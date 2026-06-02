import { Link } from 'react-router-dom'
import { ChevronRight, ChevronDown, FileText } from 'lucide-react'
import { useState } from 'react'

interface DocNode {
  id: number
  slug: string
  title: string
  children: DocNode[]
}

interface SidebarProps {
  docs: DocNode[]
  productSlug: string
  versionSlug: string
  currentDocSlug?: string
}

function DocTreeItem({ doc, productSlug, versionSlug, currentDocSlug }: {
  doc: DocNode
  productSlug: string
  versionSlug: string
  currentDocSlug?: string
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = doc.children && doc.children.length > 0
  const isActive = doc.slug === currentDocSlug

  return (
    <div>
      <div className={`flex items-center gap-1 rounded px-2 py-1 ${isActive ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
        {hasChildren && (
          <button onClick={() => setExpanded(!expanded)} className="p-0.5">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
        {!hasChildren && <span className="w-5" />}
        <FileText size={14} className="text-gray-400" />
        <Link
          to={`/${productSlug}/${versionSlug}/${doc.slug}`}
          className="ml-1 flex-1 truncate text-sm"
        >
          {doc.title}
        </Link>
      </div>
      {hasChildren && expanded && (
        <div className="ml-4 border-l pl-2">
          {doc.children.map((child) => (
            <DocTreeItem
              key={child.id}
              doc={child}
              productSlug={productSlug}
              versionSlug={versionSlug}
              currentDocSlug={currentDocSlug}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ docs, productSlug, versionSlug, currentDocSlug }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-r bg-white p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Documentation
      </h3>
      <nav className="space-y-1">
        <div className={`flex items-center gap-2 rounded px-2 py-1 ${!currentDocSlug ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
          <FileText size={14} className="text-gray-400" />
          <Link to={`/${productSlug}/${versionSlug}`} className="text-sm">
            Home
          </Link>
        </div>
        {docs.map((doc) => (
          <DocTreeItem
            key={doc.id}
            doc={doc}
            productSlug={productSlug}
            versionSlug={versionSlug}
            currentDocSlug={currentDocSlug}
          />
        ))}
      </nav>
    </aside>
  )
}
