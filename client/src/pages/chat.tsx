import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Plus,
  Trash2,
  Bot,
  User,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Cpu,
  Copy,
  Check,
} from "lucide-react";
import type { AiModel } from "@shared/schema";

interface Message {
  id: number;
  role: string;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  messages?: Message[];
}

export default function ChatPage() {
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("meta-llama/llama-3.3-70b-instruct");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: models = [] } = useQuery<AiModel[]>({
    queryKey: ["/api/models"],
  });

  const { data: activeChat } = useQuery<Conversation>({
    queryKey: ["/api/conversations", activeConversation],
    enabled: !!activeConversation,
  });

  const enabledModels = models.filter((m) => m.isEnabled);

  const createConversation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/conversations", { title: "New Chat" });
      return res.json();
    },
    onSuccess: (data: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setActiveConversation(data.id);
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setActiveConversation(null);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, streamingContent]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setInput(t);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const speakText = useCallback((text: string) => {
    if (!voiceEnabled) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    u.onend = () => {
      if (continuousMode) setTimeout(toggleListening, 500);
    };
    window.speechSynthesis.speak(u);
  }, [voiceEnabled, continuousMode, toggleListening]);

  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    let convId = activeConversation;
    if (!convId) {
      const res = await apiRequest("POST", "/api/conversations", {
        title: input.slice(0, 50),
      });
      const conv = await res.json();
      convId = conv.id;
      setActiveConversation(convId);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    }

    const message = input.trim();
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message, model: selectedModel }),
        credentials: "include",
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullResponse += data.content;
                  setStreamingContent(fullResponse);
                }
                if (data.done) speakText(fullResponse);
              } catch {}
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", convId] });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = (id: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const displayMessages = activeChat?.messages || [];
  const currentModel = enabledModels.find(m => m.modelId === selectedModel);

  return (
    <div className="flex h-full">
      {showSidebar && (
        <div className="w-60 border-r border-border/30 flex flex-col shrink-0">
          <div className="p-3 flex items-center gap-2">
            <Button
              data-testid="button-new-chat"
              onClick={() => createConversation.mutate()}
              className="flex-1 gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={() => setShowSidebar(false)} data-testid="button-hide-chat-sidebar">
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hide sidebar</TooltipContent>
            </Tooltip>
          </div>
          <ScrollArea className="flex-1">
            <div className="px-2 pb-2 space-y-0.5">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  data-testid={`conversation-item-${conv.id}`}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                    activeConversation === conv.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveConversation(conv.id)}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate flex-1 text-xs">{conv.title}</span>
                  <button
                    data-testid={`button-delete-conversation-${conv.id}`}
                    className="invisible group-hover:visible"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation.mutate(conv.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              ))}
              {conversations.length === 0 && (
                <div className="flex flex-col items-center py-12 px-4 text-center">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No conversations yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border/30 px-3 py-2 flex items-center justify-between gap-2 h-12 shrink-0">
          <div className="flex items-center gap-2">
            {!showSidebar && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={() => setShowSidebar(true)} data-testid="button-show-chat-sidebar">
                    <PanelLeftOpen className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Show sidebar</TooltipContent>
              </Tooltip>
            )}
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[220px] h-8 text-xs" data-testid="select-model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {enabledModels.map((model) => (
                  <SelectItem key={model.id} value={model.modelId} data-testid={`model-option-${model.id}`}>
                    <span className="flex items-center gap-2 text-xs">
                      <Cpu className="w-3 h-3 text-muted-foreground" />
                      {model.name}
                    </span>
                  </SelectItem>
                ))}
                {enabledModels.length === 0 && (
                  <SelectItem value="meta-llama/llama-3.3-70b-instruct">
                    Llama 3.3 70B (default)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {currentModel && (
              <Badge variant="outline" className="text-[10px] hidden md:flex">
                {currentModel.inputCost === "0" ? "Free" : `$${currentModel.inputCost}/M`}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant={continuousMode ? "default" : "ghost"}
                  onClick={() => setContinuousMode(!continuousMode)}
                  data-testid="button-continuous-mode"
                >
                  <Sparkles className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {continuousMode ? "Continuous mode ON" : "Enable continuous voice mode"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant={voiceEnabled ? "default" : "ghost"}
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  data-testid="button-toggle-voice"
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {voiceEnabled ? "Voice output ON" : "Enable voice output"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {displayMessages.length === 0 && !streamingContent ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-pulse" />
              </div>
              <div className="text-center max-w-md">
                <h2 className="text-xl font-semibold mb-2">How can I help you?</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  I can write code, analyze data, answer questions, and assist with any task.
                  Select a model above to get started.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {[
                  "Write a Python REST API",
                  "Explain quantum computing",
                  "Analyze this code",
                  "Debug my error",
                  "Create a business plan",
                  "Write a SQL query",
                ].map((suggestion) => (
                  <Badge
                    key={suggestion}
                    variant="outline"
                    className="cursor-pointer py-1.5 px-3 text-xs"
                    onClick={() => {
                      setInput(suggestion);
                      textareaRef.current?.focus();
                    }}
                    data-testid={`badge-suggestion-${suggestion.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-4 px-4 space-y-1">
              {displayMessages.map((msg) => (
                <div
                  key={msg.id}
                  data-testid={`message-${msg.id}`}
                  className={`flex gap-3 py-4 ${msg.role === "user" ? "" : ""}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === "user"
                      ? "bg-secondary"
                      : "bg-primary/10 border border-primary/20"
                  }`}>
                    {msg.role === "user" ? (
                      <User className="w-3.5 h-3.5" />
                    ) : (
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {msg.role === "user" ? "You" : "Jarvis"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words prose prose-sm dark:prose-invert max-w-none">
                      {msg.content}
                    </div>
                    {msg.role === "assistant" && (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-muted-foreground gap-1"
                          onClick={() => copyMessage(msg.id, msg.content)}
                          data-testid={`button-copy-message-${msg.id}`}
                        >
                          {copiedId === msg.id ? (
                            <><Check className="w-3 h-3" /> Copied</>
                          ) : (
                            <><Copy className="w-3 h-3" /> Copy</>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {streamingContent && (
                <div className="flex gap-3 py-4">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">Jarvis</span>
                      <Badge variant="outline" className="text-[10px] gap-1 h-4 px-1.5 animate-pulse">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Thinking
                      </Badge>
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {streamingContent}
                    </div>
                  </div>
                </div>
              )}

              {isStreaming && !streamingContent && (
                <div className="flex gap-3 py-4">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-primary animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Processing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-border/30 p-3 md:p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-card border border-border/50 rounded-xl p-1">
              <Textarea
                ref={textareaRef}
                data-testid="input-chat-message"
                placeholder={isListening ? "Listening..." : "Message Jarvis..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                className="resize-none border-0 focus-visible:ring-0 text-sm min-h-[44px] max-h-[160px] bg-transparent"
                rows={1}
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant={isListening ? "default" : "ghost"}
                        onClick={toggleListening}
                        data-testid="button-mic"
                        className={`w-8 h-8 ${isListening ? "animate-pulse" : ""}`}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isListening ? "Stop" : "Voice input"}</TooltipContent>
                  </Tooltip>
                </div>
                <Button
                  data-testid="button-send-message"
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isStreaming}
                  size="sm"
                  className="gap-1.5 h-8"
                >
                  {isStreaming ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Send
                </Button>
              </div>
            </div>
            {continuousMode && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[11px] text-muted-foreground">
                  Continuous conversation mode - auto-listens after response
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
