import { useEffect, useRef, useState } from 'react'
import type { Subject } from '../types/doc'
import { useSubjects, getSubjectColors, getSubjectEmoji } from '../lib/subjects'
import SubjectCreator from './SubjectCreator'
import '../styles/subjects.css'

interface SubjectSelectorProps {
  value: Subject | null
  onChange: (subject: Subject | null) => void
  onCreated: (subject: Subject) => void
}

interface DragState {
  active: boolean
  startX: number
  scrollLeft: number
  moved: boolean
}

export default function SubjectSelector({ value, onChange, onCreated }: SubjectSelectorProps) {
  const allSubjects = useSubjects()
  const [query, setQuery] = useState('')
  const rowRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState>({ active: false, startX: 0, scrollLeft: 0, moved: false })

  const q = query.trim().toLowerCase()
  const visible = q ? allSubjects.filter(s => s.toLowerCase().includes(q)) : allSubjects

  const startDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const el = rowRef.current
    if (!el) return
    e.preventDefault()
    dragRef.current = { active: true, startX: e.pageX, scrollLeft: el.scrollLeft, moved: false }
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current
      if (!d.active) return
      const dx = ev.pageX - d.startX
      if (Math.abs(dx) > 5) d.moved = true
      el.scrollLeft = d.scrollLeft - dx
    }
    const onUp = () => {
      dragRef.current = { ...dragRef.current, active: false }
      el.style.cursor = ''
      el.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      window.setTimeout(() => {
        dragRef.current.moved = false
      }, 0)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const maxLeft = el.scrollWidth - el.clientWidth
      if (maxLeft <= 0) return
      e.preventDefault()
      el.scrollLeft += e.deltaY + e.deltaX
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <div className="subject-selector">
      <div className="subject-selector-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          placeholder="Buscar matéria..."
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button
            className="subject-selector-clear"
            type="button"
            onClick={() => setQuery('')}
            aria-label="Limpar busca"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="subject-selector-row" ref={rowRef} onMouseDown={startDrag}>
        {visible.map(s => {
          const colors = getSubjectColors(s)
          const selected = value === s
          return (
            <button
              key={s}
              type="button"
              className={`subject-selector-card ${selected ? 'selected' : ''}`}
              style={{
                background: selected ? colors.text : colors.bg,
                color: selected ? '#1a1714' : colors.text,
                borderColor: selected ? colors.text : `${colors.text}44`,
              }}
              data-subject-editable={s}
              onClick={() => {
                if (dragRef.current.moved) return
                onChange(selected ? null : s)
              }}
            >
              <span className="subject-selector-emoji">{getSubjectEmoji(s)}</span>
              <span className="subject-selector-name">{s}</span>
            </button>
          )
        })}
        <SubjectCreator
          onCreated={onCreated}
          label=""
          compact
          triggerClassName="subject-selector-add"
        />
      </div>
    </div>
  )
}
