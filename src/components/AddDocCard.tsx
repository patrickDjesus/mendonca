import { useRef } from 'react'

interface AddDocCardProps {
  onOpenWheel: (rect: DOMRect) => void
}

export default function AddDocCard({ onOpenWheel }: AddDocCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null)

  const handleClick = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      onOpenWheel(rect)
    }
  }

  return (
    <button ref={cardRef} className="doc-card add-doc-card" onClick={handleClick} type="button">
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
        <div className="doc-card-bottom">
          <span className="doc-card-meta">Criar ou upload</span>
        </div>
      </div>
    </button>
  )
}
