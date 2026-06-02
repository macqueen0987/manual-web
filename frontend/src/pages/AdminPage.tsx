import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useAuthStore } from '../stores/authStore'

interface Product {
  id: number
  name: string
  slug: string
  description: string | null
}

interface Version {
  id: number
  name: string
  slug: string
  is_published: boolean
  is_latest: boolean
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [versions, setVersions] = useState<Record<number, Version[]>>({})
  const [user, setUser] = useState<any>(null)
  const [newProductName, setNewProductName] = useState('')
  const [newProductSlug, setNewProductSlug] = useState('')
  const [newProductDesc, setNewProductDesc] = useState('')
  const [newVersionName, setNewVersionName] = useState('')
  const [newVersionSlug, setNewVersionSlug] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const loadData = async () => {
    const prods = await client.get('/products')
    setProducts(prods.data)
    const vers: Record<number, Version[]> = {}
    for (const p of prods.data) {
      const v = await client.get(`/products/${p.slug}/versions`)
      vers[p.id] = v.data
    }
    setVersions(vers)
  }

  useEffect(() => {
    client.get('/auth/me').then((res) => setUser(res.data))
    loadData()
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleCreateProduct = async () => {
    try {
      await client.post('/products', {
        name: newProductName,
        slug: newProductSlug,
        description: newProductDesc,
      })
      setNewProductName('')
      setNewProductSlug('')
      setNewProductDesc('')
      setMessage('Product created')
      loadData()
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to create product')
    }
  }

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Delete this product and all its data?')) return
    try {
      await client.delete(`/products/${id}`)
      setMessage('Product deleted')
      loadData()
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to delete')
    }
  }

  const handleCreateVersion = async () => {
    if (!selectedProductId) return
    try {
      await client.post('/versions', {
        product_id: selectedProductId,
        name: newVersionName,
        slug: newVersionSlug,
      })
      setNewVersionName('')
      setNewVersionSlug('')
      setMessage('Version created')
      loadData()
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to create version')
    }
  }

  const handlePublishLatest = async (productSlug: string) => {
    const name = prompt('Version name:', '2026.05.01')
    const slug = prompt('Version slug:', '2026-05-01')
    if (!name || !slug) return
    try {
      await client.post(`/products/${productSlug}/versions/publish`, { name, slug })
      setMessage('Version published from latest')
      loadData()
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to publish')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const first = products[0]
                if (first) {
                  navigate(`/admin/products/${first.slug}/latest/editor`)
                }
              }}
              disabled={products.length === 0}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Open Editor
            </button>
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {message && (
          <div className={`mb-4 rounded p-3 ${message.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}

        {/* Create Product */}
        <div className="mb-8 rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Create Product</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <input
              className="rounded border px-3 py-2"
              placeholder="Product Name"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
            />
            <input
              className="rounded border px-3 py-2"
              placeholder="Slug (a-z, 0-9, -)"
              value={newProductSlug}
              onChange={(e) => setNewProductSlug(e.target.value)}
            />
            <input
              className="rounded border px-3 py-2"
              placeholder="Description"
              value={newProductDesc}
              onChange={(e) => setNewProductDesc(e.target.value)}
            />
            <button
              onClick={handleCreateProduct}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Create
            </button>
          </div>
        </div>

        {/* Create Version */}
        <div className="mb-8 rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Create Version</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <select
              className="rounded border px-3 py-2"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
            >
              <option value="">Select Product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input
              className="rounded border px-3 py-2"
              placeholder="Version Name"
              value={newVersionName}
              onChange={(e) => setNewVersionName(e.target.value)}
            />
            <input
              className="rounded border px-3 py-2"
              placeholder="Slug"
              value={newVersionSlug}
              onChange={(e) => setNewVersionSlug(e.target.value)}
            />
            <button
              onClick={handleCreateVersion}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Create
            </button>
          </div>
        </div>

        {/* Products List */}
        <h2 className="mb-4 text-lg font-semibold">Products</h2>
        <div className="space-y-4">
          {products.map((product) => (
            <div key={product.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{product.name}</h3>
                  <p className="text-sm text-gray-500">/{product.slug}</p>
                  <p className="text-sm text-gray-600">{product.description}</p>
                </div>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="rounded bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200"
                >
                  Delete
                </button>
              </div>

              {/* Versions */}
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-medium text-gray-500">Versions</h4>
                <div className="flex flex-wrap gap-2">
                  {(versions[product.id] || []).map((v) => (
                    <div key={v.id} className="flex items-center gap-2 rounded bg-gray-100 px-3 py-1 text-sm">
                      <span>{v.name}</span>
                      {v.is_latest && (
                        <>
                          <span className="text-xs text-blue-600">(latest)</span>
                          <button
                            onClick={() =>
                              navigate(`/admin/products/${product.slug}/latest/editor`)
                            }
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handlePublishLatest(product.slug)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Publish snapshot
                          </button>
                        </>
                      )}
                      {v.is_published && <span className="text-xs text-green-600">(published)</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
