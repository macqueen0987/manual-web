import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AdminDialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Wider modal for complex forms */
  wide?: boolean
}

/** Replaces legacy Modal — shadcn Dialog wrapper with same props. */
export default function AdminDialog({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: AdminDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className={wide ? 'max-w-2xl' : 'max-w-md'}
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4">{children}</div>
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  )
}
