import { describe, expect, it } from 'vitest'
import {
  ADMIN_ONLY_CATEGORY,
  categoryDisplayLabel,
  categoryGroupLabel,
  categorySectionId,
  collectCategorySuggestions,
  filterPublicProducts,
  groupProductsByCategory,
  isAdminOnlyCategory,
  isNamedCategoryGroup,
  isPublicCatalogProduct,
  namedCategoryGroups,
  productCategoryKey,
  publicExploreGroups,
  type ProductWithCategory,
  UNCATEGORIZED_KEY,
} from './productCategories'

function product(overrides: Partial<ProductWithCategory> = {}): ProductWithCategory {
  return {
    id: 1,
    name: 'Alpha',
    slug: 'alpha',
    description: null,
    sort_order: 0,
    ...overrides,
  }
}

describe('productCategoryKey', () => {
  it('returns trimmed category or empty key', () => {
    expect(productCategoryKey(product({ category: '  Docs  ' }))).toBe('Docs')
    expect(productCategoryKey(product({ category: '   ' }))).toBe(UNCATEGORIZED_KEY)
    expect(productCategoryKey(product())).toBe(UNCATEGORIZED_KEY)
  })
})

describe('isAdminOnlyCategory', () => {
  it('matches canonical admin-only label', () => {
    expect(isAdminOnlyCategory(ADMIN_ONLY_CATEGORY)).toBe(true)
    expect(isAdminOnlyCategory(` ${ADMIN_ONLY_CATEGORY} `)).toBe(true)
    expect(isAdminOnlyCategory('Public')).toBe(false)
  })
})

describe('categoryDisplayLabel', () => {
  it('returns localized labels', () => {
    expect(categoryDisplayLabel(null, 'ko')).toContain('기타 제품')
    expect(categoryDisplayLabel(ADMIN_ONLY_CATEGORY, 'en')).toContain('Unpublished')
    expect(categoryDisplayLabel('Platform', 'ko')).toBe('Platform')
  })
})

describe('categoryGroupLabel', () => {
  it('uses group key and label', () => {
    expect(categoryGroupLabel({ key: '', label: null }, 'ko')).toContain('기타 제품')
    expect(categoryGroupLabel({ key: ADMIN_ONLY_CATEGORY, label: null }, 'en')).toContain(
      'Unpublished',
    )
    expect(categoryGroupLabel({ key: 'Platform', label: 'Platform Suite' }, 'ko')).toBe(
      'Platform Suite',
    )
  })
})

describe('filterPublicProducts', () => {
  it('excludes admin-only category', () => {
    const products = [
      product({ id: 1, category: 'Docs' }),
      product({ id: 2, category: ADMIN_ONLY_CATEGORY }),
    ]
    expect(filterPublicProducts(products)).toHaveLength(1)
    expect(isPublicCatalogProduct(products[1]!)).toBe(false)
  })
})

describe('groupProductsByCategory', () => {
  it('preserves insertion order and sorts within groups', () => {
    const groups = groupProductsByCategory([
      product({ id: 1, category: 'B', sort_order: 2, name: 'Second' }),
      product({ id: 2, category: 'A', sort_order: 1, name: 'First A' }),
      product({ id: 3, category: 'B', sort_order: 1, name: 'First B' }),
    ])
    expect(groups.map((g) => g.key)).toEqual(['B', 'A'])
    expect(groups[0]!.products.map((p) => p.name)).toEqual(['First B', 'Second'])
  })
})

describe('namedCategoryGroups', () => {
  it('filters uncategorized and admin-only groups', () => {
    const groups = groupProductsByCategory([
      product({ id: 1 }),
      product({ id: 2, category: 'Docs' }),
      product({ id: 3, category: ADMIN_ONLY_CATEGORY }),
    ])
    expect(namedCategoryGroups(groups).map((g) => g.key)).toEqual(['Docs'])
    expect(isNamedCategoryGroup(groups[0]!)).toBe(false)
    expect(isNamedCategoryGroup(groups[1]!)).toBe(true)
  })
})

describe('publicExploreGroups', () => {
  it('excludes admin-only products and groups', () => {
    const groups = publicExploreGroups([
      product({ id: 1, category: 'Docs' }),
      product({ id: 2, category: ADMIN_ONLY_CATEGORY }),
      product({ id: 3 }),
    ])
    expect(groups.map((g) => g.key)).toEqual(['Docs', ''])
  })
})

describe('categorySectionId', () => {
  it('slugifies category keys for anchors', () => {
    expect(categorySectionId('')).toBe('category-other')
    expect(categorySectionId('Cloud Docs')).toBe('category-cloud-docs')
    expect(categorySectionId('API v2')).toBe('category-api-v2')
  })
})

describe('collectCategorySuggestions', () => {
  it('deduplicates and always includes admin-only option', () => {
    const suggestions = collectCategorySuggestions([
      product({ category: 'Docs' }),
      product({ category: 'Docs' }),
      product({ category: 'Platform' }),
    ])
    expect(suggestions).toEqual(['Docs', 'Platform', ADMIN_ONLY_CATEGORY])
  })
})
