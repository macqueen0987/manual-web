import { translate, type Locale } from '../../i18n'

interface HomeHeroSectionProps {
  locale: Locale
  customHtml: string | null | undefined
}

export default function HomeHeroSection({ locale, customHtml }: HomeHeroSectionProps) {
  if (customHtml) {
    return (
      <div
        className="home-hero-template"
        dangerouslySetInnerHTML={{ __html: customHtml }}
      />
    )
  }

  return (
    <section className="border-b border-stone-200/80 bg-gradient-to-b from-surface-raised to-surface">
      <div className="mx-auto max-w-6xl px-4 py-5 text-center sm:px-6 sm:py-6">
        <h1 className="sr-only">{translate(locale, 'home.heroTitle')}</h1>
        <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
          {translate(locale, 'home.heroSetupHint')}
        </p>
      </div>
    </section>
  )
}
