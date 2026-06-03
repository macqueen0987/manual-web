import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, LogOut } from 'lucide-react'
import { translate } from '../../i18n'
import { useLocaleStore } from '../../stores/localeStore'

export type AccountMenuLink = {
  to: string
  label: string
}

interface AccountMenuProps {
  label: string
  onLogout: () => void | Promise<void>
  links?: AccountMenuLink[]
  className?: string
}

export default function AccountMenu({
  label,
  onLogout,
  links = [],
  className = '',
}: AccountMenuProps) {
  const locale = useLocaleStore((s) => s.locale)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  const handleLogout = () => {
    setOpen(false)
    void onLogout()
  }

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ui-btn-ghost flex max-w-[10rem] items-center gap-1 py-1.5 sm:max-w-[12rem] lg:max-w-[14rem]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={label}
        title={label}
      >
        <span className="truncate text-sm">{label}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
        >
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-muted"
            >
              {item.label}
            </Link>
          ))}
          {links.length > 0 && <div className="my-1 border-t border-stone-100" role="separator" />}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-muted"
          >
            <LogOut size={16} aria-hidden />
            {translate(locale, 'admin.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
