import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkIsAdmin, adminListUsers, adminSetUserRole, adminDeleteUser, adminGetStats, type AdminUserProfile } from '../../lib/db'
import { pushNotification } from '../../components/NotificationProvider'
import '../../styles/admin.css'

export default function Admin() {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [users, setUsers] = useState<AdminUserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingUser, setEditingUser] = useState<AdminUserProfile | null>(null)
  const [stats, setStats] = useState({ totalUsers: 0, totalDocs: 0, totalChallenges: 0, totalVideos: 0 })
  const [tab, setTab] = useState<'users' | 'stats' | 'settings'>('users')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    checkIsAdmin().then(admin => {
      if (!mounted) return
      setIsAdmin(admin)
      if (admin) loadUsers()
      else setLoading(false)
    }).catch(() => { if (mounted) { setIsAdmin(false); setLoading(false) } })
    return () => { mounted = false }
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await adminListUsers()
      setUsers(data)
      setStats(prev => ({ ...prev, totalUsers: data.length }))
    } catch (e) {
      console.error('Erro ao listar usuários:', e)
      pushNotification({ type: 'info', title: 'Erro', message: 'Não foi possível listar os usuários.' })
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!isAdmin) return
    adminGetStats().then(s => setStats(s)).catch(console.error)
  }, [isAdmin])

  const handleSetRole = useCallback(async (userId: string, role: 'admin' | 'user') => {
    setActionLoading(true)
    try {
      await adminSetUserRole(userId, role)
      setUsers(prev => prev.map(u => u.userId === userId ? { ...u, isAdmin: role === 'admin' } : u))
      pushNotification({ type: 'info', title: 'Papel atualizado', message: `Usuário agora é "${role}".` })
    } catch (e) {
      console.error('Erro ao atualizar papel:', e)
      pushNotification({ type: 'info', title: 'Erro', message: 'Não foi possível atualizar o papel.' })
    }
    setActionLoading(false)
    setEditingUser(null)
  }, [])

  const handleDeleteUser = useCallback(async (userId: string) => {
    if (!confirm('Tem certeza que deseja deletar este usuário? Esta ação é irreversível.')) return
    setActionLoading(true)
    try {
      await adminDeleteUser(userId)
      setUsers(prev => prev.filter(u => u.userId !== userId))
      pushNotification({ type: 'info', title: 'Usuário deletado', message: 'O usuário foi removido.' })
    } catch (e) {
      console.error('Erro ao deletar:', e)
      pushNotification({ type: 'info', title: 'Erro', message: 'Não foi possível deletar o usuário.' })
    }
    setActionLoading(false)
  }, [])

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.name.toLowerCase().includes(search.toLowerCase())
  )

  if (isAdmin === false) {
    return (
      <div className="admin-page">
        <div className="admin-denied">
          <span className="admin-denied-icon">🔒</span>
          <h3>Acesso Negado</h3>
          <p>Você não tem permissão de administrador.</p>
          <button className="admin-btn primary" onClick={() => navigate('/home')}>Voltar</button>
        </div>
      </div>
    )
  }

  if (isAdmin === null || loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading"><div className="quiz-spinner" /></div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-header-left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h1 className="admin-title">Administração</h1>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')} type="button">
          Usuários ({users.length})
        </button>
        <button className={`admin-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')} type="button">
          Estatísticas
        </button>
        <button className={`admin-tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')} type="button">
          Configurações
        </button>
      </div>

      {tab === 'users' && (
        <div className="admin-section">
          <div className="admin-toolbar">
            <input
              className="admin-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email..."
            />
            <button className="admin-btn secondary" onClick={loadUsers} disabled={loading} type="button">
              {loading ? 'Carregando...' : 'Atualizar'}
            </button>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Email</th>
                  <th>Papel</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.userId}>
                    <td className="admin-user-name">
                      <div className="admin-avatar" style={{ background: u.isAdmin ? '#daa03c30' : '#508cc830', color: u.isAdmin ? '#daa03c' : '#508cc8' }}>
                        {(u.name || u.email)[0]?.toUpperCase() || '?'}
                      </div>
                      <span>{u.name || 'Sem nome'}</span>
                    </td>
                    <td className="admin-email">{u.email}</td>
                    <td>
                      <span className={`admin-role-badge role-${u.isAdmin ? 'admin' : 'user'}`}>
                        {u.isAdmin ? 'Admin' : 'Usuário'}
                      </span>
                    </td>
                    <td className="admin-date">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="admin-actions">
                      <button className="admin-btn small" onClick={() => setEditingUser(u)} type="button">Editar</button>
                      <button className="admin-btn small danger" onClick={() => handleDeleteUser(u.userId)} type="button">Deletar</button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={5} className="admin-empty">Nenhum usuário encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'stats' && (
        <div className="admin-section">
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-value">{stats.totalUsers}</span>
              <span className="admin-stat-label">Usuários</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value">{stats.totalDocs}</span>
              <span className="admin-stat-label">Documentos</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value">{stats.totalChallenges}</span>
              <span className="admin-stat-label">Desafios</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value">{stats.totalVideos}</span>
              <span className="admin-stat-label">Vídeos</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="admin-section">
          <div className="admin-settings-card">
            <h3>Configurações Gerais</h3>
            <p className="admin-settings-hint">Painel de configurações do administrador.</p>
            <div className="admin-settings-list">
              <div className="admin-settings-item">
                <span>Modo manutenção</span>
                <span className="admin-role-badge">Em breve</span>
              </div>
              <div className="admin-settings-item">
                <span>Notificações em massa</span>
                <span className="admin-role-badge">Em breve</span>
              </div>
              <div className="admin-settings-item">
                <span>Backup do banco</span>
                <span className="admin-role-badge">Em breve</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="admin-modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3>Editar Usuário</h3>
            <div className="admin-modal-info">
              <p><strong>{editingUser.name || editingUser.email}</strong></p>
              <p className="admin-email">{editingUser.email}</p>
            </div>
            <div className="admin-modal-field">
              <label>Papel</label>
              <div className="admin-modal-btns">
                <button
                  className={`admin-btn ${!editingUser.isAdmin ? 'primary' : 'secondary'}`}
                  onClick={() => handleSetRole(editingUser.userId, 'user')}
                  disabled={actionLoading}
                  type="button"
                >
                  Usuário
                </button>
                <button
                  className={`admin-btn ${editingUser.isAdmin ? 'primary' : 'secondary'}`}
                  onClick={() => handleSetRole(editingUser.userId, 'admin')}
                  disabled={actionLoading}
                  type="button"
                >
                  Admin
                </button>
              </div>
            </div>
            <div className="admin-modal-actions">
              <button className="admin-btn secondary" onClick={() => setEditingUser(null)} type="button">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
