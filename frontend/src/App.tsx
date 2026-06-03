import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import client from './api/client'
import SetupPage from './pages/SetupPage'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import AdminHomePage from './pages/AdminHomePage'
import ProductPage from './pages/ProductPage'
import EditorPage from './pages/EditorPage'
import MediaPage from './pages/MediaPage'
import PageLoader from './components/ui/PageLoader'
import ErrorBoundary from './components/ErrorBoundary'
import AdminRoute from './components/auth/AdminRoute'
import { translate } from './i18n'
import { useLocaleStore } from './stores/localeStore'
import { useSiteBranding } from './hooks/useSiteBranding'

function App() {
  useSiteBranding()
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null)
  const [setupLoading, setSetupLoading] = useState(true)
  const bootstrap = useAuthStore((s) => s.bootstrap)
  const sessionReady = useAuthStore((s) => s.sessionReady)
  const locale = useLocaleStore((s) => s.locale)

  useEffect(() => {
    void bootstrap({ fetchUser: true })
    checkSetup()
  }, [bootstrap])

  const checkSetup = async () => {
    try {
      const res = await client.get('/setup/status')
      setIsSetupComplete(res.data.is_setup_complete)
    } catch {
      setIsSetupComplete(false)
    } finally {
      setSetupLoading(false)
    }
  }

  if (setupLoading || !sessionReady) {
    return <PageLoader label={translate(locale, 'common.starting')} />
  }

  return (
    <ErrorBoundary>
    <Routes>
      {!isSetupComplete && (
        <Route path="/setup" element={<SetupPage onComplete={checkSetup} />} />
      )}
      {!isSetupComplete && <Route path="*" element={<Navigate to="/setup" />} />}

      {isSetupComplete && (
        <>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomePage />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/home"
            element={
              <AdminRoute>
                <AdminHomePage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/media"
            element={
              <AdminRoute>
                <MediaPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/products/:productSlug/:versionSlug/editor/:docSlug"
            element={
              <AdminRoute>
                <EditorPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/products/:productSlug/:versionSlug/editor"
            element={
              <AdminRoute>
                <EditorPage />
              </AdminRoute>
            }
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
    </ErrorBoundary>
  )
}

export default App
