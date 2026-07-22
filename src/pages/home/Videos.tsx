import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { VideoMeta, VideoNote } from '../../types/video'
import type { Subject } from '../../types/doc'
import { SUBJECTS, SUBJECT_COLORS } from '../../types/doc'
import VideoPlayer, { type VideoPlayerHandle } from '../../components/VideoPlayer'
import NotesPanel from '../../components/NotesPanel'
import { extractYoutubeId } from '../../utils/youtube'
import { fetchVideos, createVideo, deleteVideo, fetchVideoNotes, createVideoNote, deleteVideoNote, deleteAllVideoNotes, updateVideoDuration, logActivity, recordAction } from '../../lib/db'
import '../../styles/videos.css'

import { formatTimestamp } from '../../utils/format'

function parseDurationToSeconds(dur: string | undefined): number {
  if (!dur) return 3600
  const hMatch = dur.match(/(\d+)\s*h/)
  const mMatch = dur.match(/(\d+)\s*min/)
  const colonMatch = dur.match(/^(\d+):(\d{2})$/)
  if (hMatch) return parseInt(hMatch[1]) * 3600 + (mMatch ? parseInt(mMatch[1]) * 60 : 0)
  if (mMatch) return parseInt(mMatch[1]) * 60
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2])
  return 3600
}

function getSavedProgress(videoId: string): number {
  try {
    const raw = localStorage.getItem(getProgressKey(videoId))
    if (raw) {
      const data = JSON.parse(raw)
      return data.time || 0
    }
  } catch { /* noop */ }
  return 0
}


function getProgressKey(videoId: string) { return `video_progress_${videoId}` }

