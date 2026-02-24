import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/chat";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("general"),
  icon: text("icon").default("briefcase"),
  color: text("color").default("blue"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const aiModels = pgTable("ai_models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  modelId: text("model_id").notNull().unique(),
  provider: text("provider").notNull().default("openrouter"),
  description: text("description"),
  contextWindow: integer("context_window").default(8192),
  inputCost: text("input_cost").default("0"),
  outputCost: text("output_cost").default("0"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  isFavorite: boolean("is_favorite").default(false).notNull(),
  category: text("category").default("general"),
  role: text("role").default("general"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  details: text("details"),
  source: text("source").default("dashboard"),
  workspaceId: integer("workspace_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const githubRepos = pgTable("github_repos", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  repoUrl: text("repo_url").notNull(),
  branch: text("branch").notNull().default("main"),
  status: text("status").notNull().default("connected"),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const businessEmails = pgTable("business_emails", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"),
  direction: text("direction").notNull().default("sent"),
  fromAddr: text("from_addr").notNull(),
  toAddr: text("to_addr").notNull(),
  subject: text("subject").notNull(),
  body: text("body"),
  status: text("status").notNull().default("sent"),
  threadId: text("thread_id"),
  messageId: text("message_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const businessContacts = pgTable("business_contacts", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  source: text("source").default("email"),
  lastContact: timestamp("last_contact"),
  totalMessages: integer("total_messages").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const businessMetrics = pgTable("business_metrics", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"),
  metricType: text("metric_type").notNull(),
  metricKey: text("metric_key").notNull(),
  metricValue: text("metric_value").notNull().default("0"),
  period: text("period"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const businessLeads = pgTable("business_leads", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  website: text("website"),
  status: text("status").notNull().default("new"),
  source: text("source").default("manual"),
  score: integer("score").default(0),
  notes: text("notes"),
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const emailQueue = pgTable("email_queue", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"),
  toAddr: text("to_addr").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("pending"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  error: text("error"),
  leadId: integer("lead_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const usersRelations = relations(users, ({ }) => ({}));

export const aiModelsRelations = relations(aiModels, ({ }) => ({}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({
  id: true,
  createdAt: true,
});

export const insertAiModelSchema = createInsertSchema(aiModels).omit({
  id: true,
  createdAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  lastUsed: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type AiModel = typeof aiModels.$inferSelect;
export type InsertAiModel = z.infer<typeof insertAiModelSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export const insertGithubRepoSchema = createInsertSchema(githubRepos).omit({
  id: true,
  lastSync: true,
  createdAt: true,
});
export type GitHubRepo = typeof githubRepos.$inferSelect;
export type InsertGithubRepo = z.infer<typeof insertGithubRepoSchema>;

export const insertBusinessEmailSchema = createInsertSchema(businessEmails).omit({
  id: true,
  createdAt: true,
});
export type BusinessEmail = typeof businessEmails.$inferSelect;
export type InsertBusinessEmail = z.infer<typeof insertBusinessEmailSchema>;

export const insertBusinessContactSchema = createInsertSchema(businessContacts).omit({
  id: true,
  createdAt: true,
});
export type BusinessContact = typeof businessContacts.$inferSelect;
export type InsertBusinessContact = z.infer<typeof insertBusinessContactSchema>;

export const insertBusinessMetricSchema = createInsertSchema(businessMetrics).omit({
  id: true,
  createdAt: true,
});
export type BusinessMetric = typeof businessMetrics.$inferSelect;
export type InsertBusinessMetric = z.infer<typeof insertBusinessMetricSchema>;

export const insertBusinessLeadSchema = createInsertSchema(businessLeads).omit({
  id: true,
  createdAt: true,
});
export type BusinessLead = typeof businessLeads.$inferSelect;
export type InsertBusinessLead = z.infer<typeof insertBusinessLeadSchema>;

export const insertEmailQueueSchema = createInsertSchema(emailQueue).omit({
  id: true,
  createdAt: true,
});
export type EmailQueueItem = typeof emailQueue.$inferSelect;
export type InsertEmailQueueItem = z.infer<typeof insertEmailQueueSchema>;
