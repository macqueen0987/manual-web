import { useState, type DragEvent } from 'react'
import type { Locale } from '../../i18n'
import { translate } from '../../i18n'
import {
  categoryGroupLabel,
  isAdminOnlyCategory,
  type CategoryGroup,
  type ProductWithCategory,
} from '../../utils/productCategories'
import { reorderProductList, sortProductsInGroup } from '../../utils/productSortOrder'

interface VersionSummary {
  id: number
  name: string
  is_latest: boolean
}

interface ProductSidebarListProps {
  groups: CategoryGroup<ProductWithCategory>[]
  selectedId: number | null
  versions: Record<number, VersionSummary[]>
  locale: Locale
  onSelect: (id: number) => void
  onReorder: (categoryKey: string, ordered: ProductWithCategory[]) => void | Promise<void>
}

export default function ProductSidebarList({
  groups,
  selectedId,
  versions,
  locale,
  onSelect,
  onReorder,
}: ProductSidebarListProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dropTargetId, setDropTargetId] = useState<number | null>(null)

  const handleDragStart = (e: DragEvent, productId: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(productId))
    setDraggingId(productId)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDropTargetId(null)
  }

  const handleDrop = async (
    e: DragEvent,
    categoryKey: string,
    sorted: ProductWithCategory[],
    targetId: number,
  ) => {
    e.preventDefault()
    setDropTargetId(null)
    const draggedId = Number(e.dataTransfer.getData('text/plain'))
    if (!draggedId) return
    const next = reorderProductList(sorted, draggedId, targetId)
    if (!next) return
    await onReorder(categoryKey, next)
    setDraggingId(null)
  }

  return (
    <div className="space-y-4">
      <p className="px-2 text-xs text-ink-faint">
        {translate(locale, 'admin.productDragReorderHint')}
      </p>
      {groups.map((group) => {
        const categoryKey = group.key
        const sorted = sortProductsInGroup(group.products)
        const multi = sorted.length > 1

        return (
          <div key={categoryKey || '__uncategorized'}>
            <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {categoryGroupLabel(group, locale)}
            </p>
            <ul className="space-y-1">
              {sorted.map((p) => {
                const isSelected = selectedId === p.id
                const latest = (versions[p.id] || []).find((v) => v.is_latest)
                const isDragging = draggingId === p.id
                const isDropTarget =
                  multi && dropTargetId === p.id && draggingId !== null && draggingId !== p.id

                return (
                  <li
                    key={p.id}
                    data-product-id={p.id}
                    className="relative"
                    onDragOver={(e) => {
                      if (!multi || !draggingId || draggingId === p.id) return
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      setDropTargetId(p.id)
                    }}
                    onDragLeave={(e) => {
                      if (dropTargetId !== p.id) return
                      const related = e.relatedTarget as Node | null
                      if (related && e.currentTarget.contains(related)) return
                      setDropTargetId(null)
                    }}
                    onDrop={(e) => void handleDrop(e, categoryKey, sorted, p.id)}
                  >
                    {isDropTarget ? (
                      <div
                        className="pointer-events-none mb-1 overflow-hidden rounded-lg border-2 border-dashed border-accent bg-accent-muted/50 shadow-sm"
                        aria-live="polite"
                      >
                        <div className="h-0.5 bg-accent" />
                        <p className="px-3 py-2.5 text-center text-xs font-semibold text-accent-hover">
                          {translate(locale, 'admin.productDropHere')}
                        </p>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      draggable={multi}
                      onDragStart={(e) => handleDragStart(e, p.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelect(p.id)}
                      className={`w-full rounded-lg px-3 py-3 text-left transition-[opacity,box-shadow] ${
                        isSelected
                          ? 'bg-white shadow-card ring-1 ring-accent/20'
                          : 'hover:bg-white/80'
                      } ${isDragging ? 'opacity-35' : ''} ${
                        isDropTarget ? 'ring-1 ring-accent/20' : ''
                      } ${multi ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      <p className="truncate font-medium text-ink">{p.name}</p>
                      <p className="truncate text-xs text-ink-faint">/{p.slug}</p>
                      {isAdminOnlyCategory(p.category) && (
                        <p className="mt-1 text-xs font-medium text-amber-700">
                          {translate(locale, 'admin.adminOnlyBadge')}
                        </p>
                      )}
                      {latest && (
                        <p className="mt-1 text-xs text-ink-muted">
                          {translate(locale, 'admin.latestBadge')}: {latest.name}
                        </p>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
