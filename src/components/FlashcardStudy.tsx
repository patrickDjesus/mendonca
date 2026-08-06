import { useEffect, useRef, useState } from 'react'
import type { Flashcard } from '../types/flashcard'
import { SUBJECT_COLORS } from '../types/doc'
import MathRenderer from './MathRenderer'

interface Props {
  cards: Flashcard[]
  title: string
  onExit: () => void
  onGrade: (card: Flashcard, easy: boolean) => void
}

interface CardState {
  flipped: boolean
  grade: boolean | null
}

const GAP = 24
const MOMENTUM = 150

function subjectColor(subject: string) {
  const c = SUBJECT_COLORS[subject as keyof typeof SUBJECT_COLORS]
  return { background: c?.bg ?? 'rgba(140,120,200,0.15)', color: c?.text ?? '#8c78c8' }
}

export default function FlashcardStudy({ cards, title, onExit, onGrade }: Props) {
  const [queue] = useState(() => [...cards].sort(() => Math.random() - 0.5))
  const total = queue.length
  const [states, setStates] = useState<CardState[]>(() => queue.map(() => ({ flipped: false, grade: null })))
  const [index, setIndex] = useState(0)
  const [containerW, setContainerW] = useState(0)
  const [containerH, setContainerH] = useState(0)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  const rouletteRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    startX: number
    startY: number
    startOffset: number
    dx: number
    dy: number
    vx: number
    lastX: number
    lastT: number
    moved: boolean
  } | null>(null)

  const cardW = containerW > 0 ? Math.min(420, Math.round(containerW * 0.72)) : 300
  const cardH = containerH > 0
    ? Math.min(Math.round(cardW * 1.35), Math.round(containerH * 0.92))
    : Math.round(cardW * 1.35)
  const stride = cardW + GAP
  const fadeSpan = containerW * 0.55

  const easyCount = states.filter(s => s.grade === true).length
  const hardCount = states.filter(s => s.grade === false).length
  const gradedCount = easyCount + hardCount
  const finished = total > 0 && gradedCount === total
  const percent = total === 0 ? 0 : Math.round((gradedCount / total) * 100)

  useEffect(() => {
    const el = rouletteRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      if (rect.width) setContainerW(Math.round(rect.width))
      if (rect.height) setContainerH(Math.round(rect.height))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (containerW > 0) setOffset(-index * stride)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerW])

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(total - 1, i))
    setIndex(clamped)
    setOffset(-clamped * stride)
  }

  const flip = (i: number) => {
    setStates(prev => prev.map((s, j) => (j === i ? { ...s, flipped: !s.flipped } : s)))
  }

  const gradeCard = (i: number, easy: boolean) => {
    const c = queue[i]
    if (!c) return
    setStates(prev => prev.map((s, j) => (j === i ? { ...s, grade: easy } : s)))
    onGrade(c, easy)
  }

  const restart = () => {
    setStates(queue.map(() => ({ flipped: false, grade: null })))
    setIndex(0)
    setOffset(0)
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('button')) return
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffset: offset,
      dx: 0,
      dy: 0,
      vx: 0,
      lastX: e.clientX,
      lastT: Date.now(),
      moved: false,
    }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d) return
    d.dx = e.clientX - d.startX
    d.dy = e.clientY - d.startY
    const now = Date.now()
    const dt = now - d.lastT
    if (dt > 0) d.vx = (e.clientX - d.lastX) / dt
    d.lastX = e.clientX
    d.lastT = now
    if (Math.abs(d.dx) > 6) d.moved = true
    setOffset(d.startOffset + d.dx)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d) return
    dragRef.current = null
    setDragging(false)

    const verticalScroll = Math.abs(d.dy) > 14 && Math.abs(d.dy) > Math.abs(d.dx)

    if (verticalScroll) {
      goTo(index)
      return
    }

    if (d.moved) {
      const rawOffset = d.startOffset + d.dx + d.vx * MOMENTUM
      const target = Math.max(0, Math.min(total - 1, Math.round(-rawOffset / stride)))
      goTo(target)
      return
    }

    const rect = rouletteRef.current?.getBoundingClientRect()
    if (!rect) return
    const xFromCenter = e.clientX - rect.left - rect.width / 2
    const i = Math.max(0, Math.min(total - 1, Math.round((xFromCenter - offset) / stride)))
    if (i === index) flip(i)
    else goTo(i)
  }

  const handlePointerCancel = () => {
    dragRef.current = null
    setDragging(false)
    goTo(index)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        onExit()
        return
      }
      if (finished) return
      if (e.code === 'ArrowLeft') {
        e.preventDefault()
        goTo(index - 1)
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        goTo(index + 1)
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        flip(index)
      } else if ((e.key === 'e' || e.key === 'E') && states[index]?.flipped) {
        gradeCard(index, true)
      } else if ((e.key === 'd' || e.key === 'D') && states[index]?.flipped) {
        gradeCard(index, false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  if (finished) {
    return (
      <div className="fs-page">
        <div className="fs-topbar">
          <div className="fs-topbar-left">
            <button className="fc-back-btn" onClick={onExit} title="Voltar" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <span className="fs-deck-title">{title}</span>
          </div>
        </div>
        <div className="fs-done">
          <div className="fs-done-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className="fs-done-title">Sessão concluída!</h2>
          <p className="fs-done-sub">{total} {total === 1 ? 'card revisado' : 'cards revisados'}</p>
          <div className="fs-done-stats">
            <div className="fs-done-stat easy">
              <span className="fs-done-stat-value">{easyCount}</span>
              <span className="fs-done-stat-label">Fáceis</span>
            </div>
            <div className="fs-done-stat hard">
              <span className="fs-done-stat-value">{hardCount}</span>
              <span className="fs-done-stat-label">Difíceis</span>
            </div>
          </div>
          <div className="fs-done-actions">
            <button className="fs-btn next" onClick={restart} type="button">
              Estudar novamente
            </button>
            <button className="fs-btn ghost" onClick={onExit} type="button">
              Voltar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="fs-page">
        <div className="fs-topbar">
          <div className="fs-topbar-left">
            <button className="fc-back-btn" onClick={onExit} title="Voltar" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <span className="fs-deck-title">{title}</span>
          </div>
        </div>
        <div className="fs-empty">
          <p>Nenhum card para estudar com esses filtros.</p>
          <button className="fs-btn ghost" onClick={onExit} type="button">Voltar</button>
        </div>
      </div>
    )
  }

  const current = states[index]

  return (
    <div className="fs-page">
      <div className="fs-topbar">
        <div className="fs-topbar-left">
          <button className="fc-back-btn" onClick={onExit} title="Encerrar estudo" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <span className="fs-deck-title">{title}</span>
        </div>
        <span className="fs-progress-text">{gradedCount} de {total} respondidos</span>
      </div>

      <div className="fs-progress-track">
        <div className="fs-progress-fill" style={{ width: `${percent}%` }} />
      </div>

      <div
        className="fs-roulette"
        ref={rouletteRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div
          className="fs-roulette-track"
          style={{
            transform: `translateX(${offset - cardW / 2}px)`,
            transition: dragging ? 'none' : 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {queue.map((c, i) => {
            const st = states[i]
            const dist = Math.abs(offset + i * stride)
            const fade = containerW > 0 ? Math.max(0, Math.min(1, 1 - dist / fadeSpan)) : 1
            const op = Math.round(fade * 1000) / 1000
            const sc = 0.86 + 0.14 * fade
            return (
              <div
                key={c.id}
                className="fs-slot"
                style={{
                  width: cardW,
                  height: cardH,
                  marginRight: i < total - 1 ? GAP : 0,
                  opacity: op,
                  transform: `scale(${sc})`,
                  transition: dragging
                    ? 'none'
                    : 'opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1), transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <div className={`fs-flip ${st.flipped ? 'flipped' : ''}`}>
                  <div className="fs-face fs-front">
                    <div className="fs-face-top">
                      <span className="fc-subject-badge" style={subjectColor(c.subject)}>
                        {c.subject}
                      </span>
                      <span className="fs-corner">?</span>
                    </div>
                    <div className="fs-card-text">
                      <div className="fs-card-content">
                        <MathRenderer text={c.front} />
                      </div>
                    </div>
                    <div className="fs-face-foot">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 14 4 9l5-5" />
                        <path d="M4 9h10a6 6 0 0 1 6 6" />
                        <path d="m15 20 5 5-5 5" />
                        <path d="M20 19H10a6 6 0 0 1-6-6" />
                      </svg>
                      <span className="fs-flip-hint">Clique para virar</span>
                    </div>
                  </div>

                  <div className="fs-face fs-back">
                    <div className="fs-face-top">
                      <span className="fs-answer-label">Resposta</span>
                      <span className="fs-corner">✓</span>
                    </div>
                    <div className="fs-card-text">
                      <div className="fs-card-content">
                        <MathRenderer text={c.back} />
                      </div>
                    </div>
                    <div className="fs-face-foot fs-back-foot">
                      {st.grade === null ? (
                        <>
                          <button className="fs-btn easy" onClick={() => gradeCard(i, true)} type="button">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            Fácil
                          </button>
                          <button className="fs-btn hard" onClick={() => gradeCard(i, false)} type="button">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6L6 18" />
                              <path d="M6 6l12 12" />
                            </svg>
                            Difícil
                          </button>
                        </>
                      ) : (
                        <div className={`fs-grade-feedback ${st.grade ? 'easy' : 'hard'}`}>
                          {st.grade ? 'Fácil' : 'Difícil'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="fs-hints">
        {!current.flipped ? (
          <>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="16" y2="12" />
                <line x1="8" y1="18" x2="16" y2="12" />
              </svg>
              Arraste para navegar
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 14 4 9l5-5" />
                <path d="M4 9h10a6 6 0 0 1 6 6" />
              </svg>
              Clique no card para revelar a resposta
            </span>
          </>
        ) : current.grade === null ? (
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Escolha Fácil ou Difícil no verso do card
          </span>
        ) : (
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="16" y2="12" />
              <line x1="8" y1="18" x2="16" y2="12" />
            </svg>
            Arraste para o próximo card
          </span>
        )}
      </div>
    </div>
  )
}
