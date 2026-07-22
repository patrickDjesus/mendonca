import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fetchMyCounts, fetchRecentActivities, type Activity } from '../../lib/db'
import { SUBJECTS, SUBJECT_COLORS } from '../../types/doc'
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

function getRank(xp: number): { title: string; tier: number; color: string } {
  if (xp >= 5000) return { title: 'Mestre', tier: 5, color: '#daa03c' }
  if (xp >= 2000) return { title: 'Erudito', tier: 4, color: '#b450b4' }
  if (xp >= 800) return { title: 'Estudioso', tier: 3, color: '#508cc8' }
  if (xp >= 200) return { title: 'Aprendiz', tier: 2, color: '#50b478' }
  return { title: 'Iniciante', tier: 1, color: '#6a5a4a' }
}

function getLevelProgress(xp: number): number {
  const thresholds = [0, 200, 800, 2000, 5000]
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xp >= thresholds[i]) {
      const current = thresholds[i]
      const next = thresholds[i + 1] || thresholds[i] + 3000
      return Math.min(100, ((xp - current) / (next - current)) * 100)
    }
  }
  return 0
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
        for (const s of SUBJECTS) {
          if (a.title.includes(s)) {
            subMap[s] = (subMap[s] || 0) + 1
          }
        }
      }
      setSubjectCounts(subMap)
    }).catch(console.error)
  }, [])

  const rank = getRank(counts.xp)
  const levelProgress = getLevelProgress(counts.xp)
  const totalContent = counts.docs + counts.challenges + counts.videos
  const maxSubjectCount = Math.max(1, ...Object.values(subjectCounts))

  const greeting = userName || 'estudante'

  return (
    <div className="perfil-page">
      {/* ── Hero Card ─────────────────────────────────── */}
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
              {rank.tier}
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
            </div>
          </div>
        </div>

        {/* ── Rank + Level Bar ──────────────────────────── */}
        <div className="perfil-rank-section">
          <div className="perfil-rank-label">
            <span className="perfil-rank-title" style={{ color: rank.color }}>{rank.title}</span>
            <span className="perfil-rank-xp">{counts.xp.toLocaleString('pt-BR')} XP</span>
          </div>
          <div className="perfil-level-bar">
            <div className="perfil-level-fill" style={{ width: `${levelProgress}%`, background: rank.color }} />
          </div>
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────── */}
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

      {/* ── Subject Mastery ────────────────────────────── */}
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
            {SUBJECTS.filter(s => subjectCounts[s]).sort((a, b) => (subjectCounts[b] || 0) - (subjectCounts[a] || 0)).map(subject => {
              const colors = SUBJECT_COLORS[subject]
              const count = subjectCounts[subject] || 0
              const pct = Math.round((count / maxSubjectCount) * 100)
              return (
                <div key={subject} className="perfil-subject-row">
                  <div className="perfil-subject-info">
                    <div className="perfil-subject-dot" style={{ background: colors.text }} />
                    <span className="perfil-subject-name">{subject}</span>
                    <span className="perfil-subject-count">{count}</span>
                  </div>
                  <div className="perfil-subject-bar">
                    <div
                      className="perfil-subject-fill"
                      style={{ width: `${pct}%`, background: colors.text }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Activity Feed ──────────────────────────────── */}
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
