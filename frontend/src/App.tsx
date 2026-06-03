import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import client from './api/client'
import SetupPage from './pages/SetupPage'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import ProductPage from './pages/ProductPage'
import EditorPage from './pages/EditorPage'
import MediaPage from './pages/MediaPage'
import PageLoader from './components/ui/PageLoader'
import { translate } from './i18n'
import { useLocaleStore } from './stores/localeStore'

function App() {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const { validateSession, isAuthenticated } = useAuthStore()
  const locale = useLocaleStore((s) => s.locale)

  useEffect(() => {
    void validateSession()
    checkSetup()
  }, [validateSession])

  const checkSetup = async () => {
    try {
      const res = await client.get('/setup/status')
      setIsSetupComplete(res.data.is_setup_complete)
    } catch {
      setIsSetupComplete(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <PageLoader label={translate(locale, 'common.starting')} />

  return (
    <Routes>
      {!isSetupComplete && (
        <Route path="/setup" element={<SetupPage onComplete={checkSetup} />} />
      )}
      {!isSetupComplete && <Route path="*" element={<Navigate to="/setup" />} />}
      
      {isSetupComplete && (
        <>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={isAuthenticated ? <AdminPage /> : <Navigate to="/login" />} />
          <Route path="/admin/media" element={isAuthenticated ? <MediaPage /> : <Navigate to="/login" />} />
          <Route
            path="/admin/products/:productSlug/:versionSlug/editor/:docSlug"
            element={isAuthenticated ? <EditorPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/products/:productSlug/:versionSlug/editor"
            element={isAuthenticated ? <EditorPage /> : <Navigate to="/login" />}
          />
          <Route path="/admin/editor" element={<Navigate to="/admin" replace />} />
          <Route path="/:productSlug/:versionSlug/*" element={<ProductPage />} />
          <Route path="/:productSlug/:versionSlug" element={<ProductPage />} />
          <Route path="/:productSlug/:maybeDocOrVersion" element={<ProductPage />} />
          <Route path="/:productSlug" element={<ProductPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </>
      )}
    </Routes>
  )
}

export default App
