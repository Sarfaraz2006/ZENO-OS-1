import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { registerChatRoutes } from "./replit_integrations/chat";
import { randomBytes, createHash } from "crypto";
import { analyzeBusinessWithRules, analyzeBusinessWithAI, getBusinessContextForChat } from "./business-brain";
import { scrapeAndSaveLeads } from "./lead-scraper";
import { startEmailQueueWorker, queueEmailsForLeads } from "./email-queue";
import { detectTaskType, selectModelForTask, getTaskLabel } from "./model-router";
import { sendGmailEmail, fetchGmailInbox, fetchGmailThread, getGmailProfile } from "./gmail-client";
import { startAutonomousAgent, stopAutonomousAgent, isAgentRunning } from "./autonomous-agent";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "zeno-os-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
    })
  );

  const requireAuth = (req: any, res: any, next: any) => {
    // AUTH DISABLED FOR TESTING - re-enable when project is complete
    req.session.authenticated = true;
    return next();
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

  app.get("/api/ai-providers", requireAuth, async (_req, res) => {
    try {
      const providers = await storage.getAllAiProviders();
      const masked = providers.map(p => ({ ...p, apiKey: p.apiKey.slice(0, 8) + "..." + p.apiKey.slice(-4) }));
      res.json(masked);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch AI providers" });
    }
  });

  app.get("/api/ai-providers/active", requireAuth, async (_req, res) => {
    try {
      const active = await storage.getActiveAiProvider();
      if (active) {
        res.json({ ...active, apiKey: active.apiKey.slice(0, 8) + "..." + active.apiKey.slice(-4) });
      } else {
        res.json({ providerName: "OpenRouter (Replit)", providerType: "openrouter", isDefault: true });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active provider" });
    }
  });

  app.post("/api/ai-providers", requireAuth, async (req, res) => {
    try {
      const { name, provider, apiKey, baseUrl, isActive, isDefault } = req.body;
      if (!name || !provider || !apiKey) {
        return res.status(400).json({ error: "Name, provider type, and API key are required" });
      }
      const created = await storage.createAiProvider({ name, provider, apiKey, baseUrl: baseUrl || null, isActive: isActive ?? true, isDefault: isDefault ?? false });
      if (isDefault) {
        await storage.setDefaultAiProvider(created.id);
      }
      await storage.createLog({ action: `AI Provider added: ${name} (${provider})`, source: "settings" });
      res.status(201).json({ ...created, apiKey: created.apiKey.slice(0, 8) + "..." + created.apiKey.slice(-4) });
    } catch (error) {
      res.status(500).json({ error: "Failed to create AI provider" });
    }
  });

  app.patch("/api/ai-providers/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateAiProvider(id, req.body);
      if (!updated) return res.status(404).json({ error: "Provider not found" });
      res.json({ ...updated, apiKey: updated.apiKey.slice(0, 8) + "..." + updated.apiKey.slice(-4) });
    } catch (error) {
      res.status(500).json({ error: "Failed to update AI provider" });
    }
  });

  app.post("/api/ai-providers/:id/set-default", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.setDefaultAiProvider(id);
      await storage.createLog({ action: "Default AI provider changed", source: "settings" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to set default provider" });
    }
  });

  app.delete("/api/ai-providers/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAiProvider(id);
      await storage.createLog({ action: "AI Provider removed", source: "settings" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete AI provider" });
    }
  });

  app.post("/api/ai-providers/test", requireAuth, async (req, res) => {
    try {
      const { provider, apiKey, baseUrl } = req.body;
      const OpenAI = (await import("openai")).default;
      const { getProviderBaseUrl } = await import("./ai-client");
      const finalUrl = baseUrl || getProviderBaseUrl(provider);
      const client = new OpenAI({ baseURL: finalUrl, apiKey });
      const { getProviderDefaultModel } = await import("./ai-client");
      const model = getProviderDefaultModel(provider);
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: "Say 'OK' in one word." }],
        max_tokens: 10,
      });
      const reply = response.choices[0]?.message?.content || "";
      res.json({ success: true, reply, model });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || "Connection failed" });
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
    res.json({ message: "ZENO OS API v1 - Use POST to chat" });
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

  app.get("/api/github/repos/:owner/:repo/tree", requireAuth, async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const path = (req.query.path as string) || "";
      const ref = (req.query.ref as string) || "main";
      const { getUncachableGitHubClient } = await import("./github-client");
      const octokit = await getUncachableGitHubClient();
      const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
      if (Array.isArray(data)) {
        const items = data.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size,
          sha: item.sha,
        })).sort((a, b) => {
          if (a.type === "dir" && b.type !== "dir") return -1;
          if (a.type !== "dir" && b.type === "dir") return 1;
          return a.name.localeCompare(b.name);
        });
        res.json(items);
      } else {
        res.json([{ name: data.name, path: data.path, type: data.type, size: data.size, sha: data.sha }]);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch tree" });
    }
  });

  app.get("/api/github/repos/:owner/:repo/file", requireAuth, async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const path = req.query.path as string;
      const ref = (req.query.ref as string) || "main";
      if (!path) return res.status(400).json({ error: "Path required" });
      const { getUncachableGitHubClient } = await import("./github-client");
      const octokit = await getUncachableGitHubClient();
      const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
      if (Array.isArray(data) || data.type !== "file") {
        return res.status(400).json({ error: "Not a file" });
      }
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      res.json({ name: data.name, path: data.path, content, sha: data.sha, size: data.size });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch file" });
    }
  });

  app.put("/api/github/repos/:owner/:repo/file", requireAuth, async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const { path, content, message, sha, branch } = req.body;
      if (!path || content === undefined) return res.status(400).json({ error: "Path and content required" });
      const { getUncachableGitHubClient } = await import("./github-client");
      const octokit = await getUncachableGitHubClient();
      const encoded = Buffer.from(content).toString("base64");
      const params: any = { owner, repo, path, message: message || `Update ${path}`, content: encoded };
      if (sha) params.sha = sha;
      if (branch) params.branch = branch;
      const { data } = await octokit.repos.createOrUpdateFileContents(params);
      await storage.createLog({ action: "GitHub file updated", details: `${owner}/${repo}/${path}`, source: "github" });
      res.json({ success: true, sha: data.content?.sha, commit: data.commit?.sha });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update file" });
    }
  });

  app.delete("/api/github/repos/:owner/:repo/file", requireAuth, async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const { path, sha, message, branch } = req.body;
      if (!path || !sha) return res.status(400).json({ error: "Path and sha required" });
      const { getUncachableGitHubClient } = await import("./github-client");
      const octokit = await getUncachableGitHubClient();
      await octokit.repos.deleteFile({
        owner, repo, path, sha,
        message: message || `Delete ${path}`,
        branch: branch || "main",
      });
      await storage.createLog({ action: "GitHub file deleted", details: `${owner}/${repo}/${path}`, source: "github" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete file" });
    }
  });

  app.get("/api/settings/smtp", requireAuth, async (_req, res) => {
    try {
      const host = await storage.getSetting("smtp_host");
      const port = await storage.getSetting("smtp_port");
      const user = await storage.getSetting("smtp_user");
      const pass = await storage.getSetting("smtp_pass");
      const from = await storage.getSetting("smtp_from");
      const notifyLogin = await storage.getSetting("smtp_notify_login");
      const notifyApi = await storage.getSetting("smtp_notify_api");
      res.json({
        host: host?.value || "",
        port: port?.value || "587",
        user: user?.value || "",
        pass: pass?.value || "",
        from: from?.value || "",
        notifyLogin: notifyLogin?.value === "true",
        notifyApi: notifyApi?.value === "true",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/settings/smtp", requireAuth, async (req, res) => {
    try {
      const { host, port, user, pass, from, notifyLogin, notifyApi } = req.body;
      await storage.upsertSetting("smtp_host", host || "");
      await storage.upsertSetting("smtp_port", port || "587");
      await storage.upsertSetting("smtp_user", user || "");
      await storage.upsertSetting("smtp_pass", pass || "");
      await storage.upsertSetting("smtp_from", from || "");
      await storage.upsertSetting("smtp_notify_login", notifyLogin ? "true" : "false");
      await storage.upsertSetting("smtp_notify_api", notifyApi ? "true" : "false");
      await storage.createLog({ action: "SMTP settings updated", details: `Host: ${host}`, source: "settings" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/gmail/profile", requireAuth, async (_req, res) => {
    try {
      const profile = await getGmailProfile();
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Gmail not connected" });
    }
  });

  app.post("/api/email/send", requireAuth, async (req, res) => {
    try {
      const { to, subject, body } = req.body;
      if (!to || !subject || !body) return res.status(400).json({ error: "to, subject, and body are required" });

      const profile = await getGmailProfile();
      const result = await sendGmailEmail(to, subject, body);

      await storage.createBusinessEmail({
        direction: "sent", fromAddr: profile.email, toAddr: to,
        subject, body, status: "sent", messageId: result.id, threadId: result.threadId,
      });
      await storage.createLog({ action: "Email sent via Gmail", details: `To: ${to}, Subject: ${subject}`, source: "email" });
      res.json({ success: true, message: "Email sent via Gmail", messageId: result.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to send email" });
    }
  });

  app.get("/api/business/stats", requireAuth, async (_req, res) => {
    try {
      const emailStats = await storage.getBusinessEmailStats();
      const contacts = await storage.getBusinessContacts(100);
      const metrics = await storage.getBusinessMetrics();
      const whatsappSent = metrics.find(m => m.metricType === "whatsapp" && m.metricKey === "sent");
      const whatsappReceived = metrics.find(m => m.metricType === "whatsapp" && m.metricKey === "received");
      const paymentTotal = metrics.find(m => m.metricType === "payment" && m.metricKey === "total");
      const paymentCount = metrics.find(m => m.metricType === "payment" && m.metricKey === "count");
      const automations = metrics.find(m => m.metricType === "n8n" && m.metricKey === "workflows");
      const automationRuns = metrics.find(m => m.metricType === "n8n" && m.metricKey === "runs");
      res.json({
        email: emailStats,
        whatsapp: {
          sent: Number(whatsappSent?.metricValue || 0),
          received: Number(whatsappReceived?.metricValue || 0),
          total: Number(whatsappSent?.metricValue || 0) + Number(whatsappReceived?.metricValue || 0),
        },
        payment: {
          total: Number(paymentTotal?.metricValue || 0),
          count: Number(paymentCount?.metricValue || 0),
        },
        automation: {
          workflows: Number(automations?.metricValue || 0),
          runs: Number(automationRuns?.metricValue || 0),
        },
        contacts: contacts.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/business/emails", requireAuth, async (_req, res) => {
    try {
      const emails = await storage.getBusinessEmails(100);
      res.json(emails);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/business/contacts", requireAuth, async (_req, res) => {
    try {
      const contacts = await storage.getBusinessContacts(100);
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/business/contacts", requireAuth, async (req, res) => {
    try {
      const { name, email, phone, source } = req.body;
      if (!name) return res.status(400).json({ error: "Name required" });
      const contact = await storage.createBusinessContact({ name, email, phone, source });
      res.json(contact);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/email/reply", requireAuth, async (req, res) => {
    try {
      const { to, subject, body, originalId } = req.body;
      if (!to || !subject || !body) return res.status(400).json({ error: "to, subject, and body required" });

      const profile = await getGmailProfile();
      const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
      const result = await sendGmailEmail(to, replySubject, body, originalId || undefined);

      await storage.createBusinessEmail({
        direction: "sent", fromAddr: profile.email, toAddr: to,
        subject: replySubject, body, status: "replied",
        messageId: result.id, threadId: result.threadId,
      });

      await storage.createLog({ action: "Email replied via Gmail", details: `To: ${to}`, source: "email" });
      res.json({ success: true, messageId: result.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to send reply" });
    }
  });

  app.post("/api/email/check-inbox", requireAuth, async (_req, res) => {
    try {
      const messages = await fetchGmailInbox(20);
      let saved = 0;

      for (const msg of messages) {
        try {
          await storage.createBusinessEmail({
            direction: "received",
            fromAddr: msg.from,
            toAddr: msg.to,
            subject: msg.subject || "(No subject)",
            body: msg.body || msg.snippet,
            status: "received",
            messageId: msg.id,
            threadId: msg.threadId,
          });
          saved++;
        } catch {}
      }

      await storage.createLog({ action: "Gmail inbox checked", details: `Fetched ${messages.length}, saved ${saved} new`, source: "email" });
      res.json({ success: true, fetched: messages.length, saved });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to check inbox" });
    }
  });

  app.get("/api/gmail/thread/:threadId", requireAuth, async (req, res) => {
    try {
      const thread = await fetchGmailThread(req.params.threadId);
      res.json(thread);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch thread" });
    }
  });

  // === AUTONOMOUS AGENT CONTROL ===
  app.get("/api/agent/status", requireAuth, async (_req, res) => {
    res.json({ running: isAgentRunning() });
  });

  app.post("/api/agent/start", requireAuth, async (_req, res) => {
    startAutonomousAgent(60000);
    await storage.createLog({ action: "[ZENO Agent] Manually started", details: "Autonomous agent activated", source: "autonomous" });
    res.json({ success: true, running: true });
  });

  app.post("/api/agent/stop", requireAuth, async (_req, res) => {
    stopAutonomousAgent();
    await storage.createLog({ action: "[ZENO Agent] Manually stopped", details: "Autonomous agent deactivated", source: "autonomous" });
    res.json({ success: true, running: false });
  });

  // === IMAP INBOX CHECK (manual) ===
  app.post("/api/email/check-inbox-imap", requireAuth, async (_req, res) => {
    try {
      if (!process.env.GMAIL_ADDRESS || !process.env.GMAIL_APP_PASSWORD) {
        return res.status(400).json({ error: "Gmail credentials not configured" });
      }

      const { ImapFlow } = await import("imapflow");
      const client = new ImapFlow({
        host: "imap.gmail.com",
        port: 993,
        secure: true,
        auth: { user: process.env.GMAIL_ADDRESS, pass: process.env.GMAIL_APP_PASSWORD },
        logger: false,
      });

      await client.connect();
      const lock = await client.getMailboxLock("INBOX");
      const newEmails: any[] = [];

      try {
        const since = new Date();
        since.setDate(since.getDate() - 7);
        const uids = await client.search({ since });

        if (uids && uids.length > 0) {
          const recentUids = uids.slice(-20);
          const msgs = client.fetch(recentUids, { envelope: true, uid: true });
          for await (const msg of msgs) {
            const env = msg.envelope;
            if (env) {
              newEmails.push({
                direction: "received",
                fromAddr: env.from?.[0]?.address || "",
                toAddr: env.to?.[0]?.address || process.env.GMAIL_ADDRESS,
                subject: env.subject || "(No subject)",
                body: "",
                status: "received",
                messageId: env.messageId || undefined,
              });
            }
          }
        }
      } finally {
        lock.release();
      }
      await client.logout();

      let saved = 0;
      for (const email of newEmails) {
        try {
          await storage.createBusinessEmail(email);
          saved++;
        } catch {}
      }

      await storage.createLog({ action: "IMAP inbox checked", details: `Fetched ${newEmails.length}, saved ${saved} new`, source: "email" });
      res.json({ success: true, fetched: newEmails.length, saved });
    } catch (error: any) {
      console.error("IMAP check error:", error);
      res.status(500).json({ error: error.message || "Failed to check inbox via IMAP" });
    }
  });

  app.post("/api/business/webhook/n8n", async (req, res) => {
    try {
      const { event, data } = req.body;
      await storage.upsertBusinessMetric("n8n", "runs",
        String(Number((await storage.getBusinessMetrics()).find(m => m.metricType === "n8n" && m.metricKey === "runs")?.metricValue || 0) + 1)
      );
      await storage.createLog({ action: "n8n webhook received", details: event || "automation", source: "n8n" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/integrations/status", requireAuth, async (_req, res) => {
    try {
      const n8nWebhookUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : ""}/api/business/webhook/n8n`;

      let gmailConnected = false;
      let gmailEmail = "";
      try {
        const profile = await getGmailProfile();
        gmailConnected = !!profile.email;
        gmailEmail = profile.email;
      } catch {}
      if (!gmailConnected && process.env.GMAIL_ADDRESS && process.env.GMAIL_APP_PASSWORD) {
        gmailConnected = true;
        gmailEmail = process.env.GMAIL_ADDRESS;
      }

      const twilioSetting = await storage.getSetting("twilio_connected");
      const twilioConnected = twilioSetting?.value === "true";

      const stripeSetting = await storage.getSetting("stripe_connected");
      const stripeConnected = stripeSetting?.value === "true";

      const n8nRuns = (await storage.getBusinessMetrics()).find(m => m.metricType === "n8n" && m.metricKey === "runs");
      const n8nTested = Number(n8nRuns?.metricValue || 0) > 0;

      res.json({
        email: { connected: gmailConnected, label: gmailConnected ? `Gmail: ${gmailEmail}` : "Not Connected", provider: "gmail" },
        whatsapp: { connected: twilioConnected, label: twilioConnected ? "Connected" : "Not Connected" },
        stripe: { connected: stripeConnected, label: stripeConnected ? "Connected" : "Not Connected" },
        n8n: { connected: n8nTested, webhookUrl: n8nWebhookUrl, label: n8nTested ? "Active" : "Not Tested" },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/integrations/connect", requireAuth, async (req, res) => {
    try {
      const { service, credentials } = req.body;
      if (!service) return res.status(400).json({ error: "Service name required" });

      if (service === "twilio") {
        if (!credentials?.sid || !credentials?.authToken || !credentials?.phoneNumber) {
          return res.status(400).json({ error: "Account SID, Auth Token, and Phone Number are required" });
        }
        await storage.upsertSetting("twilio_sid", credentials.sid);
        await storage.upsertSetting("twilio_auth_token", credentials.authToken);
        await storage.upsertSetting("twilio_phone", credentials.phoneNumber);
        await storage.upsertSetting("twilio_connected", "true");
        await storage.createLog({ action: "Twilio connected", details: "WhatsApp integration configured", source: "integration" });
        return res.json({ success: true, message: "Twilio credentials saved. WhatsApp integration is now active." });
      }

      if (service === "stripe") {
        if (!credentials?.secretKey) {
          return res.status(400).json({ error: "Secret Key is required" });
        }
        await storage.upsertSetting("stripe_secret_key", credentials.secretKey);
        if (credentials.webhookSecret) {
          await storage.upsertSetting("stripe_webhook_secret", credentials.webhookSecret);
        }
        await storage.upsertSetting("stripe_connected", "true");
        await storage.createLog({ action: "Stripe connected", details: "Payment integration configured", source: "integration" });
        return res.json({ success: true, message: "Stripe credentials saved. Payment tracking is now active." });
      }

      res.status(400).json({ error: `Unknown service: ${service}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/brain/analyze", requireAuth, async (req, res) => {
    try {
      const mode = req.query.mode as string;
      if (mode && mode !== "ai" && mode !== "rules") {
        return res.status(400).json({ error: "Invalid mode. Use 'ai' or 'rules'." });
      }
      if (mode === "ai") {
        const analysis = await analyzeBusinessWithAI();
        res.json(analysis);
      } else {
        const analysis = await analyzeBusinessWithRules();
        res.json(analysis);
      }
    } catch (error: any) {
      console.error("Brain analysis error:", error);
      res.status(500).json({ error: error.message || "Brain analysis failed" });
    }
  });

  app.post("/api/brain/ask", requireAuth, async (req, res) => {
    try {
      const { question } = req.body;
      if (!question || typeof question !== "string" || question.trim().length === 0) {
        return res.status(400).json({ error: "Question is required" });
      }
      if (question.length > 500) {
        return res.status(400).json({ error: "Question too long (max 500 characters)" });
      }
      const analysis = await analyzeBusinessWithAI(question.trim());
      res.json(analysis);
    } catch (error: any) {
      console.error("Brain ask error:", error);
      res.status(500).json({ error: error.message || "Brain question failed" });
    }
  });

  app.get("/api/brain/context", requireAuth, async (req, res) => {
    try {
      const context = await getBusinessContextForChat();
      res.json({ context });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  // === WORKSPACE ROUTES ===
  app.get("/api/workspaces", requireAuth, async (_req, res) => {
    try {
      const ws = await storage.getAllWorkspaces();
      res.json(ws);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/workspaces", requireAuth, async (req, res) => {
    try {
      const { name, type, icon, color } = req.body;
      if (!name) return res.status(400).json({ error: "Workspace name required" });
      const ws = await storage.createWorkspace({ name, type: type || "general", icon, color });
      await storage.createLog({ action: "[ZENO] Workspace Created", details: name, source: "workspace" });
      res.status(201).json(ws);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/workspaces/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateWorkspace(id, req.body);
      if (!updated) return res.status(404).json({ error: "Workspace not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/workspaces/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWorkspace(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // === LEADS ROUTES ===
  app.get("/api/leads", requireAuth, async (req, res) => {
    try {
      const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string) : undefined;
      const leads = await storage.getBusinessLeads(workspaceId);
      res.json(leads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/leads", requireAuth, async (req, res) => {
    try {
      const { name, email, phone, company, website, status, source, notes, workspaceId } = req.body;
      if (!name) return res.status(400).json({ error: "Lead name required" });
      const lead = await storage.createBusinessLead({
        name, email, phone, company, website, status: status || "new",
        source: source || "manual", notes, workspaceId,
      });
      res.status(201).json(lead);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/leads/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateBusinessLead(id, req.body);
      if (!updated) return res.status(404).json({ error: "Lead not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/leads/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBusinessLead(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // === LEAD SCRAPER ===
  app.post("/api/leads/scrape", requireAuth, async (req, res) => {
    try {
      const { query, workspaceId } = req.body;
      if (!query) return res.status(400).json({ error: "Search query required" });
      await storage.createLog({
        action: `[ZENO] Scouting for ${query}...`,
        details: `Starting lead search`,
        source: "scraper",
        workspaceId,
      });
      const saved = await scrapeAndSaveLeads(query, workspaceId);
      res.json({ success: true, leadsFound: saved, message: `Found and saved ${saved} leads` });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Scraping failed" });
    }
  });

  // === AI OUTREACH EMAIL GENERATION ===
  app.post("/api/leads/generate-outreach", requireAuth, async (req, res) => {
    try {
      const { leadIds } = req.body;
      if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({ error: "leadIds array required" });
      }

      const OpenAI = (await import("openai")).default;
      const openrouter = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
      });

      const results: any[] = [];

      for (const leadId of leadIds) {
        const leads = await storage.getBusinessLeads();
        const lead = leads.find((l: any) => l.id === leadId);
        if (!lead) {
          results.push({ leadId, error: "Lead not found" });
          continue;
        }

        const prompt = `You are a professional business development specialist for ZENO OS, an AI automation company. Write a personalized cold outreach email to the following lead:

Company/Name: ${lead.name}
Website: ${lead.website || "N/A"}
Description: ${lead.notes || "N/A"}

Our services: AI-powered business automation — intelligent lead generation, smart email campaigns, CRM automation, workflow optimization, and custom AI solutions.

Requirements:
- Subject line should be compelling and personalized to their business
- Email body should be 3-4 short paragraphs
- Reference something specific about their company from the description/name
- Highlight how our AI automation can help their specific business
- Professional but friendly tone
- Include a clear call-to-action (schedule a demo/call)
- Sign off as "ZENO OS Team"

Reply in this exact JSON format (no markdown, no code blocks):
{"subject": "your subject line here", "body": "your email body here with \\n for newlines"}`;

        const completion = await openrouter.chat.completions.create({
          model: "meta-llama/llama-3.3-70b-instruct",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1024,
        });

        const responseText = completion.choices[0]?.message?.content?.trim() || "";
        let subject = "";
        let body = "";

        try {
          const cleaned = responseText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          const parsed = JSON.parse(cleaned);
          subject = parsed.subject;
          body = parsed.body;
        } catch {
          subject = `AI Automation Solutions for ${lead.name}`;
          body = responseText;
        }

        const contactEmail = lead.email || `info@${(lead.website || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]}`;

        const queueItem = await storage.createEmailQueueItem({
          toAddr: contactEmail,
          subject,
          body,
          status: "draft",
          leadId: lead.id,
          scheduledAt: null,
          sentAt: null,
          error: null,
          workspaceId: lead.workspaceId,
        });

        await storage.updateBusinessLead(lead.id, { status: "contacted" });

        results.push({
          leadId: lead.id,
          leadName: lead.name,
          queueItemId: queueItem.id,
          subject,
          toAddr: contactEmail,
        });

        await storage.createLog({
          action: "[ZENO] Outreach Draft Generated",
          details: `AI draft for ${lead.name}: "${subject}"`,
          source: "ai",
          workspaceId: lead.workspaceId,
        });
      }

      res.json({ success: true, drafts: results, message: `Generated ${results.length} outreach drafts` });
    } catch (error: any) {
      console.error("Outreach generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate outreach emails" });
    }
  });

  // === EMAIL QUEUE ===
  app.get("/api/email-queue", requireAuth, async (req, res) => {
    try {
      const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string) : undefined;
      const status = req.query.status as string;
      const queue = await storage.getEmailQueue(workspaceId, status);
      res.json(queue);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/email-queue", requireAuth, async (req, res) => {
    try {
      const { toAddr, subject, body, workspaceId, leadId } = req.body;
      if (!toAddr || !subject || !body) return res.status(400).json({ error: "toAddr, subject, and body required" });
      const item = await storage.createEmailQueueItem({
        toAddr, subject, body, status: "pending",
        scheduledAt: new Date(),
        workspaceId, leadId,
      });
      res.status(201).json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/email-queue/bulk", requireAuth, async (req, res) => {
    try {
      const { leadIds, subject, bodyTemplate, workspaceId } = req.body;
      if (!leadIds?.length || !subject || !bodyTemplate) {
        return res.status(400).json({ error: "leadIds, subject, and bodyTemplate required" });
      }
      const queued = await queueEmailsForLeads(leadIds, subject, bodyTemplate, workspaceId);
      res.json({ success: true, queued, message: `${queued} emails queued with human-like delays` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // === INTELLIGENCE ROUTER ===
  app.post("/api/intelligence/route", requireAuth, async (req, res) => {
    try {
      const { message, preferredModel } = req.body;
      if (!message) return res.status(400).json({ error: "Message required" });
      const taskType = detectTaskType(message);
      const modelId = await selectModelForTask(taskType, preferredModel);
      res.json({ taskType, taskLabel: getTaskLabel(taskType), selectedModel: modelId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // === STRIPE WEBHOOK ===
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      const event = req.body;
      if (!event?.type) return res.status(400).json({ error: "Invalid event" });

      if (event.type === "checkout.session.completed") {
        const session = event.data?.object;
        const email = session?.customer_email || session?.customer_details?.email;
        const amount = (session?.amount_total || 0) / 100;

        if (email) {
          const leads = await storage.getBusinessLeads();
          const matchedLead = leads.find(l => l.email === email);
          if (matchedLead) {
            await storage.updateBusinessLead(matchedLead.id, { status: "client" });
          }
        }

        const currentTotal = (await storage.getBusinessMetrics()).find(
          m => m.metricType === "payment" && m.metricKey === "total"
        );
        const newTotal = Number(currentTotal?.metricValue || 0) + amount;
        await storage.upsertBusinessMetric("payment", "total", String(newTotal));

        const currentCount = (await storage.getBusinessMetrics()).find(
          m => m.metricType === "payment" && m.metricKey === "count"
        );
        const newCount = Number(currentCount?.metricValue || 0) + 1;
        await storage.upsertBusinessMetric("payment", "count", String(newCount));

        await storage.createLog({
          action: `[ZENO] Payment Received ($${amount})`,
          details: `From: ${email || "unknown"} | Session: ${session?.id}`,
          source: "stripe",
        });
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Stripe webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // === LIVE ACTIVITY FEED (SSE) ===
  app.get("/api/activity/stream", requireAuth, (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendLogs = async () => {
      try {
        const logs = await storage.getRecentLogs(10);
        res.write(`data: ${JSON.stringify(logs)}\n\n`);
      } catch {}
    };

    sendLogs();
    const interval = setInterval(sendLogs, 5000);

    req.on("close", () => {
      clearInterval(interval);
    });
  });

  // === VOICE COMMAND HANDLER ===
  app.post("/api/voice/command", requireAuth, async (req, res) => {
    try {
      const { command, workspaceId } = req.body;
      if (!command) return res.status(400).json({ error: "Command required" });

      const lower = command.toLowerCase();

      if (lower.includes("start scouting") || lower.includes("find leads") || lower.includes("search for")) {
        const query = command.replace(/start scouting|find leads|search for/gi, "").trim();
        if (!query) return res.json({ action: "scrape", status: "need_query", message: "What should I search for?" });
        const saved = await scrapeAndSaveLeads(query, workspaceId);
        return res.json({ action: "scrape", status: "complete", message: `Found ${saved} leads for "${query}"` });
      }

      if (lower.includes("check email") || lower.includes("check inbox")) {
        return res.json({ action: "check_inbox", status: "trigger", message: "Checking inbox..." });
      }

      if (lower.includes("send emails") || lower.includes("start outreach")) {
        return res.json({ action: "email_queue", status: "trigger", message: "Starting email outreach..." });
      }

      if (lower.includes("business health") || lower.includes("brain analysis")) {
        const analysis = await analyzeBusinessWithRules();
        return res.json({ action: "brain", status: "complete", data: analysis });
      }

      return res.json({ action: "unknown", status: "chat", message: `I'll process: "${command}"` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Start email queue worker
  startEmailQueueWorker();
  startAutonomousAgent(60000);

  return httpServer;
}

async function ensureDefaultUser() {
  const setting = await storage.getSetting("master_password");
  if (!setting) {
    await storage.upsertSetting("master_password", hashPassword("admin"));
  }
  await seedDefaultModels();
  await ensureDefaultWorkspace();
}

async function ensureDefaultWorkspace() {
  const existing = await storage.getAllWorkspaces();
  if (existing.length > 0) return;
  await storage.createWorkspace({ name: "General Business", type: "general", icon: "briefcase", color: "blue" });
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
