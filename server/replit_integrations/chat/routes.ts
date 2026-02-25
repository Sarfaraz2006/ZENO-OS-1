import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";
import { getActiveAIClient } from "../../ai-client";
import { selectModelForMessage } from "../../model-router";

export function registerChatRoutes(app: Express): void {
  // Get all conversations
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response (streaming)
  // Note: The model should be configured based on your requirements. 
  // Use the OpenRouter API to find available models.
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content, model, systemPrompt } = req.body;
      const userExplicitModel = model && model !== "auto";

      await chatStorage.createMessage(conversationId, "user", content);

      const messages = await chatStorage.getMessagesByConversation(conversationId);
      const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

      if (systemPrompt) {
        chatMessages.push({ role: "system", content: systemPrompt });
      }

      chatMessages.push(...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })));

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let finalModel: string;
      let routingInfo: { tier?: string; reason?: string; taskType?: string } = {};

      if (userExplicitModel) {
        finalModel = model;
        routingInfo = { reason: "User selected" };
      } else {
        const routed = await selectModelForMessage(content);
        finalModel = routed.modelId;
        routingInfo = { tier: routed.tier, reason: routed.reason, taskType: routed.taskType };
      }

      const { client: aiClient, providerName, providerType, defaultModel } = await getActiveAIClient();
      if (providerType !== "openrouter" && !userExplicitModel) {
        finalModel = defaultModel;
      }

      res.write(`data: ${JSON.stringify({ provider: providerName, model: finalModel, routing: routingInfo })}\n\n`);

      const stream = await aiClient.chat.completions.create({
        model: finalModel,
        messages: chatMessages,
        stream: true,
        max_tokens: 16384,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Save assistant message
      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Error sending message:", error);
      let errorMessage = "Failed to send message";
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: errorMessage });
      }
    }
  });
}

