import type { ReactNode } from 'react'

interface SiteFooterProps {
  children: ReactNode
  /** Match public home (`6xl`) or docs article column (`docs`). */
  contentMaxWidth?: '6xl' | 'docs'
  /** Pin to bottom of a flex column (docs main pane). */
  pinned?: boolean
}

/** Shared footer shell for public pages (default copyright or template HTML). */
export default function SiteFooter({
  children,
  contentMaxWidth = '6xl',
  pinned = false,
}: SiteFooterProps) {
  const innerMax =
    contentMaxWidth === 'docs' ? 'mx-auto max-w-[72rem]' : 'mx-auto max-w-6xl'

  return (
    <footer
      className={
        pinned
          ? 'sticky bottom-0 z-10 shrink-0 border-t border-stone-200/80 bg-surface/95 backdrop-blur-sm'
          : 'shrink-0 border-t border-stone-200/80 bg-surface'
      }
    >
      <div className={`w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-8 ${innerMax}`}>
        {children}
      </div>
    </footer>
  )
}
