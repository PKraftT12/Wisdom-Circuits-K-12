import { users, type User, type InsertUser, organizations, type Organization, type InsertOrganization, subscriptionPlans, type SubscriptionPlan, type InsertSubscriptionPlan, subscriptions, type Subscription, type InsertSubscription, circuitAllocations, type CircuitAllocation, type InsertCircuitAllocation, payments, type Payment, type InsertPayment, wisdomCircuits, type WisdomCircuit, type InsertWisdomCircuit, circuitPrompts, type CircuitPrompt, type InsertCircuitPrompt, circuitContent, type CircuitContent, type InsertCircuitContent } from "@shared/schema";
import { db } from "./db";
import { eq, and, or } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { nanoid } from 'nanoid';

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Wisdom Circuit methods
  createWisdomCircuit(circuit: InsertWisdomCircuit): Promise<WisdomCircuit>;
  getWisdomCircuit(id: number): Promise<WisdomCircuit | undefined>;
  getWisdomCircuitByCode(code: string): Promise<WisdomCircuit | undefined>;
  getWisdomCircuitsByTeacher(teacherId: number): Promise<WisdomCircuit[]>;
  getArchivedWisdomCircuitsByTeacher(teacherId: number): Promise<WisdomCircuit[]>;
  archiveWisdomCircuit(id: number): Promise<WisdomCircuit>;
  unarchiveWisdomCircuit(id: number): Promise<WisdomCircuit>;
  deleteWisdomCircuit(id: number): Promise<WisdomCircuit>;

  // Circuit prompts methods
  createCircuitPrompt(prompt: InsertCircuitPrompt): Promise<CircuitPrompt>;
  getCircuitPrompts(circuitId: number): Promise<CircuitPrompt[]>;
  getActiveCircuitPrompt(circuitId: number): Promise<CircuitPrompt | undefined>;
  updateCircuitPrompt(id: number, prompt: Partial<InsertCircuitPrompt>): Promise<CircuitPrompt>;

  // Content management methods
  createCircuitContent(content: InsertCircuitContent): Promise<CircuitContent>;
  getCircuitContent(circuitId: number): Promise<CircuitContent[]>;
  getCircuitContentById(id: number): Promise<CircuitContent | undefined>;
  archiveCircuitContent(id: number): Promise<CircuitContent>;

  // Organization methods
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationByCode(code: string): Promise<Organization | undefined>;
  updateOrganizationStatus(id: number, status: 'active' | 'inactive'): Promise<Organization>;

  // Subscription plan methods
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  getSubscriptionPlans(type: 'individual' | 'bulk'): Promise<SubscriptionPlan[]>;

  // Subscription methods
  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  getSubscription(id: number): Promise<Subscription | undefined>;
  getUserSubscriptions(userId: number): Promise<Subscription[]>;
  getOrganizationSubscriptions(orgId: number): Promise<Subscription[]>;
  updateSubscriptionStatus(id: number, status: 'active' | 'cancelled' | 'past_due'): Promise<Subscription>;

  // Circuit allocation methods
  allocateCircuit(allocation: InsertCircuitAllocation): Promise<CircuitAllocation>;
  getUserCircuitAllocations(userId: number): Promise<CircuitAllocation[]>;
  getOrganizationCircuitAllocations(orgId: number): Promise<CircuitAllocation[]>;
  deactivateCircuitAllocation(id: number): Promise<CircuitAllocation>;

  // Payment methods
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentHistory(subscriptionId: number): Promise<Payment[]>;
  getUserPayments(userId: number): Promise<Payment[]>;
  getOrganizationPayments(orgId: number): Promise<Payment[]>;

  // Session store
  sessionStore: session.Store;
  getSubscriptionByStripeId(stripeId: string): Promise<Subscription | undefined>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createWisdomCircuit(insertCircuit: InsertWisdomCircuit): Promise<WisdomCircuit> {
    const [circuit] = await db
      .insert(wisdomCircuits)
      .values({
        ...insertCircuit,
        code: nanoid(8).toUpperCase(),
      })
      .returning();
    return circuit;
  }

  async getWisdomCircuit(id: number): Promise<WisdomCircuit | undefined> {
    const [circuit] = await db
      .select()
      .from(wisdomCircuits)
      .where(eq(wisdomCircuits.id, id));
    return circuit;
  }

  async getWisdomCircuitByCode(code: string): Promise<WisdomCircuit | undefined> {
    const [circuit] = await db
      .select()
      .from(wisdomCircuits)
      .where(eq(wisdomCircuits.code, code));
    return circuit;
  }

  async getWisdomCircuitsByTeacher(teacherId: number): Promise<WisdomCircuit[]> {
    try {
      console.log('Fetching active circuits for teacher:', teacherId);
      const circuits = await db
        .select()
        .from(wisdomCircuits)
        .where(and(
          eq(wisdomCircuits.teacherId, teacherId),
          eq(wisdomCircuits.isArchived, false)
        ));
      console.log('Retrieved active circuits:', circuits);
      return circuits;
    } catch (error) {
      console.error('Error fetching active circuits:', error);
      throw error;
    }
  }

  async getArchivedWisdomCircuitsByTeacher(teacherId: number): Promise<WisdomCircuit[]> {
    try {
      console.log('Fetching archived circuits for teacher:', teacherId);
      const circuits = await db
        .select()
        .from(wisdomCircuits)
        .where(and(
          eq(wisdomCircuits.teacherId, teacherId),
          eq(wisdomCircuits.isArchived, true)
        ));
      console.log('Retrieved archived circuits:', circuits);
      return circuits;
    } catch (error) {
      console.error('Error fetching archived circuits:', error);
      throw error;
    }
  }

  async archiveWisdomCircuit(id: number): Promise<WisdomCircuit> {
    try {
      console.log('Archiving circuit:', id);

      // First verify the circuit exists
      const [existingCircuit] = await db
        .select()
        .from(wisdomCircuits)
        .where(eq(wisdomCircuits.id, id));

      if (!existingCircuit) {
        throw new Error('Circuit not found');
      }

      const [circuit] = await db
        .update(wisdomCircuits)
        .set({ isArchived: true })
        .where(eq(wisdomCircuits.id, id))
        .returning();

      console.log('Archived circuit:', circuit);
      return circuit;
    } catch (error) {
      console.error('Error archiving circuit:', error);
      throw error;
    }
  }

  async unarchiveWisdomCircuit(id: number): Promise<WisdomCircuit> {
    const [circuit] = await db
      .update(wisdomCircuits)
      .set({ isArchived: false })
      .where(eq(wisdomCircuits.id, id))
      .returning();
    return circuit;
  }

  async deleteWisdomCircuit(id: number): Promise<WisdomCircuit> {
    try {
      // First delete all related circuit content
      await db.delete(circuitContent)
        .where(eq(circuitContent.circuitId, id));

      // Then delete the circuit itself
      const [circuit] = await db
        .delete(wisdomCircuits)
        .where(eq(wisdomCircuits.id, id))
        .returning();

      if (!circuit) {
        throw new Error('Circuit not found');
      }

      return circuit;
    } catch (error) {
      console.error('Error deleting circuit:', error);
      throw error;
    }
  }

  async createCircuitPrompt(prompt: InsertCircuitPrompt): Promise<CircuitPrompt> {
    const [newPrompt] = await db
      .insert(circuitPrompts)
      .values(prompt)
      .returning();
    return newPrompt;
  }

  async getCircuitPrompts(circuitId: number): Promise<CircuitPrompt[]> {
    return db
      .select()
      .from(circuitPrompts)
      .where(eq(circuitPrompts.circuitId, circuitId));
  }

  async getActiveCircuitPrompt(circuitId: number): Promise<CircuitPrompt | undefined> {
    const [prompt] = await db
      .select()
      .from(circuitPrompts)
      .where(and(
        eq(circuitPrompts.circuitId, circuitId),
        eq(circuitPrompts.isActive, true)
      ));
    return prompt;
  }

  async updateCircuitPrompt(id: number, prompt: Partial<InsertCircuitPrompt>): Promise<CircuitPrompt> {
    const [updatedPrompt] = await db
      .update(circuitPrompts)
      .set(prompt)
      .where(eq(circuitPrompts.id, id))
      .returning();
    return updatedPrompt;
  }

  async createCircuitContent(content: InsertCircuitContent): Promise<CircuitContent> {
    try {
      console.log('Creating circuit content:', content);
      const [newContent] = await db
        .insert(circuitContent)
        .values({
          ...content,
          isArchived: false,
        })
        .returning();
      console.log('Created circuit content:', newContent);
      return newContent;
    } catch (error) {
      console.error('Error creating circuit content:', error);
      throw error;
    }
  }

  async getCircuitContent(circuitId: number): Promise<CircuitContent[]> {
    try {
      console.log('Fetching content for circuit:', circuitId);
      const content = await db
        .select()
        .from(circuitContent)
        .where(and(
          eq(circuitContent.circuitId, circuitId),
          eq(circuitContent.isArchived, false)
        ));
      console.log('Retrieved content:', content);
      return content;
    } catch (error) {
      console.error('Error fetching circuit content:', error);
      throw error;
    }
  }

  async getCircuitContentById(id: number): Promise<CircuitContent | undefined> {
    const [content] = await db
      .select()
      .from(circuitContent)
      .where(eq(circuitContent.id, id));
    return content;
  }

  async archiveCircuitContent(id: number): Promise<CircuitContent> {
    const [archivedContent] = await db
      .update(circuitContent)
      .set({ isArchived: true })
      .where(eq(circuitContent.id, id))
      .returning();
    return archivedContent;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [organization] = await db
      .insert(organizations)
      .values({
        ...org,
        accessCode: nanoid(8).toUpperCase(),
      })
      .returning();
    return organization;
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationByCode(code: string): Promise<Organization | undefined> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.accessCode, code));
    return org;
  }

  async updateOrganizationStatus(id: number, status: 'active' | 'inactive'): Promise<Organization> {
    const [org] = await db
      .update(organizations)
      .set({ status })
      .where(eq(organizations.id, id))
      .returning();
    return org;
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [newPlan] = await db
      .insert(subscriptionPlans)
      .values(plan)
      .returning();
    return newPlan;
  }

  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async getSubscriptionPlans(type: 'individual' | 'bulk'): Promise<SubscriptionPlan[]> {
    return db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.type, type));
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db
      .insert(subscriptions)
      .values(sub)
      .returning();
    return subscription;
  }

  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id));
    return subscription;
  }

  async getUserSubscriptions(userId: number): Promise<Subscription[]> {
    return db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
  }

  async getOrganizationSubscriptions(orgId: number): Promise<Subscription[]> {
    return db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, orgId));
  }

  async updateSubscriptionStatus(id: number, status: 'active' | 'cancelled' | 'past_due'): Promise<Subscription> {
    const [subscription] = await db
      .update(subscriptions)
      .set({ status })
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription;
  }

  async allocateCircuit(allocation: InsertCircuitAllocation): Promise<CircuitAllocation> {
    const [newAllocation] = await db
      .insert(circuitAllocations)
      .values(allocation)
      .returning();
    return newAllocation;
  }

  async getUserCircuitAllocations(userId: number): Promise<CircuitAllocation[]> {
    return db
      .select()
      .from(circuitAllocations)
      .where(and(
        eq(circuitAllocations.userId, userId),
        eq(circuitAllocations.status, 'active')
      ));
  }

  async getOrganizationCircuitAllocations(orgId: number): Promise<CircuitAllocation[]> {
    return db
      .select()
      .from(circuitAllocations)
      .where(and(
        eq(circuitAllocations.organizationId, orgId),
        eq(circuitAllocations.status, 'active')
      ));
  }

  async deactivateCircuitAllocation(id: number): Promise<CircuitAllocation> {
    const [allocation] = await db
      .update(circuitAllocations)
      .set({ status: 'inactive' })
      .where(eq(circuitAllocations.id, id))
      .returning();
    return allocation;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db
      .insert(payments)
      .values(payment)
      .returning();
    return newPayment;
  }

  async getPaymentHistory(subscriptionId: number): Promise<Payment[]> {
    return db
      .select()
      .from(payments)
      .where(eq(payments.subscriptionId, subscriptionId));
  }

  async getUserPayments(userId: number): Promise<Payment[]> {
    return db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId));
  }

  async getOrganizationPayments(orgId: number): Promise<Payment[]> {
    return db
      .select()
      .from(payments)
      .where(eq(payments.organizationId, orgId));
  }
  async getSubscriptionByStripeId(stripeId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeId));
    return subscription;
  }
}

export const storage = new DatabaseStorage();