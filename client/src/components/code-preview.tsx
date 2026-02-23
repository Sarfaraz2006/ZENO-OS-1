import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  X,
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
  Copy,
  Check,
  Download,
  RotateCcw,
  Code2,
  Eye,
} from "lucide-react";

interface CodePreviewProps {
  code: string;
  language: string;
  onClose: () => void;
}

function decodeEntities(text: string): string {
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

export function CodePreview({ code, language, onClose }: CodePreviewProps) {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [key, setKey] = useState(0);

  const decoded = decodeEntities(code);

  const fullHtml = decoded.includes("<!DOCTYPE") || decoded.includes("<html")
    ? decoded
    : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }</style>
</head>
<body>${decoded}</body>
</html>`;

  const pageTitle = decoded.match(/<title>(.*?)<\/title>/i)?.[1] || "Live Preview";

  const viewportWidth = viewport === "mobile" ? "375px" : viewport === "tablet" ? "768px" : "100%";

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(decoded);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [decoded]);

  const downloadFile = () => {
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "preview.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const openInNewTab = () => {
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border/30">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-0 border border-border/40 rounded-lg overflow-hidden">
            <button
              className={`px-3 py-1.5 text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                tab === "preview" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
              }`}
              onClick={() => setTab("preview")}
              data-testid="tab-preview"
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
            <button
              className={`px-3 py-1.5 text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                tab === "code" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
              }`}
              onClick={() => setTab("code")}
              data-testid="tab-code"
            >
              <Code2 className="w-3 h-3" />
              Code
            </button>
          </div>
          <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">{pageTitle}</span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {tab === "preview" && (
            <div className="flex items-center gap-0.5 border border-border/30 rounded-md p-0.5 mr-1">
              {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([vp, Icon]) => (
                <Button
                  key={vp}
                  size="icon"
                  variant={viewport === vp ? "secondary" : "ghost"}
                  className="w-6 h-6"
                  onClick={() => setViewport(vp)}
                  data-testid={`button-viewport-${vp}`}
                >
                  <Icon className="w-3 h-3" />
                </Button>
              ))}
            </div>
          )}
          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setKey(k => k + 1)} data-testid="button-refresh-preview">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={copyCode} data-testid="button-copy-preview">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={downloadFile} data-testid="button-download-preview">
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={openInNewTab} data-testid="button-open-newtab">
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={onClose} data-testid="button-close-preview">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "preview" ? (
          <div className="w-full h-full bg-white flex items-start justify-center overflow-auto">
            <div
              className="h-full transition-all duration-200"
              style={{ width: viewportWidth, maxWidth: "100%" }}
            >
              <iframe
                key={key}
                srcDoc={fullHtml}
                className="w-full h-full border-0"
                title="Code Preview"
                data-testid="iframe-code-preview"
                sandbox="allow-scripts"
              />
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <SyntaxHighlighter
              style={oneDark}
              language="html"
              PreTag="div"
              showLineNumbers
              customStyle={{
                margin: 0,
                borderRadius: 0,
                fontSize: "12px",
                padding: "16px",
                minHeight: "100%",
              }}
            >
              {decoded}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
    </div>
  );
}
