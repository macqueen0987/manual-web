export interface VersionRouteInfo {
  slug: string
  is_latest: boolean
}

export function versionRouteSlug(v: VersionRouteInfo): string {
  return v.is_latest ? 'latest' : v.slug
}

/** Map URL segments to version slug + document slug (ProductPage routing). */
export function resolveVersionAndDoc(
  versions: VersionRouteInfo[],
  defaultVersionSlug: string,
  versionSlugParam?: string,
  maybeSegment?: string,
  docSplat?: string,
): { versionSlug: string; docSlug: string } {
  const versionSlugs = new Set(versions.map(versionRouteSlug))

  if (versionSlugParam !== undefined) {
    return {
      versionSlug: versionSlugParam,
      docSlug: (docSplat || '').replace(/^\/+/, ''),
    }
  }

  if (maybeSegment) {
    if (versionSlugs.has(maybeSegment)) {
      return { versionSlug: maybeSegment, docSlug: '' }
    }
    return { versionSlug: defaultVersionSlug, docSlug: maybeSegment }
  }

  return { versionSlug: defaultVersionSlug, docSlug: '' }
}
