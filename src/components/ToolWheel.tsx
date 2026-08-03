import { useEffect, useRef, useState, type ReactNode } from 'react'
import FloatingCalculator from './FloatingCalculator'
import FloatingTimer from './FloatingTimer'
import FloatingDraw from './FloatingDraw'

type Tool = 'calc' | 'timer' | 'draw' | null

interface ToolDef {
  id: Exclude<Tool, null>
  label: string
  icon: ReactNode
}

const TOOLS: ToolDef[] = [
  {
    id: 'calc',
    label: 'Calculadora',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="8" y2="10.01" />
        <line x1="12" y1="10" x2="12" y2="10.01" />
        <line x1="16" y1="10" x2="16" y2="10.01" />
        <line x1="8" y1="14" x2="8" y2="14.01" />
        <line x1="12" y1="14" x2="12" y2="14.01" />
        <line x1="16" y1="14" x2="16" y2="14.01" />
        <line x1="8" y1="18" x2="8" y2="18.01" />
        <line x1="12" y1="18" x2="16" y2="18" />
      </svg>
    ),
  },
  {
    id: 'timer',
    label: 'Timer',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.5" />
        <path d="M9 2h6" />
      </svg>
    ),
  },
  {
    id: 'draw',
    label: 'Desenho',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
]

export default function ToolWheel() {
  const [wheelOpen, setWheelOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<Tool>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const toggleFab = () => {
    if (activeTool) {
      setActiveTool(null)
      return
    }
    setWheelOpen(prev => !prev)
  }

  const pick = (t: Exclude<Tool, null>) => {
    setActiveTool(t)
    setWheelOpen(false)
  }

  useEffect(() => {
    if (!wheelOpen) return
    const h = (e: MouseEvent) => {
      const root = rootRef.current
      if (root && !root.contains(e.target as Node)) setWheelOpen(false)
    }
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [wheelOpen])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWheelOpen(false)
        setActiveTool(null)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <div className="tool-wheel-root" ref={rootRef}>
      {wheelOpen && (
        <div className="tool-wheel">
          {TOOLS.map((t, i) => (
            <button
              key={t.id}
              className="tool-wheel-option"
              style={{ animationDelay: `${i * 0.05}s` }}
              onClick={() => pick(t.id)}
              type="button"
            >
              <span className="tool-wheel-option-label">{t.label}</span>
              <span className="tool-wheel-option-icon">{t.icon}</span>
            </button>
          ))}
        </div>
      )}

      <button
        className={`tool-fab ${wheelOpen ? 'tool-fab-open' : ''}`}
        onClick={toggleFab}
        type="button"
        aria-label="Ferramentas"
      >
        <svg className="tool-fab-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <FloatingCalculator open={activeTool === 'calc'} onClose={() => setActiveTool(null)} />
      <FloatingTimer open={activeTool === 'timer'} onClose={() => setActiveTool(null)} />
      <FloatingDraw open={activeTool === 'draw'} onClose={() => setActiveTool(null)} />
    </div>
  )
}
