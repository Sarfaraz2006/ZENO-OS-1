import {
  users, aiModels, apiKeys, activityLogs, settings,
  conversations, messages, githubRepos,
  type User, type InsertUser,
  type AiModel, type InsertAiModel,
  type ApiKey, type InsertApiKey,
  type ActivityLog, type InsertActivityLog,
  type Setting, type InsertSetting,
  type Conversation, type Message,
  type GitHubRepo, type InsertGithubRepo,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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

  getRecentLogs(limit?: number): Promise<ActivityLog[]>;
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

  async getRecentLogs(limit = 50): Promise<ActivityLog[]> {
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
}

export const storage = new DatabaseStorage();
