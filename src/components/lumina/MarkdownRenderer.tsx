import React, { useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  streaming?: boolean;
}

export const MarkdownRenderer = React.memo<MarkdownRendererProps>(({ content, className, streaming }) => {
  const navigate = useNavigate();
  
  const handleLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string | undefined) => {
    if (!href) return;
    
    // Check if it's an internal link (starts with /)
    if (href.startsWith('/')) {
      e.preventDefault();
      navigate(href);
    }
  }, [navigate]);

  // Memoize components to prevent ReactMarkdown from re-mounting them on every token during streaming
  const markdownComponents = useMemo(() => ({
    // Headings
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-lg font-semibold text-foreground mt-4 mb-2 first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-base font-semibold text-foreground mt-4 mb-2 first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-sm font-semibold text-foreground mt-3 mb-1.5 first:mt-0">
        {children}
      </h3>
    ),
    h4: ({ children }: { children?: React.ReactNode }) => (
      <h4 className="text-sm font-medium text-foreground mt-3 mb-1 first:mt-0">
        {children}
      </h4>
    ),
    // Paragraphs
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="text-foreground leading-relaxed mb-3 last:mb-0">
        {children}
      </p>
    ),
    // Lists
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="space-y-1.5 mb-3 last:mb-0 ml-1">
        {children}
      </ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal list-inside space-y-1.5 mb-3 last:mb-0 ml-1">
        {children}
      </ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="text-foreground flex items-start gap-2.5">
        <span className="text-primary mt-1 text-[10px] shrink-0">●</span>
        <span className="flex-1">{children}</span>
      </li>
    ),
    // Strong/Bold - properly rendered
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-foreground">
        {children}
      </strong>
    ),
    // Emphasis/Italic - properly rendered
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic text-foreground/90">{children}</em>
    ),
    // Code blocks
    code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
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
    pre: ({ children }: { children?: React.ReactNode }) => (
      <pre className="overflow-x-auto">
        {children}
      </pre>
    ),
    // Blockquote
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-3 border-primary/50 pl-4 italic text-muted-foreground my-3 bg-muted/30 py-2 pr-4 rounded-r-lg">
        {children}
      </blockquote>
    ),
    // Links - handle internal navigation
    a: ({ children, href }: { children?: React.ReactNode; href?: string }) => {
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
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="overflow-x-auto my-3">
        <table className="min-w-full border-collapse">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="border border-border/50 px-3 py-2 bg-muted/50 text-left font-medium text-foreground text-sm">
        {children}
      </th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
      <td className="border border-border/50 px-3 py-2 text-foreground text-sm">
        {children}
      </td>
    ),
  }), [handleLinkClick]);

  return (
    <div className={cn("text-sm leading-relaxed", className)}>
      <ReactMarkdown components={markdownComponents}>
        {content}
      </ReactMarkdown>
      {streaming && (
        <span className="inline-block w-2 h-4 bg-primary/80 ml-0.5 animate-pulse rounded-sm" />
      )}
    </div>
  );
});