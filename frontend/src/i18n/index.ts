import { resolveDefaultLocale } from '../config/defaultLocale'
import { en, type Messages } from './locales/en'
import { ko } from './locales/ko'

export type Locale = 'en' | 'ko'

export const DEFAULT_LOCALE: Locale = resolveDefaultLocale()
export const SUPPORTED_LOCALES: Locale[] =
  DEFAULT_LOCALE === 'ko' ? ['ko', 'en'] : ['en', 'ko']

const messages: Record<Locale, Messages> = { en, ko }

export type MessageKey =
  | `common.${keyof Messages['common']}`
  | `docs.${keyof Messages['docs']}`
  | `search.${keyof Messages['search']}`
  | `quickLinks.${keyof Messages['quickLinks']}`
  | `lang.${keyof Messages['lang']}`
  | `home.${keyof Messages['home']}`
  | `admin.${keyof Messages['admin']}`
  | `account.${keyof Messages['account']}`

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'en' || value === 'ko'
}

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj) as string | undefined
}

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const template = getNested(messages[locale] as unknown as Record<string, unknown>, key)
    ?? getNested(messages.en as unknown as Record<string, unknown>, key)
    ?? key

  if (!vars) return template
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), String(value)),
    template,
  )
}

export function localeToHrefLang(locale: Locale): string {
  return locale === 'ko' ? 'ko' : 'en'
}

/** Path helper — locale is stored in localStorage, not URL query params. */
export function withLocalePath(path: string, _locale?: Locale): string {
  return path
}
