import type { ReactNode } from 'react'

interface SiteFooterProps {
  children: ReactNode
  /** Match public home (`6xl`) or docs article column (`docs`). */
  contentMaxWidth?: '6xl' | 'docs'
}

/** Shared footer shell for public pages (default copyright or template HTML). */
export default function SiteFooter({
  children,
  contentMaxWidth = '6xl',
}: SiteFooterProps) {
  const innerMax =
    contentMaxWidth === 'docs' ? 'mx-auto max-w-[72rem]' : 'mx-auto max-w-6xl'

  return (
    <footer className="mt-auto shrink-0 border-t border-stone-200/80 bg-surface">
      <div className={`w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-8 ${innerMax}`}>
        {children}
      </div>
    </footer>
  )
}
