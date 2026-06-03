import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import PublicHeader from './PublicHeader'

interface AuthShellProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <PublicHeader breadcrumbs={[{ label: '계정' }]} />

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{subtitle}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-surface-raised p-8 shadow-card">
            {children}
          </div>
          {footer ?? (
            <p className="mt-6 text-center text-sm text-ink-muted">
              <Link to="/" className="ui-link">
                공개 문서 홈으로
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
