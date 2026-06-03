import { SUPPORTED_LOCALES, type Locale } from '../../i18n'
import { translate } from '../../i18n'
import { useLocaleStore } from '../../stores/localeStore'

interface LanguageSwitcherProps {
  className?: string
  onChange?: (locale: Locale) => void
}

export default function LanguageSwitcher({ className = '', onChange }: LanguageSwitcherProps) {
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)

  return (
    <select
      className={`ui-input w-auto min-w-[5.5rem] py-1.5 text-sm ${className}`}
      value={locale}
      onChange={(e) => {
        const next = e.target.value as Locale
        setLocale(next)
        onChange?.(next)
      }}
      aria-label={translate(locale, 'lang.label')}
    >
      {SUPPORTED_LOCALES.map((code) => (
        <option key={code} value={code}>
          {translate(locale, code === 'ko' ? 'lang.ko' : 'lang.en')}
        </option>
      ))}
    </select>
  )
}
