import { useState, useCallback, useRef, useEffect } from 'react'
import type { VideoNote } from '../types/video'
import { formatTimestamp } from '../utils/format'

function exportNotesTxt(notes: VideoNote[], videoTitle: string) {
  const sorted = [...notes].sort((a, b) => a.timestamp - b.timestamp)
  const lines: string[] = [
    `ANOTACOES — ${videoTitle}`,
    `Total: ${sorted.length} anotacoes`,
    '',
  ]
  for (const n of sorted) {
    lines.push(`[${formatTimestamp(n.timestamp)}] ${n.text}`)
  }
  lines.push('')
  lines.push(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`)

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `anotacoes-${videoTitle.replace(/[^a-zA-Z0-9]/g, '_')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}



interface Props {
  notes: VideoNote[]
  currentTime: number
  videoTitle?: string
  onAdd: (note: VideoNote) => Promise<boolean>
  onDelete: (id: string) => void
  onSeek: (seconds: number) => void
}

export default function NotesPanel({ notes, currentTime, videoTitle, onAdd, onDelete, onSeek }: Props) {
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const sorted = [...notes].sort((a, b) => a.timestamp - b.timestamp)

  const handleAdd = useCallback(async () => {
    const text = input.trim()
    if (!text || isAdding) return
    setIsAdding(true)
    const note: VideoNote = {
      id: crypto.randomUUID(),
      videoId: '',
      text,
      timestamp: currentTime,
      createdAt: Date.now(),
    }
    setInput('')
    const ok = await onAdd(note)
    if (!ok) setInput(text)
    setIsAdding(false)
  }, [input, currentTime, onAdd, isAdding])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }, [handleAdd])

  useEffect(() => {
    if (!flashId) return
    const t = setTimeout(() => setFlashId(null), 1200)
    return () => clearTimeout(t)
  }, [flashId])

  const handleSeek = useCallback((seconds: number, id: string) => {
    onSeek(seconds)
    setFlashId(id)
  }, [onSeek])

  return (
    <div className="notes-panel">
      <div className="notes-panel-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <h3 className="notes-panel-title">Anotações</h3>
        <span className="notes-panel-count">{notes.length}</span>
        {notes.length > 0 && videoTitle && (
          <button
            className="notes-export-btn"
            onClick={() => exportNotesTxt(notes, videoTitle)}
            title="Exportar anotações"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        )}
      </div>

      <div className="notes-input-area">
        <div className="notes-input-timestamp">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{formatTimestamp(currentTime)}</span>
        </div>
        <div className="notes-input-row">
          <textarea
            className="notes-input"
            placeholder="Escreva uma anotação..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <button
            className="notes-send-btn"
            onClick={handleAdd}
            disabled={!input.trim() || isAdding}
            title="Adicionar anotação"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      <div className="notes-list" ref={listRef}>
        {sorted.length === 0 && (
          <div className="notes-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <p>Nenhuma anotação ainda</p>
            <span>Assista ao vídeo e registre pontos importantes</span>
          </div>
        )}
        {sorted.map(note => (
          <div
            key={note.id}
            className={`notes-item ${flashId === note.id ? 'flash' : ''}`}
          >
            <div className="notes-item-left">
              <button
                className="notes-timestamp-btn"
                onClick={() => handleSeek(note.timestamp, note.id)}
                type="button"
                title="Ir para este momento"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>{formatTimestamp(note.timestamp)}</span>
              </button>
            </div>
            <div className="notes-item-body">
              <p className="notes-item-text">{note.text}</p>
              <div className="notes-item-actions">
                <button
                  className="notes-delete-btn"
                  onClick={() => onDelete(note.id)}
                  title="Remover anotação"
                  type="button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
