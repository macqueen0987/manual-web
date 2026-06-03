import type { DocNode } from '../components/admin/DocTreeNav'

export function flattenDocTree(nodes: DocNode[]): DocNode[] {
  const result: DocNode[] = []
  const stack = [...nodes].reverse()
  while (stack.length) {
    const node = stack.pop()!
    result.push({
      id: node.id,
      title: node.title,
      slug: node.slug,
      parent_id: node.parent_id ?? null,
      children: node.children,
    })
    if (node.children?.length) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i])
      }
    }
  }
  return result
}

export function findDocNode(nodes: DocNode[], id: number): DocNode | null {
  const stack = [...nodes]
  while (stack.length) {
    const node = stack.pop()!
    if (node.id === id) return node
    if (node.children?.length) {
      stack.push(...node.children)
    }
  }
  return null
}

export function invalidParentIdsForDoc(docTree: DocNode[], selectedDocId: number | null): Set<number> {
  if (!selectedDocId) return new Set<number>()
  const node = findDocNode(docTree, selectedDocId)
  if (!node) return new Set<number>([selectedDocId])
  const ids = new Set<number>([selectedDocId])
  const walk = (n: DocNode) => {
    for (const child of n.children ?? []) {
      ids.add(child.id)
      walk(child)
    }
  }
  walk(node)
  return ids
}
