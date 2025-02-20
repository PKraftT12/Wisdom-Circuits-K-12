import Stripe from 'stripe';
import { insertPaymentSchema, insertSubscriptionSchema } from '@shared/schema';
import { storage } from '../storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export interface CreateCheckoutSessionParams {
  priceId: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  mode: 'subscription' | 'payment';
  userId: number;
  organizationId?: number;
  quantity?: number;
}

export const stripeService = {
  async createCustomer(email: string, name?: string) {
    return stripe.customers.create({
      email,
      name,
    });
  },

  async createCheckoutSession({
    priceId,
    customerId,
    successUrl,
    cancelUrl,
    mode,
    userId,
    organizationId,
    quantity = 1,
  }: CreateCheckoutSessionParams) {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId.toString(),
        ...(organizationId && { organizationId: organizationId.toString() }),
      },
    });

    return session;
  },

  async handleWebhook(signature: string, payload: string | Buffer) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = parseInt(session.metadata?.userId || '0', 10);
          const organizationId = session.metadata?.organizationId 
            ? parseInt(session.metadata.organizationId, 10)
            : undefined;

          if (session.mode === 'subscription') {
            await storage.createSubscription({
              userId,
              organizationId,
              stripeSubscriptionId: session.subscription as string,
              status: 'active',
              currentPeriodStart: new Date(session.created * 1000),
              currentPeriodEnd: new Date(
                (session.created + 365 * 24 * 60 * 60) * 1000
              ), // 1 year from creation
            });
          }

          await storage.createPayment({
            userId,
            organizationId,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency || 'usd',
            stripePaymentId: session.payment_intent as string,
            status: 'succeeded',
          });
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const subscriptionId = subscription.id;
          const status = subscription.status === 'active' ? 'active' : 'past_due';

          // Update subscription status in our database
          const dbSubscription = await storage.getSubscriptionByStripeId(subscriptionId);
          if (dbSubscription) {
            await storage.updateSubscriptionStatus(dbSubscription.id, status);
          }
          break;
        }

        // Handle other webhook events as needed
      }

      return { received: true };
    } catch (err) {
      console.error('Error processing Stripe webhook:', err);
      throw err;
    }
  },
};
