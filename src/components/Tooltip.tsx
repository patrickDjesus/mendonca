import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import '../styles/tooltip.css'

interface TooltipProps {
  children?: ReactNode
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  hideIcon?: boolean
}

const OPPOSITE: Record<string, string> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
const GAP = 10

export default function Tooltip({ children, content, position: defaultPos = 'top', hideIcon = false }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const [finalPos, setFinalPos] = useState<{ top: number; left: number; dir: string }>({ top: 0, left: 0, dir: defaultPos })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  const measureAndFlip = useCallback(() => {
    const el = triggerRef.current
    const popup = popupRef.current
    if (!el) return

    const r = el.getBoundingClientRect()
    const sy = window.scrollY
    const sx = window.scrollX
    const vw = window.innerWidth
    const vh = window.innerHeight

    let dir: string = defaultPos

    function calcForDir(d: string) {
      switch (d) {
        case 'top':    return { top: r.top + sy - GAP, left: r.left + sx + r.width / 2 }
        case 'bottom': return { top: r.bottom + sy + GAP, left: r.left + sx + r.width / 2 }
        case 'left':   return { top: r.top + sy + r.height / 2, left: r.left + sx - GAP }
        case 'right':  return { top: r.top + sy + r.height / 2, left: r.right + sx + GAP }
        default:       return { top: r.top + sy - GAP, left: r.left + sx + r.width / 2 }
      }
    }

    let p = calcForDir(dir)

    if (popup) {
      const pw = popup.offsetWidth
      const ph = popup.offsetHeight

      const overTop    = dir === 'top'    && (r.top - GAP - ph) < 0
      const overBottom = dir === 'bottom' && (r.bottom + GAP + ph) > vh
      const overLeft   = dir === 'left'   && (r.left - GAP - pw) < 0
      const overRight  = dir === 'right'  && (r.right + GAP + pw) > vw

      if (overTop || overBottom || overLeft || overRight) {
        dir = OPPOSITE[dir] || 'bottom'
        p = calcForDir(dir)
      }

      if (dir === 'top' || dir === 'bottom') {
        const half = pw / 2
        if (p.left - half < sx + 4) p.left = sx + half + 4
        else if (p.left + half > sx + vw - 4) p.left = sx + vw - half - 4
      }

      if (dir === 'left' || dir === 'right') {
        const half = ph / 2
        if (p.top - half < sy + 4) p.top = sy + half + 4
        else if (p.top + half > sy + vh - 4) p.top = sy + vh - half - 4
      }
    }

    setFinalPos({ top: p.top, left: p.left, dir })
  }, [defaultPos])

  useEffect(() => {
    if (!open) return
    measureAndFlip()
    const onScroll = () => measureAndFlip()
    const onResize = () => measureAndFlip()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, measureAndFlip])

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return
      if (popupRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const popup = open ? createPortal(
    <div
      ref={popupRef}
      className={`tooltip-popup tooltip-popup-${finalPos.dir as 'top' | 'bottom' | 'left' | 'right'}`}
      role="tooltip"
      style={{ top: finalPos.top, left: finalPos.left }}
    >
      <div className="tooltip-popup-icon">?</div>
      <div className="tooltip-popup-text">{content}</div>
    </div>,
    document.body
  ) : null

  return (
    <span
      className={`tooltip-anchor${hideIcon ? ' icon-hidden' : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen(prev => !prev)}
    >
      {hideIcon ? (
        <span ref={triggerRef} style={{ display: 'inline-flex', alignItems: 'inherit', justifyContent: 'inherit' }}>
          {children}
        </span>
      ) : (
        <>
          {children}
          <span ref={triggerRef} className="tooltip-trigger" role="button" tabIndex={0}>?</span>
        </>
      )}
      {popup}
    </span>
  )
}
