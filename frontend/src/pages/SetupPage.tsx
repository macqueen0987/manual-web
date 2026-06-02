import { useState } from 'react'
import client from '../api/client'

interface SetupPageProps {
  onComplete: () => void
}

export default function SetupPage({ onComplete }: SetupPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [productName, setProductName] = useState('')
  const [productSlug, setProductSlug] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await client.post('/setup/init', {
        admin: { email, password, full_name: fullName },
        product: { name: productName, slug: productSlug, description },
      })
      onComplete()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold">Initial Setup</h1>
        <p className="mb-6 text-gray-600">Create your admin account and first product.</p>

        {error && <div className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold">Admin Account</h2>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              className="mt-1 w-full rounded border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              required
              className="mt-1 w-full rounded border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Full Name</label>
            <input
              type="text"
              className="mt-1 w-full rounded border px-3 py-2"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <h2 className="pt-4 text-lg font-semibold">First Product</h2>
          <div>
            <label className="block text-sm font-medium">Product Name</label>
            <input
              type="text"
              required
              className="mt-1 w-full rounded border px-3 py-2"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Slug (URL)</label>
            <input
              type="text"
              required
              pattern="[a-z0-9-]+"
              className="mt-1 w-full rounded border px-3 py-2"
              value={productSlug}
              onChange={(e) => setProductSlug(e.target.value)}
              placeholder="my-product"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  )
}
