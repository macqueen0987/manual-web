import { describe, expect, it } from 'vitest'
import {
  reorderProductList,
  sortOrderPatches,
  sortProductsInGroup,
} from './productSortOrder'

describe('sortProductsInGroup', () => {
  it('orders by sort_order then name', () => {
    const items = [
      { id: 1, name: 'Z', sort_order: 1 },
      { id: 2, name: 'A', sort_order: 0 },
    ]
    expect(sortProductsInGroup(items).map((p) => p.id)).toEqual([2, 1])
  })
})

describe('reorderProductList', () => {
  const items = [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
    { id: 3, name: 'c' },
  ]

  it('moves item to target index', () => {
    expect(reorderProductList(items, 3, 1)?.map((p) => p.id)).toEqual([3, 1, 2])
  })

  it('returns null for same id', () => {
    expect(reorderProductList(items, 2, 2)).toBeNull()
  })
})

describe('sortOrderPatches', () => {
  it('lists only changed rows', () => {
    const ordered = [
      { id: 10, name: 'a', sort_order: 1 },
      { id: 20, name: 'b', sort_order: 0 },
    ]
    expect(sortOrderPatches(ordered)).toEqual([
      { id: 10, sort_order: 0 },
      { id: 20, sort_order: 1 },
    ])
  })
})
