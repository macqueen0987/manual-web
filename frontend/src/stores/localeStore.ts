import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_LOCALE, type Locale } from '../i18n'

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

function applyHtmlLang(locale: Locale) {
  document.documentElement.lang = locale === 'ko' ? 'ko' : 'en'
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      setLocale: (locale) => {
        applyHtmlLang(locale)
        set({ locale })
      },
    }),
    {
      name: 'manual-web-locale',
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        if (state?.locale) applyHtmlLang(state.locale)
      },
    },
  ),
)

export { translate as t } from '../i18n'
