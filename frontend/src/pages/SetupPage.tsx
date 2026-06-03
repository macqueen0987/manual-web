import { useState } from 'react'
import client from '../api/client'
import AuthShell from '../components/layout/AuthShell'
import Alert from '../components/ui/Alert'
import { slugifyProductName } from '../utils/slugify'

interface SetupPageProps {
  onComplete: () => void
}

export default function SetupPage({ onComplete }: SetupPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [productName, setProductName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!productName.trim()) {
      setError('제품명을 입력해 주세요.')
      return
    }
    const slug = slugifyProductName(productName)
    setLoading(true)
    try {
      await client.post('/setup/init', {
        admin: { email, password, full_name: fullName },
        product: { name: productName.trim(), slug, description },
      })
      onComplete()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail || '설정에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="초기 설정"
      subtitle="관리자 계정과 첫 제품을 만듭니다. 한 번만 진행하면 됩니다."
      footer={null}
    >
      {error && (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-ink">관리자 계정</legend>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              className="ui-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
              className="ui-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-ink">
              이름 (선택)
            </label>
            <input
              id="fullName"
              type="text"
              className="ui-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-stone-100 pt-6">
          <legend className="text-sm font-semibold text-ink">첫 제품</legend>
          <div>
            <label htmlFor="productName" className="mb-1.5 block text-sm font-medium text-ink">
              제품명
            </label>
            <input
              id="productName"
              type="text"
              required
              className="ui-input"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-ink">
              설명 (선택)
            </label>
            <textarea
              id="description"
              className="ui-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={loading || !productName.trim()}
          className="ui-btn-primary w-full py-2.5"
        >
          {loading ? '설정 중…' : '설정 완료'}
        </button>
      </form>
    </AuthShell>
  )
}
