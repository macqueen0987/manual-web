import { useLocaleStore } from '../stores/localeStore'

/** Doc UI locale from persisted store (localStorage). */
export function useDocLocale() {
  const locale = useLocaleStore((s) => s.locale)
  const setDocLocale = useLocaleStore((s) => s.setLocale)
  return { locale, setDocLocale }
}
