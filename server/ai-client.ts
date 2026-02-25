import OpenAI from "openai";
import { storage } from "./storage";
import type { AiProvider } from "@shared/schema";

const PROVIDER_CONFIGS: Record<string, { baseUrl: string; defaultModel: string }> = {
  openrouter: {
    baseUrl: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-20250514",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
  },
  custom: {
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3",
  },
};

function getDefaultOpenRouterClient(): OpenAI {
  return new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
  });
}

function createClientFromProvider(provider: AiProvider): OpenAI {
  const config = PROVIDER_CONFIGS[provider.provider];
  const baseURL = provider.baseUrl || config?.baseUrl || "https://openrouter.ai/api/v1";

  return new OpenAI({
    baseURL,
    apiKey: provider.apiKey,
  });
}

export interface ActiveAIClient {
  client: OpenAI;
  providerName: string;
  providerType: string;
  defaultModel: string;
}

export async function getActiveAIClient(): Promise<ActiveAIClient> {
  try {
    const activeProvider = await storage.getActiveAiProvider();
    if (activeProvider) {
      const config = PROVIDER_CONFIGS[activeProvider.provider] || PROVIDER_CONFIGS.custom;
      return {
        client: createClientFromProvider(activeProvider),
        providerName: activeProvider.name,
        providerType: activeProvider.provider,
        defaultModel: config.defaultModel,
      };
    }
  } catch (e) {
    console.error("[AI Client] Error getting active provider, falling back to OpenRouter:", e);
  }

  return {
    client: getDefaultOpenRouterClient(),
    providerName: "OpenRouter (Replit)",
    providerType: "openrouter",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
  };
}

export function getProviderDefaultModel(providerType: string): string {
  return PROVIDER_CONFIGS[providerType]?.defaultModel || "meta-llama/llama-3.3-70b-instruct";
}

export function getProviderBaseUrl(providerType: string): string {
  return PROVIDER_CONFIGS[providerType]?.baseUrl || "";
}
