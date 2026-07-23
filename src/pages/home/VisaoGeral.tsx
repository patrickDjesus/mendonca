import { useEffect, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import philosophers from '../../data/philosophers.json'
import { fetchMyCounts, fetchRecentActivities, type Activity, fetchGoals, createGoal, updateGoal, deleteGoal as deleteGoalDb, type Goal } from '../../lib/db'

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

const ENEM_DATE = new Date('2026-11-08T13:30:00-03:00')

function getTimeLeft() {
  const now = new Date()
  const diff = ENEM_DATE.getTime() - now.getTime()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function ActivityIcon({ icon, color }: { icon: string; color: string }) {
  if (icon === 'book') {
    return (
      <div className="act-icon" style={{ background: `${color}20`, color }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </div>
    )
  }
  if (icon === 'video') {
    return (
      <div className="act-icon" style={{ background: `${color}20`, color }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </div>
    )
  }
  if (icon === 'challenge') {
    return (
      <div className="act-icon" style={{ background: `${color}20`, color }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </div>
    )
  }
  return (
    <div className="act-icon" style={{ background: `${color}20`, color }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </div>
  )
}

export default function VisaoGeral() {
  const { userName } = useOutletContext<{ userName: string }>()
  const [timeLeft, setTimeLeft] = useState(getTimeLeft)
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * philosophers.length))
  const [quoteHovered, setQuoteHovered] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalInput, setGoalInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [counts, setCounts] = useState({ docs: 0, challenges: 0, videos: 0 })
  const [activities, setActivities] = useState<Activity[]>([])

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchMyCounts().then(setCounts).catch(console.error)
    fetchRecentActivities().then(setActivities).catch(console.error)
    fetchGoals().then(setGoals).catch(console.error)
  }, [])

  useEffect(() => {
    if (quoteHovered) return
    const quoteTimer = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % philosophers.length)
    }, 15000)
    return () => clearInterval(quoteTimer)
  }, [quoteHovered])

  const quote = philosophers[quoteIndex]

  function addGoal(e: FormEvent) {
    e.preventDefault()
    const text = goalInput.trim()
    if (!text) return
    setGoalInput('')
    createGoal(text).then(goal => {
      setGoals(prev => [...prev, goal])
    }).catch(err => {
      console.error('Erro ao salvar objetivo:', err)
    })
  }

  function toggleGoal(id: string) {
    const goal = goals.find(g => g.id === id)
    if (!goal) return
    const willBeDone = !goal.done
    const newCompletedAt = willBeDone ? Date.now() : null
    setGoals(prev => prev.map(g => {
      if (g.id !== id) return g
      return { ...g, done: willBeDone, completedAt: newCompletedAt }
    }))
    updateGoal(id, { done: willBeDone, completedAt: newCompletedAt }).catch(err => {
      console.error('Erro ao atualizar objetivo:', err)
      setGoals(prev => prev.map(g => {
        if (g.id !== id) return g
        return { ...g, done: goal.done, completedAt: goal.completedAt }
      }))
    })
  }

  function handleDeleteGoal(id: string) {
    const prev = goals
    setGoals(prev => prev.filter(g => g.id !== id))
    deleteGoalDb(id).catch(err => {
      console.error('Erro ao deletar objetivo:', err)
      setGoals(prev)
    })
  }

  function startEdit(id: string, text: string) {
    setEditingId(id)
    setEditText(text)
  }

  function saveEdit(id: string) {
    const text = editText.trim()
    setEditingId(null)
    setEditText('')
    if (!text) return
    const prevGoal = goals.find(g => g.id === id)
    setGoals(prev => prev.map(g => g.id === id ? { ...g, text } : g))
    updateGoal(id, { text }).catch(err => {
      console.error('Erro ao salvar edição:', err)
      if (prevGoal) setGoals(prev => prev.map(g => g.id === id ? { ...g, text: prevGoal.text } : g))
    })
  }

  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}min`
    if (minutes > 0) return `${minutes}min`
    return `${seconds}s`
  }

  const sortedGoals = [...goals].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return a.createdAt - b.createdAt
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="dash-grid">
      {/* Header */}
      <div className="dash-header">
        <h1 className="dash-greeting">{greeting}, <span>{userName || 'estudante'}</span></h1>
      </div>

      {/* Row 1: ENEM countdown + Quote */}
      <div className="dash-row-1">
        <div className="card card-enem">
          <div className="enem-top">
            <div className="enem-flag">ENEM 2026</div>
            <span className="enem-date">8 de novembro</span>
          </div>
          <div className="enem-countdown">
            <div className="enem-unit">
              <span className="enem-value">{String(timeLeft.days).padStart(2, '0')}</span>
              <span className="enem-label">DIAS</span>
            </div>
            <span className="enem-sep">:</span>
            <div className="enem-unit">
              <span className="enem-value">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span className="enem-label">HORAS</span>
            </div>
            <span className="enem-sep">:</span>
            <div className="enem-unit">
              <span className="enem-value">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="enem-label">MIN</span>
            </div>
            <span className="enem-sep">:</span>
            <div className="enem-unit">
              <span className="enem-value">{String(timeLeft.seconds).padStart(2, '0')}</span>
              <span className="enem-label">SEG</span>
            </div>
          </div>
        </div>

        <div className="card card-quote" onMouseEnter={() => setQuoteHovered(true)} onMouseLeave={() => setQuoteHovered(false)}>
          <div className="quote-nav">
            <button className="quote-nav-btn" onClick={() => setQuoteIndex(prev => (prev - 1 + philosophers.length) % philosophers.length)} type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          </div>
          <div className="quote-image-wrap">
            <img
              src={quote.url_foto}
              alt={quote.nome}
              className="quote-image"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <div className="quote-content">
            <p className="quote-text">"{quote.frase}"</p>
            <p className="quote-author">{quote.nome}</p>
          </div>
          <div className="quote-nav">
            <button className="quote-nav-btn" onClick={() => setQuoteIndex(prev => (prev + 1) % philosophers.length)} type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Activities (tall) + Stats & Goals (stacked) */}
      <div className="dash-row-2">
        <div className="card card-activities">
          <h3 className="card-title">Atividades Recentes</h3>
          <div className="act-list">
            {activities.length === 0 && (
              <p className="goals-empty">Nenhuma atividade ainda.</p>
            )}
            {activities.map(act => (
              <div className="act-item" key={act.id}>
                <ActivityIcon icon={act.icon} color={act.color} />
                <span className="act-text">{act.title}</span>
                <span className="act-time">{timeAgo(act.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-row-2-right">
          <div className="card card-stats">
            <h3 className="card-title">Seu Progresso</h3>
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-icon-wrap" style={{ background: 'rgba(80,140,200,0.15)', color: '#508cc8' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="stat-num">{counts.docs}</div>
                <div className="stat-desc">Documentos</div>
              </div>
              <div className="stat-box">
                <div className="stat-icon-wrap" style={{ background: 'rgba(180,80,180,0.15)', color: '#b450b4' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div className="stat-num">{counts.challenges}</div>
                <div className="stat-desc">Desafios</div>
              </div>
              <div className="stat-box">
                <div className="stat-icon-wrap" style={{ background: 'rgba(200,80,80,0.15)', color: '#c85050' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
                <div className="stat-num">{counts.videos}</div>
                <div className="stat-desc">Vídeos</div>
              </div>
            </div>
          </div>

          <div className="card card-goals">
            <h3 className="card-title">Objetivos</h3>
            <form className="goals-form" onSubmit={addGoal}>
              <input
                type="text"
                className="goals-input"
                placeholder="Adicionar uma meta..."
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
              />
              <button type="submit" className="goals-add-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </form>
            <div className="goals-list">
              {goals.length === 0 && (
                <p className="goals-empty">Nenhuma meta ainda. Adicione acima!</p>
              )}
              {sortedGoals.map(g => (
                <div key={g.id} className={`goal-item ${g.done ? 'done' : ''}`}>
                  <input
                    type="checkbox"
                    checked={g.done}
                    onChange={() => toggleGoal(g.id)}
                    className="goal-check"
                  />
                  <span className="goal-checkmark" onClick={() => toggleGoal(g.id)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {editingId === g.id ? (
                    <input
                      type="text"
                      className="goal-edit-input"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onBlur={() => saveEdit(g.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit(g.id)
                        if (e.key === 'Escape') { setEditingId(null); setEditText('') }
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className="goal-text" onDoubleClick={() => !g.done && startEdit(g.id, g.text)}>{g.text}</span>
                  )}
                  {g.done && g.completedAt && (
                    <span className="goal-duration">{formatDuration(g.completedAt - g.createdAt)}</span>
                  )}
                  <div className="goal-actions">
                    {!g.done && editingId !== g.id && (
                      <button className="goal-action-btn" onClick={() => startEdit(g.id, g.text)} title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    )}
                    <button className="goal-action-btn delete" onClick={() => handleDeleteGoal(g.id)} title="Excluir">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
