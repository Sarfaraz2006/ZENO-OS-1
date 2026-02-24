import {
  users, aiModels, apiKeys, activityLogs, settings,
  conversations, messages, githubRepos,
  businessEmails, businessContacts, businessMetrics,
  workspaces, businessLeads, emailQueue,
  type User, type InsertUser,
  type AiModel, type InsertAiModel,
  type ApiKey, type InsertApiKey,
  type ActivityLog, type InsertActivityLog,
  type Setting, type InsertSetting,
  type Conversation, type Message,
  type GitHubRepo, type InsertGithubRepo,
  type BusinessEmail, type InsertBusinessEmail,
  type BusinessContact, type InsertBusinessContact,
  type BusinessMetric, type InsertBusinessMetric,
  type Workspace, type InsertWorkspace,
  type BusinessLead, type InsertBusinessLead,
  type EmailQueueItem, type InsertEmailQueueItem,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, isNull, or } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllWorkspaces(): Promise<Workspace[]>;
  getWorkspace(id: number): Promise<Workspace | undefined>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  updateWorkspace(id: number, data: Partial<InsertWorkspace>): Promise<Workspace | undefined>;
  deleteWorkspace(id: number): Promise<void>;

  getAllModels(): Promise<AiModel[]>;
  getModel(id: number): Promise<AiModel | undefined>;
  getModelByModelId(modelId: string): Promise<AiModel | undefined>;
  createModel(model: InsertAiModel): Promise<AiModel>;
  updateModel(id: number, data: Partial<InsertAiModel>): Promise<AiModel | undefined>;
  deleteModel(id: number): Promise<void>;

  getAllApiKeys(): Promise<ApiKey[]>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKeyLastUsed(id: number): Promise<void>;
  deleteApiKey(id: number): Promise<void>;
  toggleApiKey(id: number, isActive: boolean): Promise<void>;

  getRecentLogs(limit?: number, workspaceId?: number): Promise<ActivityLog[]>;
  createLog(log: InsertActivityLog): Promise<ActivityLog>;

  getSetting(key: string): Promise<Setting | undefined>;
  upsertSetting(key: string, value: string): Promise<Setting>;
  getAllSettings(): Promise<Setting[]>;

  getConversationCount(): Promise<number>;
  getMessageCount(): Promise<number>;
  getModelCount(): Promise<number>;

  getAllGithubRepos(): Promise<GitHubRepo[]>;
  createGithubRepo(repo: InsertGithubRepo): Promise<GitHubRepo>;
  updateGithubRepo(id: number, data: Partial<InsertGithubRepo>): Promise<GitHubRepo | undefined>;
  deleteGithubRepo(id: number): Promise<void>;

  getBusinessEmails(limit?: number, workspaceId?: number): Promise<BusinessEmail[]>;
  createBusinessEmail(email: InsertBusinessEmail): Promise<BusinessEmail>;
  getBusinessEmailStats(workspaceId?: number): Promise<{ sent: number; received: number; replied: number; total: number }>;

  getBusinessContacts(limit?: number, workspaceId?: number): Promise<BusinessContact[]>;
  createBusinessContact(contact: InsertBusinessContact): Promise<BusinessContact>;

  getBusinessMetrics(workspaceId?: number): Promise<BusinessMetric[]>;
  upsertBusinessMetric(type: string, key: string, value: string, period?: string, workspaceId?: number): Promise<BusinessMetric>;

  getBusinessLeads(workspaceId?: number, limit?: number): Promise<BusinessLead[]>;
  getBusinessLead(id: number): Promise<BusinessLead | undefined>;
  createBusinessLead(lead: InsertBusinessLead): Promise<BusinessLead>;
  updateBusinessLead(id: number, data: Partial<InsertBusinessLead>): Promise<BusinessLead | undefined>;
  deleteBusinessLead(id: number): Promise<void>;

  getEmailQueue(workspaceId?: number, status?: string): Promise<EmailQueueItem[]>;
  createEmailQueueItem(item: InsertEmailQueueItem): Promise<EmailQueueItem>;
  updateEmailQueueItem(id: number, data: Partial<InsertEmailQueueItem>): Promise<EmailQueueItem | undefined>;
  getNextPendingEmail(): Promise<EmailQueueItem | undefined>;
}

