export interface EditorProduct {
  id: number
  name: string
  slug: string
}

export interface EditorVersion {
  id: number
  name: string
  slug: string
  is_latest: boolean
  is_published: boolean
}
