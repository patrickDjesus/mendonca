import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { VideoMeta, VideoNote } from '../../types/video'
import type { Subject } from '../../types/doc'
import { SUBJECTS, SUBJECT_COLORS } from '../../types/doc'
import VideoPlayer, { type VideoPlayerHandle } from '../../components/VideoPlayer'
import NotesPanel from '../../components/NotesPanel'
import '../../styles/videos.css'

const SAMPLE_VIDEOS: VideoMeta[] = [
  {
    id: 'v1',
    title: 'Derivadas — Conceito e Regras Básicas',
    description: 'Aula completa sobre derivadas para o ENEM',
    subject: 'Matemática',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '24:15',
    authorName: 'Prof. Carlos',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now() - 86400000 * 1,
  },
  {
    id: 'v2',
    title: 'Tabela Periódica — Elementos e Propriedades',
    description: 'Visão geral da tabela periódica',
    subject: 'Química',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '18:42',
    authorName: 'Prof. Ana',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'v3',
    title: 'Leis de Newton — Exemplos Práticos',
    description: 'Resolução de exercícios sobre as 3 leis de Newton',
    subject: 'Física',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '31:08',
    authorName: 'Prof. Marcos',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'v4',
    title: 'Células — Tipos e Funções',
    description: 'Células animais, vegetais e procariontes',
    subject: 'Biologia',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '22:30',
    authorName: 'Prof. Lucia',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'v5',
    title: 'Modernismo — Manifesto Antropofágico',
    description: 'Análise completa do Manifesto de Oswald de Andrade',
    subject: 'Linguagens',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '27:55',
    authorName: 'Prof. Beatriz',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'v6',
    title: 'Revolução Industrial — Impactos Sociais',
    description: 'As transformações sociais da revolução industrial',
    subject: 'História',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '20:10',
    authorName: 'Prof. Ricardo',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 6,
  },
  {
    id: 'v7',
    title: 'Climatologia — Tipos Climáticos do Brasil',
    description: 'Classificação de Köppen aplicada ao Brasil',
    subject: 'Geografia',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '26:40',
    authorName: 'Prof. Sandra',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'v8',
    title: 'Ética — Introdução ao Pensamento Filosófico',
    description: 'Os fundamentos da ética para o ENEM',
    subject: 'Filosofia',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '19:25',
    authorName: 'Prof. Fernando',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 8,
    updatedAt: Date.now() - 86400000 * 8,
  },
  {
    id: 'v9',
    title: 'Função Exponencial e Logarítmica',
    description: 'Domine as funções exponenciais e logarítmicas',
    subject: 'Matemática',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '35:12',
    authorName: 'Prof. Carlos',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 9,
    updatedAt: Date.now() - 86400000 * 9,
  },
  {
    id: 'v10',
    title: 'Cadeia Alimentar — Relações Ecológicas',
    description: 'Cadeias e teias alimentares nos ecossistemas',
    subject: 'Biologia',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '16:50',
    authorName: 'Prof. Lucia',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'v11',
    title: 'Cinemática — Movimento Retilíneo Uniforme',
    description: 'MRU, MRUV e Queda Livre com exercícios',
    subject: 'Física',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '29:33',
    authorName: 'Prof. Marcos',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 11,
    updatedAt: Date.now() - 86400000 * 11,
  },
  {
    id: 'v12',
    title: 'Reação Ácido-Base — pH e Neutralização',
    description: 'Cálculos de pH e conceitos fundamentais',
    subject: 'Química',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '21:18',
    authorName: 'Prof. Ana',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 12,
    updatedAt: Date.now() - 86400000 * 12,
  },
  {
    id: 'v13',
    title: 'Interpretação de Texto — Estratégias para o ENEM',
    description: 'Técnicas de leitura e interpretação textual',
    subject: 'Linguagens',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '15:44',
    authorName: 'Prof. Beatriz',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 13,
    updatedAt: Date.now() - 86400000 * 13,
  },
  {
    id: 'vm1',
    title: 'Geometria Analítica — Reta e Circunferência',
    description: 'Equações da reta, angulo entre retas e circunferência',
    subject: 'Matemática',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '28:05',
    authorName: 'Prof. Carlos',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 14,
    updatedAt: Date.now() - 86400000 * 14,
  },
  {
    id: 'vm2',
    title: 'Probabilidade e Estatística — Probabilidade Condicional',
    description: 'Teorema de Bayes e problemas do ENEM',
    subject: 'Matemática',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '22:18',
    authorName: 'Prof. Carlos',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 15,
  },
  {
    id: 'vm3',
    title: 'Trigonometria — Seno, Cosseno e Tangente',
    description: 'Relacoes trigonometricas e arcos notaveis',
    subject: 'Matemática',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '31:42',
    authorName: 'Prof. Carla',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 16,
    updatedAt: Date.now() - 86400000 * 16,
  },
  {
    id: 'vm4',
    title: 'Matrizes e Determinantes — Operacoes Básicas',
    description: 'Soma, multiplicacao e inversa de matrizes',
    subject: 'Matemática',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '19:55',
    authorName: 'Prof. Carlos',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 17,
    updatedAt: Date.now() - 86400000 * 17,
  },
  {
    id: 'vm5',
    title: 'Análise Combinatória — Permutacao e Combinacao',
    description: 'Principio multiplicativo e aditivo resolvidos',
    subject: 'Matemática',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '25:30',
    authorName: 'Prof. Carla',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 18,
    updatedAt: Date.now() - 86400000 * 18,
  },
  {
    id: 'vm6',
    title: 'Progressoes Aritmeticas e Geometricas',
    description: 'PA e PG: termo geral, soma e problemas',
    subject: 'Matemática',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '17:20',
    authorName: 'Prof. Carlos',
    isPublic: true,
    createdAt: Date.now() - 86400000 * 19,
    updatedAt: Date.now() - 86400000 * 19,
  },
]

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] ?? null
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export default function Videos() {
  const [videos, setVideos] = useState<VideoMeta[]>(SAMPLE_VIDEOS)
  const [watchingVideo, setWatchingVideo] = useState<VideoMeta | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ title: '', description: '', videoUrl: '', subject: null as Subject | null, isPublic: false })
  const [deleteTarget, setDeleteTarget] = useState<VideoMeta | null>(null)
  const [notes, setNotes] = useState<VideoNote[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [watchTimeAccum, setWatchTimeAccum] = useState(0)
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)
  const watchTimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrollRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const dragRef = useRef({ active: false, el: null as HTMLDivElement | null, startX: 0, scrollLeft: 0 })
  const dragMoved = useRef(false)
  const dragRowCleanup = useRef<(() => void) | null>(null)

  const initDrag = useCallback((row: HTMLDivElement, startX: number) => {
    dragRef.current = { active: true, el: row, startX, scrollLeft: row.scrollLeft }
    dragMoved.current = false
    row.style.cursor = 'grabbing'
    row.style.userSelect = 'none'
    row.style.scrollSnapType = 'none'
    row.style.scrollBehavior = 'auto'

    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d.active || !d.el) return
      e.preventDefault()
      const dx = e.pageX - d.startX
      if (Math.abs(dx) > 5) dragMoved.current = true
      d.el.scrollLeft = d.scrollLeft - dx
    }
    const onUp = () => {
      const d = dragRef.current
      if (d.el) {
        d.el.style.cursor = ''
        d.el.style.userSelect = ''
        d.el.style.scrollSnapType = ''
        d.el.style.scrollBehavior = ''
      }
      dragRef.current = { active: false, el: null, startX: 0, scrollLeft: 0 }
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      dragRowCleanup.current = null
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    dragRowCleanup.current = onUp
  }, [])

  useEffect(() => {
    return () => { dragRowCleanup.current?.() }
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<Subject, VideoMeta[]>()
    for (const s of SUBJECTS) map.set(s, [])
    for (const v of videos) {
      const arr = map.get(v.subject)
      if (arr) arr.push(v)
    }
    return Array.from(map.entries()).filter(([, vids]) => vids.length > 0)
  }, [videos])

  const heroVideo = useMemo(() => {
    return videos.reduce((latest, v) => v.createdAt > latest.createdAt ? v : latest, videos[0])
  }, [videos])

  const scrollRow = useCallback((subject: Subject, dir: -1 | 1) => {
    const el = scrollRefs.current.get(subject)
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' })
  }, [])

  const handleAdd = useCallback(() => {
    if (!addForm.subject || !addForm.videoUrl) return
    const newVideo: VideoMeta = {
      id: generateId(),
      title: addForm.title || 'Novo Vídeo',
      description: addForm.description || undefined,
      subject: addForm.subject,
      videoUrl: addForm.videoUrl,
      isPublic: addForm.isPublic,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setVideos(prev => [newVideo, ...prev])
    setAddForm({ title: '', description: '', videoUrl: '', subject: null, isPublic: false })
    setShowAddModal(false)
  }, [addForm])

  const handleDelete = useCallback((id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id))
    setDeleteTarget(null)
    if (watchingVideo?.id === id) {
      setWatchingVideo(null)
      setNotes([])
      setCurrentTime(0)
      setDuration(0)
      setWatchTimeAccum(0)
    }
  }, [watchingVideo])

  useEffect(() => {
    if (!watchingVideo) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWatchingVideo(null)
        setNotes([])
        setCurrentTime(0)
        setDuration(0)
        setWatchTimeAccum(0)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [watchingVideo])

  useEffect(() => {
    if (!showAddModal) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddModal(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showAddModal])

  useEffect(() => {
    if (!deleteTarget) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDeleteTarget(null)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [deleteTarget])

  useEffect(() => {
    if (!watchingVideo) return
    watchTimeIntervalRef.current = setInterval(() => {
      setWatchTimeAccum(prev => prev + 1)
    }, 1000)
    return () => {
      if (watchTimeIntervalRef.current) clearInterval(watchTimeIntervalRef.current)
    }
  }, [watchingVideo])

  const handleAddNote = useCallback((note: VideoNote) => {
    setNotes(prev => [...prev, { ...note, videoId: watchingVideo?.id || '' }])
  }, [watchingVideo])

  const handleDeleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
  }, [])

  const handleSeek = useCallback((seconds: number) => {
    videoPlayerRef.current?.seekTo(seconds)
  }, [])

  const handleOpenVideo = useCallback((video: VideoMeta) => {
    if (dragMoved.current) return
    setWatchingVideo(video)
    setNotes([])
    setCurrentTime(0)
    setDuration(0)
    setWatchTimeAccum(0)
  }, [])

  const formatWatchTime = useCallback((totalSec: number): string => {
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = Math.floor(totalSec % 60)
    if (h > 0) return `${h}h ${m}min`
    if (m > 0) return `${m}min`
    return `${s}s`
  }, [])

  const heroColors = heroVideo ? SUBJECT_COLORS[heroVideo.subject] : null
  const heroYoutubeId = heroVideo ? extractYoutubeId(heroVideo.videoUrl) : null

  return (
    <div className="videos-page">
      <div className="videos-topbar">
        <div className="videos-topbar-left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <h1 className="videos-page-title">Videoaulas</h1>
        </div>
        <button className="videos-add-btn" onClick={() => setShowAddModal(true)} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar vídeo
        </button>
      </div>

      {!watchingVideo && (
        <>
          {heroVideo && (
        <div className="video-hero" onClick={() => handleOpenVideo(heroVideo)}>
          <div className="video-hero-thumb">
            {heroYoutubeId ? (
              <img
                src={`https://img.youtube.com/vi/${heroYoutubeId}/maxresdefault.jpg`}
                alt={heroVideo.title}
                className="video-hero-img"
              />
            ) : (
              <div className="video-hero-placeholder" style={{ background: heroColors?.bg }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            )}
            <div className="video-hero-play">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            </div>
            {heroVideo.duration && <span className="video-hero-duration">{heroVideo.duration}</span>}
          </div>
          <div className="video-hero-info">
            {heroColors && (
              <span className="video-hero-badge" style={{ background: heroColors.bg, color: heroColors.text }}>
                {heroVideo.subject}
              </span>
            )}
            <h2 className="video-hero-title">{heroVideo.title}</h2>
            {heroVideo.description && <p className="video-hero-desc">{heroVideo.description}</p>}
            <div className="video-hero-meta">
              {heroVideo.authorName && <span>{heroVideo.authorName}</span>}
              <span>{new Date(heroVideo.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      )}

      <div className="videos-sections">
        {grouped.map(([subject, vids]) => {
          const colors = SUBJECT_COLORS[subject]
          return (
            <section key={subject} className="video-section">
              <div className="video-section-header">
                <div className="video-section-title-group">
                  <div className="video-section-dot" style={{ background: colors.text }} />
                  <h3 className="video-section-title">{subject}</h3>
                  <span className="video-section-count">{vids.length}</span>
                </div>
                <div className="video-section-nav">
                  <button className="video-nav-btn" onClick={() => scrollRow(subject, -1)} type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button className="video-nav-btn" onClick={() => scrollRow(subject, 1)} type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
              <div
                className="video-row"
                ref={el => {
                  const prev = scrollRefs.current.get(subject)
                  if (prev && prev !== el) prev.removeEventListener('mousedown', (prev as any).__dragHandler)
                  if (el) {
                    const handler = (e: MouseEvent) => {
                      if (e.button !== 0) return
                      e.preventDefault()
                      initDrag(el, e.pageX)
                    }
                    ;(el as any).__dragHandler = handler
                    el.addEventListener('mousedown', handler)
                  }
                  if (el) scrollRefs.current.set(subject, el)
                }}
              >
                {vids.map(video => {
                  const ytId = extractYoutubeId(video.videoUrl)
                  const vColors = SUBJECT_COLORS[video.subject]
                  return (
                    <div
                      key={video.id}
                      className="video-card"
                      onClick={() => handleOpenVideo(video)}
                    >
                      <div className="video-card-thumb">
                        {ytId ? (
                          <img
                            src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                            alt={video.title}
                            className="video-card-img"
                            loading="lazy"
                          />
                        ) : video.thumbnail ? (
                          <img src={video.thumbnail} alt={video.title} className="video-card-img" loading="lazy" />
                        ) : (
                          <div className="video-card-placeholder" style={{ background: vColors.bg }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          </div>
                        )}
                        <div className="video-card-play-overlay">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="6 3 20 12 6 21 6 3" />
                          </svg>
                        </div>
                        {video.duration && <span className="video-card-duration">{video.duration}</span>}
                      </div>
                      <div className="video-card-info">
                        <span className="video-card-title">{video.title}</span>
                        <div className="video-card-meta">
                          {video.authorName && <span className="video-card-author">{video.authorName}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
        </>
      )}

      {watchingVideo && (
        <div className="video-watch-view">
          <div className="video-watch-left">
            <div className="video-watch-player-wrap">
              <VideoPlayer
                ref={videoPlayerRef}
                videoUrl={watchingVideo.videoUrl}
                autoPlay
                onTimeUpdate={setCurrentTime}
                onDurationReady={setDuration}
              />
            </div>

            <div className="video-watch-info">
              <div className="video-watch-title-row">
                <h2 className="video-watch-title">{watchingVideo.title}</h2>
                <button
                  className="video-watch-back"
                  onClick={() => {
                    setWatchingVideo(null)
                    setNotes([])
                    setCurrentTime(0)
                    setDuration(0)
                    setWatchTimeAccum(0)
                  }}
                  type="button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Voltar
                </button>
              </div>

              {watchingVideo.authorName && (
                <div className="video-watch-author">
                  <div className="video-watch-author-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <span>{watchingVideo.authorName}</span>
                </div>
              )}

              {watchingVideo.description && (
                <p className="video-watch-desc">{watchingVideo.description}</p>
              )}
            </div>

            <div className="video-watch-stats">
              <div className="video-watch-stat">
                <div className="video-watch-stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className="video-watch-stat-info">
                  <span className="video-watch-stat-value">{formatWatchTime(watchTimeAccum)}</span>
                  <span className="video-watch-stat-label">Tempo assistido</span>
                </div>
              </div>

              <div className="video-watch-stat">
                <div className="video-watch-stat-icon" style={{ background: SUBJECT_COLORS[watchingVideo.subject]?.bg, color: SUBJECT_COLORS[watchingVideo.subject]?.text }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
                <div className="video-watch-stat-info">
                  <span className="video-watch-stat-value">{watchingVideo.subject}</span>
                  <span className="video-watch-stat-label">Matéria</span>
                </div>
              </div>

              <div className="video-watch-stat">
                <div className="video-watch-stat-icon" style={{ background: 'rgba(200, 80, 80, 0.12)', color: '#c85050' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="video-watch-stat-info">
                  <span className="video-watch-stat-value">{notes.length}</span>
                  <span className="video-watch-stat-label">Anotações</span>
                </div>
              </div>

              <div className="video-watch-stat">
                <div className="video-watch-stat-icon" style={{ background: 'rgba(100, 180, 100, 0.12)', color: '#6ab86a' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
                    <polyline points="17 2 12 7 7 2" />
                  </svg>
                </div>
                <div className="video-watch-stat-info">
                  <span className="video-watch-stat-value">{watchingVideo.duration || '—'}</span>
                  <span className="video-watch-stat-label">Duração</span>
                </div>
              </div>

              {duration > 0 && (
                <div className="video-watch-stat">
                  <div className="video-watch-stat-icon" style={{ background: 'rgba(180, 140, 80, 0.12)', color: '#daa03c' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="20" x2="12" y2="10" />
                      <line x1="18" y1="20" x2="18" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="16" />
                    </svg>
                  </div>
                  <div className="video-watch-stat-info">
                    <span className="video-watch-stat-value">
                      {duration > 0 ? `${Math.round((currentTime / duration) * 100)}%` : '—'}
                    </span>
                    <span className="video-watch-stat-label">Progresso</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="video-watch-right">
            <NotesPanel
              notes={notes}
              currentTime={currentTime}
              onAdd={handleAddNote}
              onDelete={handleDeleteNote}
              onSeek={handleSeek}
            />
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="video-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="video-modal" onClick={e => e.stopPropagation()}>
            <h3 className="video-modal-title">Adicionar vídeo</h3>

            <div className="video-form-field">
              <label className="video-form-label">URL do vídeo</label>
              <input
                className="video-form-input"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={addForm.videoUrl}
                onChange={e => setAddForm(f => ({ ...f, videoUrl: e.target.value }))}
              />
              <span className="video-form-hint">Suporta YouTube ou links diretos de vídeo</span>
            </div>

            <div className="video-form-field">
              <label className="video-form-label">Título</label>
              <input
                className="video-form-input"
                type="text"
                placeholder="Ex: Derivadas — Conceito e Regras"
                value={addForm.title}
                onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="video-form-field">
              <label className="video-form-label">Descrição <span className="video-form-optional">(opcional)</span></label>
              <textarea
                className="video-form-textarea"
                placeholder="Breve descrição do conteúdo..."
                rows={2}
                value={addForm.description}
                onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="video-form-field">
              <label className="video-form-label">Disciplina</label>
              <div className="video-form-subjects">
                {SUBJECTS.map(s => {
                  const colors = SUBJECT_COLORS[s]
                  const selected = addForm.subject === s
                  return (
                    <button
                      key={s}
                      className={`video-form-chip ${selected ? 'selected' : ''}`}
                      style={{
                        background: selected ? colors.text : colors.bg,
                        color: selected ? '#1a1714' : colors.text,
                        borderColor: selected ? colors.text : colors.text + '33',
                      }}
                      onClick={() => setAddForm(f => ({ ...f, subject: selected ? null : s }))}
                      type="button"
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="video-form-field video-form-toggle-row">
              <div className="video-form-toggle-info">
                <span className="video-form-label" style={{ marginBottom: 0 }}>Público</span>
                <span className="video-form-toggle-desc">Visível para todos os alunos</span>
              </div>
              <button
                className={`video-form-toggle ${addForm.isPublic ? 'on' : ''}`}
                onClick={() => setAddForm(f => ({ ...f, isPublic: !f.isPublic }))}
                type="button"
              >
                <div className="video-form-toggle-knob" />
              </button>
            </div>

            <div className="video-form-actions">
              <button className="video-form-cancel" onClick={() => setShowAddModal(false)} type="button">
                Cancelar
              </button>
              <button
                className="video-form-confirm"
                disabled={!addForm.subject || !addForm.videoUrl}
                onClick={handleAdd}
                type="button"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="video-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="video-modal video-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="video-confirm-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <h3 className="video-modal-title">Deletar vídeo?</h3>
            <p className="video-confirm-text">"{deleteTarget.title}" será removido permanentemente.</p>
            <div className="video-form-actions">
              <button className="video-form-cancel" onClick={() => setDeleteTarget(null)} type="button">
                Cancelar
              </button>
              <button className="video-form-confirm video-form-delete" onClick={() => handleDelete(deleteTarget.id)} type="button">
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
