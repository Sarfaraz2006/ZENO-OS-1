import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
  Copy,
  Check,
  Download,
} from "lucide-react";

interface CodePreviewProps {
  code: string;
  language: string;
  onClose: () => void;
}

export function CodePreview({ code, language, onClose }: CodePreviewProps) {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const getViewportWidth = () => {
    switch (viewport) {
      case "mobile": return "375px";
      case "tablet": return "768px";
      case "desktop": return "100%";
    }
  };

  const getFullHtml = (code: string) => {
    if (code.includes("<!DOCTYPE") || code.includes("<html")) {
      return code;
    }
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
${code}
</body>
</html>`;
  };

  const htmlContent = getFullHtml(code);

  const openInNewTab = () => {
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const downloadFile = () => {
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "preview.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const containerClass = isFullscreen
    ? "fixed inset-0 z-50 bg-background flex flex-col"
    : "flex flex-col h-full";

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/30 bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] gap-1 h-5">
            <Monitor className="w-3 h-3" />
            Live Preview
          </Badge>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
            {language}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 border border-border/30 rounded-md p-0.5 mr-2">
            <Button
              size="icon"
              variant={viewport === "desktop" ? "secondary" : "ghost"}
              className="w-7 h-7"
              onClick={() => setViewport("desktop")}
              data-testid="button-viewport-desktop"
            >
              <Monitor className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant={viewport === "tablet" ? "secondary" : "ghost"}
              className="w-7 h-7"
              onClick={() => setViewport("tablet")}
              data-testid="button-viewport-tablet"
            >
              <Tablet className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant={viewport === "mobile" ? "secondary" : "ghost"}
              className="w-7 h-7"
              onClick={() => setViewport("mobile")}
              data-testid="button-viewport-mobile"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </Button>
          </div>

          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={copyCode} data-testid="button-copy-preview-code">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={downloadFile} data-testid="button-download-preview">
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={openInNewTab} data-testid="button-open-preview-tab">
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="w-7 h-7"
            onClick={() => setIsFullscreen(!isFullscreen)}
            data-testid="button-toggle-fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={onClose} data-testid="button-close-preview">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-[#f5f5f5] dark:bg-[#1a1a1a] flex items-start justify-center overflow-auto p-4">
        <div
          className="bg-white shadow-lg transition-all duration-300 h-full"
          style={{
            width: getViewportWidth(),
            maxWidth: "100%",
            minHeight: viewport === "desktop" ? "100%" : "600px",
          }}
        >
          <iframe
            srcDoc={htmlContent}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title="Code Preview"
            data-testid="iframe-code-preview"
            style={{ minHeight: viewport === "desktop" ? "100%" : "600px" }}
          />
        </div>
      </div>
    </div>
  );
}
