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

  app.post("/api/terminal/execute", requireAuth, async (req, res) => {
    try {
      const { command } = req.body;
      if (!command) return res.status(400).json({ error: "Command required" });

      const safeCommands = ["ls", "pwd", "echo", "date", "whoami", "cat", "head", "tail", "wc", "grep", "find", "which", "env", "uptime", "df", "free", "ps", "node", "npm", "python3"];
      const cmd = command.trim().split(/\s+/)[0];

      const blocked = ["rm", "rmdir", "kill", "shutdown", "reboot", "mkfs", "dd", "chmod", "chown", "sudo", "su"];
      if (blocked.includes(cmd)) {
        return res.json({ error: `Command '${cmd}' is blocked for security reasons.` });
      }

      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      const result = await execAsync(command, {
        timeout: 30000,
        maxBuffer: 1024 * 1024,
        cwd: process.cwd(),
      });

      await storage.createLog({ action: "Terminal command", details: command, source: "terminal" });
      res.json({ output: result.stdout || result.stderr || "(no output)" });
    } catch (error: any) {
      if (error.stdout || error.stderr) {
        res.json({ output: error.stdout, error: error.stderr });
      } else {
        res.json({ error: error.message || "Command failed" });
      }
    }
  });

  app.get("/api/github/user", requireAuth, async (_req, res) => {
    try {
      const { getUncachableGitHubClient } = await import("./github-client");
      const octokit = await getUncachableGitHubClient();
      const { data } = await octokit.users.getAuthenticated();
      res.json({ login: data.login, name: data.name, avatar: data.avatar_url, url: data.html_url });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get GitHub user" });
    }
  });

  app.get("/api/github/repos", requireAuth, async (_req, res) => {
    try {
      const { getUncachableGitHubClient } = await import("./github-client");
      const octokit = await getUncachableGitHubClient();
      const { data } = await octokit.repos.listForAuthenticatedUser({
        sort: "updated",
        per_page: 50,
      });
      const repos = data.map(r => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        html_url: r.html_url,
        default_branch: r.default_branch,
        private: r.private,
        updated_at: r.updated_at,
        language: r.language,
        has_pages: r.has_pages,
      }));
      res.json(repos);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch repositories" });
    }
  });

  app.post("/api/github/repos", requireAuth, async (req, res) => {
    try {
      const { name, description, isPrivate } = req.body;
      if (!name) return res.status(400).json({ error: "Repository name required" });
      const { getUncachableGitHubClient } = await import("./github-client");
      const octokit = await getUncachableGitHubClient();
      const { data } = await octokit.repos.createForAuthenticatedUser({
        name,
        description: description || "",
        private: isPrivate || false,
        auto_init: true,
      });
      await storage.createLog({ action: "GitHub repo created", details: data.full_name, source: "github" });
      res.status(201).json({
        id: data.id,
        name: data.name,
        full_name: data.full_name,
        html_url: data.html_url,
        default_branch: data.default_branch,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create repository" });
    }
  });

  app.post("/api/github/deploy", requireAuth, async (req, res) => {
    try {
      const { owner, repo, htmlContent, commitMessage } = req.body;
      if (!owner || !repo || !htmlContent) {
        return res.status(400).json({ error: "Owner, repo, and htmlContent required" });
      }

      const { getUncachableGitHubClient } = await import("./github-client");
      const octokit = await getUncachableGitHubClient();

      const branch = "gh-pages";
      let sha: string | undefined;

      try {
        const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
        sha = ref.object.sha;
      } catch {
        const { data: mainRef } = await octokit.git.getRef({ owner, repo, ref: "heads/main" });
        await octokit.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: mainRef.object.sha });
        sha = mainRef.object.sha;
      }

      const content = Buffer.from(htmlContent).toString("base64");

      let existingFileSha: string | undefined;
      try {
        const { data: fileData } = await octokit.repos.getContent({ owner, repo, path: "index.html", ref: branch });
        if (!Array.isArray(fileData) && fileData.type === "file") {
          existingFileSha = fileData.sha;
        }
      } catch {}

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: "index.html",
        message: commitMessage || "Deploy to GitHub Pages",
        content,
        branch,
        sha: existingFileSha,
      });

      try {
        await octokit.repos.createPagesSite({ owner, repo, source: { branch, path: "/" } });
      } catch {}

      const pageUrl = `https://${owner}.github.io/${repo}/`;
      await storage.createLog({ action: "GitHub Pages deployed", details: `${owner}/${repo}`, source: "github" });

      res.json({ success: true, url: pageUrl, message: `Deployed to ${pageUrl}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Deployment failed" });
    }
  });

  app.delete("/api/github/repos/:owner/:repo", requireAuth, async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const { getUncachableGitHubClient } = await import("./github-client");
      const octokit = await getUncachableGitHubClient();
      await octokit.repos.delete({ owner, repo });
      await storage.createLog({ action: "GitHub repo deleted", details: `${owner}/${repo}`, source: "github" });
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete repository" });
    }
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
