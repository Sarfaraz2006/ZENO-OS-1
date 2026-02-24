import { storage } from "./storage";

export type TaskType = "background" | "high_stakes" | "codegen" | "general" | "scraping" | "email_draft";

const TASK_KEYWORDS: Record<TaskType, string[]> = {
  background: ["scrape", "scout", "search", "find leads", "data clean", "summarize", "list"],
  high_stakes: ["negotiate", "proposal", "contract", "pricing", "close deal", "sales pitch", "persuade", "convince"],
  codegen: ["build", "create website", "generate code", "landing page", "html", "css", "javascript", "react", "portfolio"],
  scraping: ["scrape", "find businesses", "search for", "scout leads", "find contacts"],
  email_draft: ["write email", "draft email", "outreach", "follow up", "cold email"],
  general: [],
};

const ROLE_PREFERENCES: Record<TaskType, string[]> = {
  background: ["fast", "general"],
  high_stakes: ["reasoning", "general"],
  codegen: ["reasoning", "general"],
  scraping: ["fast", "general"],
  email_draft: ["general", "fast"],
  general: ["general", "fast"],
};

const FAST_MODEL_IDS = [
  "google/gemini-3-flash-preview",
  "deepseek/deepseek-chat",
  "meta-llama/llama-3.3-70b-instruct",
];

const POWERFUL_MODEL_IDS = [
  "anthropic/claude-sonnet-4.6",
  "meta-llama/llama-3.3-70b-instruct",
];

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

export async function selectModelForTask(taskType: TaskType, preferredModel?: string): Promise<string> {
  const models = await storage.getAllModels();
  const enabledModels = models.filter(m => m.isEnabled);

  if (preferredModel) {
    const pref = enabledModels.find(m => m.modelId === preferredModel);
    if (pref) return pref.modelId;
  }

  const preferredCategories = ROLE_PREFERENCES[taskType] || ["general"];

  if (taskType === "background" || taskType === "scraping" || taskType === "email_draft") {
    for (const fastId of FAST_MODEL_IDS) {
      const found = enabledModels.find(m => m.modelId === fastId);
      if (found) return found.modelId;
    }
  }

  if (taskType === "high_stakes" || taskType === "codegen") {
    for (const powId of POWERFUL_MODEL_IDS) {
      const found = enabledModels.find(m => m.modelId === powId);
      if (found) return found.modelId;
    }
  }

  for (const cat of preferredCategories) {
    const found = enabledModels.find(m => m.category === cat);
    if (found) return found.modelId;
  }

  if (enabledModels.length > 0) return enabledModels[0].modelId;

  return "meta-llama/llama-3.3-70b-instruct";
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
