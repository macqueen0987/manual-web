import { useEffect } from 'react'
import { X } from 'lucide-react'

export interface ToastMessage {
  text: string
  variant: 'success' | 'error'
}

interface ToastProps {
  toast: ToastMessage | null
  onDismiss: () => void
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [toast, onDismiss])

  if (!toast) return null

  const isError = toast.variant === 'error'

  return (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${
        isError
          ? 'border-red-200 bg-red-50 text-red-900'
          : 'border-teal-200 bg-white text-ink'
      }`}
    >
      <p className="flex-1 text-sm">{toast.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded p-0.5 opacity-70 hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  )
}
