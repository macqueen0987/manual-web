import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import AuthShell from '../components/layout/AuthShell'
import Alert from '../components/ui/Alert'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setTokens } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await client.post('/auth/login', { email, password })
      setTokens(res.data.access_token, res.data.refresh_token)
      navigate('/admin')
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail || '로그인에 실패했습니다. 이메일과 비밀번호를 확인하세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="관리자 로그인"
      subtitle="제품 매뉴얼을 편집하려면 로그인하세요"
    >
      {error && (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
            이메일
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
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
            autoComplete="current-password"
            className="ui-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" disabled={loading} className="ui-btn-primary w-full py-2.5">
          {loading ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </AuthShell>
  )
}
