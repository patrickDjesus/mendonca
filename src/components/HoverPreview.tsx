import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import '../styles/hovercard.css'

export interface HoverPreviewBind {
  ref: (el: HTMLElement | null) => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

interface HoverPreviewProps {
  children: (bind: HoverPreviewBind) => ReactNode
  preview: ReactNode
  showDelay?: number
}

const GAP = 12
const MARGIN = 8

export default function HoverPreview({ children, preview, showDelay = 250 }: HoverPreviewProps) {
  const elRef = useRef<HTMLElement | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoveringRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const measure = useCallback(() => {
    const el = elRef.current
    const card = cardRef.current
    if (!el || !card) return
    const r = el.getBoundingClientRect()
    const sy = window.scrollY
    const sx = window.scrollX
    const cw = card.offsetWidth
    const ch = card.offsetHeight
    const placeAbove = r.top - ch - GAP >= MARGIN
    const top = placeAbove ? r.top + sy - ch - GAP : r.bottom + sy + GAP
    const vw = window.innerWidth
    const left = Math.max(
      sx + MARGIN + cw / 2,
      Math.min(sx + vw - MARGIN - cw / 2, r.left + sx + r.width / 2),
    )
    setPos({ top, left })
  }, [])

  const openNow = useCallback(() => {
    if (!hoveringRef.current) return
    if (elRef.current?.closest('[data-dragging="true"]')) return
    setOpen(true)
  }, [])

  const onMouseEnter = useCallback(() => {
    hoveringRef.current = true
    if (openTimerRef.current) clearTimeout(openTimerRef.current)
    openTimerRef.current = setTimeout(openNow, showDelay)
  }, [openNow, showDelay])

  const onMouseLeave = useCallback(() => {
    hoveringRef.current = false
    if (openTimerRef.current) clearTimeout(openTimerRef.current)
    setOpen(false)
  }, [])

  const setElRef = useCallback((el: HTMLElement | null) => {
    elRef.current = el
  }, [])

  const bind = useMemo<HoverPreviewBind>(() => ({
    ref: setElRef,
    onMouseEnter,
    onMouseLeave,
  }), [setElRef, onMouseEnter, onMouseLeave])
  useEffect(() => {
    if (open) measure()
  }, [open, measure])

  useEffect(() => {
    if (!open) return
    const onUpdate = () => measure()
    window.addEventListener('scroll', onUpdate, true)
    window.addEventListener('resize', onUpdate)
    return () => {
      window.removeEventListener('scroll', onUpdate, true)
      window.removeEventListener('resize', onUpdate)
    }
  }, [open, measure])

  useEffect(() => () => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current)
  }, [])

  return (
    <>
      {children(bind)}
      {open && createPortal(
        <div
          ref={cardRef}
          className="hover-preview-card"
          style={{ top: pos.top, left: pos.left }}
        >
          {preview}
        </div>,
        document.body,
      )}
    </>
  )
}
