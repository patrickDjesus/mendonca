import { useState, useCallback, useRef, useEffect } from 'react'
import type { VideoNote } from '../types/video'
import type { NoteGroup } from '../lib/db'
import {
  fetchNoteGroups,
  createNoteGroup,
  updateNoteGroup,
  deleteNoteGroup,
  assignNoteToGroup,
} from '../lib/db'
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

function groupNotesByDate(notes: VideoNote[]) {
  const now = Date.now()
  const dayMs = 86400000
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const todayStart = startOfToday.getTime()
  const yesterdayStart = todayStart - dayMs
  const weekStart = todayStart - 6 * dayMs

  const today: VideoNote[] = []
  const yesterday: VideoNote[] = []
  const thisWeek: VideoNote[] = []
  const older: VideoNote[] = []

  for (const note of notes) {
    const ts = note.createdAt || now
    if (ts >= todayStart) today.push(note)
    else if (ts >= yesterdayStart) yesterday.push(note)
    else if (ts >= weekStart) thisWeek.push(note)
    else older.push(note)
  }

  const groups: { key: string; label: string; notes: VideoNote[] }[] = []
  if (today.length) groups.push({ key: 'today', label: 'Hoje', notes: today })
  if (yesterday.length) groups.push({ key: 'yesterday', label: 'Ontem', notes: yesterday })
  if (thisWeek.length) groups.push({ key: 'week', label: 'Esta semana', notes: thisWeek })
  if (older.length) groups.push({ key: 'older', label: 'Anteriores', notes: older })
  return groups
}

interface Props {
  notes: VideoNote[]
  currentTime: number
  videoId?: string
  videoTitle?: string
  onAdd: (note: VideoNote) => Promise<boolean>
  onDelete: (id: string) => void
  onSeek: (seconds: number) => void
}

