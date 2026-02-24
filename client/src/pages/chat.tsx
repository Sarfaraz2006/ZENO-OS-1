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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Download,
  Settings2,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { CodePreview } from "@/components/code-preview";
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

const DEFAULT_SYSTEM_PROMPT = `You are ZENO, an elite AI business operating system. You build stunning, production-grade websites and handle business automation.

CRITICAL RULES FOR CODE GENERATION:
When asked to build/create/design ANY website, page, component, or UI:
1. Generate a COMPLETE, single HTML file with ALL CSS and JS inline
2. Wrap it in exactly one \`\`\`html code block
3. Keep explanation text to 1-2 sentences max — the code IS the answer
4. NEVER use placeholder "Lorem ipsum" text — write real, contextual content

DESIGN STANDARDS (follow EVERY time):
- Use Google Fonts via CDN (Inter, Poppins, or similar modern fonts)
- Color palette: Use harmonious gradients and accent colors, never plain black/white
- Layout: CSS Grid or Flexbox, fully responsive with mobile breakpoints
- Spacing: Generous padding (60-100px sections), proper whitespace rhythm
- Typography: Clear hierarchy (48-72px hero, 24-36px headings, 16-18px body)
- Effects: Subtle CSS animations, smooth hover transitions, box-shadows
- Images: Use picsum.photos or unsplash source URLs for realistic placeholder images
- Icons: Use inline SVG icons or emoji for visual elements
- Hero section: Full-width with gradient/image background, bold heading, CTA button
- Navigation: Fixed/sticky header with smooth scroll navigation
- Footer: Complete footer with links, social icons, copyright
- Make it look like a REAL professional website, not a student project

QUALITY CHECK: Before outputting, verify your code has:
✓ Google Fonts loaded ✓ Gradient backgrounds ✓ Hover effects ✓ Responsive design
✓ Real content (not lorem ipsum) ✓ Professional spacing ✓ Smooth animations

For non-HTML code requests, use proper markdown code blocks with language tags.
For explanations, use clean markdown formatting.`;

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
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [previewCode, setPreviewCode] = useState<{ code: string; language: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef("");
  const pendingVoiceSendRef = useRef(false);

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

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    if (!isListening && pendingVoiceSendRef.current && inputRef.current.trim()) {
      pendingVoiceSendRef.current = false;
      const voiceText = inputRef.current.trim();
      setTimeout(() => {
        handleSendMessage(voiceText);
      }, 300);
    }
  }, [isListening]);

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

    let finalTranscript = "";

    recognition.onresult = (e: any) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      const fullText = finalTranscript + interim;
      setInput(fullText);
      inputRef.current = fullText;
    };

    recognition.onend = () => {
      setIsListening(false);
      if (inputRef.current.trim()) {
        pendingVoiceSendRef.current = true;
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const speakText = useCallback((text: string) => {
    if (!voiceEnabled) return;
    window.speechSynthesis.cancel();
    const plainText = text.replace(/```[\s\S]*?```/g, "Code block.").replace(/[#*`_~]/g, "");
    const u = new SpeechSynthesisUtterance(plainText.slice(0, 500));
    u.rate = 1;
    u.pitch = 1;
    u.onend = () => {
      if (continuousMode) setTimeout(toggleListening, 500);
    };
    window.speechSynthesis.speak(u);
  }, [voiceEnabled, continuousMode, toggleListening]);

  const handleSendMessage = async (overrideMessage?: string) => {
    const msgText = overrideMessage || inputRef.current;
    if (!msgText.trim() || isStreaming) return;

    let convId = activeConversation;
    if (!convId) {
      const res = await apiRequest("POST", "/api/conversations", {
        title: msgText.slice(0, 50),
      });
      const conv = await res.json();
      convId = conv.id;
      setActiveConversation(convId);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    }

    const message = msgText.trim();
    setInput("");
    inputRef.current = "";
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: message,
          model: selectedModel,
          systemPrompt,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Failed to send message" }));
        throw new Error(err.error || "Failed to send message");
      }

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
                if (data.error) {
                  throw new Error(data.error);
                }
                if (data.content) {
                  fullResponse += data.content;
                  setStreamingContent(fullResponse);
                }
                if (data.done) {
                  speakText(fullResponse);
                  const htmlMatch = fullResponse.match(/```html\n([\s\S]*?)```/);
                  if (htmlMatch) {
                    setPreviewCode({ code: htmlMatch[1], language: "html" });
                  }
                }
              } catch (parseErr: any) {
                if (parseErr?.message && parseErr.message !== "Unexpected end of JSON input") {
                  throw parseErr;
                }
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      const errorMsg = `⚠️ Error: ${error.message || "Failed to get response. Please try a different model."}`;
      setStreamingContent(errorMsg);
      setIsStreaming(false);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", convId] });
      setTimeout(() => setStreamingContent(""), 6000);
      return;
    }
    setIsStreaming(false);
    setStreamingContent("");
    queryClient.invalidateQueries({ queryKey: ["/api/conversations", convId] });
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

  const exportConversation = () => {
    if (!activeChat?.messages) return;
    const text = activeChat.messages.map((m) =>
      `## ${m.role === "user" ? "You" : "Zeno"}\n${m.content}\n`
    ).join("\n---\n\n");
    const blob = new Blob([`# ${activeChat.title}\n\n${text}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeChat.title.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreview = (code: string, language: string) => {
    setPreviewCode({ code, language });
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
              onClick={() => {
                createConversation.mutate();
                setPreviewCode(null);
              }}
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
                  onClick={() => {
                    setActiveConversation(conv.id);
                    setPreviewCode(null);
                  }}
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

      <div className={`flex-1 flex min-w-0 ${previewCode ? "" : ""}`}>
        <div className={`flex flex-col min-w-0 ${previewCode ? "w-[45%] shrink-0" : "flex-1"}`}>
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
                <SelectTrigger className="w-[180px] h-8 text-xs" data-testid="select-model">
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
              <Dialog open={showSystemPrompt} onOpenChange={setShowSystemPrompt}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid="button-system-prompt">
                        <Settings2 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>System prompt</TooltipContent>
                </Tooltip>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-primary" />
                      System Prompt
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    <p className="text-xs text-muted-foreground">
                      Customize how the AI behaves. This prompt is sent with every message.
                    </p>
                    <Textarea
                      data-testid="textarea-system-prompt"
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      rows={10}
                      className="text-xs font-mono"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                        data-testid="button-reset-system-prompt"
                      >
                        Reset to Default
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs"
                        onClick={() => setShowSystemPrompt(false)}
                        data-testid="button-save-system-prompt"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {activeChat && activeChat.messages && activeChat.messages.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={exportConversation} data-testid="button-export-chat">
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export conversation</TooltipContent>
                </Tooltip>
              )}

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
                  <h2 className="text-xl font-semibold mb-2" data-testid="text-chat-welcome">What shall I build for you?</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ask me to create any website, UI or code. ZENO will generate it and show you a live preview.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {[
                    "Build a cafe landing page",
                    "Create a portfolio website",
                    "Design a pricing table",
                    "Build a login form",
                  ].map((suggestion) => (
                    <Badge
                      key={suggestion}
                      variant="outline"
                      className="cursor-pointer py-1.5 px-3 text-xs hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current = suggestion;
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
                    className="flex gap-3 py-4"
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
                          {msg.role === "user" ? "You" : "Zeno"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="text-sm leading-relaxed">
                        {msg.role === "assistant" ? (
                          <MarkdownRenderer content={msg.content} onPreview={handlePreview} />
                        ) : (
                          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                        )}
                      </div>
                      {msg.role === "assistant" && (
                        <div className="mt-2 flex items-center gap-1">
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
                        <span className="text-xs font-medium">Zeno</span>
                        <Badge variant="outline" className="text-[10px] gap-1 h-4 px-1.5 animate-pulse">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          Generating
                        </Badge>
                      </div>
                      <div className="text-sm leading-relaxed">
                        <MarkdownRenderer content={streamingContent} onPreview={handlePreview} />
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
                      <span className="text-sm text-muted-foreground">Thinking...</span>
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
                  placeholder={isListening ? "Listening..." : "Ask me to build something..."}
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
                    onClick={() => handleSendMessage()}
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

        {previewCode && (
          <div className="flex-1 min-w-0">
            <CodePreview
              code={previewCode.code}
              language={previewCode.language}
              onClose={() => setPreviewCode(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
