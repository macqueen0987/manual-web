function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface HighlightTextProps {
  text: string
  query: string
  className?: string
}

/** Highlights query terms in plain text (for search previews). */
export default function HighlightText({ text, query, className = '' }: HighlightTextProps) {
  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map(escapeRegExp)

  if (words.length === 0) {
    return <span className={className}>{text}</span>
  }

  const pattern = new RegExp(`(${words.join('|')})`, 'gi')
  const parts = text.split(pattern)

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null
        const isMatch = words.some((w) => part.toLowerCase() === w.toLowerCase())
        if (isMatch) {
          return (
            <mark
              key={index}
              className="rounded-sm bg-accent/12 px-0.5 font-medium text-accent-hover"
            >
              {part}
            </mark>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </span>
  )
}
