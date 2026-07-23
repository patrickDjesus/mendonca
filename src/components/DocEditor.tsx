import { useEffect, useCallback, useRef, useState } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import type { DocMeta } from '../types/doc'

interface DocEditorProps {
  doc: DocMeta
  onSave: (doc: DocMeta) => void
  onCancel: () => void
}

function ToolbarBtn({ active, title, onClick, children }: {
  active?: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      className={`doc-toolbar-btn ${active ? 'active' : ''}`}
      title={title}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

function ToolbarSep() {
  return <div className="doc-toolbar-sep" />
}

export default function DocEditor({ doc, onSave, onCancel }: DocEditorProps) {
  const editor = useCreateBlockNote({
    initialContent: doc.content && doc.content.length > 0
      ? doc.content
      : [{ type: 'heading', props: { level: 1 }, content: [{ type: 'text', text: doc.title, styles: {} }] }],
  })

  const titleRef = useRef<HTMLInputElement>(null)
  const titleValue = useRef(doc.title)
  const [paperStyle, setPaperStyle] = useState<'default' | 'white'>(doc.paperStyle || 'default')
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>(JSON.stringify(doc.content || []))

  useEffect(() => {
    setPaperStyle(doc.paperStyle || 'default')
  }, [doc.id, doc.paperStyle])

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus()
      titleRef.current.select()
    }
  }, [])

  useEffect(() => {
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current) }
  }, [])

  const handleSave = useCallback(() => {
    const blocks = editor.document
    const firstBlock = blocks[0]
    let title = titleValue.current.trim()
    if (!title && firstBlock) {
      const text = firstBlock.content
      if (Array.isArray(text)) {
        title = text.map((b: { type: string; text?: string }) => ('text' in b && b.text ? b.text : '')).join('')
      }
    }
    onSave({
      ...doc,
      title: title || 'Sem título',
      content: blocks,
      paperStyle,
      updatedAt: Date.now(),
    })
  }, [editor, doc, onSave, paperStyle])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (e.key === 'Escape') {
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleSave, onCancel])

  const handleAutoSave = useCallback(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => {
      const blocks = editor.document
      const serialized = JSON.stringify(blocks)
      if (serialized === lastSavedRef.current) return
      lastSavedRef.current = serialized
      const firstBlock = blocks[0]
      let title = titleValue.current.trim()
      if (!title && firstBlock) {
        const text = firstBlock.content
        if (Array.isArray(text)) {
          title = text.map((b: { type: string; text?: string }) => ('text' in b && b.text ? b.text : '')).join('')
        }
      }
      onSave({
        ...doc,
        title: title || doc.title,
        content: blocks,
        paperStyle,
        updatedAt: Date.now(),
      })
    }, 3000)
  }, [editor, doc, onSave, paperStyle])

  const fmt = {
    toggleBold: () => editor.toggleStyles({ bold: true }),
    toggleItalic: () => editor.toggleStyles({ italic: true }),
    toggleUnderline: () => editor.toggleStyles({ underline: true }),
    toggleStrike: () => editor.toggleStyles({ strike: true }),
    toggleHighlight: () => editor.toggleStyles({ backgroundColor: 'yellow' }),
    heading1: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'heading', props: { level: 1 } }),
    heading2: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'heading', props: { level: 2 } }),
    heading3: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'heading', props: { level: 3 } }),
    paragraph: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'paragraph' }),
    bulletList: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'bulletListItem' }),
    numberedList: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'numberedListItem' }),
    checkList: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'checkListItem' }),
    inlineCode: () => editor.toggleStyles({ code: true }),
  }

  return (
    <div className="doc-editor-overlay">
      <div className="doc-editor-toolbar">
        <button className="doc-editor-back" onClick={onCancel} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Voltar</span>
        </button>
        <input
          ref={titleRef}
          className="doc-editor-title-input"
          defaultValue={doc.title}
          onChange={e => { titleValue.current = e.target.value }}
          placeholder="Título do documento..."
          spellCheck={false}
        />
        <button className="doc-editor-save" onClick={handleSave} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span>Salvar</span>
        </button>
        <button
          className={`doc-paper-toggle ${paperStyle === 'white' ? 'active' : ''}`}
          onClick={() => setPaperStyle(p => p === 'default' ? 'white' : 'default')}
          type="button"
        >
          <div className="doc-paper-toggle-dot" />
          <span>{paperStyle === 'white' ? 'Papel branco' : 'Papel marrom'}</span>
        </button>
      </div>

      <div className="doc-format-bar">
        <div className="doc-format-group">
          <ToolbarBtn title="Parágrafo" onClick={fmt.paragraph}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="15" y2="12" />
              <line x1="3" y1="18" x2="18" y2="18" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn title="Título 1" onClick={fmt.heading1}>
            <span className="doc-toolbar-label">H1</span>
          </ToolbarBtn>
          <ToolbarBtn title="Título 2" onClick={fmt.heading2}>
            <span className="doc-toolbar-label">H2</span>
          </ToolbarBtn>
          <ToolbarBtn title="Título 3" onClick={fmt.heading3}>
            <span className="doc-toolbar-label">H3</span>
          </ToolbarBtn>
        </div>

        <ToolbarSep />

        <div className="doc-format-group">
          <ToolbarBtn title="Negrito (Ctrl+B)" onClick={fmt.toggleBold}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
              <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn title="Itálico (Ctrl+I)" onClick={fmt.toggleItalic}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="4" x2="10" y2="4" />
              <line x1="14" y1="20" x2="5" y2="20" />
              <line x1="15" y1="4" x2="9" y2="20" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn title="Sublinhado (Ctrl+U)" onClick={fmt.toggleUnderline}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
              <line x1="4" y1="21" x2="20" y2="21" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn title="Tachado" onClick={fmt.toggleStrike}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4H9a3 3 0 0 0-2.83 4" />
              <path d="M14 12a4 4 0 0 1 0 8H6" />
              <line x1="4" y1="12" x2="20" y2="12" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn title="Marca-texto" onClick={fmt.toggleHighlight}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </ToolbarBtn>
        </div>

        <ToolbarSep />

        <div className="doc-format-group">
          <ToolbarBtn title="Lista com marcadores" onClick={fmt.bulletList}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="9" y1="6" x2="20" y2="6" />
              <line x1="9" y1="12" x2="20" y2="12" />
              <line x1="9" y1="18" x2="20" y2="18" />
              <circle cx="5" cy="6" r="1" fill="currentColor" />
              <circle cx="5" cy="12" r="1" fill="currentColor" />
              <circle cx="5" cy="18" r="1" fill="currentColor" />
            </svg>
          </ToolbarBtn>
              <ToolbarBtn title="Lista numerada" onClick={fmt.numberedList}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="10" y1="6" x2="21" y2="6" />
              <line x1="10" y1="12" x2="21" y2="12" />
              <line x1="10" y1="18" x2="21" y2="18" />
              <text x="4" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="Inter">1</text>
              <text x="4" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="Inter">2</text>
              <text x="4" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="Inter">3</text>
            </svg>
          </ToolbarBtn>
          <ToolbarBtn title="Lista de tarefas" onClick={fmt.checkList}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="6" height="6" rx="1" />
              <polyline points="4.5 8 6 9.5 8 6.5" />
              <line x1="12" y1="8" x2="21" y2="8" />
              <rect x="3" y="13" width="6" height="6" rx="1" />
              <line x1="12" y1="16" x2="21" y2="16" />
            </svg>
          </ToolbarBtn>
        </div>

        <ToolbarSep />

        <div className="doc-format-group">
          <ToolbarBtn title="Código inline" onClick={fmt.inlineCode}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </ToolbarBtn>
        </div>
      </div>

      <div className="doc-editor-body">
        <div className={`doc-editor-paper ${paperStyle === 'white' ? 'paper-white' : ''}`}>
          <div className="doc-paper-margin" />
          <div className="doc-paper-holes">
            <span /><span /><span />
          </div>
          <div className="doc-paper-lines">
            <BlockNoteView
              editor={editor}
              theme="dark"
              onChange={handleAutoSave}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
