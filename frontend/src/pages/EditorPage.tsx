import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import MDEditor from '@uiw/react-md-editor'
import client from '../api/client'

interface Product {
  id: number
  name: string
  slug: string
}

interface Version {
  id: number
  name: string
  slug: string
  product_id: number
  is_latest: boolean
}

interface DocumentItem {
  id: number
  title: string
  slug: string
}

export default function EditorPage() {
  const { productSlug, versionSlug, docId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [products, setProducts] = useState<Product[]>([])
  const [versions, setVersions] = useState<Version[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>(productSlug || '')
  const [selectedVersion, setSelectedVersion] = useState<string>(versionSlug || 'latest')
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  const [selectedDocSlug, setSelectedDocSlug] = useState<string>(docId || '')
  const [content, setContent] = useState<string>('')
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageIsError, setMessageIsError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (productSlug) setSelectedProduct(productSlug)
    if (versionSlug) setSelectedVersion(versionSlug)
    if (docId) setSelectedDocSlug(docId)
  }, [productSlug, versionSlug, docId])

  useEffect(() => {
    client.get('/products').then((res) => {
      setProducts(res.data)
      if (!selectedProduct && res.data.length > 0) {
        setSelectedProduct(productSlug || res.data[0].slug)
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedProduct) return
    const product = products.find((p) => p.slug === selectedProduct)
    if (!product) return
    client.get(`/products/${selectedProduct}/versions`).then((res) => {
      setVersions(res.data)
      if (!selectedVersion || !res.data.find((v: Version) => v.slug === selectedVersion)) {
        const latest = res.data.find((v: Version) => v.is_latest)
        setSelectedVersion(latest?.slug || res.data[0]?.slug)
      }
    })
  }, [selectedProduct])

  useEffect(() => {
    if (!selectedProduct || !selectedVersion) return
    client
      .get(`/products/${selectedProduct}/versions/${selectedVersion}/documents`)
      .then((res) => {
        const flatten = (nodes: any[]): DocumentItem[] => {
          const result: DocumentItem[] = []
          for (const node of nodes) {
            result.push({ id: node.id, title: node.title, slug: node.slug })
            if (node.children) result.push(...flatten(node.children))
          }
          return result
        }
        setDocuments(flatten(res.data))
      })
  }, [selectedProduct, selectedVersion])

  useEffect(() => {
    if (!selectedProduct || !selectedVersion) return
    const expected = selectedDocSlug
      ? `/admin/products/${selectedProduct}/${selectedVersion}/editor/${selectedDocSlug}`
      : `/admin/products/${selectedProduct}/${selectedVersion}/editor`
    if (location.pathname !== expected) {
      navigate(expected, { replace: true })
    }
  }, [selectedProduct, selectedVersion, selectedDocSlug, location.pathname, navigate])

  useEffect(() => {
    if (!selectedDocSlug) {
      setSelectedDocId(null)
      setContent('')
      setTitle('')
      setSlug('')
      return
    }
    client
      .get(`/products/${selectedProduct}/versions/${selectedVersion}/documents/${selectedDocSlug}`)
      .then((res) => {
        setSelectedDocId(res.data.id)
        setContent(res.data.content)
        setTitle(res.data.title)
        setSlug(res.data.slug)
      })
  }, [selectedDocSlug, selectedProduct, selectedVersion])

  const handleSave = async () => {
    if (!selectedDocId) return
    setSaving(true)
    setMessage('')
    setMessageIsError(false)
    try {
      await client.put(`/documents/${selectedDocId}`, { content, title })
      setMessage('Saved successfully')
      setMessageIsError(false)
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Save failed')
      setMessageIsError(true)
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!title || !slug) return
    const version = versions.find((v) => v.slug === selectedVersion)
    if (!version) return
    setSaving(true)
    try {
      const res = await client.post('/documents', {
        version_id: version.id,
        title,
        slug,
        content,
        sort_order: 0,
      })
      setSelectedDocId(res.data.id)
      setSelectedDocSlug(res.data.slug)
      setMessage('Created successfully')
      setMessageIsError(false)
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Create failed')
      setMessageIsError(true)
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await client.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = res.data.url as string
      setContent((prev) => `${prev}\n![image](${url})\n`)
      setMessage('Image inserted')
      setMessageIsError(false)
    } catch {
      setMessage('Image upload failed')
      setMessageIsError(true)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">Document Editor</h1>
          <div className="flex items-center gap-4">
            {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageUpload(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
            >
              Upload image
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
            >
              Back to Admin
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {message && (
          <div
            className={`mb-4 rounded p-3 ${
              messageIsError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {message}
          </div>
        )}

        {/* Controls */}
        <div className="mb-6 grid gap-4 rounded-lg border bg-white p-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium">Product</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value)
                setSelectedDocSlug('')
                setSelectedDocId(null)
                setSelectedVersion('latest')
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Version</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={selectedVersion}
              onChange={(e) => {
                setSelectedVersion(e.target.value)
                setSelectedDocSlug('')
                setSelectedDocId(null)
              }}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.slug}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Document</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={selectedDocSlug}
              onChange={(e) => {
                setSelectedDocSlug(e.target.value)
                setSelectedDocId(null)
              }}
            >
              <option value="">New document...</option>
              {documents.map((d) => (
                <option key={d.id} value={d.slug}>{d.title}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            {selectedDocId ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={saving}
                className="w-full rounded bg-green-600 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
            )}
          </div>
        </div>

        {/* Title & Slug for new doc */}
        {!selectedDocId && (
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Title</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Slug</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="document-slug"
              />
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="rounded-lg border bg-white p-4" data-color-mode="light">
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || '')}
            height={600}
          />
        </div>
      </main>
    </div>
  )
}
