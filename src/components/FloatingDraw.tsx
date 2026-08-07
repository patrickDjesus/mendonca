import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

interface FloatingDrawProps {
  open: boolean
  onClose: () => void
}

type Tool = 'pen' | 'eraser' | 'rect' | 'circle' | 'line' | 'arrow' | 'text'

interface DrawElement {
  tool: Tool
  color: string
  size: number
  points: { x: number; y: number }[]
  text?: string
}

const COLORS = ['#daa03c', '#ffffff', '#e85050', '#4fa0e0', '#55c060', '#000000']
const SIZES = [2, 4, 8, 16]

function strokeStyle(el: DrawElement): string {
  return el.color
}

function lineWidthOf(el: DrawElement): number {
  return el.size
}

function paintElement(ctx: CanvasRenderingContext2D, el: DrawElement) {
  if (el.tool === 'text') {
    const px = 16 + el.size * 2
    ctx.save()
    ctx.font = `${px}px Caveat, cursive`
    ctx.fillStyle = el.color
    ctx.textBaseline = 'alphabetic'
    ;(el.text || '').split('\n').forEach((line, i) => {
      ctx.fillText(line, el.points[0].x, el.points[0].y + i * px)
    })
    ctx.restore()
    return
  }

  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.strokeStyle = strokeStyle(el)
  ctx.fillStyle = strokeStyle(el)
  ctx.lineWidth = lineWidthOf(el)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (el.tool === 'pen') {
    if (el.points.length < 2) {
      ctx.beginPath()
      ctx.arc(el.points[0].x, el.points[0].y, ctx.lineWidth / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    ctx.beginPath()
    ctx.moveTo(el.points[0].x, el.points[0].y)
    for (const p of el.points.slice(1)) ctx.lineTo(p.x, p.y)
    ctx.stroke()
    ctx.restore()
    return
  }

  const [a, b] = el.points
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const w = Math.abs(b.x - a.x)
  const h = Math.abs(b.y - a.y)

  if (el.tool === 'rect') {
    ctx.strokeRect(x, y, w, h)
  } else if (el.tool === 'circle') {
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (el.tool === 'line') {
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  } else if (el.tool === 'arrow') {
    const ang = Math.atan2(b.y - a.y, b.x - a.x)
    const headLen = 10 + ctx.lineWidth * 2
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.moveTo(b.x - headLen * Math.cos(ang - 0.42), b.y - headLen * Math.sin(ang - 0.42))
    ctx.lineTo(b.x, b.y)
    ctx.lineTo(b.x - headLen * Math.cos(ang + 0.42), b.y - headLen * Math.sin(ang + 0.42))
    ctx.stroke()
  }

  ctx.restore()
}

function elementBounds(el: DrawElement): { x: number; y: number; w: number; h: number } {
  const pad = 10
  if (el.tool === 'text') {
    const px = 16 + el.size * 2
    const lines = (el.text || '').split('\n')
    const w = Math.max(...lines.map(l => Math.max(l.length * px * 0.5, 1)), 1)
    const p = el.points[0]
    return { x: p.x - pad, y: p.y - px - pad, w: w + pad * 2, h: lines.length * px + pad * 2 }
  }
  if (el.tool === 'pen') {
    const xs = el.points.map(p => p.x)
    const ys = el.points.map(p => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
  }
  const a = el.points[0]
  const b = el.points[1]
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return { x: x - pad, y: y - pad, w: Math.abs(b.x - a.x) + pad * 2, h: Math.abs(b.y - a.y) + pad * 2 }
}

function hitTest(elements: DrawElement[], x: number, y: number): number {
  for (let i = elements.length - 1; i >= 0; i--) {
    const b = elementBounds(elements[i])
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return i
  }
  return -1
}

interface ToolDef {
  id: Tool
  label: string
  icon: ReactNode
}

const TOOLS: ToolDef[] = [
  {
    id: 'pen',
    label: 'Caneta',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
  {
    id: 'eraser',
    label: 'Apagar item',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
        <path d="M22 21H7" />
        <path d="m5 11 9 9" />
      </svg>
    ),
  },
  {
    id: 'rect',
    label: 'Retângulo',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
      </svg>
    ),
  },
  {
    id: 'circle',
    label: 'Círculo',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    id: 'line',
    label: 'Linha',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="20" x2="20" y2="4" />
      </svg>
    ),
  },
  {
    id: 'arrow',
    label: 'Seta',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="21" x2="21" y2="3" />
        <path d="M8 3h13v13" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Texto',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="12" y1="20" x2="12" y2="4" />
      </svg>
    ),
  },
]

export default function FloatingDraw({ open, onClose }: FloatingDrawProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(false)
  const elementsRef = useRef<DrawElement[]>([])
  const currentRef = useRef<DrawElement | null>(null)
  const redoRef = useRef<DrawElement[][]>([])
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#daa03c')
  const [size, setSize] = useState(4)
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; value: string } | null>(null)
  const textDraftRef = useRef<{ x: number; y: number; value: string } | null>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const canvas = canvasRef.current
    if (!canvas) return
    const fit = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [open])

  const getPos = useCallback((e: React.PointerEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const el of elementsRef.current) paintElement(ctx, el)
  }, [])

  const undo = useCallback(() => {
    const el = elementsRef.current.pop()
    if (el) redoRef.current.push([el])
    redraw()
  }, [redraw])

  const redo = useCallback(() => {
    const group = redoRef.current.pop()
    if (!group) return
    elementsRef.current.push(...group)
    redraw()
  }, [redraw])

  const commitElement = useCallback((el: DrawElement) => {
    elementsRef.current.push(el)
    redoRef.current = []
  }, [])

  const commitText = useCallback((closeEvenEmpty = false) => {
    const draft = textDraftRef.current
    if (!draft) return
    if (draft.value.trim()) {
      commitElement({
        tool: 'text',
        color,
        size,
        points: [{ x: draft.x, y: draft.y }],
        text: draft.value,
      })
      redraw()
    }
    if (draft.value.trim() || closeEvenEmpty) {
      textDraftRef.current = null
      setTextDraft(null)
    }
  }, [color, size, commitElement, redraw])

  useEffect(() => {
    if (textDraft) textInputRef.current?.focus()
  }, [textDraft])

  const eraseAt = useCallback((pos: { x: number; y: number }) => {
    const idx = hitTest(elementsRef.current, pos.x, pos.y)
    if (idx === -1) return
    const [removed] = elementsRef.current.splice(idx, 1)
    if (removed) redoRef.current.push([removed])
    redraw()
  }, [redraw])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const canvas = canvasRef.current
    if (!canvas) return
    const pos = getPos(e)

    commitText()

    if (tool === 'text') {
      const draft = { x: pos.x, y: pos.y, value: '' }
      textDraftRef.current = draft
      setTextDraft(draft)
      return
    }

    activeRef.current = true
    canvas.setPointerCapture(e.pointerId)

    if (tool === 'eraser') {
      eraseAt(pos)
      return
    }

    currentRef.current = { tool, color, size, points: [pos] }
  }, [getPos, tool, color, size, commitText, eraseAt])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!activeRef.current) return
    const pos = getPos(e)

    if (tool === 'eraser') {
      eraseAt(pos)
      return
    }

    const cur = currentRef.current
    if (!cur) return

    if (cur.tool === 'pen') {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const prev = cur.points[cur.points.length - 1]
      cur.points.push(pos)
      ctx.save()
      ctx.strokeStyle = cur.color
      ctx.lineWidth = cur.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      ctx.restore()
      return
    }

    cur.points = [cur.points[0], pos]
    redraw()
    const ctx = canvas.getContext('2d')
    if (ctx && currentRef.current) paintElement(ctx, currentRef.current)
  }, [getPos, redraw, tool, eraseAt])

  const handlePointerUp = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    if (currentRef.current) {
      commitElement(currentRef.current)
      currentRef.current = null
    }
  }, [commitElement])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const target = document.activeElement
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      if (typing) return
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase()
        if (k === 'z' && !e.shiftKey) {
          e.preventDefault()
          undo()
        } else if (k === 'z' && e.shiftKey) {
          e.preventDefault()
          redo()
        } else if (k === 'y') {
          e.preventDefault()
          redo()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, undo, redo])

  const clear = useCallback(() => {
    elementsRef.current = []
    redoRef.current = []
    currentRef.current = null
    setTextDraft(null)
    redraw()
  }, [redraw])

  return (
    open ? (
      <div className="draw-overlay" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
        <canvas ref={canvasRef} className="draw-canvas" />

        {textDraft && (
          <input
            ref={textInputRef}
            className="draw-text-input"
            style={{ left: textDraft.x, top: textDraft.y }}
            value={textDraft.value}
            placeholder="Digite o texto..."
            onChange={e => {
              const v = e.target.value
              if (textDraftRef.current) textDraftRef.current = { ...textDraftRef.current, value: v }
              setTextDraft(d => (d ? { ...d, value: v } : d))
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') commitText()
              if (e.key === 'Escape') {
                e.stopPropagation()
                textDraftRef.current = null
                setTextDraft(null)
              }
            }}
            onBlur={() => commitText()}
            onPointerDown={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          />
        )}

        <div className="draw-toolbar">
          <div className="draw-tools">
            {TOOLS.map(t => (
              <button
                key={t.id}
                className={`draw-tool ${tool === t.id ? 'draw-tool-active' : ''}`}
                onClick={() => { commitText(true); setTool(t.id) }}
                onPointerDown={e => e.stopPropagation()}
                type="button"
                title={t.label}
              >
                {t.icon}
              </button>
            ))}
          </div>

          <div className="draw-colors">
            {COLORS.map(c => (
              <button
                key={c}
                className={`draw-swatch ${color === c && tool !== 'eraser' ? 'draw-swatch-active' : ''}`}
                style={{ background: c }}
                onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen') }}
                onPointerDown={e => e.stopPropagation()}
                type="button"
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>

          <div className="draw-sizes">
            {SIZES.map(s => (
              <button
                key={s}
                className={`draw-size ${size === s ? 'draw-size-active' : ''}`}
                onClick={() => setSize(s)}
                onPointerDown={e => e.stopPropagation()}
                type="button"
                aria-label={`Tamanho ${s}`}
              >
                <span style={{ width: s, height: s }} />
              </button>
            ))}
          </div>

          <div className="draw-actions" onPointerDown={e => e.stopPropagation()}>
            <button className="draw-btn" onClick={undo} type="button" title="Ctrl+Z">Desfazer</button>
            <button className="draw-btn" onClick={redo} type="button" title="Ctrl+Shift+Z">Refazer</button>
            <button className="draw-btn" onClick={clear} type="button">Limpar</button>
            <button className="draw-btn draw-btn-close" onClick={onClose} type="button">Fechar</button>
          </div>
        </div>
      </div>
    ) : null
  )
}
