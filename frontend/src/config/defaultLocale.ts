import { type Locale } from '../i18n'

/** Project-wide `DEFAULT_LOCALE` (root `.env`, same as backend). */
export function resolveDefaultLocale(): Locale {
  const raw = (import.meta.env.DEFAULT_LOCALE as string | undefined)?.trim().toLowerCase()
  if (raw === 'ko' || raw === 'kr' || raw === 'korean') return 'ko'
  if (raw === 'en' || raw === 'eng' || raw === 'english') return 'en'
  return 'en'
}
