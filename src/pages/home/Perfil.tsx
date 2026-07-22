import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fetchMyCounts, fetchRecentActivities, fetchStreak, fetchUserAchievements, type Activity, getLevelProgress, getRank } from '../../lib/db'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, CATEGORY_ICONS, type Achievement } from '../../data/achievements'
import '../../styles/perfil.css'

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d}d`
  const w = Math.floor(d / 7)
  return `há ${w}sem`
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function ActIcon({ icon, color }: { icon: string; color: string }) {
  const iconMap: Record<string, JSX.Element> = {
    book: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
    video: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
    challenge: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  }
  return (
    <div className="perfil-act-icon" style={{ background: `${color}20`, color }}>
      {iconMap[icon] || iconMap.challenge}
    </div>
  )
}

export default function Perfil() {
  const { userName } = useOutletContext<{ userName: string }>()
  const [email, setEmail] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [counts, setCounts] = useState({ docs: 0, challenges: 0, videos: 0, xp: 0, streak: 0 })
  const [activities, setActivities] = useState<Activity[]>([])
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({})
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email || '')
      setCreatedAt(new Date(user.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }))
    })
    fetchMyCounts().then(setCounts).catch(console.error)
    fetchRecentActivities(20).then(acts => {
      setActivities(acts)
      const subMap: Record<string, number> = {}
      for (const a of acts) {
        const subjects = ['Física', 'Química', 'Biologia', 'Matemática', 'Linguagens', 'Ciências Humanas', 'Ciências da Natureza', 'Geografia', 'História', 'Filosofia']
        for (const s of subjects) {
          if (a.title.includes(s)) subMap[s] = (subMap[s] || 0) + 1
        }
      }
      setSubjectCounts(subMap)
    }).catch(console.error)
    fetchUserAchievements().then(ua => {
      setUnlockedIds(new Set(ua.map(a => a.achievementId)))
    }).catch(console.error)
  }, [])

  const levelInfo = getLevelProgress(counts.xp)
  const rank = getRank(counts.xp)
  const greeting = userName || 'estudante'
  const maxSubjectCount = Math.max(1, ...Object.values(subjectCounts))

  const filteredAchievements = activeCategory
    ? ACHIEVEMENTS.filter(a => a.category === activeCategory)
    : ACHIEVEMENTS
  const unlockedCount = ACHIEVEMENTS.filter(a => unlockedIds.has(a.id)).length
  const totalBonusPct = unlockedCount * 10

  return (
    <div className="perfil-page">
      {/* Hero Card */}
      <div className="perfil-hero">
        <div className="perfil-hero-bg">
          <div className="perfil-hero-orb perfil-orb-1" />
          <div className="perfil-hero-orb perfil-orb-2" />
          <div className="perfil-hero-orb perfil-orb-3" />
        </div>

        <div className="perfil-hero-content">
          <div className="perfil-avatar-wrap">
            <div className="perfil-avatar-ring" style={{ borderColor: rank.color }}>
              <div className="perfil-avatar">
                <span>{getInitials(greeting)}</span>
              </div>
            </div>
            <div className="perfil-avatar-badge" style={{ background: rank.color }}>
              {levelInfo.level}
            </div>
          </div>

          <div className="perfil-info">
            <h1 className="perfil-name">{greeting}</h1>
            <p className="perfil-email">{email}</p>
            <div className="perfil-meta-row">
              <span className="perfil-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Membro desde {createdAt}
              </span>
              <span className="perfil-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {unlockedCount}/{ACHIEVEMENTS.length} conquistas
              </span>
            </div>
          </div>
        </div>

        {/* Rank + Level Bar */}
        <div className="perfil-rank-section">
          <div className="perfil-rank-label">
            <span className="perfil-rank-title" style={{ color: rank.color }}>{rank.title}</span>
            <span className="perfil-rank-xp">{counts.xp.toLocaleString('pt-BR')} XP</span>
          </div>
          <div className="perfil-level-bar">
            <div className="perfil-level-fill" style={{ width: `${levelInfo.percent}%`, background: rank.color }} />
          </div>
          <div className="perfil-level-info">
            <span>Nível {levelInfo.level}</span>
            <span>{(levelInfo.needed - levelInfo.current).toLocaleString('pt-BR')} XP para próximo nível</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="perfil-stats">
        <div className="perfil-stat-card">
          <div className="perfil-stat-icon" style={{ background: 'rgba(218,160,60,0.15)', color: '#daa03c' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="perfil-stat-value">{counts.streak}</div>
          <div className="perfil-stat-label">Sequência</div>
        </div>

        <div className="perfil-stat-card">
          <div className="perfil-stat-icon" style={{ background: 'rgba(80,140,200,0.15)', color: '#508cc8' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="perfil-stat-value">{counts.docs}</div>
          <div className="perfil-stat-label">Documentos</div>
        </div>

        <div className="perfil-stat-card">
          <div className="perfil-stat-icon" style={{ background: 'rgba(200,80,80,0.15)', color: '#c85050' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <div className="perfil-stat-value">{counts.videos}</div>
          <div className="perfil-stat-label">Vídeos</div>
        </div>

        <div className="perfil-stat-card">
          <div className="perfil-stat-icon" style={{ background: 'rgba(180,80,180,0.15)', color: '#b450b4' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="perfil-stat-value">{counts.challenges}</div>
          <div className="perfil-stat-label">Desafios</div>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="perfil-section perfil-achievements-section">
        <div className="perfil-section-header">
          <h2 className="perfil-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="7" />
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
            </svg>
            Conquistas
          </h2>
          <span className="perfil-achievement-bonus">+{totalBonusPct}% XP</span>
        </div>

        <div className="perfil-achievement-cats">
          <button
            className={`perfil-ach-cat ${activeCategory === null ? 'active' : ''}`}
            onClick={() => setActiveCategory(null)}
            type="button"
          >
            Todas
          </button>
          {ACHIEVEMENT_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`perfil-ach-cat ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
              type="button"
            >
              {CATEGORY_ICONS[cat]} {cat}
            </button>
          ))}
        </div>

        <div className="perfil-achievement-grid">
          {filteredAchievements.map(ach => {
            const unlocked = unlockedIds.has(ach.id)
            return (
              <div key={ach.id} className={`perfil-achievement-card ${unlocked ? 'unlocked' : 'locked'}`}>
                <div className="perfil-ach-icon">{ach.icon}</div>
                <div className="perfil-ach-info">
                  <span className="perfil-ach-name">{ach.name}</span>
                  <span className="perfil-ach-desc">{ach.description}</span>
                </div>
                <div className="perfil-ach-badge">
                  {unlocked ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Subject Mastery */}
      {Object.keys(subjectCounts).length > 0 && (
        <div className="perfil-section">
          <h2 className="perfil-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
            Matérias mais estudadas
          </h2>
          <div className="perfil-subjects">
            {Object.keys(subjectCounts).sort((a, b) => (subjectCounts[b] || 0) - (subjectCounts[a] || 0)).map(subject => {
              const colors: Record<string, { text: string }> = {
                'Física': { text: '#508cc8' }, 'Química': { text: '#50b478' }, 'Biologia': { text: '#50b450' },
                'Matemática': { text: '#c88c3c' }, 'Linguagens': { text: '#b450b4' }, 'Ciências Humanas': { text: '#c86450' },
                'Ciências da Natureza': { text: '#50b890' }, 'Geografia': { text: '#3ca064' }, 'História': { text: '#c86450' },
                'Filosofia': { text: '#8c78c8' },
              }
              const c = colors[subject] || { text: '#6a5a4a' }
              const count = subjectCounts[subject] || 0
              const pct = Math.round((count / maxSubjectCount) * 100)
              return (
                <div key={subject} className="perfil-subject-row">
                  <div className="perfil-subject-info">
                    <div className="perfil-subject-dot" style={{ background: c.text }} />
                    <span className="perfil-subject-name">{subject}</span>
                    <span className="perfil-subject-count">{count}</span>
                  </div>
                  <div className="perfil-subject-bar">
                    <div className="perfil-subject-fill" style={{ width: `${pct}%`, background: c.text }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="perfil-section">
        <h2 className="perfil-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Atividade Recente
        </h2>
        <div className="perfil-activity-list">
          {activities.length === 0 && (
            <div className="perfil-empty-activity">
              <p>Nenhuma atividade registrada ainda.</p>
              <span>Comece estudando para ver seu histórico aqui!</span>
            </div>
          )}
          {activities.slice(0, 10).map(act => (
            <div key={act.id} className="perfil-activity-item">
              <ActIcon icon={act.icon} color={act.color} />
              <span className="perfil-activity-text">{act.title}</span>
              <span className="perfil-activity-time">{timeAgo(act.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
