import { Link } from 'react-router-dom'

interface BrandMarkProps {
  to?: string
  compact?: boolean
}

export default function BrandMark({ to = '/', compact = false }: BrandMarkProps) {
  const inner = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
        M
      </span>
      {!compact && (
        <span className="font-display text-base font-semibold tracking-tight text-ink">
          Manual Web
        </span>
      )}
    </>
  )

  const className = 'flex items-center gap-2.5 transition-opacity hover:opacity-90'

  if (to) {
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    )
  }

  return <div className={className}>{inner}</div>
}
