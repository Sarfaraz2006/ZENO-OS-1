import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { Copy, Check, Eye, Code2, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useCallback } from "react";

interface MarkdownRendererProps {
  content: string;
  onPreview?: (code: string, language: string) => void;
}

function ArtifactCard({
  language,
  code,
  onPreview,
}: {
  language: string | undefined;
  code: string;
  onPreview?: (code: string, language: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isHtml = language === "html" || language === "htm";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const lines = code.split("\n").length;
  const title = isHtml
    ? code.match(/<title>(.*?)<\/title>/i)?.[1] || "HTML Page"
    : `${(language || "code").toUpperCase()} snippet`;

  return (
    <div className="my-3 rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-muted/30 transition-colors"
        onClick={() => {
          if (isHtml && onPreview) {
            onPreview(code, language || "html");
          } else {
            setExpanded(!expanded);
          }
        }}
        data-testid="artifact-card"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isHtml ? "bg-blue-500/10 border border-blue-500/20" : "bg-violet-500/10 border border-violet-500/20"
        }`}>
          {isHtml ? (
            <Eye className={`w-4 h-4 ${isHtml ? "text-blue-500" : "text-violet-500"}`} />
          ) : (
            <Code2 className="w-4 h-4 text-violet-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-[11px] text-muted-foreground">
            {isHtml ? "Click to preview" : `${lines} lines · ${language || "code"}`}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] gap-1"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            data-testid="button-copy-artifact"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
          {isHtml && onPreview ? (
            <Button
              size="sm"
              variant="default"
              className="h-7 px-3 text-[11px] gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(code, language || "html");
              }}
              data-testid="button-preview-artifact"
            >
              <Eye className="w-3 h-3" />
              Preview
            </Button>
          ) : (
            <div className="w-5 h-5 flex items-center justify-center">
              {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
          )}
        </div>
      </div>

      {expanded && !isHtml && (
        <div className="border-t border-border/30">
          <SyntaxHighlighter
            style={oneDark}
            language={language || "text"}
            PreTag="div"
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize: "12px",
              padding: "12px 16px",
              maxHeight: "400px",
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}

export function MarkdownRenderer({ content, onPreview }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || "");
          const language = match ? match[1] : undefined;
          const codeString = String(children).replace(/\n$/, "");
          const isInline = !className && !codeString.includes("\n");

          if (isInline) {
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>
                {children}
              </code>
            );
          }

          return (
            <ArtifactCard
              language={language}
              code={codeString}
              onPreview={onPreview}
            />
          );
        },
        pre({ children }: any) {
          return <>{children}</>;
        },
        p({ children }: any) {
          return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
        },
        ul({ children }: any) {
          return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
        },
        ol({ children }: any) {
          return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
        },
        li({ children }: any) {
          return <li className="leading-relaxed">{children}</li>;
        },
        h1({ children }: any) {
          return <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>;
        },
        h2({ children }: any) {
          return <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>;
        },
        h3({ children }: any) {
          return <h3 className="text-base font-semibold mb-1.5 mt-2">{children}</h3>;
        },
        blockquote({ children }: any) {
          return (
            <blockquote className="border-l-2 border-primary/30 pl-3 my-2 text-muted-foreground italic">
              {children}
            </blockquote>
          );
        },
        table({ children }: any) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-sm border border-border/30 rounded">
                {children}
              </table>
            </div>
          );
        },
        th({ children }: any) {
          return <th className="px-3 py-1.5 text-left font-medium bg-muted/50 border-b border-border/30">{children}</th>;
        },
        td({ children }: any) {
          return <td className="px-3 py-1.5 border-b border-border/20">{children}</td>;
        },
        a({ href, children }: any) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
              {children}
            </a>
          );
        },
        hr() {
          return <hr className="my-3 border-border/30" />;
        },
        strong({ children }: any) {
          return <strong className="font-semibold">{children}</strong>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
