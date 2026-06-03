import { DEFAULT_LOCALE, SUPPORTED_LOCALES, translate, type Locale } from '../i18n'

export function secondaryContentLocale(): Locale {
  return (
    SUPPORTED_LOCALES.find((l) => l !== DEFAULT_LOCALE) ??
    (DEFAULT_LOCALE === 'ko' ? 'en' : 'ko')
  )
}

export function isSecondaryContentLocale(locale: Locale): boolean {
  return locale !== DEFAULT_LOCALE
}

export function localeToApiParam(locale: Locale): string | undefined {
  return locale === DEFAULT_LOCALE ? undefined : locale
}

export function localeDisplayLabel(locale: Locale, uiLocale: Locale): string {
  return translate(uiLocale, locale === 'ko' ? 'lang.ko' : 'lang.en')
}
