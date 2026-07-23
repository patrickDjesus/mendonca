import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { NotificationProvider } from './components/NotificationProvider'
import ErrorBoundary from './components/ErrorBoundary'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/home/HomePage'

const VisaoGeral = lazy(() => import('./pages/home/VisaoGeral'))
const Documentos = lazy(() => import('./pages/home/Documentos'))
const Videos = lazy(() => import('./pages/home/Videos'))
const Desafios = lazy(() => import('./pages/home/Desafios'))
const Simulados = lazy(() => import('./pages/home/Simulados'))
const Perfil = lazy(() => import('./pages/home/Perfil'))
const Admin = lazy(() => import('./pages/home/Admin'))

function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#daa03c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Carregando...</span>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1714' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#daa03c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Carregando...</span>
      </div>
    </div>
  )
  if (!authed) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>}>
            <Route index element={<Suspense fallback={<PageFallback />}><VisaoGeral /></Suspense>} />
            <Route path="documentos" element={<Suspense fallback={<PageFallback />}><Documentos /></Suspense>} />
            <Route path="videos" element={<Suspense fallback={<PageFallback />}><Videos /></Suspense>} />
            <Route path="desafios" element={<Suspense fallback={<PageFallback />}><Desafios /></Suspense>} />
            <Route path="simulados" element={<Suspense fallback={<PageFallback />}><Simulados /></Suspense>} />
            <Route path="perfil" element={<Suspense fallback={<PageFallback />}><Perfil /></Suspense>} />
            <Route path="admin" element={<Suspense fallback={<PageFallback />}><Admin /></Suspense>} />
          </Route>
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </NotificationProvider>
    </ErrorBoundary>
  )
}

export default App
