export type VersionFlags = {
  is_latest: boolean
  is_published: boolean
}

/** Editable: working copy (latest) or any unpublished snapshot. Published snapshots are read-only. */
export function isVersionEditable(version: VersionFlags): boolean {
  return version.is_latest || !version.is_published
}

/** i18n key for read-only snapshot badge in the editor toolbar. */
export function editorReadOnlySnapshotKey(
  version: VersionFlags,
): 'editorReadOnlyPublishedSnapshot' | 'editorReadOnlyUnpublishedSnapshot' | null {
  if (isVersionEditable(version)) return null
  return 'editorReadOnlyPublishedSnapshot'
}

type AdminTranslate = (
  key:
    | 'admin.latestBadge'
    | 'admin.publishedBadge'
    | 'admin.versionUnpublishedSuffix'
    | 'admin.editorReadOnlyPublishedSnapshot'
    | 'admin.editorReadOnlyUnpublishedSnapshot',
) => string

/** Version dropdown label: name + status suffix (matches editor toolbar). */
export function formatVersionOptionLabel(
  name: string,
  version: VersionFlags,
  t: AdminTranslate,
): string {
  if (version.is_latest) {
    return `${name} (${t('admin.latestBadge')})`
  }
  if (version.is_published) {
    return `${name} (${t('admin.publishedBadge')})`
  }
  return `${name}${t('admin.versionUnpublishedSuffix')}`
}

/** Read-only badge text in the editor toolbar, or null when the version is editable. */
export function formatEditorReadOnlyBadge(
  version: VersionFlags,
  t: AdminTranslate,
): string | null {
  const key = editorReadOnlySnapshotKey(version)
  if (!key) return null
  return key === 'editorReadOnlyPublishedSnapshot'
    ? t('admin.editorReadOnlyPublishedSnapshot')
    : t('admin.editorReadOnlyUnpublishedSnapshot')
}

export function readOnlySnapshotBadgeClass(version: VersionFlags): string {
  return version.is_published
    ? 'bg-stone-100 text-ink-muted'
    : 'bg-amber-50 text-amber-900'
}
