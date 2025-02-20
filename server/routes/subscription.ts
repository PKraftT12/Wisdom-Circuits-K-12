import { Router } from 'express';
import { stripeService } from '../services/stripe';
import { storage } from '../storage';
import { insertSubscriptionSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

const checkoutSessionSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  mode: z.enum(['subscription', 'payment']),
  quantity: z.number().optional(),
});

router.post('/api/checkout/create-session', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { priceId, successUrl, cancelUrl, mode, quantity } = checkoutSessionSchema.parse(req.body);

    const session = await stripeService.createCheckoutSession({
      priceId,
      successUrl,
      cancelUrl,
      mode,
      userId: req.user.id,
      organizationId: req.user.organizationId,
      quantity,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(400).json({ 
      message: error instanceof z.ZodError 
        ? 'Invalid request data' 
        : 'Error creating checkout session' 
    });
  }
});

router.post('/api/webhook/stripe', async (req, res) => {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return res.status(400).json({ message: 'Missing stripe-signature header' });
  }

  try {
    const result = await stripeService.handleWebhook(signature, req.rawBody);
    res.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ message: 'Webhook error' });
  }
});

router.post('/api/organization/verify-code', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ message: 'Access code is required' });
  }

  try {
    const organization = await storage.getOrganizationByCode(code);
    if (!organization) {
      return res.status(404).json({ message: 'Invalid access code' });
    }

    if (organization.status !== 'active') {
      return res.status(400).json({ message: 'Organization subscription is not active' });
    }

    // Update user's organization
    await storage.updateUser(req.user.id, { organizationId: organization.id });
    
    res.json({ message: 'Organization code verified successfully' });
  } catch (error) {
    console.error('Error verifying organization code:', error);
    res.status(500).json({ message: 'Error verifying organization code' });
  }
});

export default router;
