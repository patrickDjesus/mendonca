import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Subject } from '../types/doc'
import { addCustomSubject, useSubjects, getCustom, SUBJECT_PALETTE, SUBJECT_EMOJIS, DEFAULT_SUBJECT_EMOJI, hexToColor } from '../lib/subjects'
import '../styles/subjects.css'

interface SubjectCreatorProps {
  onCreated: (subject: Subject) => void
  label?: string
  triggerClassName?: string
  compact?: boolean
}

const MENU_WIDTH = 280
const MENU_GAP = 6

function defaultHex(): string {
  return SUBJECT_PALETTE[getCustom().length % SUBJECT_PALETTE.length].text
}

export default function SubjectCreator({ onCreated, label = 'Nova', triggerClassName, compact = false }: SubjectCreatorProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState<string | null>(null)
  const [emoji, setEmoji] = useState<string>(DEFAULT_SUBJECT_EMOJI)
  const [error, setError] = useState<string | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useSubjects()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onScroll = (e: Event) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const viewW = window.innerWidth
    const viewH = window.innerHeight
    const estH = 400
    let top = rect.bottom + MENU_GAP
    if (top + estH > viewH - 8) top = Math.max(8, rect.top - estH - MENU_GAP)
    let left = rect.left
    if (left + MENU_WIDTH > viewW - 8) left = Math.max(8, rect.right - MENU_WIDTH)
    setPos({ top, left })
  }, [open])

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Digite um nome.')
      return
    }
    const chosen = color ?? defaultHex()
    if (!addCustomSubject(trimmed, hexToColor(chosen), emoji)) {
      setError('Essa matéria já existe.')
      return
    }
    onCreated(trimmed as Subject)
    setName('')
    setColor(null)
    setEmoji(DEFAULT_SUBJECT_EMOJI)
    setError(null)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`subject-creator-trigger ${compact ? 'compact' : ''} ${triggerClassName || ''}`}
        onClick={() => {
          if (!open) setColor(defaultHex())
          setOpen(o => !o)
        }}
        title="Criar nova matéria"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {label}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className="subject-creator-menu"
            style={{ top: pos.top, left: pos.left }}
            onClick={e => e.stopPropagation()}
          >
            <div className="subject-creator-title">Nova matéria</div>
            <input
              className="subject-creator-input"
              value={name}
              autoFocus
              placeholder="Ex: Astronomia"
              maxLength={30}
              onChange={e => { setName(e.target.value); if (error) setError(null) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            />

            <div className="sc-field-label">Ícone</div>
            <div className="sc-emojis">
              {SUBJECT_EMOJIS.map(em => (
                <button
                  key={em}
                  type="button"
                  className={`sc-emoji ${emoji === em ? 'selected' : ''}`}
                  onClick={() => setEmoji(em)}
                  aria-label={`Emoji ${em}`}
                >
                  {em}
                </button>
              ))}
            </div>

            <div className="sc-field-label">Cor</div>
            <div className="sc-colors">
              {SUBJECT_PALETTE.map(c => {
                const selected = color === c.text
                return (
                  <button
                    key={c.text}
                    type="button"
                    className={`sc-swatch ${selected ? 'selected' : ''}`}
                    style={{ background: c.text }}
                    onClick={() => setColor(c.text)}
                    aria-label={`Cor ${c.text}`}
                  />
                )
              })}
              <label className="sc-swatch sc-swatch-custom" title="Cor personalizada">
                <input
                  type="color"
                  value={color ?? defaultHex()}
                  onChange={e => setColor(e.target.value)}
                  aria-label="Cor personalizada"
                />
                <span>+</span>
              </label>
            </div>

            {error && <div className="subject-creator-error">{error}</div>}
            <button
              className="subject-creator-submit"
              onClick={submit}
              type="button"
              disabled={!name.trim()}
              style={color ? { background: hexToColor(color).bg, color: hexToColor(color).text, border: `1px solid ${hexToColor(color).text}55` } : undefined}
            >
              Criar
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}
