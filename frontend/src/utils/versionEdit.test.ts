import { describe, expect, it } from 'vitest'
import { translate, type Locale, type MessageKey } from '../i18n'
import {
  editorReadOnlySnapshotKey,
  formatEditorReadOnlyBadge,
  formatVersionOptionLabel,
  isVersionEditable,
  readOnlySnapshotBadgeClass,
} from './versionEdit'

function adminT(locale: Locale) {
  return (key: Extract<MessageKey, `admin.${string}`>) => translate(locale, key)
}

describe('isVersionEditable', () => {
  it('allows latest working copy', () => {
    expect(isVersionEditable({ is_latest: true, is_published: false })).toBe(true)
  })

  it('allows latest even when marked published', () => {
    expect(isVersionEditable({ is_latest: true, is_published: true })).toBe(true)
  })

  it('blocks published snapshots', () => {
    expect(isVersionEditable({ is_latest: false, is_published: true })).toBe(false)
  })

  it('allows unpublished non-latest drafts', () => {
    expect(isVersionEditable({ is_latest: false, is_published: false })).toBe(true)
  })
})

describe('editorReadOnlySnapshotKey', () => {
  it('returns null for working copy', () => {
    expect(editorReadOnlySnapshotKey({ is_latest: true, is_published: false })).toBeNull()
  })

  it('returns published key for published snapshot', () => {
    expect(editorReadOnlySnapshotKey({ is_latest: false, is_published: true })).toBe(
      'editorReadOnlyPublishedSnapshot',
    )
  })

  it('returns null for unpublished snapshot (editable)', () => {
    expect(editorReadOnlySnapshotKey({ is_latest: false, is_published: false })).toBeNull()
  })
})

describe('formatVersionOptionLabel', () => {
  const t = adminT('ko')

  it('labels working copy', () => {
    expect(formatVersionOptionLabel('2026.06.03', { is_latest: true, is_published: false }, t)).toBe(
      '2026.06.03 (작업 중)',
    )
  })

  it('labels published snapshot', () => {
    expect(formatVersionOptionLabel('2026.05.01', { is_latest: false, is_published: true }, t)).toBe(
      '2026.05.01 (발행됨)',
    )
  })

  it('labels unpublished snapshot (regression: must show 게시되지 않음)', () => {
    const label = formatVersionOptionLabel(
      '2026.06.03',
      { is_latest: false, is_published: false },
      t,
    )
    expect(label).toBe('2026.06.03 (게시되지 않음)')
    expect(label).not.toContain('게시됨')
    expect(label).not.toContain('발행됨')
  })

  it('labels unpublished snapshot in English', () => {
    expect(
      formatVersionOptionLabel('2026.06.03', { is_latest: false, is_published: false }, adminT('en')),
    ).toBe('2026.06.03 (not published)')
  })
})

describe('formatEditorReadOnlyBadge', () => {
  const t = adminT('ko')

  it('returns null for working copy', () => {
    expect(formatEditorReadOnlyBadge({ is_latest: true, is_published: false }, t)).toBeNull()
  })

  it('shows published snapshot message', () => {
    expect(formatEditorReadOnlyBadge({ is_latest: false, is_published: true }, t)).toBe(
      '게시된 스냅샷 — 읽기 전용',
    )
  })

  it('returns null for unpublished snapshot (editable)', () => {
    expect(formatEditorReadOnlyBadge({ is_latest: false, is_published: false }, t)).toBeNull()
  })
})

describe('readOnlySnapshotBadgeClass', () => {
  it('uses muted style for published snapshots', () => {
    expect(readOnlySnapshotBadgeClass({ is_latest: false, is_published: true })).toContain(
      'stone-100',
    )
  })

  it('uses amber style for unpublished snapshots', () => {
    expect(readOnlySnapshotBadgeClass({ is_latest: false, is_published: false })).toContain(
      'amber-50',
    )
  })
})

describe('editor version UI matrix', () => {
  const fixtures = [
    {
      name: 'working copy',
      version: { is_latest: true, is_published: false },
      editable: true,
      badge: null,
      optionSuffix: '(작업 중)',
    },
    {
      name: 'unpublished snapshot',
      version: { is_latest: false, is_published: false },
      editable: true,
      badge: null,
      optionSuffix: '(게시되지 않음)',
    },
    {
      name: 'published snapshot',
      version: { is_latest: false, is_published: true },
      editable: false,
      badge: '게시된 스냅샷 — 읽기 전용',
      optionSuffix: '(발행됨)',
    },
  ] as const

  const t = adminT('ko')

  for (const fx of fixtures) {
    it(`${fx.name}: editability and labels stay consistent`, () => {
      expect(isVersionEditable(fx.version)).toBe(fx.editable)
      expect(formatEditorReadOnlyBadge(fx.version, t)).toBe(fx.badge)
      const option = formatVersionOptionLabel('v1', fx.version, t)
      expect(option).toContain(fx.optionSuffix)
      if (fx.badge) {
        expect(option).not.toBe(fx.badge)
      }
    })
  }
})
