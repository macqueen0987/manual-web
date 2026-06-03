export interface HomeQuickLink {
  path: string
  title: string
  description: string
}

export interface HomeQuickLinkColumn {
  title: string
  links: HomeQuickLink[]
}

export interface ShowcaseSlot {
  id: string
  title: string
  tagline: string
  detail: string
  image_url?: string | null
  primary_product_slug?: string | null
}

/** @deprecated Migrated to showcase_slots on load */
export interface CategoryIntro {
  tagline: string
  detail: string
  image_url?: string | null
  primary_product_slug?: string | null
}

export interface HomeLocaleContent {
  hero_tagline: string
  quick_link_columns: HomeQuickLinkColumn[]
  showcase_slots: ShowcaseSlot[]
  /** @deprecated */
  category_intros?: Record<string, CategoryIntro>
}

export interface HomeContent {
  en: HomeLocaleContent
  ko: HomeLocaleContent
}

export const MAX_SHOWCASE_SLOTS = 4
