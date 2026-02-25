import { storage } from "./storage";

export type TaskType = "background" | "high_stakes" | "codegen" | "general" | "scraping" | "email_draft";

const TASK_KEYWORDS: Record<TaskType, string[]> = {
  background: ["scrape", "scout", "search", "find leads", "data clean", "summarize", "list"],
  high_stakes: ["negotiate", "proposal", "contract", "pricing", "close deal", "sales pitch", "persuade", "convince", "analyze deeply", "complex analysis", "detailed report", "strategic plan", "business plan", "legal", "financial analysis"],
  codegen: ["build", "create website", "generate code", "landing page", "html", "css", "javascript", "react", "portfolio", "full stack", "database schema", "api design", "complex app", "refactor"],
  scraping: ["scrape", "find businesses", "search for", "scout leads", "find contacts"],
  email_draft: ["write email", "draft email", "outreach", "follow up", "cold email"],
  general: [],
};

const COMPLEXITY_KEYWORDS = [
  "explain in detail", "step by step", "comprehensive", "in-depth",
  "compare and contrast", "pros and cons", "architecture",
  "debug", "fix this complex", "optimize", "performance",
  "multi-step", "workflow", "pipeline", "integration",
  "translate to multiple", "write a full", "complete implementation",
];

function isComplexTask(taskType: TaskType, message: string): boolean {
  if (taskType === "high_stakes" || taskType === "codegen") return true;
  const lower = message.toLowerCase();
  if (COMPLEXITY_KEYWORDS.some(kw => lower.includes(kw))) return true;
  if (lower.length > 500) return true;
  if ((lower.match(/\n/g) || []).length > 5) return true;
  return false;
}

export function detectTaskType(message: string): TaskType {
  const lower = message.toLowerCase();

  for (const [type, keywords] of Object.entries(TASK_KEYWORDS)) {
    if (type === "general") continue;
    if (keywords.some(kw => lower.includes(kw))) {
      return type as TaskType;
    }
  }

  if (lower.length > 500) return "high_stakes";

  return "general";
}

export async function selectModelForTask(taskType: TaskType, preferredModel?: string): Promise<{ modelId: string; tier: "free" | "paid"; reason: string }> {
  const models = await storage.getAllModels();
  const enabledModels = models.filter(m => m.isEnabled);

  if (preferredModel) {
    const pref = enabledModels.find(m => m.modelId === preferredModel);
    if (pref) {
      const isFree = pref.inputCost === "0" && pref.outputCost === "0";
      return { modelId: pref.modelId, tier: isFree ? "free" : "paid", reason: "User selected" };
    }
  }

  const freeModels = enabledModels.filter(m => m.inputCost === "0" && m.outputCost === "0");
  const paidModels = enabledModels.filter(m => m.inputCost !== "0" || m.outputCost !== "0");

  const needsPaid = isComplexTask(taskType, "");

  if (!needsPaid && freeModels.length > 0) {
    const bestFree = freeModels.find(m => m.isFavorite) || freeModels[0];
    return { modelId: bestFree.modelId, tier: "free", reason: `Simple task → free model` };
  }

  if (needsPaid) {
    if (paidModels.length > 0) {
      const reasoning = paidModels.find(m => m.category === "reasoning");
      if (reasoning) return { modelId: reasoning.modelId, tier: "paid", reason: `Complex task → paid reasoning model` };
      const favorite = paidModels.find(m => m.isFavorite);
      if (favorite) return { modelId: favorite.modelId, tier: "paid", reason: `Complex task → paid favorite model` };
      return { modelId: paidModels[0].modelId, tier: "paid", reason: `Complex task → paid model` };
    }
    if (freeModels.length > 0) {
      const bestFree = freeModels.find(m => m.isFavorite) || freeModels[0];
      return { modelId: bestFree.modelId, tier: "free", reason: `Complex task but no paid models → using best free` };
    }
  }

  if (enabledModels.length > 0) {
    const isFree = enabledModels[0].inputCost === "0" && enabledModels[0].outputCost === "0";
    return { modelId: enabledModels[0].modelId, tier: isFree ? "free" : "paid", reason: "Fallback to first enabled model" };
  }

  return { modelId: "meta-llama/llama-3.3-70b-instruct", tier: "free", reason: "Default fallback" };
}

export async function selectModelForMessage(message: string, preferredModel?: string): Promise<{ modelId: string; taskType: TaskType; tier: "free" | "paid"; reason: string }> {
  const taskType = detectTaskType(message);
  const complex = isComplexTask(taskType, message);

  const models = await storage.getAllModels();
  const enabledModels = models.filter(m => m.isEnabled);

  if (preferredModel) {
    const pref = enabledModels.find(m => m.modelId === preferredModel);
    if (pref) {
      const isFree = pref.inputCost === "0" && pref.outputCost === "0";
      return { modelId: pref.modelId, taskType, tier: isFree ? "free" : "paid", reason: "User selected" };
    }
  }

  const freeModels = enabledModels.filter(m => m.inputCost === "0" && m.outputCost === "0");
  const paidModels = enabledModels.filter(m => m.inputCost !== "0" || m.outputCost !== "0");

  if (!complex && freeModels.length > 0) {
    const bestFree = freeModels.find(m => m.isFavorite) || freeModels[0];
    return { modelId: bestFree.modelId, taskType, tier: "free", reason: `Simple ${getTaskLabel(taskType).toLowerCase()} → free model` };
  }

  if (complex) {
    if (paidModels.length > 0) {
      const reasoning = paidModels.find(m => m.category === "reasoning");
      if (reasoning) return { modelId: reasoning.modelId, taskType, tier: "paid", reason: `Complex ${getTaskLabel(taskType).toLowerCase()} → paid reasoning` };
      const favorite = paidModels.find(m => m.isFavorite);
      if (favorite) return { modelId: favorite.modelId, taskType, tier: "paid", reason: `Complex ${getTaskLabel(taskType).toLowerCase()} → paid model` };
      return { modelId: paidModels[0].modelId, taskType, tier: "paid", reason: `Complex task → paid model` };
    }
    if (freeModels.length > 0) {
      return { modelId: freeModels[0].modelId, taskType, tier: "free", reason: `Complex but no paid models → best free` };
    }
  }

  if (enabledModels.length > 0) {
    const isFree = enabledModels[0].inputCost === "0" && enabledModels[0].outputCost === "0";
    return { modelId: enabledModels[0].modelId, taskType, tier: isFree ? "free" : "paid", reason: "Fallback" };
  }

  return { modelId: "meta-llama/llama-3.3-70b-instruct", taskType, tier: "free", reason: "Default" };
}

export function getTaskLabel(taskType: TaskType): string {
  const labels: Record<TaskType, string> = {
    background: "Background Task",
    high_stakes: "High-Stakes",
    codegen: "Code Generation",
    scraping: "Lead Scouting",
    email_draft: "Email Draft",
    general: "General",
  };
  return labels[taskType] || "General";
}
