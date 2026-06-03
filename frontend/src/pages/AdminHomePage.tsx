import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import client from '../api/client'
import AdminLayout from '../components/admin/AdminLayout'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import CategoryImageField from '../components/admin/CategoryImageField'
import PageLoader from '../components/ui/PageLoader'
import { useEnsureUser } from '../components/auth/useEnsureUser'
import { useAuthStore } from '../stores/authStore'
import { SUPPORTED_LOCALES, translate, type Locale } from '../i18n'
import { useLocaleStore } from '../stores/localeStore'
import type { HomeContent, ShowcaseSlot } from '../types/homeContent'
import { MAX_SHOWCASE_SLOTS } from '../types/homeContent'
import {
  createShowcaseSlot,
  normalizeHomeContent,
} from '../utils/showcaseSlots'
import type { ProductWithCategory } from '../utils/productCategories'

export default function AdminHomePage() {
  const uiLocale = useLocaleStore((s) => s.locale)
  const { user, logout } = useAuthStore()
  useEnsureUser()
  const [editLocale, setEditLocale] = useState<Locale>(uiLocale)
  const [content, setContent] = useState<HomeContent | null>(null)
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [homeRes, productsRes] = await Promise.all([
        client.get<HomeContent>('/site/home'),
        client.get<ProductWithCategory[]>('/products'),
      ])
      setContent(normalizeHomeContent(homeRes.data))
      setProducts(productsRes.data)
    } catch {
      notify(translate(uiLocale, 'admin.homeEditorLoadFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [uiLocale])

  useEffect(() => {
    void load()
  }, [load])

  const localeContent = content?.[editLocale]
  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [products],
  )

  const patchLocale = (patch: Partial<typeof localeContent>) => {
    if (!content || !localeContent) return
    setContent({
      ...content,
      [editLocale]: { ...localeContent, ...patch },
    })
  }

  const updateSlot = (index: number, patch: Partial<ShowcaseSlot>) => {
    if (!localeContent) return
    const slots = [...localeContent.showcase_slots]
    slots[index] = { ...slots[index], ...patch }
    patchLocale({ showcase_slots: slots })
  }

  const addSlot = () => {
    if (!localeContent || localeContent.showcase_slots.length >= MAX_SHOWCASE_SLOTS) return
    patchLocale({ showcase_slots: [...localeContent.showcase_slots, createShowcaseSlot()] })
  }

  const removeSlot = (index: number) => {
    if (!localeContent) return
    patchLocale({
      showcase_slots: localeContent.showcase_slots.filter((_, i) => i !== index),
    })
  }

  const save = async () => {
    if (!content) return
    setSaving(true)
    try {
      const res = await client.put<HomeContent>('/site/home', normalizeHomeContent(content))
      setContent(normalizeHomeContent(res.data))
      notify(translate(uiLocale, 'admin.homeEditorSaved'), 'success')
    } catch {
      notify(translate(uiLocale, 'admin.homeEditorSaveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !content || !localeContent) {
    return <PageLoader label={translate(uiLocale, 'common.loading')} />
  }

  const slots = localeContent.showcase_slots
  const canAdd = slots.length < MAX_SHOWCASE_SLOTS

  return (
    <AdminLayout userEmail={user?.email} onLogout={logout}>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-semibold text-ink sm:text-2xl">
              {translate(uiLocale, 'admin.homeEditorTitle')}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {translate(uiLocale, 'admin.homeEditorSubtitle')}
            </p>
          </div>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            <Save size={16} />
            {saving
              ? translate(uiLocale, 'common.loading')
              : translate(uiLocale, 'admin.homeEditorSave')}
          </Button>
        </div>

        <div className="mb-6 flex gap-2">
          {SUPPORTED_LOCALES.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setEditLocale(loc)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                editLocale === loc
                  ? 'bg-accent text-white'
                  : 'bg-surface-muted text-ink-muted hover:text-ink'
              }`}
            >
              {translate(uiLocale, loc === 'ko' ? 'lang.ko' : 'lang.en')}
            </button>
          ))}
        </div>

        <section className="ui-card mb-6 p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            {translate(uiLocale, 'admin.homeEditorHero')}
          </h2>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-ink-muted">
              {translate(uiLocale, 'admin.homeEditorHeroTagline')}
            </span>
            <textarea
              className="ui-textarea mt-1.5"
              rows={2}
              value={localeContent.hero_tagline}
              onChange={(e) => patchLocale({ hero_tagline: e.target.value })}
            />
          </label>
        </section>

        <section className="ui-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">
                {translate(uiLocale, 'admin.homeEditorShowcase')}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {translate(uiLocale, 'admin.homeEditorShowcaseHint', {
                  max: String(MAX_SHOWCASE_SLOTS),
                })}
              </p>
            </div>
            <button
              type="button"
              className="ui-btn-secondary py-1.5 text-sm"
              disabled={!canAdd}
              onClick={addSlot}
            >
              <Plus size={14} />
              {translate(uiLocale, 'admin.homeEditorAddSlot')}
            </button>
          </div>

          <div className="mt-4 space-y-6">
            {slots.length === 0 ? (
              <p className="text-sm text-ink-muted">
                {translate(uiLocale, 'admin.homeEditorNoSlots')}
              </p>
            ) : (
              slots.map((slot, index) => (
                <div
                  key={slot.id}
                  className="rounded-lg border border-stone-200 bg-surface p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-ink-faint">
                      {translate(uiLocale, 'admin.homeEditorSlotNumber', {
                        n: String(index + 1),
                      })}
                    </span>
                    <button
                      type="button"
                      className="ui-btn-ghost p-2 text-red-600"
                      aria-label={translate(uiLocale, 'common.delete')}
                      onClick={() => removeSlot(index)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="text-xs text-ink-faint">
                        {translate(uiLocale, 'admin.homeEditorSlotTitle')}
                      </span>
                      <input
                        className="ui-input mt-1"
                        value={slot.title}
                        placeholder="Blue"
                        onChange={(e) => updateSlot(index, { title: e.target.value })}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs text-ink-faint">
                        {translate(uiLocale, 'admin.homeEditorTagline')}
                      </span>
                      <input
                        className="ui-input mt-1"
                        value={slot.tagline}
                        onChange={(e) => updateSlot(index, { tagline: e.target.value })}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs text-ink-faint">
                        {translate(uiLocale, 'admin.homeEditorDetail')}
                      </span>
                      <textarea
                        className="ui-textarea mt-1"
                        rows={3}
                        value={slot.detail}
                        onChange={(e) => updateSlot(index, { detail: e.target.value })}
                      />
                    </label>
                    <CategoryImageField
                      value={slot.image_url}
                      onChange={(image_url) => updateSlot(index, { image_url })}
                      onUploadError={(text) => notify(text, 'error')}
                    />
                    <label className="block sm:col-span-2">
                      <span className="text-xs text-ink-faint">
                        {translate(uiLocale, 'admin.homeEditorPrimaryProduct')}
                      </span>
                      <select
                        className="ui-input mt-1"
                        value={slot.primary_product_slug ?? ''}
                        onChange={(e) =>
                          updateSlot(index, {
                            primary_product_slug: e.target.value || null,
                          })
                        }
                      >
                        <option value="">
                          {translate(uiLocale, 'admin.homeEditorPrimaryProductNone')}
                        </option>
                        {sortedProducts.map((p) => (
                          <option key={p.id} value={p.slug}>
                            {p.name} ({p.slug})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

    </AdminLayout>
  )
}
