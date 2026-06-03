import { describe, expect, it } from 'vitest'
import type { DocNode } from '../components/admin/DocTreeNav'
import { findDocNode, flattenDocTree, invalidParentIdsForDoc } from './docTree'

const tree: DocNode[] = [
  {
    id: 1,
    title: 'Root',
    slug: 'root',
    parent_id: null,
    children: [
      { id: 2, title: 'Child', slug: 'child', parent_id: 1, children: [] },
    ],
  },
]

describe('flattenDocTree', () => {
  it('returns depth-first flat list', () => {
    expect(flattenDocTree(tree).map((n) => n.id)).toEqual([1, 2])
  })
})

describe('findDocNode', () => {
  it('finds nested node by id', () => {
    expect(findDocNode(tree, 2)?.title).toBe('Child')
    expect(findDocNode(tree, 99)).toBeNull()
  })
})

describe('invalidParentIdsForDoc', () => {
  it('includes node and descendants', () => {
    expect(invalidParentIdsForDoc(tree, 1)).toEqual(new Set([1, 2]))
  })
})
