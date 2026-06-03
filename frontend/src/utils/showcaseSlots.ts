import type { HomeContent, HomeLocaleContent, ShowcaseSlot } from '../types/homeContent'
import { MAX_SHOWCASE_SLOTS } from '../types/homeContent'
import type { ProductWithCategory } from './productCategories'

export function slugifySlotId(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  return base || 'slot'
}

export function createShowcaseSlot(): ShowcaseSlot {
  const suffix = crypto.randomUUID().slice(0, 8)
  return {
    id: `slot-${suffix}`,
    title: '',
    tagline: '',
    detail: '',
    image_url: null,
    primary_product_slug: null,
  }
}

function migrateIntrosToSlots(
  intros: Record<string, { tagline: string; detail: string; image_url?: string | null; primary_product_slug?: string | null }>,
): ShowcaseSlot[] {
  const slots: ShowcaseSlot[] = []
  const seen = new Set<string>()
  for (const [title, intro] of Object.entries(intros)) {
    if (!title.trim()) continue
    let id = slugifySlotId(title)
    if (seen.has(id)) id = `${id}-${seen.size}`
    seen.add(id)
    slots.push({
      id,
      title,
      tagline: intro.tagline ?? '',
      detail: intro.detail ?? '',
      image_url: intro.image_url ?? null,
      primary_product_slug: intro.primary_product_slug ?? null,
    })
    if (slots.length >= MAX_SHOWCASE_SLOTS) break
  }
  return slots
}

export function normalizeLocaleContent(loc: HomeLocaleContent): HomeLocaleContent {
  let slots = loc.showcase_slots
  if (!slots?.length && loc.category_intros) {
    slots = migrateIntrosToSlots(loc.category_intros)
  }
  return {
    hero_tagline: loc.hero_tagline,
    quick_link_columns: loc.quick_link_columns ?? [],
    showcase_slots: (slots ?? []).slice(0, MAX_SHOWCASE_SLOTS),
  }
}

export function normalizeHomeContent(content: HomeContent): HomeContent {
  return {
    en: normalizeLocaleContent(content.en),
    ko: normalizeLocaleContent(content.ko),
  }
}

export function visibleShowcaseSlots(slots: ShowcaseSlot[]): ShowcaseSlot[] {
  return slots.filter((s) => s.title.trim())
}

export function primaryProductForSlot(
  products: ProductWithCategory[],
  slug?: string | null,
): ProductWithCategory | undefined {
  if (slug) {
    const match = products.find((p) => p.slug === slug)
    if (match) return match
  }
  return undefined
}
