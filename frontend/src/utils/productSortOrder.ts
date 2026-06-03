export type SortableProduct = {
  id: number
  name: string
  sort_order?: number
}

/** Stable order within a category (matches public home). */
export function sortProductsInGroup<T extends SortableProduct>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name),
  )
}

/** Move one product before another in a flat list (same category). */
export function reorderProductList<T extends { id: number }>(
  items: T[],
  draggedId: number,
  targetId: number,
): T[] | null {
  if (draggedId === targetId) return null
  const from = items.findIndex((p) => p.id === draggedId)
  const to = items.findIndex((p) => p.id === targetId)
  if (from < 0 || to < 0) return null
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function sortOrderPatches<T extends SortableProduct>(
  ordered: T[],
): { id: number; sort_order: number }[] {
  return ordered
    .map((p, index) => ({ id: p.id, sort_order: index }))
    .filter(({ id, sort_order }) => {
      const row = ordered.find((p) => p.id === id)!
      return (row.sort_order ?? 0) !== sort_order
    })
}
