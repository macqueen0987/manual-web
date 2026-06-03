import { AlertCircle } from 'lucide-react'

interface AlertProps {
  children: React.ReactNode
  variant?: 'error' | 'info'
}

export default function Alert({ children, variant = 'error' }: AlertProps) {
  const styles =
    variant === 'error'
      ? 'border-red-200 bg-red-50 text-red-900'
      : 'border-stone-200 bg-surface-muted text-ink-muted'

  return (
    <div
      role="alert"
      className={`flex gap-2 rounded-lg border px-3 py-2.5 text-sm ${styles}`}
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0 opacity-80" aria-hidden />
      <div>{children}</div>
    </div>
  )
}
