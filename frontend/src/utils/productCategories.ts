import { translate, type Locale } from '../i18n'
import { sortProductsInGroup } from './productSortOrder'

export interface ProductWithCategory {
  has_public_docs?: boolean
  id: number
  name: string
  slug: string
  description: string | null
  category?: string | null
  icon_url?: string | null
  sort_order?: number
}

export const UNCATEGORIZED_KEY = ''

/** Admin-only internal docs; hidden from public home, search, and direct URLs. */
export const ADMIN_ONLY_CATEGORY = '미공개'

export function productCategoryKey(product: ProductWithCategory): string {
  const trimmed = product.category?.trim()
  return trimmed ? trimmed : UNCATEGORIZED_KEY
}

export type CategoryGroup<T extends ProductWithCategory = ProductWithCategory> = {
  key: string
  label: string | null
  products: T[]
}

export function isAdminOnlyCategory(category?: string | null): boolean {
  return (category?.trim() ?? '') === ADMIN_ONLY_CATEGORY
}

/** UI label for a product category (locale-aware; DB value stays canonical). */
export function categoryDisplayLabel(
  category: string | null | undefined,
  locale: Locale,
): string {
  const trimmed = category?.trim()
  if (!trimmed) return translate(locale, 'home.uncategorized')
  if (isAdminOnlyCategory(trimmed)) return translate(locale, 'admin.categoryAdminOnly')
  return trimmed
}

/** UI label for a grouped category section. */
export function categoryGroupLabel(
  group: Pick<CategoryGroup, 'key' | 'label'>,
  locale: Locale,
): string {
  if (!group.key) return translate(locale, 'home.uncategorized')
  if (group.key === ADMIN_ONLY_CATEGORY) return translate(locale, 'admin.categoryAdminOnly')
  return group.label ?? group.key
}

export function isPublicCatalogProduct(product: ProductWithCategory): boolean {
  return !isAdminOnlyCategory(product.category)
}

export function filterPublicProducts<T extends ProductWithCategory>(products: T[]): T[] {
  return products.filter(isPublicCatalogProduct)
}

export function isNamedCategoryGroup(group: CategoryGroup): boolean {
  return group.key !== UNCATEGORIZED_KEY && group.key !== ADMIN_ONLY_CATEGORY
}

/** Groups for public home — excludes uncategorized and 「미공개」. */
export function namedCategoryGroups<T extends ProductWithCategory>(
  groups: CategoryGroup<T>[],
): CategoryGroup<T>[] {
  return groups.filter(isNamedCategoryGroup)
}

/** Explore sections on public home (excludes admin-only category). */
export function publicExploreGroups<T extends ProductWithCategory>(products: T[]) {
  return groupProductsByCategory(filterPublicProducts(products)).filter(
    (g) => g.key !== ADMIN_ONLY_CATEGORY,
  )
}

export function groupProductsByCategory<T extends ProductWithCategory>(
  products: T[],
): CategoryGroup<T>[] {
  const order: string[] = []
  const map = new Map<string, T[]>()

  for (const product of products) {
    const key = productCategoryKey(product)
    if (!map.has(key)) {
      map.set(key, [])
      order.push(key)
    }
    map.get(key)!.push(product)
  }

  return order.map((key) => ({
    key,
    label: key || null,
    products: sortProductsInGroup(map.get(key)!),
  }))
}

export function categorySectionId(key: string): string {
  if (!key) return 'category-other'
  return `category-${key.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
}

export function collectCategorySuggestions(products: ProductWithCategory[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const product of products) {
    const name = product.category?.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  if (!seen.has(ADMIN_ONLY_CATEGORY)) {
    out.push(ADMIN_ONLY_CATEGORY)
  }
  return out.sort((a, b) => a.localeCompare(b))
}
