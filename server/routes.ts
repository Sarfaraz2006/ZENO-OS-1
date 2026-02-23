import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { registerChatRoutes } from "./replit_integrations/chat";
import { randomBytes, createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "jarvis-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
    })
  );

  const requireAuth = (req: any, res: any, next: any) => {
    if (req.session?.authenticated) {
      return next();
    }
    res.status(401).json({ error: "Unauthorized" });
  };

  const requireApiKey = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const key = authHeader.slice(7);
      const apiKey = await storage.getApiKeyByKey(key);
      if (apiKey && apiKey.isActive) {
        await storage.updateApiKeyLastUsed(apiKey.id);
        return next();
      }
    }
    if (req.session?.authenticated) {
      return next();
    }
    res.status(401).json({ error: "Unauthorized" });
  };

  await ensureDefaultUser();

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { password } = req.body;
      const setting = await storage.getSetting("master_password");
      const storedHash = setting?.value || hashPassword("admin");
      if (hashPassword(password) === storedHash) {
        (req.session as any).authenticated = true;
        await storage.createLog({ action: "Login", details: "Dashboard login successful", source: "auth" });
        res.json({ success: true });
      } else {
        res.status(401).json({ error: "Invalid password" });
      }
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/check", (req, res) => {
    if ((req.session as any)?.authenticated) {
      res.json({ authenticated: true });
    } else {
      res.status(401).json({ authenticated: false });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const setting = await storage.getSetting("master_password");
      const storedHash = setting?.value || hashPassword("admin");
      if (hashPassword(currentPassword) !== storedHash) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      await storage.upsertSetting("master_password", hashPassword(newPassword));
      await storage.createLog({ action: "Password changed", source: "auth" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  app.get("/api/stats", requireAuth, async (_req, res) => {
    try {
      const [conversations, messages, models] = await Promise.all([
        storage.getConversationCount(),
        storage.getMessageCount(),
        storage.getModelCount(),
      ]);
      const apiKeys = (await storage.getAllApiKeys()).length;
      res.json({ conversations, messages, models, apiKeys });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/logs", requireAuth, async (_req, res) => {
    try {
      const logs = await storage.getRecentLogs(50);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  app.get("/api/models", requireApiKey, async (_req, res) => {
    try {
      const models = await storage.getAllModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  app.post("/api/models", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getModelByModelId(req.body.modelId);
      if (existing) {
        return res.status(400).json({ error: "Model with this ID already exists" });
      }
      const model = await storage.createModel(req.body);
      await storage.createLog({
        action: "Model added",
        details: `${model.name} (${model.modelId})`,
        source: "models",
      });
      res.status(201).json(model);
    } catch (error) {
      res.status(500).json({ error: "Failed to add model" });
    }
  });

  app.patch("/api/models/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateModel(id, req.body);
      if (!updated) return res.status(404).json({ error: "Model not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update model" });
    }
  });

  app.delete("/api/models/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteModel(id);
      await storage.createLog({ action: "Model removed", source: "models" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete model" });
    }
  });

  app.get("/api/api-keys", requireAuth, async (_req, res) => {
    try {
      const keys = await storage.getAllApiKeys();
      res.json(keys);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  });

  app.post("/api/api-keys", requireAuth, async (req, res) => {
    try {
      const { name } = req.body;
      const key = `jrv_${randomBytes(32).toString("hex")}`;
      const apiKey = await storage.createApiKey({ name, key, isActive: true });
      await storage.createLog({ action: "API key created", details: name, source: "security" });
      res.status(201).json({ ...apiKey, key });
    } catch (error) {
      res.status(500).json({ error: "Failed to create API key" });
    }
  });

  app.patch("/api/api-keys/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isActive } = req.body;
      await storage.toggleApiKey(id, isActive);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update API key" });
    }
  });

  app.delete("/api/api-keys/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteApiKey(id);
      await storage.createLog({ action: "API key deleted", source: "security" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete API key" });
    }
  });

  registerChatRoutes(app);

  app.get("/api/v1/chat", requireApiKey, async (req, res) => {
    res.json({ message: "Jarvis API v1 - Use POST to chat" });
  });

  return httpServer;
}

async function ensureDefaultUser() {
  const setting = await storage.getSetting("master_password");
  if (!setting) {
    await storage.upsertSetting("master_password", hashPassword("admin"));
  }
  await seedDefaultModels();
}

async function seedDefaultModels() {
  const existingModels = await storage.getAllModels();
  if (existingModels.length > 0) return;

  const defaultModels = [
    {
      name: "Llama 3.3 70B",
      modelId: "meta-llama/llama-3.3-70b-instruct",
      provider: "openrouter",
      description: "High-quality open model for general tasks",
      contextWindow: 131072,
      inputCost: "0.35",
      outputCost: "0.40",
      category: "general",
      isEnabled: true,
      isFavorite: true,
    },
    {
      name: "DeepSeek V3",
      modelId: "deepseek/deepseek-chat",
      provider: "openrouter",
      description: "Powerful and cost-effective model",
      contextWindow: 65536,
      inputCost: "0.14",
      outputCost: "0.28",
      category: "general",
      isEnabled: true,
      isFavorite: false,
    },
    {
      name: "Claude Sonnet 4.6",
      modelId: "anthropic/claude-sonnet-4.6",
      provider: "openrouter",
      description: "Advanced reasoning and analysis",
      contextWindow: 200000,
      inputCost: "3",
      outputCost: "15",
      category: "reasoning",
      isEnabled: true,
      isFavorite: true,
    },
    {
      name: "Gemini 3 Flash",
      modelId: "google/gemini-3-flash-preview",
      provider: "openrouter",
      description: "Fast Google model for quick tasks",
      contextWindow: 1000000,
      inputCost: "0.1",
      outputCost: "0.4",
      category: "fast",
      isEnabled: true,
      isFavorite: false,
    },
    {
      name: "Qwen 3 Max",
      modelId: "qwen/qwen3-max-thinking",
      provider: "openrouter",
      description: "Advanced thinking and reasoning model",
      contextWindow: 40960,
      inputCost: "1",
      outputCost: "4",
      category: "reasoning",
      isEnabled: true,
      isFavorite: false,
    },
  ];

  for (const model of defaultModels) {
    try {
      await storage.createModel(model);
    } catch {}
  }
}
