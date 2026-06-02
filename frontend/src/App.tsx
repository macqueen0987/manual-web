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

function App() {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const { init, isAuthenticated } = useAuthStore()

  useEffect(() => {
    init()
    checkSetup()
  }, [])

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

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
