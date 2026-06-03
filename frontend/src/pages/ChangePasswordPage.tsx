import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import AuthShell from '../components/layout/AuthShell'
import Alert from '../components/ui/Alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { translate } from '../i18n'
import { useLocaleStore } from '../stores/localeStore'

export default function ChangePasswordPage() {
  const locale = useLocaleStore((s) => s.locale)
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 8) {
      setError(translate(locale, 'account.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(translate(locale, 'account.passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      await client.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setSuccess(translate(locale, 'account.passwordChanged'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      window.setTimeout(() => navigate(-1), 1200)
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      if (typeof detail === 'string' && detail.toLowerCase().includes('incorrect')) {
        setError(translate(locale, 'account.wrongCurrentPassword'))
      } else {
        setError(translate(locale, 'account.passwordChangeFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title={translate(locale, 'account.changePasswordTitle')}
      subtitle={translate(locale, 'account.changePasswordSubtitle')}
    >
      {error && (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mb-5">
          <Alert variant="info">{success}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="current-password">{translate(locale, 'account.currentPassword')}</Label>
          <Input
            id="current-password"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">{translate(locale, 'account.newPassword')}</Label>
          <Input
            id="new-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">{translate(locale, 'account.confirmPassword')}</Label>
          <Input
            id="confirm-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading
            ? translate(locale, 'account.changingPassword')
            : translate(locale, 'account.changePassword')}
        </Button>
      </form>
    </AuthShell>
  )
}
