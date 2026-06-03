import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import AuthShell from '../components/layout/AuthShell'
import Alert from '../components/ui/Alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '../stores/authStore'
import { translate } from '../i18n'
import { useLocaleStore } from '../stores/localeStore'

export default function LoginPage() {
  const locale = useLocaleStore((s) => s.locale)
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
      setError(detail || translate(locale, 'account.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title={translate(locale, 'account.loginTitle')}
      subtitle={translate(locale, 'account.loginSubtitle')}
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
          {loading ? translate(locale, 'account.loggingIn') : translate(locale, 'common.login')}
        </Button>
      </form>
    </AuthShell>
  )
}
