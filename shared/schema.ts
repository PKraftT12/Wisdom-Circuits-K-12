import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password"),  // Make password optional for OAuth users
  isTeacher: boolean("is_teacher").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  authProvider: text("auth_provider").notNull().default('local'), // 'local', 'google', 'canvas', 'clever'
  providerId: text("provider_id"), // ID from the OAuth provider
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  organizationId: integer("organization_id").references(() => organizations.id),
});

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'school' or 'district'
  accessCode: text("access_code").notNull().unique(),
  status: text("status").notNull().default('active'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'individual' or 'bulk'
  pricePerCircuit: decimal("price_per_circuit").notNull(),
  minCircuits: integer("min_circuits"),
  maxCircuits: integer("max_circuits"),
  features: jsonb("features").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  organizationId: integer("organization_id").references(() => organizations.id),
  planId: integer("plan_id").references(() => subscriptionPlans.id),
  status: text("status").notNull(), // 'active', 'cancelled', 'past_due'
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAt: timestamp("cancel_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const circuitAllocations = pgTable("circuit_allocations", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id),
  circuitId: integer("circuit_id").references(() => wisdomCircuits.id),
  userId: integer("user_id").references(() => users.id),
  organizationId: integer("organization_id").references(() => organizations.id),
  status: text("status").notNull().default('active'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id),
  userId: integer("user_id").references(() => users.id),
  organizationId: integer("organization_id").references(() => organizations.id),
  amount: decimal("amount").notNull(),
  currency: text("currency").notNull().default('usd'),
  stripePaymentId: text("stripe_payment_id").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const wisdomCircuits = pgTable("wisdom_circuits", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  grade: text("grade").notNull(),
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  teacherName: text("teacher_name").notNull(),
  description: text("description").notNull(),
  // Add colorScheme to the schema
  colorScheme: jsonb("color_scheme"),
  teachingStyles: jsonb("teaching_styles").notNull().default(['hybrid']),
  homeworkPolicies: jsonb("homework_policies").notNull().default(['guide']),
  responseTypes: jsonb("response_types").notNull().default(['detailed']),
  stateAlignment: text("state_alignment").notNull().default('California'),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const circuitPrompts = pgTable("circuit_prompts", {
  id: serial("id").primaryKey(),
  circuitId: integer("circuit_id").notNull().references(() => wisdomCircuits.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  configuration: jsonb("configuration").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const circuitContent = pgTable("circuit_content", {
  id: serial("id").primaryKey(),
  circuitId: integer("circuit_id").notNull().references(() => wisdomCircuits.id),
  title: text("title").notNull(),
  description: text("description"),
  fileType: text("file_type").notNull(),
  contentUrl: text("content_url").notNull(),
  category: text("category").notNull(),
  content: text("content"), // Store the actual content text for OpenAI context
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  isArchived: boolean("is_archived").notNull().default(false),
});

const teachingStyleSchema = z.enum(["authority", "demonstrator", "facilitator", "delegator", "hybrid"]);
const homeworkPolicySchema = z.enum(["guide", "verify", "examples", "no_solutions"]);
const responseTypeSchema = z.enum(["detailed", "concise", "step_by_step", "conceptual"]);

export const insertUserSchema = createInsertSchema(users)
  .pick({
    email: true,
    password: true,
    isTeacher: true,
    authProvider: true,
    providerId: true,
    displayName: true,
    avatarUrl: true,
    isAdmin: true,
    organizationId: true,
  })
  .extend({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

export const insertWisdomCircuitSchema = createInsertSchema(wisdomCircuits)
  .omit({ id: true, code: true, createdAt: true, isArchived: true })
  .extend({
    name: z.string().min(1, "Circuit name is required"),
    grade: z.enum(["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"], {
      required_error: "Grade selection is required",
    }),
    teacherName: z.string().min(1, "Teacher name is required"),
    description: z.string().min(1, "Description is required").max(200, "Description must not exceed 200 characters"),
    colorScheme: z.object({
      bg: z.string(),
      icon: z.string(),
      accent: z.string(),
    }).optional(),
    teachingStyles: z.array(teachingStyleSchema).min(1, "At least one teaching style is required"),
    homeworkPolicies: z.array(homeworkPolicySchema).min(1, "At least one homework policy is required"),
    responseTypes: z.array(responseTypeSchema).min(1, "At least one response type is required"),
    stateAlignment: z.string().min(1, "State alignment is required"),
  });

export const insertCircuitPromptSchema = createInsertSchema(circuitPrompts)
  .omit({ id: true, createdAt: true })
  .extend({
    configuration: z.object({
      teachingStyle: z.enum(["Socratic", "Direct", "Interactive", "Guided Discovery"]),
      responseType: z.enum(["Detailed", "Concise", "Step-by-Step", "Conceptual"]),
      homeworkPolicy: z.enum(["Guide Only", "Verify Answers", "Provide Examples", "No Direct Solutions"]),
      conceptBreakdown: z.boolean(),
      useExamples: z.boolean(),
      difficultyAdaptation: z.boolean(),
      encouragementFrequency: z.enum(["High", "Medium", "Low"]),
      defaultPrompts: z.array(z.string()),
      customPrompts: z.array(z.string()).optional(),
    }),
  });

export const insertCircuitContentSchema = createInsertSchema(circuitContent)
  .omit({ id: true, isArchived: true, uploadedAt: true })
  .extend({
    title: z.string().min(1, "Content title is required"),
    description: z.string().optional(),
    fileType: z.enum(["pdf", "docx", "txt", "pptx", "transcript"]),
    category: z.enum(["syllabus", "worksheet", "pacing_guide", "lesson_plan", "reference_material", "transcript"]),
    content: z.string().optional(),
  });

export const insertOrganizationSchema = createInsertSchema(organizations)
  .extend({
    name: z.string().min(1, "Organization name is required"),
    type: z.enum(["school", "district"]),
    accessCode: z.string().min(1, "Access code is required"),
    status: z.enum(["active", "inactive"]),
  });

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans)
  .extend({
    name: z.string().min(1, "Plan name is required"),
    type: z.enum(["individual", "bulk"]),
    pricePerCircuit: z.number().positive("Price must be positive"),
    features: z.array(z.string()),
  });

export const insertSubscriptionSchema = createInsertSchema(subscriptions)
  .extend({
    status: z.enum(["active", "cancelled", "past_due"]),
  });

export const insertCircuitAllocationSchema = createInsertSchema(circuitAllocations)
  .extend({
    status: z.enum(["active", "inactive"]),
  });

export const insertPaymentSchema = createInsertSchema(payments)
  .extend({
    amount: z.number().positive("Amount must be positive"),
    currency: z.string().length(3, "Currency must be a 3-letter code"),
    status: z.enum(["succeeded", "failed", "pending"]),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertWisdomCircuit = z.infer<typeof insertWisdomCircuitSchema>;
export type WisdomCircuit = typeof wisdomCircuits.$inferSelect;
export type InsertCircuitPrompt = z.infer<typeof insertCircuitPromptSchema>;
export type CircuitPrompt = typeof circuitPrompts.$inferSelect;
export type InsertCircuitContent = z.infer<typeof insertCircuitContentSchema>;
export type CircuitContent = typeof circuitContent.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type CircuitAllocation = typeof circuitAllocations.$inferSelect;
export type InsertCircuitAllocation = z.infer<typeof insertCircuitAllocationSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;