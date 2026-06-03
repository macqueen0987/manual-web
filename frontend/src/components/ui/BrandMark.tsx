import { Link } from 'react-router-dom'
import { useSiteBranding } from '../../hooks/useSiteBranding'

interface BrandMarkProps {
  to?: string
  compact?: boolean
}

export default function BrandMark({ to = '/', compact = false }: BrandMarkProps) {
  const { title, logo_url, logo_letter } = useSiteBranding()

  const mark = logo_url ? (
    <img
      src={logo_url}
      alt=""
      className="h-8 w-8 shrink-0 rounded-lg object-contain"
    />
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
      {logo_letter}
    </span>
  )

  const inner = (
    <>
      {mark}
      {!compact && (
        <span className="font-display text-base font-semibold tracking-tight text-ink">
          {title}
        </span>
      )}
    </>
  )

  const className = 'flex items-center gap-2.5 transition-opacity hover:opacity-90'

  if (to) {
    return (
      <Link to={to} className={className} aria-label={title}>
        {inner}
      </Link>
    )
  }

  return <div className={className}>{inner}</div>
}
