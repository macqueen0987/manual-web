import { describe, expect, it } from 'vitest'
import { isVersionEditable } from './versionEdit'

describe('isVersionEditable', () => {
  it('allows latest working copy', () => {
    expect(isVersionEditable({ is_latest: true, is_published: false })).toBe(true)
  })

  it('blocks published snapshots', () => {
    expect(isVersionEditable({ is_latest: false, is_published: true })).toBe(false)
  })

  it('blocks unpublished non-latest drafts', () => {
    expect(isVersionEditable({ is_latest: false, is_published: false })).toBe(false)
  })
})
