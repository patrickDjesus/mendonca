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

  if (loading) return null
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
