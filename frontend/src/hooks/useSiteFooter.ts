import { useEffect, useState } from 'react'
import client from '../api/client'
import type { Locale } from '../i18n'

interface SiteFooterTemplate {
  html: string | null
}

const cache = new Map<string, string | null>()
const inflight = new Map<string, Promise<string | null>>()

function fetchSiteFooter(locale: Locale): Promise<string | null> {
  const cached = cache.get(locale)
  if (cached !== undefined) return Promise.resolve(cached)

  let pending = inflight.get(locale)
  if (!pending) {
    pending = client
      .get<SiteFooterTemplate>('/site/footer', { params: { locale } })
      .then((res) => res.data.html)
      .catch(() => null)
      .then((html) => {
        cache.set(locale, html)
        return html
      })
      .finally(() => {
        inflight.delete(locale)
      })
    inflight.set(locale, pending)
  }
  return pending
}

export function useSiteFooter(locale: Locale): string | null | undefined {
  const [html, setHtml] = useState<string | null | undefined>(cache.get(locale))

  useEffect(() => {
    let active = true
    void fetchSiteFooter(locale).then((value) => {
      if (active) setHtml(value)
    })
    return () => {
      active = false
    }
  }, [locale])

  return html
}
