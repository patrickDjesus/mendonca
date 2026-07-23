import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { VideoNote } from '../types/video'
import type { NoteGroup } from '../lib/db'
import {
  fetchNoteGroups,
  createNoteGroup,
  updateNoteGroup,
  deleteNoteGroup,
  assignNoteToGroup,
  assignNotesToGroup,
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

function copyNotesStructured(notes: VideoNote[], videoTitle: string): Promise<boolean> {
  const sorted = [...notes].sort((a, b) => a.timestamp - b.timestamp)
  const lines: string[] = [
    `# ${videoTitle}`,
    '',
  ]
  for (const n of sorted) {
    lines.push(`[${formatTimestamp(n.timestamp)}] ${n.text}`)
  }
  lines.push('')
  lines.push(`_${sorted.length} anotacoes — ${new Date().toLocaleDateString('pt-BR')}_`)

  return navigator.clipboard.writeText(lines.join('\n')).then(() => true).catch(() => false)
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
  onGroupChange?: (notes: VideoNote[]) => void
}

export default function NotesPanel({ notes, currentTime, videoId, videoTitle, onAdd, onDelete, onSeek, onGroupChange }: Props) {
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [sortMode, setSortMode] = useState<'recent' | 'timestamp'>('recent')
  const [customGroups, setCustomGroups] = useState<NoteGroup[]>([])
  const [localNotes, setLocalNotes] = useState<VideoNote[]>(notes)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupParentId, setNewGroupParentId] = useState<string | null>(null)
  const [showGroupInput, setShowGroupInput] = useState(false)
  const [dragNoteIds, setDragNoteIds] = useState<string[]>([])
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [movingGroupId, setMovingGroupId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [copiedNotes, setCopiedNotes] = useState(false)
  const [creatingSubGroupOf, setCreatingSubGroupOf] = useState<string | null>(null)
  const [subGroupName, setSubGroupName] = useState('')
  const [dragGroupId, setDragGroupId] = useState<string | null>(null)
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null)
  const groupInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const customGroupsRef = useRef(customGroups)
  customGroupsRef.current = customGroups

  useEffect(() => {
    setLocalNotes(prev => {
      const prevMap = new Map(prev.map(n => [n.id, n.groupId]))
      if (prevMap.size === 0) return notes
      return notes.map(n => ({
        ...n,
        groupId: prevMap.has(n.id) ? (prevMap.get(n.id) ?? null) : n.groupId,
      }))
    })
  }, [notes])

  useEffect(() => {
    if (!videoId) return
    fetchNoteGroups(videoId).then(setCustomGroups).catch(() => {})
  }, [videoId])

  useEffect(() => { if (showGroupInput) groupInputRef.current?.focus() }, [showGroupInput])
  useEffect(() => { if (renamingGroupId) renameInputRef.current?.focus() }, [renamingGroupId])
  useEffect(() => { if (creatingSubGroupOf !== null) groupInputRef.current?.focus() }, [creatingSubGroupOf])

  const rootGroups = useMemo(() => customGroups.filter(g => !g.parentId), [customGroups])

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

  /* ── Selection ──────────────────────────────── */

  const toggleSelectMode = useCallback(() => {
    setSelectMode(prev => !prev)
    setSelectedIds(new Set())
  }, [])

  const toggleNoteSelection = useCallback((noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(noteId)) next.delete(noteId)
      else next.add(noteId)
      return next
    })
  }, [])

  const selectAllVisible = useCallback(() => {
    const allVisible = sortMode === 'timestamp' ? timestampSorted : sorted
    setSelectedIds(prev => {
      if (prev.size === allVisible.length) return new Set()
      return new Set(allVisible.map(n => n.id))
    })
  }, [sorted, timestampSorted, sortMode])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setSelectMode(false)
  }, [])

  const selectedCount = selectedIds.size

  /* ── Group CRUD ─────────────────────────────── */

  const handleCreateGroup = useCallback(async (parentId?: string | null) => {
    const name = (parentId ? subGroupName : newGroupName).trim()
    if (!name || !videoId) return
    const effectiveParentId = parentId !== undefined ? (parentId ?? null) : newGroupParentId
    const group: NoteGroup = {
      id: crypto.randomUUID(),
      videoId,
      name,
      sortOrder: customGroups.length,
      createdAt: Date.now(),
      parentId: effectiveParentId,
    }
    try {
      await createNoteGroup(group)
      setCustomGroups(prev => [...prev, group])
      setNewGroupName('')
      setSubGroupName('')
      setShowGroupInput(false)
      setCreatingSubGroupOf(null)
      setNewGroupParentId(null)
    } catch (e) {
      console.error('Erro ao criar grupo:', e)
      alert('Erro ao criar grupo. Verifique se o banco de dados está configurado (tabela note_groups).')
    }
  }, [newGroupName, subGroupName, videoId, customGroups.length, newGroupParentId])

  const handleDeleteGroup = useCallback(async (groupId: string) => {
    try {
      await deleteNoteGroup(groupId)
      setCustomGroups(prev => {
        const deleted = prev.find(g => g.id === groupId)
        const parentId = deleted?.parentId ?? null
        return prev
          .filter(g => g.id !== groupId)
          .map(g => g.parentId === groupId ? { ...g, parentId } : g)
      })
      setLocalNotes(prev => {
        const next = prev.map(n => n.groupId === groupId ? { ...n, groupId: null } : n)
        onGroupChange?.(next)
        return next
      })
    } catch (e) {
      console.error('Erro ao deletar grupo:', e)
      alert('Erro ao deletar grupo.')
    }
  }, [onGroupChange])

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

  /* ── Drag & Drop (multi-note) ──────────────── */

  const handleDragStart = useCallback((e: React.DragEvent, noteId: string) => {
    const idsToDrag = selectedIds.has(noteId)
      ? Array.from(selectedIds)
      : [noteId]
    e.dataTransfer.setData('application/x-note-ids', JSON.stringify(idsToDrag))
    e.dataTransfer.effectAllowed = 'move'
    setDragNoteIds(idsToDrag)
  }, [selectedIds])

  const handleDragEnd = useCallback(() => {
    setDragNoteIds([])
    setDragOverGroup(null)
  }, [])

  const handleGroupDragOver = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverGroup(groupId)
  }, [])

  const handleGroupDragLeave = useCallback((e: React.DragEvent) => {
    const related = e.relatedTarget as HTMLElement | null
    const current = e.currentTarget as HTMLElement
    if (related && current.contains(related)) return
    setDragOverGroup(null)
  }, [])

  const handleGroupDrop = useCallback(async (e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    if (e.dataTransfer.types.includes('application/x-group-id')) return
    let noteIds: string[] = []
    try {
      const raw = e.dataTransfer.getData('application/x-note-ids')
      if (raw) noteIds = JSON.parse(raw)
    } catch { /* fallback */ }
    if (!noteIds.length) {
      const fallback = e.dataTransfer.getData('text/plain')
      if (fallback) noteIds = [fallback]
    }
    if (!noteIds.length) return

    setDragNoteIds([])
    setDragOverGroup(null)

    try {
      await assignNotesToGroup(noteIds, groupId)
      setLocalNotes(prev => {
        const next = prev.map(n => noteIds.includes(n.id) ? { ...n, groupId } : n)
        onGroupChange?.(next)
        return next
      })
      setSelectedIds(new Set())
      setSelectMode(false)
    } catch (err) {
      console.error('Erro ao mover anotações:', err)
      alert('Erro ao mover anotações para o grupo. Verifique se o banco de dados está configurado.')
    }
  }, [onGroupChange])

  const handleRemoveFromGroup = useCallback(async (noteId: string) => {
    try {
      await assignNoteToGroup(noteId, null)
      setLocalNotes(prev => {
        const next = prev.map(n => n.id === noteId ? { ...n, groupId: null } : n)
        onGroupChange?.(next)
        return next
      })
    } catch (err) {
      console.error('Erro ao remover do grupo:', err)
      alert('Erro ao remover anotação do grupo. Verifique se o banco de dados está configurado.')
    }
  }, [onGroupChange])

  const handleMoveSelectedToGroup = useCallback(async (groupId: string) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      await assignNotesToGroup(ids, groupId)
      setLocalNotes(prev => {
        const next = prev.map(n => ids.includes(n.id) ? { ...n, groupId } : n)
        onGroupChange?.(next)
        return next
      })
      setSelectedIds(new Set())
      setSelectMode(false)
    } catch (err) {
      console.error('Erro ao mover anotações:', err)
      alert('Erro ao mover anotações para o grupo.')
    }
  }, [selectedIds, onGroupChange])

  /* ── Group Drag & Drop ────────────────────── */

  const handleGroupDragStart = useCallback((e: React.DragEvent, groupId: string) => {
    e.dataTransfer.setData('application/x-group-id', groupId)
    e.dataTransfer.effectAllowed = 'move'
    setDragGroupId(groupId)
  }, [])

  const handleGroupDragEnd = useCallback(() => {
    setDragGroupId(null)
    setDragOverGroupId(null)
  }, [])

  const isDescendant = useCallback((ancestorId: string, descendantId: string): boolean => {
    const map = new Map(customGroupsRef.current.map(g => [g.id, g.parentId]))
    let current: string | undefined = descendantId
    while (current) {
      if (current === ancestorId) return true
      current = map.get(current) ?? undefined
    }
    return false
  }, [])

  const handleGroupDropOnGroup = useCallback(async (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault()
    e.stopPropagation()
    let draggedGroupId: string | null = null
    try {
      const raw = e.dataTransfer.getData('application/x-group-id')
      if (raw) draggedGroupId = raw
    } catch { /* fallback */ }
    setDragGroupId(null)
    setDragOverGroupId(null)
    if (!draggedGroupId || draggedGroupId === targetGroupId) return
    if (isDescendant(draggedGroupId, targetGroupId)) return

    try {
      await updateNoteGroup(draggedGroupId, { parentId: targetGroupId })
      setCustomGroups(prev => prev.map(g => g.id === draggedGroupId ? { ...g, parentId: targetGroupId } : g))
    } catch (err) {
      console.error('Erro ao mover grupo:', err)
      alert('Erro ao mover grupo.')
    }
  }, [isDescendant])

  const handleMoveGroupToRoot = useCallback(async (groupId: string) => {
    try {
      await updateNoteGroup(groupId, { parentId: null })
      setCustomGroups(prev => prev.map(g => g.id === groupId ? { ...g, parentId: null } : g))
    } catch (err) {
      console.error('Erro ao mover grupo:', err)
    }
  }, [])

  const handleMoveGroupInto = useCallback(async (groupId: string, targetParentId: string | null) => {
    if (groupId === targetParentId) return
    if (targetParentId && isDescendant(groupId, targetParentId)) return
    try {
      await updateNoteGroup(groupId, { parentId: targetParentId })
      setCustomGroups(prev => prev.map(g => g.id === groupId ? { ...g, parentId: targetParentId } : g))
      setMovingGroupId(null)
    } catch (err) {
      console.error('Erro ao mover grupo:', err)
      alert('Erro ao mover grupo.')
    }
  }, [isDescendant])

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
            className={`notes-sort-toggle ${selectMode ? 'active' : ''}`}
            onClick={toggleSelectMode}
            title={selectMode ? 'Sair da seleção' : 'Selecionar anotações'}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </button>
        )}
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
          <>
            <button
              className="notes-export-btn"
              onClick={() => copyNotesStructured(localNotes, videoTitle).then(ok => { if (ok) setCopiedNotes(true); setTimeout(() => setCopiedNotes(false), 2000) })}
              title={copiedNotes ? 'Copiado!' : 'Copiar anotacoes'}
              type="button"
            >
              {copiedNotes ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
            <button
              className="notes-export-btn"
              onClick={() => exportNotesTxt(localNotes, videoTitle)}
              title="Exportar anotacoes"
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ── Selection bar ──────────────────────── */}
      {selectMode && (
        <div className="notes-select-bar">
          <button className="notes-select-all-btn" onClick={selectAllVisible} type="button">
            {selectedCount === sorted.length ? 'Desmarcar todas' : 'Selecionar todas'}
          </button>
          {selectedCount > 0 && customGroups.length > 0 && (
            <div className="notes-select-move-group">
              <span className="notes-select-move-label">Mover para:</span>
              {customGroups.map(g => (
                <button
                  key={g.id}
                  className="notes-select-move-btn"
                  onClick={() => handleMoveSelectedToGroup(g.id)}
                  type="button"
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
          {selectedCount > 0 && (
            <span className="notes-select-count">{selectedCount} selecionada{selectedCount > 1 ? 's' : ''}</span>
          )}
          <button className="notes-select-clear-btn" onClick={clearSelection} type="button">Cancelar</button>
        </div>
      )}

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

        {/* Custom groups (nested) */}
        {sortMode === 'recent' && rootGroups.map(group => (
          <NestedGroupRenderer
            key={group.id}
            group={group}
            depth={0}
            allGroups={customGroups}
            sorted={sorted}
            collapsed={collapsed}
            flashId={flashId}
            dragNoteIds={dragNoteIds}
            dragOverGroup={dragOverGroup}
            dragGroupId={dragGroupId}
            dragOverGroupId={dragOverGroupId}
            selectMode={selectMode}
            selectedIds={selectedIds}
            renamingGroupId={renamingGroupId}
            renameValue={renameValue}
            subGroupName={subGroupName}
            creatingSubGroupOf={creatingSubGroupOf}
            onToggleGroup={toggleGroup}
            onRenameStart={(id, name) => { setRenamingGroupId(id); setRenameValue(name) }}
            onRenameGroup={handleRenameGroup}
            onDeleteGroup={handleDeleteGroup}
            onDragOver={handleGroupDragOver}
            onDragLeave={handleGroupDragLeave}
            onDrop={handleGroupDrop}
            onSeek={handleSeek}
            onDelete={onDelete}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onRemoveFromGroup={handleRemoveFromGroup}
            onToggleSelect={toggleNoteSelection}
            onGroupDragStart={handleGroupDragStart}
            onGroupDragEnd={handleGroupDragEnd}
            onGroupDragOverId={setDragOverGroupId}
            onGroupDropOnGroup={handleGroupDropOnGroup}
            onStartSubGroup={(parentId) => { setCreatingSubGroupOf(parentId); setSubGroupName('') }}
            onCancelSubGroup={() => { setCreatingSubGroupOf(null); setSubGroupName('') }}
            onConfirmSubGroup={() => handleCreateGroup(creatingSubGroupOf)}
            onSubGroupNameChange={setSubGroupName}
            onMoveToRoot={handleMoveGroupToRoot}
            onMoveGroupInto={handleMoveGroupInto}
            movingGroupId={movingGroupId}
            setMovingGroupId={setMovingGroupId}
            isDescendant={isDescendant}
            setRenameValue={setRenameValue}
          />
        ))}

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
                    dragNoteIds={dragNoteIds}
                    selectMode={selectMode}
                    isSelected={selectedIds.has(note.id)}
                    onSeek={handleSeek}
                    onDelete={onDelete}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onToggleSelect={toggleNoteSelection}
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
            dragNoteIds={dragNoteIds}
            selectMode={selectMode}
            isSelected={selectedIds.has(note.id)}
            onSeek={handleSeek}
            onDelete={onDelete}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onToggleSelect={toggleNoteSelection}
          />
        ))}
      </div>

      {/* Create group bar */}
      <div className="notes-create-group-area">
        {showGroupInput || creatingSubGroupOf !== null ? (
          <>
            <div className="notes-create-group-row">
              <input
                ref={groupInputRef}
                className="notes-create-group-input"
                placeholder={creatingSubGroupOf !== null ? 'Nome do sub-grupo...' : 'Nome do grupo...'}
                value={creatingSubGroupOf !== null ? subGroupName : newGroupName}
                onChange={e => creatingSubGroupOf !== null ? setSubGroupName(e.target.value) : setNewGroupName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (creatingSubGroupOf !== null) handleCreateGroup(creatingSubGroupOf)
                    else handleCreateGroup()
                  }
                  if (e.key === 'Escape') {
                    if (creatingSubGroupOf !== null) { setCreatingSubGroupOf(null); setSubGroupName('') }
                    else { setShowGroupInput(false); setNewGroupName(''); setNewGroupParentId(null) }
                  }
                }}
                type="text"
              />
              <button
                className="notes-create-group-confirm"
                onClick={() => creatingSubGroupOf !== null ? handleCreateGroup(creatingSubGroupOf) : handleCreateGroup()}
                disabled={creatingSubGroupOf !== null ? !subGroupName.trim() : !newGroupName.trim()}
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button
                className="notes-create-group-cancel"
                onClick={() => {
                  if (creatingSubGroupOf !== null) { setCreatingSubGroupOf(null); setSubGroupName('') }
                  else { setShowGroupInput(false); setNewGroupName(''); setNewGroupParentId(null) }
                }}
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {creatingSubGroupOf === null && customGroups.length > 0 && (
              <div className="notes-create-group-parent-row">
                <span className="notes-create-group-parent-label">Dentro de:</span>
                <select
                  className="notes-create-group-parent-select"
                  value={newGroupParentId ?? ''}
                  onChange={e => setNewGroupParentId(e.target.value || null)}
                >
                  <option value="">Raiz (sem pai)</option>
                  {rootGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}
          </>
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

interface NestedGroupProps {
  group: NoteGroup
  depth: number
  allGroups: NoteGroup[]
  sorted: VideoNote[]
  collapsed: Set<string>
  flashId: string | null
  dragNoteIds: string[]
  dragOverGroup: string | null
  dragGroupId: string | null
  dragOverGroupId: string | null
  selectMode: boolean
  selectedIds: Set<string>
  renamingGroupId: string | null
  renameValue: string
  subGroupName: string
  creatingSubGroupOf: string | null
  onToggleGroup: (key: string) => void
  onRenameStart: (id: string, name: string) => void
  onRenameGroup: (id: string) => void
  onDeleteGroup: (id: string) => void
  onDragOver: (e: React.DragEvent, groupId: string) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, groupId: string) => void
  onSeek: (seconds: number, id: string) => void
  onDelete: (id: string) => void
  onDragStart: (e: React.DragEvent, noteId: string) => void
  onDragEnd: () => void
  onRemoveFromGroup: (noteId: string) => void
  onToggleSelect: (noteId: string, e: React.MouseEvent) => void
  onGroupDragStart: (e: React.DragEvent, groupId: string) => void
  onGroupDragEnd: () => void
  onGroupDragOverId: (id: string | null) => void
  onGroupDropOnGroup: (e: React.DragEvent, targetGroupId: string) => void
  onStartSubGroup: (parentId: string) => void
  onCancelSubGroup: () => void
  onConfirmSubGroup: () => void
  onSubGroupNameChange: (name: string) => void
  onMoveToRoot: (groupId: string) => void
  onMoveGroupInto: (groupId: string, targetParentId: string | null) => void
  movingGroupId: string | null
  setMovingGroupId: (id: string | null) => void
  isDescendant: (ancestorId: string, descendantId: string) => boolean
  setRenameValue: (v: string) => void
}

function NestedGroupRenderer({
  group, depth, allGroups, sorted, collapsed, flashId, dragNoteIds,
  dragOverGroup, dragGroupId, dragOverGroupId, selectMode, selectedIds,
  renamingGroupId, renameValue, subGroupName, creatingSubGroupOf,
  onToggleGroup, onRenameStart, onRenameGroup, onDeleteGroup,
  onDragOver, onDragLeave, onDrop,
  onSeek, onDelete, onDragStart, onDragEnd, onRemoveFromGroup, onToggleSelect,
  onGroupDragStart, onGroupDragEnd, onGroupDragOverId, onGroupDropOnGroup,
  onStartSubGroup, onCancelSubGroup, onConfirmSubGroup, onSubGroupNameChange,
  onMoveToRoot, onMoveGroupInto, movingGroupId, setMovingGroupId, isDescendant, setRenameValue,
}: NestedGroupProps) {
  const isCollapsed = collapsed.has(`custom-${group.id}`)
  const children = allGroups.filter(g => g.parentId === group.id)

  const countAllNotes = useCallback((groupId: string): number => {
    const direct = sorted.filter(n => n.groupId === groupId).length
    const childGroups = allGroups.filter(g => g.parentId === groupId)
    let childCount = 0
    for (const cg of childGroups) {
      childCount += countAllNotes(cg.id)
    }
    return direct + childCount
  }, [sorted, allGroups])

  const totalNotes = countAllNotes(group.id)
  const groupNotes = sorted.filter(n => n.groupId === group.id)
  const isBeingDragged = dragGroupId === group.id
  const isDragOver = dragOverGroup === group.id || dragOverGroupId === group.id

  return (
    <div
      className={`notes-group notes-group-custom ${isDragOver ? 'drag-over' : ''} ${isBeingDragged ? 'dragging' : ''} ${depth > 0 ? 'notes-group-nested' : ''}`}
      style={depth > 0 ? { marginLeft: depth * 16 } : undefined}
      onDragOver={e => onDragOver(e, group.id)}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(e, group.id)}
    >
      <button
        className={`notes-group-header ${isCollapsed ? 'collapsed' : ''}`}
        onClick={() => onToggleGroup(`custom-${group.id}`)}
        draggable
        onDragStart={e => onGroupDragStart(e, group.id)}
        onDragEnd={onGroupDragEnd}
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
            className="notes-group-rename-input"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={() => { if (renamingGroupId === group.id) onRenameGroup(group.id) }}
            onKeyDown={e => {
              if (e.key === 'Enter') onRenameGroup(group.id)
              if (e.key === 'Escape') onRenameStart('', '')
            }}
            onClick={e => e.stopPropagation()}
            type="text"
            autoFocus
          />
        ) : (
          <span className="notes-group-label">{group.name}</span>
        )}
        <span className="notes-group-count">{totalNotes}</span>
        <button
          className="notes-group-menu-btn"
          onClick={e => {
            e.stopPropagation()
            onStartSubGroup(group.id)
          }}
          title="Criar sub-grupo"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          className="notes-group-menu-btn"
          onClick={e => {
            e.stopPropagation()
            onRenameStart(group.id, group.name)
          }}
          title="Renomear"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        {group.parentId && (
          <button
            className="notes-group-menu-btn"
            onClick={e => {
              e.stopPropagation()
              onMoveToRoot(group.id)
            }}
            title="Mover para raiz"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 7 6" />
              <path d="M3 12h4l3-8 4 16 3-8h4" />
            </svg>
          </button>
        )}
        <button
          className="notes-group-menu-btn notes-group-delete-btn"
          onClick={e => {
            e.stopPropagation()
            onDeleteGroup(group.id)
          }}
          title="Remover grupo"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="notes-group-move-wrapper">
          <button
            className="notes-group-menu-btn"
            onClick={e => {
              e.stopPropagation()
              setMovingGroupId(movingGroupId === group.id ? null : group.id)
            }}
            title="Mover para..."
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
          {movingGroupId === group.id && (
            <div className="notes-group-move-dropdown" onClick={e => e.stopPropagation()}>
              <button
                className="notes-group-move-option"
                onClick={() => { onMoveGroupInto(group.id, null); setMovingGroupId(null) }}
                type="button"
              >
                Raiz
              </button>
              {allGroups
                .filter(g => g.id !== group.id && !isDescendant(group.id, g.id))
                .map(g => (
                  <button
                    key={g.id}
                    className={`notes-group-move-option ${g.parentId === group.id ? 'current-parent' : ''}`}
                    onClick={() => { onMoveGroupInto(group.id, g.id); setMovingGroupId(null) }}
                    type="button"
                  >
                    {g.parentId === group.id ? '↓ ' : ''}{g.name}
                  </button>
                ))}
            </div>
          )}
        </div>
      </button>
      <div className={`notes-group-body ${isCollapsed ? 'collapsed' : ''}`}>
        {groupNotes.length === 0 && children.length === 0 && (
          <div className="notes-group-empty-drop">
            Arraste anotações aqui
          </div>
        )}
        {groupNotes.map(note => (
          <NoteItem
            key={note.id}
            note={note}
            flashId={flashId}
            dragNoteIds={dragNoteIds}
            selectMode={selectMode}
            isSelected={selectedIds.has(note.id)}
            onSeek={onSeek}
            onDelete={onDelete}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onRemoveFromGroup={onRemoveFromGroup}
            onToggleSelect={onToggleSelect}
          />
        ))}
        {children.map(child => (
          <NestedGroupRenderer
            key={child.id}
            group={child}
            depth={depth + 1}
            allGroups={allGroups}
            sorted={sorted}
            collapsed={collapsed}
            flashId={flashId}
            dragNoteIds={dragNoteIds}
            dragOverGroup={dragOverGroup}
            dragGroupId={dragGroupId}
            dragOverGroupId={dragOverGroupId}
            selectMode={selectMode}
            selectedIds={selectedIds}
            renamingGroupId={renamingGroupId}
            renameValue={renameValue}
            subGroupName={subGroupName}
            creatingSubGroupOf={creatingSubGroupOf}
            onToggleGroup={onToggleGroup}
            onRenameStart={onRenameStart}
            onRenameGroup={onRenameGroup}
            onDeleteGroup={onDeleteGroup}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onSeek={onSeek}
            onDelete={onDelete}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onRemoveFromGroup={onRemoveFromGroup}
            onToggleSelect={onToggleSelect}
            onGroupDragStart={onGroupDragStart}
            onGroupDragEnd={onGroupDragEnd}
            onGroupDragOverId={onGroupDragOverId}
            onGroupDropOnGroup={onGroupDropOnGroup}
            onStartSubGroup={onStartSubGroup}
            onCancelSubGroup={onCancelSubGroup}
            onConfirmSubGroup={onConfirmSubGroup}
            onSubGroupNameChange={onSubGroupNameChange}
            onMoveToRoot={onMoveToRoot}
            onMoveGroupInto={onMoveGroupInto}
            movingGroupId={movingGroupId}
            setMovingGroupId={setMovingGroupId}
            isDescendant={isDescendant}
            setRenameValue={setRenameValue}
          />
        ))}
      </div>
    </div>
  )
}

function NoteItem({ note, flashId, dragNoteIds, selectMode, isSelected, onSeek, onDelete, onDragStart, onDragEnd, onRemoveFromGroup, onToggleSelect }: {
  note: VideoNote
  flashId: string | null
  dragNoteIds: string[]
  selectMode: boolean
  isSelected: boolean
  onSeek: (seconds: number, id: string) => void
  onDelete: (id: string) => void
  onDragStart: (e: React.DragEvent, noteId: string) => void
  onDragEnd: () => void
  onRemoveFromGroup?: (noteId: string) => void
  onToggleSelect?: (noteId: string, e: React.MouseEvent) => void
}) {
  const isDragging = dragNoteIds.includes(note.id)
  return (
    <div
      className={`notes-item ${flashId === note.id ? 'flash' : ''} ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
      draggable={!selectMode}
      onDragStart={e => onDragStart(e, note.id)}
      onDragEnd={onDragEnd}
    >
      {selectMode && (
        <button
          className={`notes-item-checkbox ${isSelected ? 'checked' : ''}`}
          onClick={e => onToggleSelect?.(note.id, e)}
          type="button"
        >
          {isSelected && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      )}
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
