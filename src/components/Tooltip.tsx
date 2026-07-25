import { useState, useRef, useEffect, type ReactNode } from 'react'
import '../styles/tooltip.css'

interface TooltipProps {
  children?: ReactNode
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ children, content, position = 'top' }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <span
      ref={ref}
      className="tooltip-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen(prev => !prev)}
    >
      {children}
      <span className="tooltip-trigger" role="button" tabIndex={0}>?</span>
      {open && (
        <span className={`tooltip-box tooltip-${position}`} role="tooltip">
          <span className="tooltip-icon">?</span>
          <span className="tooltip-text">{content}</span>
        </span>
      )}
    </span>
  )
}
