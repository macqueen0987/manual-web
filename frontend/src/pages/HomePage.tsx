import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'

interface Product {
  id: number
  name: string
  slug: string
  description: string | null
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get('/products').then((res) => {
      setProducts(res.data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">Manual Web</h1>
          <Link to="/login" className="text-blue-600 hover:underline">
            Admin Login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="mb-6 text-2xl font-bold">Products</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold">{product.name}</h3>
              <p className="mb-4 text-gray-600">{product.description || 'No description'}</p>
              <Link
                to={`/${product.slug}`}
                className="text-blue-600 hover:underline"
              >
                View Documentation →
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
