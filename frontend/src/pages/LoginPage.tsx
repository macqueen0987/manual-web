import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import AuthShell from '../components/layout/AuthShell'
import Alert from '../components/ui/Alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { loginWithTokens, fetchUserProfile } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await client.post('/auth/login', { email, password })
      loginWithTokens(res.data.access_token, res.data.refresh_token)
      await fetchUserProfile()
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
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? '로그인 중…' : '로그인'}
        </Button>
      </form>
    </AuthShell>
  )
}
