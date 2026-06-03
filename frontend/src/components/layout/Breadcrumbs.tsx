import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav
      aria-label="breadcrumb"
      className={`flex min-w-0 items-center gap-1 text-sm ${className}`}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && (
              <ChevronRight size={14} className="shrink-0 text-ink-faint" aria-hidden />
            )}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="truncate text-ink-muted transition-colors duration-200 hover:text-accent"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`truncate ${isLast ? 'font-medium text-ink' : 'text-ink-muted'}`}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