export default function NotesPanel({ notes, currentTime, videoId, videoTitle, onAdd, onDelete, onSeek }: Props) {
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [sortMode, setSortMode] = useState<'recent' | 'timestamp'>('recent')
  const [customGroups, setCustomGroups] = useState<NoteGroup[]>([])
  const [localNotes, setLocalNotes] = useState<VideoNote[]>(notes)
  const [newGroupName, setNewGroupName] = useState('')
  const [showGroupInput, setShowGroupInput] = useState(false)
  const [dragNoteId, setDragNoteId] = useState<string | null>(null)
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const groupInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setLocalNotes(notes) }, [notes])

  useEffect(() => {
    if (!videoId) return
    fetchNoteGroups(videoId).then(setCustomGroups).catch(() => {})
  }, [videoId])

  useEffect(() => { if (showGroupInput) groupInputRef.current?.focus() }, [showGroupInput])
  useEffect(() => { if (renamingGroupId) renameInputRef.current?.focus() }, [renamingGroupId])

  const sorted = [...localNotes].sort((a, b) =>
    sortMode === 'recent'
      ? (b.createdAt || 0) - (a.createdAt || 0)
      : a.timestamp - b.timestamp
  )

  const ungrouped = sorted.filter(n => !n.groupId)
  const dateGroups = sortMode === 'recent' ? groupNotesByDate(ungrouped) : []
  const timestampSorted = sortMode === 'timestamp' ? sorted : []

  const toggleGroup = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setCollapsed(prev => {
      const allKeys = [
        ...customGroups.map(g => `custom-${g.id}`),
        ...dateGroups.map(g => g.key),
      ]
      if (prev.size > 0) return new Set()
      return new Set(allKeys)
    })
  }, [customGroups, dateGroups])

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

  const handleCreateGroup = useCallback(async () => {
    const name = newGroupName.trim()
    if (!name || !videoId) return
    const group: NoteGroup = {
      id: crypto.randomUUID(),
      videoId,
      name,
      sortOrder: customGroups.length,
      createdAt: Date.now(),
    }
    try {
      await createNoteGroup(group)
      setCustomGroups(prev => [...prev, group])
      setNewGroupName('')
      setShowGroupInput(false)
    } catch (e) {
      console.error('Erro ao criar grupo:', e)
      alert('Erro ao criar grupo. Verifique se o banco de dados está configurado (tabela note_groups).')
    }
  }, [newGroupName, videoId, customGroups.length])

  const handleDeleteGroup = useCallback(async (groupId: string) => {
    try {
      await deleteNoteGroup(groupId)
      setCustomGroups(prev => prev.filter(g => g.id !== groupId))
      setLocalNotes(prev => prev.map(n => n.groupId === groupId ? { ...n, groupId: null } : n))
    } catch (e) {
      console.error('Erro ao deletar grupo:', e)
      alert('Erro ao deletar grupo.')
    }
  }, [])

  const handleRenameGroup = useCallback(async (groupId: string) => {
    const name = renameValue.trim()
    if (!name) { setRenamingGroupId(null); return }
    try {
      await updateNoteGroup(groupId, { name })
      setCustomGroups(prev => prev.map(g => g.id === groupId ? { ...g, name } : g))
    } catch (e) {
      console.error('Erro ao renomear grupo:', e)
    }
    setRenamingGroupId(null)
  }, [renameValue])

  const handleDragStart = useCallback((e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData('text/plain', noteId)
    e.dataTransfer.effectAllowed = 'move'
    setDragNoteId(noteId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragNoteId(null)
    setDragOverGroup(null)
  }, [])

  const handleGroupDragOver = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverGroup(groupId)
  }, [])

  const handleGroupDragLeave = useCallback(() => {
    setDragOverGroup(null)
  }, [])

  const handleGroupDrop = useCallback(async (e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    const noteId = e.dataTransfer.getData('text/plain')
    if (!noteId) return
    setDragNoteId(null)
    setDragOverGroup(null)
    try {
      await assignNoteToGroup(noteId, groupId)
      setLocalNotes(prev => prev.map(n => n.id === noteId ? { ...n, groupId } : n))
    } catch (err) {
      console.error('Erro ao mover anotação:', err)
      alert('Erro ao mover anotação para o grupo. Verifique se o banco de dados está configurado.')
    }
  }, [])

  const handleRemoveFromGroup = useCallback(async (noteId: string) => {
    try {
      await assignNoteToGroup(noteId, null)
      setLocalNotes(prev => prev.map(n => n.id === noteId ? { ...n, groupId: null } : n))
    } catch (err) {
      console.error('Erro ao remover do grupo:', err)
      alert('Erro ao remover anotação do grupo. Verifique se o banco de dados está configurado.')
    }
  }, [])

  const allCollapsed = sortMode === 'recent' && customGroups.length > 0 && customGroups.every(g => collapsed.has(`custom-${g.id}`))

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
        <span className="notes-panel-count">{localNotes.length}</span>
        {localNotes.length > 0 && (
          <button
            className="notes-sort-toggle"
            onClick={() => setSortMode(m => m === 'recent' ? 'timestamp' : 'recent')}
            title={sortMode === 'recent' ? 'Ordenar por momento do vídeo' : 'Ordenar por recente'}
            type="button"
          >
            {sortMode === 'recent' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            )}
          </button>
        )}
        {sortMode === 'recent' && localNotes.length > 0 && (
          <button
            className="notes-sort-toggle"
            onClick={toggleAll}
            title={allCollapsed ? 'Expandir todas' : 'Colapsar todas'}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {allCollapsed ? <polyline points="6 9 12 15 18 9" /> : <polyline points="6 15 12 9 18 15" />}
            </svg>
          </button>
        )}
        {localNotes.length > 0 && videoTitle && (
          <button
            className="notes-export-btn"
            onClick={() => exportNotesTxt(localNotes, videoTitle)}
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
        {localNotes.length === 0 && (
          <div className="notes-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <p>Nenhuma anotação ainda</p>
            <span>Assista ao vídeo e registre pontos importantes</span>
          </div>
        )}

        {/* Custom groups */}
        {sortMode === 'recent' && customGroups.map(group => {
          const isCollapsed = collapsed.has(`custom-${group.id}`)
          const groupNotes = sorted.filter(n => n.groupId === group.id)
          return (
            <div
              key={group.id}
              className={`notes-group notes-group-custom ${dragOverGroup === group.id ? 'drag-over' : ''}`}
              onDragOver={e => handleGroupDragOver(e, group.id)}
              onDragLeave={handleGroupDragLeave}
              onDrop={e => handleGroupDrop(e, group.id)}
            >
              <button
                className={`notes-group-header ${isCollapsed ? 'collapsed' : ''}`}
                onClick={() => toggleGroup(`custom-${group.id}`)}
                type="button"
              >
                <svg className="notes-group-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <svg className="notes-group-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                {renamingGroupId === group.id ? (
                  <input
                    ref={renameInputRef}
                    className="notes-group-rename-input"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameGroup(group.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameGroup(group.id)
                      if (e.key === 'Escape') setRenamingGroupId(null)
                    }}
                    onClick={e => e.stopPropagation()}
                    type="text"
                  />
                ) : (
                  <span className="notes-group-label">{group.name}</span>
                )}
                <span className="notes-group-count">{groupNotes.length}</span>
                <button
                  className="notes-group-menu-btn"
                  onClick={e => {
                    e.stopPropagation()
                    setRenamingGroupId(group.id)
                    setRenameValue(group.name)
                  }}
                  title="Renomear"
                  type="button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  className="notes-group-menu-btn notes-group-delete-btn"
                  onClick={e => {
                    e.stopPropagation()
                    handleDeleteGroup(group.id)
                  }}
                  title="Remover grupo"
                  type="button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </button>
              <div className={`notes-group-body ${isCollapsed ? 'collapsed' : ''}`}>
                {groupNotes.length === 0 && (
                  <div className="notes-group-empty-drop">
                    Arraste anotações aqui
                  </div>
                )}
                {groupNotes.map(note => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    flashId={flashId}
                    dragNoteId={dragNoteId}
                    onSeek={handleSeek}
                    onDelete={onDelete}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onRemoveFromGroup={handleRemoveFromGroup}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {/* Date-based groups (ungrouped notes) */}
        {sortMode === 'recent' && dateGroups.map(group => {
          const isCollapsed = collapsed.has(group.key)
          return (
            <div key={group.key} className="notes-group">
              <button
                className={`notes-group-header ${isCollapsed ? 'collapsed' : ''}`}
                onClick={() => toggleGroup(group.key)}
                type="button"
              >
                <svg className="notes-group-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <span className="notes-group-label">{group.label}</span>
                <span className="notes-group-count">{group.notes.length}</span>
              </button>
              <div className={`notes-group-body ${isCollapsed ? 'collapsed' : ''}`}>
                {group.notes.map(note => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    flashId={flashId}
                    dragNoteId={dragNoteId}
                    onSeek={handleSeek}
                    onDelete={onDelete}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {/* Flat timestamp mode */}
        {sortMode === 'timestamp' && timestampSorted.map(note => (
          <NoteItem
            key={note.id}
            note={note}
            flashId={flashId}
            dragNoteId={dragNoteId}
            onSeek={handleSeek}
            onDelete={onDelete}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {/* Create group bar */}
      <div className="notes-create-group-area">
        {showGroupInput ? (
          <div className="notes-create-group-row">
            <input
              ref={groupInputRef}
              className="notes-create-group-input"
              placeholder="Nome do grupo..."
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateGroup()
                if (e.key === 'Escape') { setShowGroupInput(false); setNewGroupName('') }
              }}
              type="text"
            />
            <button className="notes-create-group-confirm" onClick={handleCreateGroup} disabled={!newGroupName.trim()} type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <button className="notes-create-group-cancel" onClick={() => { setShowGroupInput(false); setNewGroupName('') }} type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : (
          <button className="notes-create-group-btn" onClick={() => setShowGroupInput(true)} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            Criar grupo
          </button>
        )}
      </div>
    </div>
  )
}

function NoteItem({ note, flashId, dragNoteId, onSeek, onDelete, onDragStart, onDragEnd, onRemoveFromGroup }: {
  note: VideoNote
  flashId: string | null
  dragNoteId: string | null
  onSeek: (seconds: number, id: string) => void
  onDelete: (id: string) => void
  onDragStart: (e: React.DragEvent, noteId: string) => void
  onDragEnd: () => void
  onRemoveFromGroup?: (noteId: string) => void
}) {
  return (
    <div
      className={`notes-item ${flashId === note.id ? 'flash' : ''} ${dragNoteId === note.id ? 'dragging' : ''}`}
      draggable
      onDragStart={e => onDragStart(e, note.id)}
      onDragEnd={onDragEnd}
    >
      <div className="notes-item-left">
        <button
          className="notes-timestamp-btn"
          onClick={() => onSeek(note.timestamp, note.id)}
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
          {note.groupId && onRemoveFromGroup && (
            <button
              className="notes-ungroup-btn"
              onClick={() => onRemoveFromGroup(note.id)}
              title="Remover do grupo"
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </button>
          )}
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
  )
}
