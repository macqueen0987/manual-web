/** Only the working copy (latest) row is editable in the admin editor. */
export function isVersionEditable(version: {
  is_latest: boolean
  is_published: boolean
}): boolean {
  return version.is_latest
}
