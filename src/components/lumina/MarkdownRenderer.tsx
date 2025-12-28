import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  streaming?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className, streaming }) => {
  const navigate = useNavigate();
  
  // Memoize the markdown content to prevent unnecessary re-renders during streaming
  const displayContent = useMemo(() => {
    return streaming ? content : content;
  }, [content, streaming]);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string | undefined) => {
    if (!href) return;
    
    // Check if it's an internal link (starts with /)
    if (href.startsWith('/')) {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <div className={cn("text-sm leading-relaxed", className)}>
      <ReactMarkdown
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-lg font-semibold text-foreground mt-4 mb-2 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-foreground mt-4 mb-2 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-foreground mt-3 mb-1.5 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-medium text-foreground mt-3 mb-1 first:mt-0">
              {children}
            </h4>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className="text-foreground leading-relaxed mb-3 last:mb-0">
              {children}
            </p>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="space-y-1.5 mb-3 last:mb-0 ml-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1.5 mb-3 last:mb-0 ml-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground flex items-start gap-2.5">
              <span className="text-primary mt-1 text-[10px] shrink-0">●</span>
              <span className="flex-1">{children}</span>
            </li>
          ),
          // Strong/Bold - properly rendered
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          // Emphasis/Italic - properly rendered
          em: ({ children }) => (
            <em className="italic text-foreground/90">{children}</em>
          ),
          // Code blocks
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 bg-muted/70 rounded-md text-[13px] font-mono text-primary">
                  {children}
                </code>
              );
            }
            return (
              <code className="block p-4 bg-muted/50 rounded-xl text-[13px] font-mono overflow-x-auto my-3 border border-border/50">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="overflow-x-auto">
              {children}
            </pre>
          ),
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-primary/50 pl-4 italic text-muted-foreground my-3 bg-muted/30 py-2 pr-4 rounded-r-lg">
              {children}
            </blockquote>
          ),
          // Links - handle internal navigation
          a: ({ children, href }) => {
            const isInternal = href?.startsWith('/');
            return (
              <a 
                href={href} 
                onClick={(e) => handleLinkClick(e, href)}
                target={isInternal ? undefined : "_blank"}
                rel={isInternal ? undefined : "noopener noreferrer"}
                className={cn(
                  "text-primary hover:underline underline-offset-2 font-medium",
                  isInternal && "cursor-pointer"
                )}
              >
                {children}
              </a>
            );
          },
          // Horizontal rule
          hr: () => <hr className="border-border/50 my-4" />,
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border-collapse">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border/50 px-3 py-2 bg-muted/50 text-left font-medium text-foreground text-sm">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border/50 px-3 py-2 text-foreground text-sm">
              {children}
            </td>
          ),
        }}
      >
        {displayContent}
      </ReactMarkdown>
      {streaming && (
        <span className="inline-block w-2 h-4 bg-primary/80 ml-0.5 animate-pulse rounded-sm" />
      )}
    </div>
  );
};