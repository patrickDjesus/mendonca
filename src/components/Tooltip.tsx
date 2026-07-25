import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import '../styles/tooltip.css'

interface TooltipProps {
  children?: ReactNode
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ children, content, position = 'top' }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const calcPosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const gap = 10

    let top = 0
    let left = 0

    switch (position) {
      case 'top':
        top = rect.top + window.scrollY - gap
        left = rect.left + window.scrollX + rect.width / 2
        break
      case 'bottom':
        top = rect.bottom + window.scrollY + gap
        left = rect.left + window.scrollX + rect.width / 2
        break
      case 'left':
        top = rect.top + window.scrollY + rect.height / 2
        left = rect.left + window.scrollX - gap
        break
      case 'right':
        top = rect.top + window.scrollY + rect.height / 2
        left = rect.right + window.scrollX + gap
        break
    }

    setPos({ top, left })
  }, [position])

  useEffect(() => {
    if (!open) return
    calcPosition()
    const handleScroll = () => calcPosition()
    const handleResize = () => calcPosition()
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [open, calcPosition])

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      const trigger = triggerRef.current
      const popup = popupRef.current
      if (trigger && trigger.contains(e.target as Node)) return
      if (popup && popup.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const anchorClass = `tooltip-anchor tooltip-anchor-${position}`

  const popup = open ? createPortal(
    <div
      ref={popupRef}
      className={`tooltip-popup tooltip-popup-${position}`}
      role="tooltip"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="tooltip-popup-icon">?</div>
      <div className="tooltip-popup-text">{content}</div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <span
        ref={triggerRef}
        className={anchorClass}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(prev => !prev)}
      >
        {children}
        <span className="tooltip-trigger" role="button" tabIndex={0}>?</span>
      </span>
      {popup}
    </>
  )
}
