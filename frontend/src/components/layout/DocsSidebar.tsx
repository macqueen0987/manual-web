import { Link } from 'react-router-dom'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { translate, withLocalePath, type Locale } from '../../i18n'

export interface DocNode {
  id: number
  slug: string
  title: string
  children: DocNode[]
}

interface DocsSidebarProps {
  docs: DocNode[]
  productSlug: string
  productName?: string
  versionSlug: string
  locale: Locale
  currentDocSlug?: string
  onNavigate?: () => void
}

function NavLink({
  to,
  active,
  children,
  onNavigate,
  indent = 0,
}: {
  to: string
  active: boolean
  children: React.ReactNode
  onNavigate?: () => void
  indent?: number
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      style={{ paddingLeft: `${8 + indent * 12}px` }}
      className={`block border-l-2 py-1.5 pr-3 text-sm leading-snug transition-colors duration-150 ${
        active
          ? 'border-accent bg-accent-muted/40 font-medium text-accent-hover'
          : 'border-transparent text-ink-muted hover:border-stone-300 hover:bg-surface-muted hover:text-ink'
      }`}
    >
      {children}
    </Link>
  )
}

function DocTreeItem({
  doc,
  productSlug,
  versionSlug,
  locale,
  currentDocSlug,
  onNavigate,
  depth = 0,
}: {
  doc: DocNode
  productSlug: string
  versionSlug: string
  locale: Locale
  currentDocSlug?: string
  onNavigate?: () => void
  depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = Boolean(doc.children?.length)
  const isActive = doc.slug === currentDocSlug

  return (
    <div>
      <div className="flex items-stretch">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex w-6 shrink-0 items-center justify-center text-ink-faint hover:text-ink"
            aria-expanded={expanded}
            aria-label={expanded ? translate(locale, 'docs.collapse') : translate(locale, 'docs.expand')}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <NavLink
            to={withLocalePath(`/${productSlug}/${versionSlug}/${doc.slug}`, locale)}
            active={isActive}
            onNavigate={onNavigate}
            indent={depth}
          >
            {doc.title}
          </NavLink>
        </div>
      </div>
      {hasChildren && expanded && (
        <div className="ml-3">
          {doc.children!.map((child) => (
            <DocTreeItem
              key={child.id}
              doc={child}
              productSlug={productSlug}
              versionSlug={versionSlug}
              locale={locale}
              currentDocSlug={currentDocSlug}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Left documentation tree — UiPath-style nav rail. */
export default function DocsSidebar({
  docs,
  productSlug,
  productName,
  versionSlug,
  locale,
  currentDocSlug,
  onNavigate,
}: DocsSidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-stone-200 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
          {translate(locale, 'docs.docNav')}
        </p>
        {productName && (
          <p className="mt-1 truncate font-display text-base font-semibold text-ink">{productName}</p>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-3" aria-label={translate(locale, 'docs.docList')}>
        {docs.map((doc) => (
          <DocTreeItem
            key={doc.id}
            doc={doc}
            productSlug={productSlug}
            versionSlug={versionSlug}
            locale={locale}
            currentDocSlug={currentDocSlug}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </div>
  )
}
