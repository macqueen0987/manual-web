import type { AdminProduct, AdminVersion } from '../pages/admin/types'

export const sampleProduct: AdminProduct = {
  id: 1,
  name: 'Alpha Docs',
  slug: 'alpha',
  description: 'Sample product',
  category: 'Platform',
  sort_order: 0,
}

export const workingVersion: AdminVersion = {
  id: 10,
  name: 'latest',
  slug: 'latest',
  is_latest: true,
  is_published: false,
}

export const publishedVersion: AdminVersion = {
  id: 11,
  name: '2026.06.03',
  slug: '20260603',
  is_latest: false,
  is_published: true,
}

export const draftVersion: AdminVersion = {
  id: 12,
  name: 'draft',
  slug: 'draft',
  is_latest: false,
  is_published: false,
}
