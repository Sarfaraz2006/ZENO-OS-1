import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Terminal as TerminalIcon,
  Trash2,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TerminalEntry {
  id: number;
  type: "input" | "output" | "error" | "system";
  content: string;
  timestamp: Date;
}

export default function TerminalPage() {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<TerminalEntry[]>([
    {
      id: 0,
      type: "system",
      content: "J.A.R.V.I.S Terminal v1.0 — Type a command or ask AI to execute tasks.\nType 'help' for available commands. Type 'clear' to clear screen.",
      timestamp: new Date(),
    },
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  let entryId = useRef(1);

  const executeCommand = useMutation({
    mutationFn: async (command: string) => {
      const res = await apiRequest("POST", "/api/terminal/execute", { command });
      return res.json();
    },
    onSuccess: (data: { output: string; error?: string }) => {
      if (data.error) {
        addEntry("error", data.error);
      } else {
        addEntry("output", data.output || "(no output)");
      }
    },
    onError: (error: Error) => {
      addEntry("error", `Error: ${error.message}`);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addEntry = (type: TerminalEntry["type"], content: string) => {
    setHistory((prev) => [
      ...prev,
      { id: entryId.current++, type, content, timestamp: new Date() },
    ]);
  };

  const handleBuiltinCommand = (cmd: string): boolean => {
    const trimmed = cmd.trim().toLowerCase();

    if (trimmed === "clear") {
      setHistory([]);
      return true;
    }

    if (trimmed === "help") {
      addEntry("system",
        `Available commands:
  help        - Show this help message
  clear       - Clear terminal screen
  time        - Show current date and time
  whoami      - Show current user info
  status      - Show system status
  models      - List configured AI models
  version     - Show platform version

Any other input will be processed by the AI assistant or executed as a system command.`
      );
      return true;
    }

    if (trimmed === "time" || trimmed === "date") {
      addEntry("output", new Date().toLocaleString());
      return true;
    }

    if (trimmed === "whoami") {
      addEntry("output", "admin@jarvis-platform");
      return true;
    }

    if (trimmed === "version") {
      addEntry("output", "J.A.R.V.I.S Platform v1.0.0\nRuntime: Node.js + React\nAI: OpenRouter Multi-Model");
      return true;
    }

    if (trimmed === "status") {
      addEntry("output",
        `System Status: ONLINE
AI Engine: Connected (OpenRouter)
Database: PostgreSQL Active
Auth: Session Active
Uptime: ${Math.floor(performance.now() / 1000)}s`
      );
      return true;
    }

    return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim();
    addEntry("input", cmd);
    setCommandHistory((prev) => [cmd, ...prev]);
    setHistoryIndex(-1);
    setInput("");

    if (!handleBuiltinCommand(cmd)) {
      executeCommand.mutate(cmd);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  const copyAll = () => {
    const text = history.map((e) => {
      if (e.type === "input") return `$ ${e.content}`;
      return e.content;
    }).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getEntryColor = (type: TerminalEntry["type"]) => {
    switch (type) {
      case "input": return "text-emerald-400";
      case "output": return "text-foreground/90";
      case "error": return "text-red-400";
      case "system": return "text-sky-400";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border/30 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-primary" />
          <h1 className="font-semibold text-sm" data-testid="text-terminal-title">Terminal</h1>
          <Badge variant="outline" className="text-[10px] gap-1 h-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Active
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={copyAll} data-testid="button-copy-terminal">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setHistory([])} data-testid="button-clear-terminal">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto bg-[#0d1117] p-4 font-mono text-sm cursor-text"
        onClick={() => inputRef.current?.focus()}
        data-testid="terminal-output"
      >
        {history.map((entry) => (
          <div key={entry.id} className="mb-1.5">
            {entry.type === "input" ? (
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 shrink-0 select-none">$</span>
                <span className={getEntryColor(entry.type)}>{entry.content}</span>
              </div>
            ) : (
              <pre className={`whitespace-pre-wrap break-words ${getEntryColor(entry.type)} leading-relaxed`}>
                {entry.content}
              </pre>
            )}
          </div>
        ))}

        {executeCommand.isPending && (
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-xs">Processing...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border/30 bg-[#0d1117]">
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="text-emerald-400 font-mono text-sm shrink-0 select-none">$</span>
          <input
            ref={inputRef}
            data-testid="input-terminal-command"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={executeCommand.isPending}
            placeholder="Enter command..."
            className="flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </form>
    </div>
  );
}
