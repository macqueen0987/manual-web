import type { ReactNode } from 'react'

interface PublicPageSubheaderProps {
  title: string
  description?: string
  tools?: ReactNode
}

/** Shared second header row for public pages (home + docs). */
export default function PublicPageSubheader({
  title,
  description,
  tools,
}: PublicPageSubheaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-lg font-semibold tracking-tight text-ink md:text-xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{description}</p>
        )}
      </div>
      {tools && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {tools}
        </div>
      )}
    </div>
  )
}
