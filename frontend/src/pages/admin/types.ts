import type { ProductWithCategory } from '../../utils/productCategories'

export type AdminProduct = ProductWithCategory

export interface AdminVersion {
  id: number
  name: string
  slug: string
  is_published: boolean
  is_latest: boolean
}
