import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  // Clean up common markdown artifacts that shouldn't render as markdown
  const cleanContent = content
    .replace(/^\*\*\s*/gm, '') // Remove leading ** 
    .replace(/\s*\*\*$/gm, '') // Remove trailing **
    .replace(/^#+\s*/gm, '')   // Remove leading # headers that look wrong
    .replace(/\*\*/g, '')      // Remove all bold markers
    .replace(/\*/g, '')        // Remove italic markers
    .replace(/^[-•]\s*/gm, '• ') // Normalize list items
    .trim();

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-lg font-semibold text-foreground mt-4 mb-2 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-foreground mt-3 mb-2 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-foreground mt-3 mb-1 first:mt-0">
              {children}
            </h3>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className="text-sm text-foreground leading-relaxed mb-3 last:mb-0">
              {children}
            </p>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="list-none space-y-1.5 mb-3 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1.5 mb-3 last:mb-0 text-sm">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-foreground flex items-start gap-2">
              <span className="text-primary mt-1.5 text-xs">•</span>
              <span className="flex-1">{children}</span>
            </li>
          ),
          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic text-foreground/90">{children}</em>
          ),
          // Code
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono text-primary">
                  {children}
                </code>
              );
            }
            return (
              <code className="block p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
                {children}
              </code>
            );
          },
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/50 pl-4 italic text-muted-foreground my-3">
              {children}
            </blockquote>
          ),
          // Links
          a: ({ children, href }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),
          // Horizontal rule
          hr: () => <hr className="border-border my-4" />,
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
};
