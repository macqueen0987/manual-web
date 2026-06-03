import { useEffect, useState } from 'react'
import client from '../api/client'

export interface SiteBranding {
  title: string
  logo_url: string | null
  logo_letter: string
}

const DEFAULT_BRANDING: SiteBranding = {
  title: 'Manual Web',
  logo_url: null,
  logo_letter: 'M',
}

let cached: SiteBranding | null = null
let inflight: Promise<SiteBranding> | null = null

function fetchSiteBranding(): Promise<SiteBranding> {
  if (cached) return Promise.resolve(cached)
  if (!inflight) {
    inflight = client
      .get<SiteBranding>('/site/branding')
      .then((res) => {
        cached = res.data
        return res.data
      })
      .catch(() => DEFAULT_BRANDING)
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

export function useSiteBranding(): SiteBranding {
  const [branding, setBranding] = useState<SiteBranding>(cached ?? DEFAULT_BRANDING)

  useEffect(() => {
    let active = true
    void fetchSiteBranding().then((data) => {
      if (!active) return
      setBranding(data)
      document.title = data.title
    })
    return () => {
      active = false
    }
  }, [])

  return branding
}
