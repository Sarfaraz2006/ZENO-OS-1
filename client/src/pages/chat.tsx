import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      if (activeConversation) setActiveConversation(null);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, streamingContent]);

  const initSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("");
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (continuousMode && input.trim()) {
        handleSendMessage();
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    return recognition;
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = initSpeechRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    if (!voiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (continuousMode) {
        setTimeout(() => toggleListening(), 500);
      }
    };
    window.speechSynthesis.speak(utterance);
  };

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
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullResponse += data.content;
                  setStreamingContent(fullResponse);
                }
                if (data.done) {
                  if (voiceEnabled) speakText(fullResponse);
                }
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

  const displayMessages = activeChat?.messages || [];

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border/50 flex flex-col bg-card/30">
        <div className="p-3 border-b border-border/50">
          <Button
            data-testid="button-new-chat"
            onClick={() => createConversation.mutate()}
            className="w-full gap-2"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                data-testid={`conversation-item-${conv.id}`}
                className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                  activeConversation === conv.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => setActiveConversation(conv.id)}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1">{conv.title}</span>
                <button
                  data-testid={`button-delete-conversation-${conv.id}`}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
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
              <p className="text-xs text-muted-foreground text-center py-8 px-2">
                No conversations yet. Start a new chat.
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="border-b border-border/50 px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[280px]" data-testid="select-model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {enabledModels.map((model) => (
                  <SelectItem key={model.id} value={model.modelId} data-testid={`model-option-${model.id}`}>
                    <span className="flex items-center gap-2">
                      <Bot className="w-3 h-3" />
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
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant={continuousMode ? "default" : "ghost"}
              onClick={() => setContinuousMode(!continuousMode)}
              data-testid="button-continuous-mode"
              title="Continuous conversation mode"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant={voiceEnabled ? "default" : "ghost"}
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              data-testid="button-toggle-voice"
              title="Toggle voice output"
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          {displayMessages.length === 0 && !streamingContent && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold">How can I help you?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Ask me anything. I can code, analyze, and assist with any task.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {["Write Python code", "Analyze data", "Explain a concept", "Debug an error"].map(
                  (suggestion) => (
                    <Badge
                      key={suggestion}
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                      data-testid={`badge-suggestion-${suggestion.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      {suggestion}
                    </Badge>
                  )
                )}
              </div>
            </div>
          )}

          <div className="space-y-4 max-w-3xl mx-auto">
            {displayMessages.map((msg) => (
              <div
                key={msg.id}
                data-testid={`message-${msg.id}`}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border/50"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {streamingContent && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div className="max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed bg-card border border-border/50">
                  <div className="whitespace-pre-wrap break-words">{streamingContent}</div>
                </div>
              </div>
            )}

            {isStreaming && !streamingContent && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div className="bg-card border border-border/50 rounded-lg px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-border/50 p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Button
              size="icon"
              variant={isListening ? "default" : "ghost"}
              onClick={toggleListening}
              data-testid="button-mic"
              title={isListening ? "Stop listening" : "Start listening"}
              className={isListening ? "animate-pulse" : ""}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Input
              ref={inputRef}
              data-testid="input-chat-message"
              placeholder={isListening ? "Listening..." : "Type your message..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              className="flex-1"
            />
            <Button
              data-testid="button-send-message"
              onClick={handleSendMessage}
              disabled={!input.trim() || isStreaming}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {continuousMode && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Continuous conversation mode active - Voice will auto-listen after response
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
