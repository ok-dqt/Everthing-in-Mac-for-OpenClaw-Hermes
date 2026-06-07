import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
}

export function MarkdownContent({ content }: Props) {
  if (!content) return null

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes('language-')
          if (isBlock) {
            return (
              <pre className="bg-surface-dark rounded-lg p-3 my-2 overflow-x-auto border border-border-dark">
                <code className={`text-xs text-on-dark font-mono ${className}`} {...props}>{children}</code>
              </pre>
            )
          }
          return (
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs" {...props}>
              {children}
            </code>
          )
        },
        ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-3 border-brand/50 pl-3 text-muted-foreground italic my-2">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
