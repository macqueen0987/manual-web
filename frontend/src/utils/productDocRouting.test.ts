import { describe, expect, it } from 'vitest'
import { resolveVersionAndDoc } from './productDocRouting'

const versions = [
  { slug: 'latest', is_latest: true },
  { slug: 'f4a15ed7', is_latest: false },
]

describe('resolveVersionAndDoc', () => {
  it('uses explicit version param from /:product/:version/* route', () => {
    expect(
      resolveVersionAndDoc(versions, 'f4a15ed7', 'f4a15ed7', undefined, 'page-abc'),
    ).toEqual({ versionSlug: 'f4a15ed7', docSlug: 'page-abc' })
  })

  it('treats unknown segment as document slug under default version', () => {
    expect(resolveVersionAndDoc(versions, 'f4a15ed7', undefined, '2026.06.03')).toEqual({
      versionSlug: 'f4a15ed7',
      docSlug: '2026.06.03',
    })
  })

  it('recognizes version slug in two-segment URL', () => {
    expect(resolveVersionAndDoc(versions, 'f4a15ed7', undefined, 'f4a15ed7')).toEqual({
      versionSlug: 'f4a15ed7',
      docSlug: '',
    })
  })

  it('defaults to published version with empty doc', () => {
    expect(resolveVersionAndDoc(versions, 'f4a15ed7')).toEqual({
      versionSlug: 'f4a15ed7',
      docSlug: '',
    })
  })
})
