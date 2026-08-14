import { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { recordAction } from '../../lib/db'
import ToolWheel from '../../components/ToolWheel'
import Changelog from '../../components/Changelog'
import '../../styles/home.css'

export default function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [userName, setUserName] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [submenuPos, setSubmenuPos] = useState<{ top: number; left: number } | null>(null)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)

  const moreActive = location.pathname === '/home/perfil' || location.pathname === '/home/treino'

  useEffect(() => {
    if (!moreOpen) return
    const onDown = (e: MouseEvent) => {
      if (moreBtnRef.current?.contains(e.target as Node)) return
      if (submenuRef.current?.contains(e.target as Node)) return
      setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [moreOpen])

  const toggleMore = () => {
    const next = !moreOpen
    if (next && moreBtnRef.current) {
      const rect = moreBtnRef.current.getBoundingClientRect()
      setSubmenuPos({
        top: Math.max(rect.top, 10),
        left: Math.min(rect.right + 10, window.innerWidth - 212),
      })
    }
    setMoreOpen(next)
  }

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
      recordAction('login').catch(() => {})
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
      <button className="sidebar-hamburger" onClick={() => setSidebarOpen(prev => !prev)} type="button" aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {sidebarOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/logo.png" alt="Mendonça" className="sidebar-logo-img" />
        </div>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          <NavLink to="/home" end className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Visão geral</span>
          </NavLink>

          <NavLink to="/home/documentos" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>Documentos</span>
          </NavLink>

          <NavLink to="/home/videos" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <span>Vídeos</span>
          </NavLink>

          <NavLink to="/home/desafios" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Desafios</span>
          </NavLink>

          <NavLink to="/home/flashcards" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <span>Flash Cards</span>
          </NavLink>

          <button
            ref={moreBtnRef}
            type="button"
            className={`sidebar-item sidebar-more ${moreActive || moreOpen ? 'open' : ''}`}
            onClick={toggleMore}
            aria-expanded={moreOpen}
            aria-label="Mais opções"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>Mais opções</span>
          </button>

        </nav>

        {moreOpen && submenuPos && (
          <div className="sidebar-submenu" ref={submenuRef} style={{ top: submenuPos.top, left: submenuPos.left }}>
            <NavLink to="/home/perfil" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={() => setMoreOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Perfil</span>
            </NavLink>

            <NavLink to="/home/treino" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={() => setMoreOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Treino</span>
            </NavLink>
          </div>
        )}

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
      <ToolWheel />
      <Changelog />
    </div>
  )
}