export default function Videos() {
  const [videos, setVideos] = useState<VideoMeta[]>([])
  const [watchingVideo, setWatchingVideo] = useState<VideoMeta | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ title: '', description: '', videoUrl: '', subject: null as Subject | null })
  const [deleteTarget, setDeleteTarget] = useState<VideoMeta | null>(null)
  const [notes, setNotes] = useState<VideoNote[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [watchTimeAccum, setWatchTimeAccum] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [resumePrompt, setResumePrompt] = useState<{ video: VideoMeta; seconds: number } | null>(null)
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)
  const watchTimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrollRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const dragHandlers = useRef<Map<string, (e: MouseEvent) => void>>(new Map())
  const dragRef = useRef({ active: false, el: null as HTMLDivElement | null, startX: 0, scrollLeft: 0 })
  const dragMoved = useRef(false)
  const dragRowCleanup = useRef<(() => void) | null>(null)

  const savedProgressMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of videos) {
      const t = getSavedProgress(v.id)
      if (t > 0) map.set(v.id, t)
    }
    return map
  }, [videos])

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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match = v.title.toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q)
        if (!match) continue
      }
      const arr = map.get(v.subject)
      if (arr) arr.push(v)
    }
    return Array.from(map.entries()).filter(([, vids]) => vids.length > 0)
  }, [videos, searchQuery])

  const heroVideo = useMemo(() => {
    const filtered = searchQuery.trim()
      ? videos.filter(v => {
          const q = searchQuery.toLowerCase()
          return v.title.toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q)
        })
      : videos
    if (filtered.length === 0) return null
    return filtered.reduce((latest, v) => v.createdAt > latest.createdAt ? v : latest, filtered[0])
  }, [videos, searchQuery])

  const scrollRow = useCallback((subject: Subject, dir: -1 | 1) => {
    const el = scrollRefs.current.get(subject)
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' })
  }, [])

  const handleAdd = useCallback(async () => {
    if (!addForm.videoUrl.trim() || !addForm.subject) return
    const newVideo: VideoMeta = {
      id: crypto.randomUUID(),
      title: addForm.title || 'Novo Vídeo',
      description: addForm.description || undefined,
      subject: addForm.subject,
      videoUrl: addForm.videoUrl,
      isPublic: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    try {
      await createVideo(newVideo)
      setVideos(prev => [newVideo, ...prev])
      logActivity('video_added', `Adicionou "${newVideo.title}"`, 'video', '#c85050').catch(() => {})
      setAddForm({ title: '', description: '', videoUrl: '', subject: null })
      setShowAddModal(false)
    } catch (e) {
      console.error('Erro ao salvar vídeo:', e)
    }
  }, [addForm])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteVideo(id)
      await deleteAllVideoNotes(id)
    } catch (e) {
      console.error('Erro ao deletar vídeo:', e)
    }
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

  const handleLeaveVideo = useCallback(() => {
    if (watchingVideo && watchTimeAccum > 0) {
      const minutes = Math.floor(watchTimeAccum / 60)
      if (minutes >= 1) {
        recordAction('video', { watchMinutes: minutes, subject: watchingVideo.subject }).catch(() => {})
      }
    }
    setWatchingVideo(null)
    setNotes([])
    setCurrentTime(0)
    setDuration(0)
    setWatchTimeAccum(0)
    setIsPlaying(false)
  }, [watchingVideo, watchTimeAccum])

  useEffect(() => {
    if (!watchingVideo) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleLeaveVideo()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [watchingVideo, handleLeaveVideo])

  useEffect(() => {
    fetchVideos().then(setVideos).catch(console.error)
  }, [])

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
    if (!watchingVideo || !isPlaying) return
    watchTimeIntervalRef.current = setInterval(() => {
      setWatchTimeAccum(prev => prev + 1)
    }, 1000)
    return () => {
      if (watchTimeIntervalRef.current) clearInterval(watchTimeIntervalRef.current)
    }
  }, [watchingVideo, isPlaying])

  useEffect(() => {
    if (!watchingVideo || currentTime < 3) return
    const key = getProgressKey(watchingVideo.id)
    try {
      const existing = JSON.parse(localStorage.getItem(key) || '{}')
      existing.time = currentTime
      existing.updatedAt = Date.now()
      localStorage.setItem(key, JSON.stringify(existing))
    } catch { /* noop */ }
  }, [watchingVideo, currentTime])

  useEffect(() => {
    if (!watchingVideo || duration <= 0 || watchingVideo.duration) return
    const h = Math.floor(duration / 3600)
    const m = Math.floor((duration % 3600) / 60)
    const s = Math.floor(duration % 60)
    const formatted = h > 0 ? `${h}h ${m}min` : `${m}:${s.toString().padStart(2, '0')}`
    setVideos(prev => prev.map(v => v.id === watchingVideo.id ? { ...v, duration: formatted } : v))
    updateVideoDuration(watchingVideo.id, formatted).catch(() => {})
  }, [watchingVideo, duration])

  const handleAddNote = useCallback(async (note: VideoNote): Promise<boolean> => {
    if (!watchingVideo?.id) return false
    const fullNote = { ...note, videoId: watchingVideo.id }
    try {
      await createVideoNote(fullNote)
      setNotes(prev => [...prev, fullNote])
      recordAction('note').catch(() => {})
      return true
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('Erro ao salvar anotação:', msg)
      alert(`Erro ao salvar anotação: ${msg}`)
      return false
    }
  }, [watchingVideo])

  const handleDeleteNote = useCallback(async (id: string) => {
    const previousNotes = notes
    setNotes(prev => prev.filter(n => n.id !== id))
    try {
      await deleteVideoNote(id)
    } catch (e) {
      console.error('Erro ao deletar anotação:', e)
      setNotes(previousNotes)
      alert('Erro ao deletar anotação.')
    }
  }, [notes])

  const handleSeek = useCallback((seconds: number) => {
    videoPlayerRef.current?.seekTo(seconds)
    setCurrentTime(seconds)
  }, [])

  const handleNoteGroupChange = useCallback((updatedNotes: VideoNote[]) => {
    setNotes(updatedNotes)
  }, [])

  const handleOpenVideo = useCallback((video: VideoMeta) => {
    if (dragMoved.current) return
    setWatchingVideo(video)
    setNotes([])
    setCurrentTime(0)
    setDuration(0)
    setWatchTimeAccum(0)
    setIsPlaying(false)
    fetchVideoNotes(video.id).then(setNotes).catch(console.error)

    try {
      const raw = localStorage.getItem(getProgressKey(video.id))
      if (raw) {
        const data = JSON.parse(raw)
        if (data.time && data.time > 10) {
          setResumePrompt({ video, seconds: data.time })
        }
      }
    } catch { /* noop */ }
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
        <div className="videos-topbar-right">
          <div className="videos-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="videos-search-input"
              type="text"
              placeholder="Buscar vídeos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="videos-search-clear" onClick={() => setSearchQuery('')} type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          <button className="videos-add-btn" onClick={() => setShowAddModal(true)} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Adicionar vídeo
          </button>
        </div>
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
              {heroVideo.duration && <span>{heroVideo.duration}</span>}
              {savedProgressMap.has(heroVideo.id) && (
                <span style={{ color: '#daa03c', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {formatWatchTime(savedProgressMap.get(heroVideo.id)!)}
                </span>
              )}
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
                  const prevHandler = dragHandlers.current.get(subject)
                  if (prev && prevHandler) {
                    prev.removeEventListener('mousedown', prevHandler)
                    dragHandlers.current.delete(subject)
                  }
                  if (el) {
                    const handler = (e: MouseEvent) => {
                      if (e.button !== 0) return
                      e.preventDefault()
                      initDrag(el, e.pageX)
                    }
                    dragHandlers.current.set(subject, handler)
                    el.addEventListener('mousedown', handler)
                    scrollRefs.current.set(subject, el)
                  }
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
                    {savedProgressMap.has(video.id) && (
                      <div className="video-card-progress-bar">
                        <div
                          className="video-card-progress-fill"
                          style={{ width: `${Math.min(100, (savedProgressMap.get(video.id)! / parseDurationToSeconds(video.duration)) * 100)}%` }}
                        />
                      </div>
                    )}
                      </div>
                      <div className="video-card-info">
                        <span className="video-card-title">{video.title}</span>
                        <div className="video-card-meta">
                          {video.authorName && <span className="video-card-author">{video.authorName}</span>}
                          {video.duration && <span className="video-card-author">{video.duration}</span>}
                          {savedProgressMap.has(video.id) && (
                            <span className="video-card-author" style={{ color: '#daa03c', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              {formatWatchTime(savedProgressMap.get(video.id)!)}
                            </span>
                          )}
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
                onPlayingChange={setIsPlaying}
              />
            </div>

            <div className="video-watch-info">
              <div className="video-watch-title-row">
                <h2 className="video-watch-title">{watchingVideo.title}</h2>
                <button
                  className="video-watch-back"
                  onClick={handleLeaveVideo}
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
                  <span className="video-watch-stat-value">
                    {watchingVideo.duration || (duration > 0 ? formatWatchTime(duration) : '—')}
                  </span>
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
              videoId={watchingVideo.id}
              videoTitle={watchingVideo.title}
              onAdd={handleAddNote}
              onDelete={handleDeleteNote}
              onSeek={handleSeek}
              onGroupChange={handleNoteGroupChange}
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

      {resumePrompt && (
        <div className="video-modal-overlay" onClick={() => setResumePrompt(null)}>
          <div className="video-modal video-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="video-confirm-icon" style={{ color: '#daa03c' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 className="video-modal-title">Continuar assistindo?</h3>
            <p className="video-confirm-text">
              Você parou em {formatTimestamp(resumePrompt.seconds)}. Deseja continuar de onde parou?
            </p>
            <div className="video-form-actions">
              <button className="video-form-cancel" onClick={() => {
                setResumePrompt(null)
              }} type="button">
                Do começo
              </button>
              <button className="video-form-confirm" onClick={() => {
                const sec = resumePrompt.seconds
                setResumePrompt(null)
                setTimeout(() => {
                  videoPlayerRef.current?.seekTo(sec)
                  setCurrentTime(sec)
                }, 300)
              }} type="button">
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
