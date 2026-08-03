import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface SpellPopupState {
  x: number
  y: number
  from: number
  to: number
  word: string
}

interface SpellContextMenuProps {
  anchor: SpellPopupState
  suggestions: string[]
  message?: string
  loading: boolean
  onPick: (value: string) => void
  onCopy: () => void
  onPaste: () => void
  onIgnore: () => void
  onClose: () => void
}

export default function SpellContextMenu({
  anchor,
  suggestions,
  message,
  loading,
  onPick,
  onCopy,
  onPaste,
  onIgnore,
  onClose,
}: SpellContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: 0, top: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const left = Math.max(8, Math.min(anchor.x, window.innerWidth - rect.width - 8))
    const top = Math.max(8, Math.min(anchor.y + 4, window.innerHeight - rect.height - 8))
    setPos({ left, top })
  }, [anchor])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('mousedown', onMouseDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [onClose])

  const hasWord = anchor.word.length > 0

  return createPortal(
    <div ref={ref} className="doc-ctx-menu" style={{ left: pos.left, top: pos.top }}>
      {hasWord ? (
        <>
          <div className="doc-ctx-word">{anchor.word}</div>
          {message ? <div className="doc-ctx-msg">{message}</div> : null}
          <div className="doc-ctx-sep" />
          <div className="doc-ctx-label">SUGESTÕES</div>
          {loading ? (
            <div className="doc-ctx-empty">Buscando sugestões…</div>
          ) : suggestions.length > 0 ? (
            <div className="doc-ctx-sugs">
              {suggestions.map((s) => (
                <button key={s} type="button" className="doc-ctx-item doc-ctx-sug" onClick={() => onPick(s)}>
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <div className="doc-ctx-empty">Nenhuma sugestão encontrada.</div>
          )}
          <div className="doc-ctx-sep" />
        </>
      ) : null}

      <button type="button" className="doc-ctx-item" onClick={onCopy}>Copiar</button>
      <button type="button" className="doc-ctx-item" onClick={onPaste}>Colar</button>

      {hasWord ? (
        <>
          <div className="doc-ctx-sep" />
          <button type="button" className="doc-ctx-item" onClick={onIgnore}>Ignorar erro</button>
          <div className="doc-ctx-footer">
            Correção por <a href="https://languagetool.org" target="_blank" rel="noopener noreferrer">LanguageTool</a>
          </div>
        </>
      ) : null}
    </div>,
    document.body,
  )
}
