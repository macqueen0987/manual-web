import { ChevronDown, ChevronRight, FileText, Plus } from 'lucide-react'
import { useCallback, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { translate } from '../../i18n'
import { Button } from '@/components/ui/button'
import { useLocaleStore } from '../../stores/localeStore'

export interface DocNode {
  id: number
  title: string
  slug: string
  parent_id: number | null
  sort_order?: number
  children?: DocNode[]
}

interface DropTarget {
  parentId: number | null
  sortOrder: number
  lineY: number
  lineLeft: number
  mode: 'line' | 'nest'
}

interface DocTreeNavProps {
  docs: DocNode[]
  currentSlug?: string
  onSelect: (slug: string) => void
  onNewPage: () => void
  onReposition?: (docId: number, parentId: number | null, sortOrder: number) => void
  dragEnabled?: boolean
}

const INDENT_PX = 14

function findNode(nodes: DocNode[], id: number): DocNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children?.length) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

function collectDescendantIds(node: DocNode): Set<number> {
  const ids = new Set<number>()
  const walk = (n: DocNode) => {
    for (const child of n.children ?? []) {
      ids.add(child.id)
      walk(child)
    }
  }
  walk(node)
  return ids
}

function isInvalidDrop(
  draggedId: number,
  targetDocId: number,
  docs: DocNode[],
  asChild: boolean,
): boolean {
  if (draggedId === targetDocId) return true
  const dragged = findNode(docs, draggedId)
  if (!dragged) return true
  const descendants = collectDescendantIds(dragged)
  if (asChild && descendants.has(targetDocId)) return true
  if (!asChild && descendants.has(targetDocId)) return true
  return false
}

