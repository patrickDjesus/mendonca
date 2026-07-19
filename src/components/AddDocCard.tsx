import { useState, useRef, useEffect } from 'react'

interface AddDocCardProps {
  onUploadPdf: () => void
  onCreateDoc: () => void
}

export default function AddDocCard({ onUploadPdf, onCreateDoc }: AddDocCardProps) {
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function selectOption(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <div className="add-doc-wrapper">
      <button
        ref={btnRef}
        className="doc-card add-doc-card"
        onClick={() => setOpen(prev => !prev)}
        type="button"
      >
        <div className="doc-card-preview add-doc-preview">
          <div className="add-doc-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
        </div>
        <div className="doc-card-info">
          <span className="doc-card-title">Novo Documento</span>
          <span className="doc-card-meta">Upload PDF ou criar novo</span>
        </div>
      </button>

      {open && (
        <div className="add-doc-popover" ref={popoverRef}>
          <button
            className="add-doc-option"
            onClick={() => selectOption(onUploadPdf)}
            type="button"
          >
            <div className="add-doc-option-icon upload">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="add-doc-option-text">
              <span className="add-doc-option-title">Fazer Upload de PDF</span>
              <span className="add-doc-option-desc">Anexar arquivo externo</span>
            </div>
          </button>
          <div className="add-doc-option-divider" />
          <button
            className="add-doc-option"
            onClick={() => selectOption(onCreateDoc)}
            type="button"
          >
            <div className="add-doc-option-icon create">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div className="add-doc-option-text">
              <span className="add-doc-option-title">Criar Novo Documento</span>
              <span className="add-doc-option-desc">Editor de texto nativo</span>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
