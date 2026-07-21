import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/home/HomePage'
import VisaoGeral from './pages/home/VisaoGeral'
import Documentos from './pages/home/Documentos'
import Videos from './pages/home/Videos'
import Desafios from './pages/home/Desafios'
import Simulados from './pages/home/Simulados'
import Perfil from './pages/home/Perfil'

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
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>}>
        <Route index element={<VisaoGeral />} />
        <Route path="documentos" element={<Documentos />} />
        <Route path="videos" element={<Videos />} />
        <Route path="desafios" element={<Desafios />} />
        <Route path="simulados" element={<Simulados />} />
        <Route path="perfil" element={<Perfil />} />
      </Route>
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  )
}

export default App