function TreeItem({
  doc,
  siblingIndex,
  listParentId,
  currentSlug,
  onSelect,
  dragEnabled,
  docs,
  depth = 0,
  draggingId,
}: {
  doc: DocNode
  siblingIndex: number
  listParentId: number | null
  currentSlug?: string
  onSelect: (slug: string) => void
  dragEnabled?: boolean
  docs: DocNode[]
  depth?: number
  draggingId: number | null
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = Boolean(doc.children?.length)
  const isActive = doc.slug === currentSlug
  const isDragging = draggingId === doc.id

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    if (!dragEnabled) return
    if ((e.target as HTMLElement).closest('button')) {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(doc.id))
    if (e.dataTransfer.setDragImage) {
      const ghost = e.currentTarget.cloneNode(true) as HTMLElement
      ghost.style.width = `${e.currentTarget.offsetWidth}px`
      ghost.style.opacity = '0.92'
      ghost.style.position = 'absolute'
      ghost.style.top = '-9999px'
      document.body.appendChild(ghost)
      e.dataTransfer.setDragImage(ghost, 12, 16)
      requestAnimationFrame(() => ghost.remove())
    }
  }

  return (
    <div>
      <div
        data-tree-row
        data-doc-id={doc.id}
        data-depth={depth}
        data-parent-id={listParentId ?? ''}
        data-sibling-index={siblingIndex}
        data-child-count={doc.children?.length ?? 0}
        draggable={dragEnabled}
        onDragStart={handleDragStart}
        className={`flex cursor-default select-none items-center gap-0.5 rounded-md pr-1 transition-opacity ${
          isDragging ? 'opacity-40' : ''
        } ${isActive ? 'bg-accent-muted text-accent-hover' : 'hover:bg-surface-muted'} ${
          dragEnabled ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        style={{ paddingLeft: `${depth * INDENT_PX + 4}px` }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return
          onSelect(doc.slug)
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="shrink-0 rounded p-0.5 text-ink-faint hover:text-ink"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-[22px] shrink-0" />
        )}
        <span className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left text-sm">
          <FileText size={14} className="shrink-0 text-ink-faint" />
          <span className="truncate">{doc.title}</span>
        </span>
      </div>
      {hasChildren && expanded && (
        <div>
          {doc.children!.map((child, index) => (
            <TreeItem
              key={child.id}
              doc={child}
              siblingIndex={index}
              listParentId={doc.id}
              currentSlug={currentSlug}
              onSelect={onSelect}
              dragEnabled={dragEnabled}
              docs={docs}
              depth={depth + 1}
              draggingId={draggingId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DropIndicator({ target, isNest }: { target: DropTarget; isNest?: boolean }) {
  if (isNest) {
    return (
      <div
        className="pointer-events-none absolute right-2 z-10 rounded-md border-2 border-accent/60 bg-accent-muted/20"
        style={{
          top: target.lineY - 28,
          left: target.lineLeft - 8,
          right: 8,
          height: 32,
        }}
      />
    )
  }
  return (
    <div
      className="pointer-events-none absolute right-2 z-10 h-0.5 rounded-full bg-accent shadow-sm"
      style={{
        top: target.lineY,
        left: target.lineLeft,
      }}
    />
  )
}

export default function DocTreeNav({
  docs,
  currentSlug,
  onSelect,
  onNewPage,
  onReposition,
  dragEnabled = true,
}: DocTreeNavProps) {
  const locale = useLocaleStore((s) => s.locale)
  const navRef = useRef<HTMLElement>(null)
  const draggingIdRef = useRef<number | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const startDrag = useCallback((id: number) => {
    draggingIdRef.current = id
    setDraggingId(id)
  }, [])

  const resolveDropFromPointer = useCallback(
    (clientX: number, clientY: number): DropTarget | null => {
      const draggedId = draggingIdRef.current
      if (!draggedId) return null

      const nav = navRef.current
      if (!nav) return null

      const navRect = nav.getBoundingClientRect()
      const rows = Array.from(nav.querySelectorAll<HTMLDivElement>('[data-tree-row]'))
      if (rows.length === 0) return null

      let best: DropTarget | null = null
      let bestDist = Infinity

      for (const row of rows) {
        const docId = Number(row.dataset.docId)
        const depth = Number(row.dataset.depth ?? 0)
        const listParentId = row.dataset.parentId === '' ? null : Number(row.dataset.parentId)
        const siblingIndex = Number(row.dataset.siblingIndex ?? 0)
        const childCount = Number(row.dataset.childCount ?? 0)
        const rect = row.getBoundingClientRect()

        const nestEdge = rect.left + 28 + depth * INDENT_PX
        const wantsNest = clientX >= nestEdge

        if (wantsNest && !isInvalidDrop(draggedId, docId, docs, true)) {
          const dist = Math.abs(clientY - (rect.top + rect.height * 0.55))
          if (dist < bestDist) {
            bestDist = dist
            best = {
              parentId: docId,
              sortOrder: childCount,
              lineY: rect.bottom - navRect.top - 1,
              lineLeft: nestEdge - navRect.left,
              mode: 'nest',
            }
          }
          continue
        }

        const midY = rect.top + rect.height / 2
        const insertBefore = clientY < midY
        if (isInvalidDrop(draggedId, docId, docs, false)) continue

        const dist = Math.abs(clientY - (insertBefore ? rect.top : rect.bottom))
        if (dist < bestDist) {
          bestDist = dist
          best = {
            parentId: listParentId,
            sortOrder: insertBefore ? siblingIndex : siblingIndex + 1,
            lineY: (insertBefore ? rect.top : rect.bottom) - navRect.top - 1,
            lineLeft: rect.left - navRect.left + depth * INDENT_PX,
            mode: 'line',
          }
        }
      }

      const last = rows[rows.length - 1]
      if (last) {
        const lastRect = last.getBoundingClientRect()
        if (clientY > lastRect.bottom - 4) {
          const listParentId =
            last.dataset.parentId === '' ? null : Number(last.dataset.parentId)
          const siblingIndex = Number(last.dataset.siblingIndex ?? 0)
          const depth = Number(last.dataset.depth ?? 0)
          if (!isInvalidDrop(draggedId, Number(last.dataset.docId), docs, false)) {
            best = {
              parentId: listParentId,
              sortOrder: siblingIndex + 1,
              lineY: lastRect.bottom - navRect.top - 1,
              lineLeft: lastRect.left - navRect.left + depth * INDENT_PX,
              mode: 'line',
            }
          }
        }
      }

      if (clientY < rows[0].getBoundingClientRect().top + 4) {
        const first = rows[0]
        const depth = Number(first.dataset.depth ?? 0)
        const listParentId = first.dataset.parentId === '' ? null : Number(first.dataset.parentId)
        const siblingIndex = Number(first.dataset.siblingIndex ?? 0)
        if (!isInvalidDrop(draggedId, Number(first.dataset.docId), docs, false)) {
          best = {
            parentId: listParentId,
            sortOrder: siblingIndex,
            lineY: first.getBoundingClientRect().top - navRect.top - 1,
            lineLeft: first.getBoundingClientRect().left - navRect.left + depth * INDENT_PX,
            mode: 'line',
          }
        }
      }

      return best
    },
    [docs],
  )

  const handleNavDragOver = (e: DragEvent<HTMLElement>) => {
    if (!dragEnabled || !onReposition) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const target = resolveDropFromPointer(e.clientX, e.clientY)
    setDropTarget(target)
  }

  const handleDragEnd = () => {
    draggingIdRef.current = null
    setDraggingId(null)
    setDropTarget(null)
  }

  const handleNavDrop = (e: DragEvent<HTMLElement>) => {
    if (!dragEnabled || !onReposition) return
    e.preventDefault()
    const draggedId =
      draggingIdRef.current ?? Number(e.dataTransfer.getData('text/plain'))
    const target = dropTarget ?? resolveDropFromPointer(e.clientX, e.clientY)
    handleDragEnd()
    if (!draggedId || !target) return
    onReposition(draggedId, target.parentId, target.sortOrder)
  }

  const navProps = {
    ref: navRef,
    className: 'relative flex-1 overflow-y-auto p-2',
    onDragStartCapture: (e: DragEvent<HTMLElement>) => {
      const row = (e.target as HTMLElement).closest('[data-tree-row]')
      if (!row) return
      const id = Number((row as HTMLElement).dataset.docId)
      if (id) startDrag(id)
    },
    onDragOver: handleNavDragOver,
    onDragLeave: (e: DragEvent<HTMLElement>) => {
      if (!navRef.current?.contains(e.relatedTarget as Node)) {
        setDropTarget(null)
      }
    },
    onDrop: handleNavDrop,
    onDragEnd: handleDragEnd,
  }

  const wrapNav = (children: ReactNode) => (
    <nav {...navProps}>
      {dropTarget && (
        <DropIndicator target={dropTarget} isNest={dropTarget.mode === 'nest'} />
      )}
      {children}
    </nav>
  )

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-stone-200 bg-surface-raised lg:w-56">
      <div className="flex items-center justify-between border-b border-stone-100 px-3 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
          {translate(locale, 'admin.pages')}
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={onNewPage} className="h-8 gap-1 text-accent">
          <Plus size={14} />
          {translate(locale, 'admin.newPage')}
        </Button>
      </div>
      {docs.length === 0 ? (
        wrapNav(
          <p className="px-2 py-4 text-center text-sm text-ink-faint">
            {translate(locale, 'admin.noPagesYet')}
            <br />
            <button
              type="button"
              onClick={onNewPage}
              className="mt-2 font-medium text-accent hover:underline"
            >
              {translate(locale, 'admin.firstPage')}
            </button>
          </p>,
        )
      ) : (
        wrapNav(
          <>
            {docs.map((doc, index) => (
              <TreeItem
                key={doc.id}
                doc={doc}
                siblingIndex={index}
                listParentId={null}
                currentSlug={currentSlug}
                onSelect={onSelect}
                dragEnabled={dragEnabled}
                docs={docs}
                draggingId={draggingId}
              />
            ))}
          </>,
        )
      )}
    </aside>
  )
}
