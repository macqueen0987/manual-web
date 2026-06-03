import { describe, expect, it, vi } from 'vitest'
import type { HomeContent } from '../types/homeContent'
import {
  createShowcaseSlot,
  normalizeHomeContent,
  normalizeLocaleContent,
  primaryProductForSlot,
  slugifySlotId,
  visibleShowcaseSlots,
} from './showcaseSlots'
import type { ProductWithCategory } from './productCategories'

describe('slugifySlotId', () => {
  it('slugifies slot names', () => {
    expect(slugifySlotId('Cloud Platform')).toBe('cloud-platform')
    expect(slugifySlotId('   ')).toBe('slot')
  })
})

describe('createShowcaseSlot', () => {
  it('creates empty slot with random id suffix', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('12345678-1234-5678-1234-567812345678')
    const slot = createShowcaseSlot()
    expect(slot.id).toBe('slot-12345678')
    expect(slot.title).toBe('')
  })
})

describe('normalizeLocaleContent', () => {
  it('migrates legacy category_intros to showcase_slots', () => {
    const normalized = normalizeLocaleContent({
      hero_tagline: 'Welcome',
      quick_link_columns: [],
      showcase_slots: [],
      category_intros: {
        Platform: {
          tagline: 'Build faster',
          detail: 'Details',
          primary_product_slug: 'alpha',
        },
      },
    })
    expect(normalized.showcase_slots).toHaveLength(1)
    expect(normalized.showcase_slots[0]?.title).toBe('Platform')
    expect(normalized.showcase_slots[0]?.tagline).toBe('Build faster')
  })
})

describe('normalizeHomeContent', () => {
  it('normalizes both locales', () => {
    const empty: HomeContent = {
      en: { hero_tagline: '', quick_link_columns: [], showcase_slots: [] },
      ko: { hero_tagline: '', quick_link_columns: [], showcase_slots: [] },
    }
    expect(normalizeHomeContent(empty).en.showcase_slots).toEqual([])
  })
})

describe('visibleShowcaseSlots', () => {
  it('keeps slots with non-empty titles', () => {
    expect(
      visibleShowcaseSlots([
        { id: 'a', title: '  ', tagline: '', detail: '', image_url: null, primary_product_slug: null },
        { id: 'b', title: 'Docs', tagline: '', detail: '', image_url: null, primary_product_slug: null },
      ]),
    ).toHaveLength(1)
  })
})

describe('primaryProductForSlot', () => {
  const products: ProductWithCategory[] = [
    { id: 1, name: 'Alpha', slug: 'alpha', description: null },
  ]

  it('finds product by slug', () => {
    expect(primaryProductForSlot(products, 'alpha')?.name).toBe('Alpha')
    expect(primaryProductForSlot(products, 'missing')).toBeUndefined()
    expect(primaryProductForSlot(products, null)).toBeUndefined()
  })
})
