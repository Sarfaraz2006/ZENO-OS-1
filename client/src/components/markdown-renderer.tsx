import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { Copy, Check, Eye } from "lucide-react";
import { useState } from "react";

interface MarkdownRendererProps {
  content: string;
  onPreview?: (code: string, language: string) => void;
}

export function MarkdownRenderer({ content, onPreview }: MarkdownRendererProps) {
  const [copiedBlock, setCopiedBlock] = useState<number | null>(null);
  let blockIndex = 0;

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedBlock(idx);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  const isPreviewable = (lang: string | undefined) => {
    return lang === "html" || lang === "htm";
  };

  const extractFullHtml = (code: string, lang: string | undefined) => {
    if (lang === "html" || lang === "htm") return code;
    return code;
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        code({ node, className, children, ...props }) {
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

          const currentIdx = blockIndex++;

          return (
            <div className="relative group my-3 rounded-lg overflow-hidden border border-border/30">
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/30">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  {language || "code"}
                </span>
                <div className="flex items-center gap-1">
                  {isPreviewable(language) && onPreview && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] gap-1"
                      onClick={() => onPreview(extractFullHtml(codeString, language), language || "html")}
                      data-testid={`button-preview-code-${currentIdx}`}
                    >
                      <Eye className="w-3 h-3" />
                      Preview
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => copyCode(codeString, currentIdx)}
                    data-testid={`button-copy-code-${currentIdx}`}
                  >
                    {copiedBlock === currentIdx ? (
                      <><Check className="w-3 h-3" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </Button>
                </div>
              </div>
              <SyntaxHighlighter
                style={oneDark}
                language={language || "text"}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: 0,
                  fontSize: "13px",
                  padding: "12px 16px",
                }}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          );
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
        },
        ul({ children }) {
          return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>;
        },
        h1({ children }) {
          return <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-base font-semibold mb-1.5 mt-2">{children}</h3>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-primary/30 pl-3 my-2 text-muted-foreground italic">
              {children}
            </blockquote>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-sm border border-border/30 rounded">
                {children}
              </table>
            </div>
          );
        },
        th({ children }) {
          return <th className="px-3 py-1.5 text-left font-medium bg-muted/50 border-b border-border/30">{children}</th>;
        },
        td({ children }) {
          return <td className="px-3 py-1.5 border-b border-border/20">{children}</td>;
        },
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
              {children}
            </a>
          );
        },
        hr() {
          return <hr className="my-3 border-border/30" />;
        },
        strong({ children }) {
          return <strong className="font-semibold">{children}</strong>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
