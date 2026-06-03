import { useCallback, useEffect, useRef, useState } from 'react'
import client from '../api/client'
import type { SearchHit } from '../types/search'

const DEBOUNCE_MS = 320
const MIN_QUERY_LEN = 2

export function useDocSearch(productSlug?: string) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)

  const runSearch = useCallback(
    async (raw: string) => {
      const q = raw.trim()
      if (!q) {
        setResults([])
        setOpen(false)
        setLoading(false)
        return
      }

      const id = ++requestId.current
      setLoading(true)
      setOpen(true)

      try {
        const res = await client.get<{ results: SearchHit[] }>('/search', {
          params: {
            q,
            ...(productSlug ? { product: productSlug } : {}),
          },
        })
        if (id !== requestId.current) return
        setResults(res.data.results)
      } catch {
        if (id !== requestId.current) return
        setResults([])
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    },
    [productSlug],
  )

  useEffect(() => {
    const q = query.trim()
    if (q.length < MIN_QUERY_LEN) {
      if (q.length === 0) {
        setOpen(false)
        setResults([])
        setLoading(false)
      }
      return
    }

    const timer = window.setTimeout(() => {
      void runSearch(q)
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [query, runSearch])

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  const submit = useCallback(() => {
    void runSearch(query)
  }, [query, runSearch])

  return {
    query,
    setQuery,
    results,
    open,
    setOpen,
    loading,
    close,
    submit,
    runSearch,
  }
}
