import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Locale } from '../../i18n'
import { translate, withLocalePath } from '../../i18n'
import type { ShowcaseSlot } from '../../types/homeContent'
import type { ProductWithCategory } from '../../utils/productCategories'
import { primaryProductForSlot } from '../../utils/showcaseSlots'

interface CategoryShowcaseProps {
  slots: ShowcaseSlot[]
  products: ProductWithCategory[]
  locale: Locale
}

function CategoryIllustration({ imageUrl, alt }: { imageUrl: string; alt: string }) {
  return (
    <div className="flex h-full min-h-[12rem] w-full items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-white p-2 lg:min-h-[16rem]">
      <img
        src={imageUrl}
        alt={alt}
        className="max-h-full max-w-full rounded-lg object-contain"
      />
    </div>
  )
}

export default function CategoryShowcase({
  slots,
  products,
  locale,
}: CategoryShowcaseProps) {
  const [selected, setSelected] = useState(0)
  const safeIndex = selected < slots.length ? selected : 0
  const slot = slots[safeIndex]
  if (!slot) return null

  const label = slot.title.trim()
  const detail =
    slot.detail.trim() ||
    translate(locale, 'home.categoryDetailFallback', { count: '0' })
  const primary = primaryProductForSlot(products, slot.primary_product_slug)
  const docsPath = primary
    ? withLocalePath(`/${primary.slug}`, locale)
    : '#home-explore'
  const showcaseImage = slot.image_url?.trim() || null

  return (
    <section className="text-left" aria-labelledby="home-featured">
      <h2 id="home-featured" className="sr-only">
        {translate(locale, 'home.featuredHeading')}
      </h2>

      <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-surface-raised shadow-card lg:min-h-[20rem] lg:flex-row">
        <nav
          className="flex shrink-0 flex-row gap-0 overflow-x-auto border-b border-stone-200 lg:w-[17.5rem] lg:flex-col lg:overflow-x-visible lg:border-b-0 lg:border-r"
          role="tablist"
          aria-label={translate(locale, 'home.featuredHeading')}
        >
          {slots.map((s, index) => {
            const tabLabel = s.title.trim()
            const tabTagline = s.tagline.trim() || tabLabel
            const isActive = index === safeIndex

            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="category-showcase-panel"
                id={`category-tab-${s.id}`}
                onClick={() => setSelected(index)}
                className={`min-w-[11rem] shrink-0 border-l-4 px-4 py-4 text-left transition-colors lg:min-w-0 lg:w-full ${
                  isActive
                    ? 'border-accent bg-white text-accent'
                    : 'border-transparent text-ink hover:bg-stone-50/80'
                }`}
              >
                <span
                  className={`block font-display text-base font-semibold leading-snug ${
                    isActive ? 'text-accent' : 'text-ink'
                  }`}
                >
                  {tabLabel}
                </span>
                <span
                  className={`mt-1 block truncate text-sm leading-snug ${
                    isActive ? 'text-accent/80' : 'text-ink-muted'
                  }`}
                >
                  {tabTagline}
                </span>
              </button>
            )
          })}
        </nav>

        <div
          id="category-showcase-panel"
          role="tabpanel"
          aria-labelledby={`category-tab-${slot.id}`}
          className={`flex min-w-0 flex-1 flex-col ${showcaseImage ? 'lg:flex-row' : ''}`}
        >
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-6 p-6 sm:p-8 lg:p-10">
            <div className="min-w-0 text-left">
              <h3 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                {label}
              </h3>
              <p
                className={`mt-3 text-sm leading-relaxed text-ink-muted sm:text-base ${
                  showcaseImage ? 'max-w-xl' : 'max-w-none'
                }`}
              >
                {detail}
              </p>
            </div>
            <div>
              {primary ? (
                <Link to={docsPath} className="ui-btn-primary inline-flex">
                  {translate(locale, 'home.learnAboutCategory', { name: label })}
                  <ArrowRight size={16} aria-hidden />
                </Link>
              ) : (
                <a href={docsPath} className="ui-btn-primary inline-flex">
                  {translate(locale, 'home.learnAboutCategory', { name: label })}
                  <ArrowRight size={16} aria-hidden />
                </a>
              )}
            </div>
          </div>

          {showcaseImage ? (
            <div className="border-t border-stone-200 bg-stone-50/50 p-5 lg:w-[42%] lg:border-l lg:border-t-0 lg:p-6">
              <CategoryIllustration imageUrl={showcaseImage} alt={label} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