function wsFilter(workspaceId?: number) {
  if (workspaceId) return eq(businessEmails.workspaceId, workspaceId);
  return undefined;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllWorkspaces(): Promise<Workspace[]> {
    return db.select().from(workspaces).orderBy(workspaces.createdAt);
  }

  async getWorkspace(id: number): Promise<Workspace | undefined> {
    const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return ws || undefined;
  }

  async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
    const [created] = await db.insert(workspaces).values(workspace).returning();
    return created;
  }

  async updateWorkspace(id: number, data: Partial<InsertWorkspace>): Promise<Workspace | undefined> {
    const [updated] = await db.update(workspaces).set(data).where(eq(workspaces.id, id)).returning();
    return updated || undefined;
  }

  async deleteWorkspace(id: number): Promise<void> {
    await db.delete(workspaces).where(eq(workspaces.id, id));
  }

  async getAllModels(): Promise<AiModel[]> {
    return db.select().from(aiModels).orderBy(desc(aiModels.isFavorite), aiModels.name);
  }

  async getModel(id: number): Promise<AiModel | undefined> {
    const [model] = await db.select().from(aiModels).where(eq(aiModels.id, id));
    return model || undefined;
  }

  async getModelByModelId(modelId: string): Promise<AiModel | undefined> {
    const [model] = await db.select().from(aiModels).where(eq(aiModels.modelId, modelId));
    return model || undefined;
  }

  async createModel(model: InsertAiModel): Promise<AiModel> {
    const [created] = await db.insert(aiModels).values(model).returning();
    return created;
  }

  async updateModel(id: number, data: Partial<InsertAiModel>): Promise<AiModel | undefined> {
    const [updated] = await db.update(aiModels).set(data).where(eq(aiModels.id, id)).returning();
    return updated || undefined;
  }

  async deleteModel(id: number): Promise<void> {
    await db.delete(aiModels).where(eq(aiModels.id, id));
  }

  async getAllApiKeys(): Promise<ApiKey[]> {
    return db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const [found] = await db.select().from(apiKeys).where(eq(apiKeys.key, key));
    return found || undefined;
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [created] = await db.insert(apiKeys).values(apiKey).returning();
    return created;
  }

  async updateApiKeyLastUsed(id: number): Promise<void> {
    await db.update(apiKeys).set({ lastUsed: new Date() }).where(eq(apiKeys.id, id));
  }

  async deleteApiKey(id: number): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  async toggleApiKey(id: number, isActive: boolean): Promise<void> {
    await db.update(apiKeys).set({ isActive }).where(eq(apiKeys.id, id));
  }

  async getRecentLogs(limit = 50, workspaceId?: number): Promise<ActivityLog[]> {
    if (workspaceId) {
      return db.select().from(activityLogs)
        .where(or(eq(activityLogs.workspaceId, workspaceId), isNull(activityLogs.workspaceId)))
        .orderBy(desc(activityLogs.createdAt)).limit(limit);
    }
    return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
  }

  async createLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [created] = await db.insert(activityLogs).values(log).returning();
    return created;
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async upsertSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [updated] = await db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    }
    const [created] = await db.insert(settings).values({ key, value }).returning();
    return created;
  }

  async getAllSettings(): Promise<Setting[]> {
    return db.select().from(settings);
  }

  async getConversationCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(conversations);
    return Number(result[0]?.count || 0);
  }

  async getMessageCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(messages);
    return Number(result[0]?.count || 0);
  }

  async getModelCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(aiModels);
    return Number(result[0]?.count || 0);
  }

  async getAllGithubRepos(): Promise<GitHubRepo[]> {
    return db.select().from(githubRepos).orderBy(desc(githubRepos.createdAt));
  }

  async createGithubRepo(repo: InsertGithubRepo): Promise<GitHubRepo> {
    const [created] = await db.insert(githubRepos).values(repo).returning();
    return created;
  }

  async updateGithubRepo(id: number, data: Partial<InsertGithubRepo>): Promise<GitHubRepo | undefined> {
    const [updated] = await db.update(githubRepos).set(data).where(eq(githubRepos.id, id)).returning();
    return updated || undefined;
  }

  async deleteGithubRepo(id: number): Promise<void> {
    await db.delete(githubRepos).where(eq(githubRepos.id, id));
  }

  async getBusinessEmails(limit = 50, workspaceId?: number): Promise<BusinessEmail[]> {
    if (workspaceId) {
      return db.select().from(businessEmails)
        .where(eq(businessEmails.workspaceId, workspaceId))
        .orderBy(desc(businessEmails.createdAt)).limit(limit);
    }
    return db.select().from(businessEmails).orderBy(desc(businessEmails.createdAt)).limit(limit);
  }

  async createBusinessEmail(email: InsertBusinessEmail): Promise<BusinessEmail> {
    const [created] = await db.insert(businessEmails).values(email).returning();
    return created;
  }

  async getBusinessEmailStats(workspaceId?: number) {
    if (workspaceId) {
      const sent = await db.select({ count: sql<number>`count(*)` }).from(businessEmails).where(and(eq(businessEmails.direction, "sent"), eq(businessEmails.workspaceId, workspaceId)));
      const received = await db.select({ count: sql<number>`count(*)` }).from(businessEmails).where(and(eq(businessEmails.direction, "received"), eq(businessEmails.workspaceId, workspaceId)));
      const replied = await db.select({ count: sql<number>`count(*)` }).from(businessEmails).where(and(eq(businessEmails.status, "replied"), eq(businessEmails.workspaceId, workspaceId)));
      return {
        sent: Number(sent[0]?.count || 0),
        received: Number(received[0]?.count || 0),
        replied: Number(replied[0]?.count || 0),
        total: Number(sent[0]?.count || 0) + Number(received[0]?.count || 0),
      };
    }
    const sent = await db.select({ count: sql<number>`count(*)` }).from(businessEmails).where(eq(businessEmails.direction, "sent"));
    const received = await db.select({ count: sql<number>`count(*)` }).from(businessEmails).where(eq(businessEmails.direction, "received"));
    const replied = await db.select({ count: sql<number>`count(*)` }).from(businessEmails).where(eq(businessEmails.status, "replied"));
    return {
      sent: Number(sent[0]?.count || 0),
      received: Number(received[0]?.count || 0),
      replied: Number(replied[0]?.count || 0),
      total: Number(sent[0]?.count || 0) + Number(received[0]?.count || 0),
    };
  }

  async getBusinessContacts(limit = 50, workspaceId?: number): Promise<BusinessContact[]> {
    if (workspaceId) {
      return db.select().from(businessContacts)
        .where(eq(businessContacts.workspaceId, workspaceId))
        .orderBy(desc(businessContacts.lastContact)).limit(limit);
    }
    return db.select().from(businessContacts).orderBy(desc(businessContacts.lastContact)).limit(limit);
  }

  async createBusinessContact(contact: InsertBusinessContact): Promise<BusinessContact> {
    const [created] = await db.insert(businessContacts).values(contact).returning();
    return created;
  }

  async getBusinessMetrics(workspaceId?: number): Promise<BusinessMetric[]> {
    if (workspaceId) {
      return db.select().from(businessMetrics)
        .where(eq(businessMetrics.workspaceId, workspaceId))
        .orderBy(desc(businessMetrics.createdAt));
    }
    return db.select().from(businessMetrics).orderBy(desc(businessMetrics.createdAt));
  }

  async upsertBusinessMetric(type: string, key: string, value: string, period?: string, workspaceId?: number): Promise<BusinessMetric> {
    const [created] = await db.insert(businessMetrics).values({
      metricType: type, metricKey: key, metricValue: value, period, workspaceId,
    }).returning();
    return created;
  }

  async getBusinessLeads(workspaceId?: number, limit = 100): Promise<BusinessLead[]> {
    if (workspaceId) {
      return db.select().from(businessLeads)
        .where(eq(businessLeads.workspaceId, workspaceId))
        .orderBy(desc(businessLeads.createdAt)).limit(limit);
    }
    return db.select().from(businessLeads).orderBy(desc(businessLeads.createdAt)).limit(limit);
  }

  async getBusinessLead(id: number): Promise<BusinessLead | undefined> {
    const [lead] = await db.select().from(businessLeads).where(eq(businessLeads.id, id));
    return lead || undefined;
  }

  async createBusinessLead(lead: InsertBusinessLead): Promise<BusinessLead> {
    const [created] = await db.insert(businessLeads).values(lead).returning();
    return created;
  }

  async updateBusinessLead(id: number, data: Partial<InsertBusinessLead>): Promise<BusinessLead | undefined> {
    const [updated] = await db.update(businessLeads).set(data).where(eq(businessLeads.id, id)).returning();
    return updated || undefined;
  }

  async deleteBusinessLead(id: number): Promise<void> {
    await db.delete(businessLeads).where(eq(businessLeads.id, id));
  }

  async getEmailQueue(workspaceId?: number, status?: string): Promise<EmailQueueItem[]> {
    const conditions = [];
    if (workspaceId) conditions.push(eq(emailQueue.workspaceId, workspaceId));
    if (status) conditions.push(eq(emailQueue.status, status));
    if (conditions.length > 0) {
      return db.select().from(emailQueue).where(and(...conditions)).orderBy(emailQueue.scheduledAt);
    }
    return db.select().from(emailQueue).orderBy(emailQueue.scheduledAt);
  }

  async createEmailQueueItem(item: InsertEmailQueueItem): Promise<EmailQueueItem> {
    const [created] = await db.insert(emailQueue).values(item).returning();
    return created;
  }

  async updateEmailQueueItem(id: number, data: Partial<InsertEmailQueueItem>): Promise<EmailQueueItem | undefined> {
    const [updated] = await db.update(emailQueue).set(data).where(eq(emailQueue.id, id)).returning();
    return updated || undefined;
  }

  async getNextPendingEmail(): Promise<EmailQueueItem | undefined> {
    const [item] = await db.select().from(emailQueue)
      .where(eq(emailQueue.status, "pending"))
      .orderBy(emailQueue.scheduledAt)
      .limit(1);
    return item || undefined;
  }
}

export const storage = new DatabaseStorage();
