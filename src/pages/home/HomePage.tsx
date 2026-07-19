import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import '../../styles/home.css'

export default function HomePage() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')

  useEffect(() => {
    let mounted = true
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!mounted) return
      if (!user) {
        navigate('/auth')
        return
      }
      setUserName(user.user_metadata?.name || user.email || '')
    }
    getUser()
    return () => { mounted = false }
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="Mendonça" className="sidebar-logo-img" />
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/home" end className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Visão geral</span>
          </NavLink>

          <NavLink to="/home/documentos" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>Documentos</span>
          </NavLink>

          <NavLink to="/home/videos" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <span>Vídeos</span>
          </NavLink>

          <NavLink to="/home/desafios" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Desafios</span>
          </NavLink>

          <NavLink to="/home/perfil" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Perfil</span>
          </NavLink>
        </nav>

        <div className="sidebar-divider" />

        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-content">
        <Outlet context={{ userName }} />
      </main>
    </div>
  )
}
