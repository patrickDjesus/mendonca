import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  checkIsAdmin, adminListUsers, adminSetUserRole, adminDeleteUser, adminGetStats,
  adminListUsersFull, adminSetUserXP, adminUnlockAchievementForUser, adminRemoveAchievementForUser,
  adminGetUserAchievements, adminDeleteUserDocuments, adminDeleteUserVideos,
  adminDeleteUserNotes, adminDeleteUserChallenges, adminResetUserStreak, adminPurgeUserData,
  type AdminUserProfile, type AdminFullUser,
} from '../../lib/db'
import { ACHIEVEMENTS, ACHIEVEMENT_MAP } from '../../data/achievements'
import { pushNotification } from '../../components/NotificationProvider'
import '../../styles/admin.css'

type Tab = 'users' | 'tools' | 'stats'

export default function Admin() {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [users, setUsers] = useState<AdminUserProfile[]>([])
  const [fullUsers, setFullUsers] = useState<AdminFullUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingUser, setEditingUser] = useState<AdminUserProfile | null>(null)
  const [stats, setStats] = useState({ totalUsers: 0, totalDocs: 0, totalChallenges: 0, totalVideos: 0 })
  const [tab, setTab] = useState<Tab>('users')
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
      pushNotification({ type: 'info', title: 'Erro', message: 'Não foi possível listar os usuários. Verifique se as funções RPC foram criadas no Supabase.' })
    }
    setLoading(false)
  }

  const loadFullUsers = async () => {
    setLoading(true)
    try {
      const data = await adminListUsersFull()
      setFullUsers(data)
    } catch (e) {
      console.error('Erro ao listar usuários:', e)
      pushNotification({ type: 'info', title: 'Erro', message: 'Não foi possível carregar dados completos.' })
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
      setFullUsers(prev => prev.map(u => u.userId === userId ? { ...u, isAdmin: role === 'admin' } : u))
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
      setFullUsers(prev => prev.filter(u => u.userId !== userId))
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
          <button className="admin-btn primary" onClick={() => navigate('/home')} type="button">Voltar</button>
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
        <button className={`admin-tab ${tab === 'tools' ? 'active' : ''}`} onClick={() => { setTab('tools'); if (fullUsers.length === 0) loadFullUsers() }} type="button">
          Ferramentas
        </button>
        <button className={`admin-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')} type="button">
          Estatísticas
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

      {tab === 'tools' && <ToolsTab fullUsers={fullUsers} setFullUsers={setFullUsers} loadFullUsers={loadFullUsers} loading={loading} />}

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

/* ═══════════════════════════════════════════════════════════
   TOOLS TAB
   ═══════════════════════════════════════════════════════════ */

function ToolsTab({ fullUsers, setFullUsers, loadFullUsers, loading }: { fullUsers: AdminFullUser[]; setFullUsers: React.Dispatch<React.SetStateAction<AdminFullUser[]>>; loadFullUsers: () => void; loading: boolean }) {
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [toolLoading, setToolLoading] = useState(false)
  const [xpInput, setXpInput] = useState('')
  const [userAchievements, setUserAchievements] = useState<Set<string>>(new Set())
  const [showAchievements, setShowAchievements] = useState(false)

  const selectedUser = fullUsers.find(u => u.userId === selectedUserId)

  const loadUserAchievements = useCallback(async (userId: string) => {
    try {
      const data = await adminGetUserAchievements(userId)
      setUserAchievements(new Set(data.map(a => a.achievementId)))
    } catch (e) {
      console.error(e)
      setUserAchievements(new Set())
    }
  }, [])

  const handleSelectUser = useCallback(async (userId: string) => {
    setSelectedUserId(userId)
    setShowAchievements(false)
    setUserAchievements(new Set())
    if (userId) {
      await loadUserAchievements(userId)
      setShowAchievements(true)
    }
  }, [loadUserAchievements])

  const handleSetXP = useCallback(async () => {
    if (!selectedUserId || !xpInput) return
    setToolLoading(true)
    try {
      const xp = parseInt(xpInput)
      if (isNaN(xp) || xp < 0) {
        pushNotification({ type: 'info', title: 'Erro', message: 'Valor de XP inválido.' })
        return
      }
      await adminSetUserXP(selectedUserId, xp)
      setFullUsers(prev => prev.map(u => u.userId === selectedUserId ? { ...u, totalXp: xp } : u))
      setXpInput('')
      pushNotification({ type: 'info', title: 'XP atualizado', message: `XP definido para ${xp.toLocaleString()}.` })
    } catch (e) {
      console.error(e)
      pushNotification({ type: 'info', title: 'Erro', message: 'Não foi possível atualizar o XP.' })
    }
    setToolLoading(false)
  }, [selectedUserId, xpInput, setFullUsers])

  const handleToggleAchievement = useCallback(async (achievementId: string) => {
    if (!selectedUserId) return
    setToolLoading(true)
    try {
      if (userAchievements.has(achievementId)) {
        await adminRemoveAchievementForUser(selectedUserId, achievementId)
        setUserAchievements(prev => { const n = new Set(prev); n.delete(achievementId); return n })
        pushNotification({ type: 'info', title: 'Conquista removida', message: `Removida de ${selectedUser?.name || 'usuário'}.` })
      } else {
        await adminUnlockAchievementForUser(selectedUserId, achievementId)
        setUserAchievements(prev => new Set(prev).add(achievementId))
        pushNotification({ type: 'achievement', title: 'Conquista desbloqueada!', message: `Definida para ${selectedUser?.name || 'usuário'}.`, icon: ACHIEVEMENT_MAP.get(achievementId)?.icon })
      }
    } catch (e) {
      console.error(e)
      pushNotification({ type: 'info', title: 'Erro', message: 'Não foi possível alterar a conquista.' })
    }
    setToolLoading(false)
  }, [selectedUserId, userAchievements, selectedUser, setFullUsers])

  const handleMassDelete = useCallback(async (type: 'docs' | 'videos' | 'notes' | 'challenges') => {
    if (!selectedUserId) return
    const labels = { docs: 'documentos', videos: 'vídeos', notes: 'anotações', challenges: 'desafios' }
    if (!confirm(`Tem certeza que deseja deletar todos os ${labels[type]} deste usuário?`)) return
    setToolLoading(true)
    try {
      let count = 0
      if (type === 'docs') count = await adminDeleteUserDocuments(selectedUserId)
      else if (type === 'videos') count = await adminDeleteUserVideos(selectedUserId)
      else if (type === 'notes') count = await adminDeleteUserNotes(selectedUserId)
      else if (type === 'challenges') count = await adminDeleteUserChallenges(selectedUserId)
      pushNotification({ type: 'info', title: 'Deletado', message: `${count} ${labels[type]} removidos.` })
      loadFullUsers()
    } catch (e) {
      console.error(e)
      pushNotification({ type: 'info', title: 'Erro', message: 'Não foi possível deletar.' })
    }
    setToolLoading(false)
  }, [selectedUserId, loadFullUsers])

  const handleResetStreak = useCallback(async () => {
    if (!selectedUserId) return
    if (!confirm('Resetar todo o streak e conquistas deste usuário?')) return
    setToolLoading(true)
    try {
      await adminResetUserStreak(selectedUserId)
      setUserAchievements(new Set())
      setFullUsers(prev => prev.map(u => u.userId === selectedUserId ? { ...u, totalXp: 0, currentStreak: 0 } : u))
      pushNotification({ type: 'info', title: 'Resetado', message: 'Streak e conquistas zerados.' })
    } catch (e) {
      console.error(e)
      pushNotification({ type: 'info', title: 'Erro', message: 'Não foi possível resetar.' })
    }
    setToolLoading(false)
  }, [selectedUserId, setFullUsers])

  const handleSetRole = useCallback(async (userId: string, role: 'admin' | 'user') => {
    setToolLoading(true)
    try {
      await adminSetUserRole(userId, role)
      setFullUsers(prev => prev.map(u => u.userId === userId ? { ...u, isAdmin: role === 'admin' } : u))
      pushNotification({ type: 'info', title: 'Papel atualizado', message: `Usuário agora é "${role}".` })
    } catch (e) {
      console.error('Erro ao atualizar papel:', e)
      pushNotification({ type: 'info', title: 'Erro', message: 'Não foi possível atualizar o papel.' })
    }
    setToolLoading(false)
  }, [setFullUsers])

  const handlePurgeAll = useCallback(async () => {
    if (!selectedUserId) return
    if (!confirm('ATENÇÃO: Isso vai DELETAR TODOS os dados deste usuário (docs, vídeos, notas, desafios, streak, conquistas). A conta será mantida. Continuar?')) return
    if (!confirm('Tem ABSOLUTA certeza? Esta ação é irreversível.')) return
    setToolLoading(true)
    try {
      await adminPurgeUserData(selectedUserId)
      setUserAchievements(new Set())
      setFullUsers(prev => prev.map(u => u.userId === selectedUserId ? { ...u, totalXp: 0, currentStreak: 0, docsCreated: 0, videosWatched: 0, challengesCompleted: 0, simuladosCompleted: 0, notesCreated: 0 } : u))
      pushNotification({ type: 'info', title: 'Dados purgados', message: 'Todos os dados do usuário foram removidos.' })
    } catch (e) {
      console.error(e)
      pushNotification({ type: 'info', title: 'Erro', message: 'Não foi possível purgar os dados.' })
    }
    setToolLoading(false)
  }, [selectedUserId, setFullUsers])

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <select
          className="admin-search"
          value={selectedUserId}
          onChange={e => handleSelectUser(e.target.value)}
        >
          <option value="">Selecionar usuário...</option>
          {fullUsers.map(u => (
            <option key={u.userId} value={u.userId}>
              {u.name || u.email} {u.isAdmin ? '(Admin)' : ''} — {u.totalXp.toLocaleString()} XP
            </option>
          ))}
        </select>
        <button className="admin-btn secondary" onClick={loadFullUsers} disabled={loading} type="button">
          {loading ? 'Carregando...' : 'Atualizar'}
        </button>
      </div>

      {!selectedUser && (
        <div className="admin-empty">Selecione um usuário para gerenciar.</div>
      )}

      {selectedUser && (
        <div className="admin-tools-grid">
          {/* User Info Card */}
          <div className="admin-tool-card">
            <h4>Informações</h4>
            <div className="admin-tool-info">
              <p><strong>{selectedUser.name || 'Sem nome'}</strong></p>
              <p className="admin-email">{selectedUser.email}</p>
              <span className={`admin-role-badge role-${selectedUser.isAdmin ? 'admin' : 'user'}`}>
                {selectedUser.isAdmin ? 'Admin' : 'Usuário'}
              </span>
            </div>
            <div className="admin-tool-stats">
              <div><span className="admin-tool-stat-val">{selectedUser.totalXp.toLocaleString()}</span><span className="admin-tool-stat-lbl">XP</span></div>
              <div><span className="admin-tool-stat-val">{selectedUser.currentStreak}</span><span className="admin-tool-stat-lbl">Streak</span></div>
              <div><span className="admin-tool-stat-val">{selectedUser.loginDays}</span><span className="admin-tool-stat-lbl">Dias</span></div>
            </div>
            <div className="admin-tool-actions">
              <button className={`admin-btn ${selectedUser.isAdmin ? 'secondary' : 'primary'}`} onClick={() => handleSetRole(selectedUserId, selectedUser.isAdmin ? 'user' : 'admin')} disabled={toolLoading} type="button">
                {selectedUser.isAdmin ? 'Remover Admin' : 'Tornar Admin'}
              </button>
            </div>
          </div>

          {/* XP Manager */}
          <div className="admin-tool-card">
            <h4>XP</h4>
            <div className="admin-tool-row">
              <span>Atual: <strong>{selectedUser.totalXp.toLocaleString()}</strong> XP</span>
            </div>
            <div className="admin-tool-row">
              <input
                className="admin-search"
                type="number"
                min="0"
                value={xpInput}
                onChange={e => setXpInput(e.target.value)}
                placeholder="Novo valor de XP"
              />
              <button className="admin-btn primary" onClick={handleSetXP} disabled={toolLoading || !xpInput} type="button">
                Definir XP
              </button>
            </div>
          </div>

          {/* Mass Delete */}
          <div className="admin-tool-card">
            <h4>Apagar em Massa</h4>
            <div className="admin-tool-row admin-tool-grid-2">
              <button className="admin-btn danger" onClick={() => handleMassDelete('docs')} disabled={toolLoading} type="button">
                Deletar Docs ({selectedUser.docsCreated})
              </button>
              <button className="admin-btn danger" onClick={() => handleMassDelete('videos')} disabled={toolLoading} type="button">
                Deletar Vídeos ({selectedUser.videosWatched})
              </button>
              <button className="admin-btn danger" onClick={() => handleMassDelete('notes')} disabled={toolLoading} type="button">
                Deletar Notas ({selectedUser.notesCreated})
              </button>
              <button className="admin-btn danger" onClick={() => handleMassDelete('challenges')} disabled={toolLoading} type="button">
                Deletar Desafios ({selectedUser.challengesCompleted})
              </button>
            </div>
          </div>

          {/* Reset & Purge */}
          <div className="admin-tool-card">
            <h4>Zona de Perigo</h4>
            <div className="admin-tool-row admin-tool-col">
              <button className="admin-btn danger" onClick={handleResetStreak} disabled={toolLoading} type="button">
                Resetar Streak e Conquistas
              </button>
              <button className="admin-btn danger" onClick={handlePurgeAll} disabled={toolLoading} type="button">
                Purgar Todos os Dados
              </button>
              <p className="admin-tool-hint">Estas ações são irreversíveis.</p>
            </div>
          </div>

          {/* Achievements */}
          {showAchievements && (
            <div className="admin-tool-card admin-tool-card-wide">
              <h4>Conquistas ({userAchievements.size}/{ACHIEVEMENTS.length})</h4>
              <div className="admin-achievements-grid">
                {ACHIEVEMENTS.map(a => {
                  const unlocked = userAchievements.has(a.id)
                  return (
                    <button
                      key={a.id}
                      className={`admin-achievement-item ${unlocked ? 'unlocked' : ''}`}
                      onClick={() => handleToggleAchievement(a.id)}
                      disabled={toolLoading}
                      type="button"
                      title={a.description}
                    >
                      <span className="admin-ach-icon">{a.icon}</span>
                      <span className="admin-ach-name">{a.name}</span>
                      <span className="admin-ach-badge">{unlocked ? '✓' : '○'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
