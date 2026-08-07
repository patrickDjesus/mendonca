import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getCustomSubject, hexToColor, isCustomSubject, removeCustomSubject, SUBJECT_PALETTE, SUBJECT_EMOJIS, DEFAULT_SUBJECT_EMOJI, updateCustomSubject } from '../lib/subjects'
import { reassignSubjectToNA } from '../lib/db'
import '../styles/subjects.css'

interface HoverState {
  name: string
  x: number
  y: number
}

const PENCIL_SIZE = 26
const MENU_WIDTH = 280
const MENU_HEIGHT = 400

export default function SubjectEditHost() {
  const [hover, setHover] = useState<HoverState | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState('')
  const [formEmoji, setFormEmoji] = useState(DEFAULT_SUBJECT_EMOJI)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const hoverRef = useRef<HoverState | null>(null)
  const menuOpenRef = useRef(false)
  const currentElRef = useRef<HTMLElement | null>(null)
  const hideTimerRef = useRef<number | null>(null)
  const editNameRef = useRef<string | null>(null)

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const scheduleHide = useCallback(() => {
    if (menuOpenRef.current) return
    if (hideTimerRef.current !== null) return
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null
      currentElRef.current = null
      hoverRef.current = null
      setHover(null)
    }, 200)
  }, [])

  const closeMenu = useCallback(() => {
    menuOpenRef.current = false
    setMenuOpen(false)
    cancelHide()
    currentElRef.current = null
    hoverRef.current = null
    setHover(null)
  }, [cancelHide])

  useEffect(() => {
    const onOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('.subject-edit-pencil') || el.closest('.subject-edit-menu')) return
      const target = el.closest('[data-subject-editable]') as HTMLElement | null
      if (target) {
        const name = target.getAttribute('data-subject-editable')
        if (name && isCustomSubject(name)) {
          if (currentElRef.current !== target) {
            currentElRef.current = target
            const rect = target.getBoundingClientRect()
            const next: HoverState = { name, x: rect.right, y: rect.top }
            hoverRef.current = next
            setHover(next)
          }
          cancelHide()
          return
        }
      }
      const cur = currentElRef.current
      if (cur && !cur.contains(el)) {
        scheduleHide()
      }
    }
    const clear = (e?: Event) => {
      cancelHide()
      if (e && menuOpenRef.current) {
        const t = e.target as Node
        if (menuRef.current?.contains(t)) return
      }
      currentElRef.current = null
      hoverRef.current = null
      setHover(null)
    }
    document.addEventListener('mouseover', onOver)
    window.addEventListener('scroll', clear, true)
    window.addEventListener('resize', clear)
    return () => {
      document.removeEventListener('mouseover', onOver)
      window.removeEventListener('scroll', clear, true)
      window.removeEventListener('resize', clear)
      cancelHide()
    }
  }, [cancelHide, scheduleHide])

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t)) return
      closeMenu()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen, closeMenu])

  useLayoutEffect(() => {
    if (!menuOpen) return
    const h = hoverRef.current
    if (!h) return
    const viewW = window.innerWidth
    const viewH = window.innerHeight
    let left = h.x + 6
    let top = h.y + 6
    if (left + MENU_WIDTH > viewW - 8) left = Math.max(8, h.x - MENU_WIDTH - 6)
    if (top + MENU_HEIGHT > viewH - 8) top = Math.max(8, h.y - MENU_HEIGHT - 6)
    setPos({ top, left })
  }, [menuOpen])

  const openMenu = () => {
    cancelHide()
    const h = hoverRef.current
    if (!h) return
    const subj = getCustomSubject(h.name)
    if (!subj) return
    setFormName(subj.name)
    setFormColor(subj.text)
    setFormEmoji(subj.emoji || DEFAULT_SUBJECT_EMOJI)
    setError(null)
    setDeleting(false)
    editNameRef.current = h.name
    menuOpenRef.current = true
    setMenuOpen(true)
  }

  const save = () => {
    const name = editNameRef.current
    if (!name) return
    const trimmed = formName.trim()
    if (!trimmed) {
      setError('Digite um nome.')
      return
    }
    if (!updateCustomSubject(name, { name: trimmed, color: hexToColor(formColor), emoji: formEmoji })) {
      setError('Já existe uma matéria com esse nome.')
      return
    }
    editNameRef.current = trimmed
    closeMenu()
  }

  const remove = async () => {
    const name = editNameRef.current
    if (!name) return
    setDeleting(true)
    try {
      await reassignSubjectToNA(name)
      removeCustomSubject(name)
      editNameRef.current = null
      window.dispatchEvent(new Event('mendonca:subjects-deleted'))
      closeMenu()
    } catch {
      setError('Não foi possível excluir. Tente novamente.')
      setDeleting(false)
    }
  }

  const pencilLeft = hover ? Math.max(4, hover.x - PENCIL_SIZE / 2 - 2) : 0
  const pencilTop = hover ? Math.max(4, hover.y - PENCIL_SIZE + 2) : 0

  return (
    <>
      {hover &&
        !menuOpen &&
        createPortal(
          <button
            type="button"
            className="subject-edit-pencil"
            style={{ left: pencilLeft, top: pencilTop }}
            title="Editar matéria"
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
            onClick={e => { e.stopPropagation(); openMenu() }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>,
          document.body,
        )}

      {menuOpen &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className="subject-edit-menu"
            style={{ top: pos.top, left: pos.left }}
            onClick={e => e.stopPropagation()}
          >
            <div className="subject-creator-title">Editar matéria</div>
            <input
              className="subject-creator-input"
              value={formName}
              autoFocus
              placeholder="Nome da matéria"
              maxLength={30}
              onChange={e => { setFormName(e.target.value); if (error) setError(null) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
            />
            <div className="sc-field-label">Ícone</div>
            <div className="sc-emojis">
              {SUBJECT_EMOJIS.map(em => (
                <button
                  key={em}
                  type="button"
                  className={`sc-emoji ${formEmoji === em ? 'selected' : ''}`}
                  onClick={() => setFormEmoji(em)}
                  aria-label={`Emoji ${em}`}
                >
                  {em}
                </button>
              ))}
            </div>
            <div className="sc-field-label">Cor</div>
            <div className="sc-colors">
              {SUBJECT_PALETTE.map(c => {
                const selected = formColor === c.text
                return (
                  <button
                    key={c.text}
                    type="button"
                    className={`sc-swatch ${selected ? 'selected' : ''}`}
                    style={{ background: c.text }}
                    onClick={() => setFormColor(c.text)}
                    aria-label={`Cor ${c.text}`}
                  />
                )
              })}
              <label className="sc-swatch sc-swatch-custom" title="Cor personalizada">
                <input
                  type="color"
                  value={formColor}
                  onChange={e => setFormColor(e.target.value)}
                  aria-label="Cor personalizada"
                />
                <span>+</span>
              </label>
            </div>
            {error && <div className="subject-creator-error">{error}</div>}
            <div className="sc-menu-actions">
              <button className="sc-menu-delete" onClick={remove} type="button" disabled={deleting}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
              <button className="sc-menu-save" onClick={save} type="button" disabled={!formName.trim()}>
                Salvar
              </button>
            </div>
            <div className="sc-menu-hint">Ao excluir, os arquivos dessa matéria passam para N/A.</div>
          </div>,
          document.body,
        )}
    </>
  )
}
