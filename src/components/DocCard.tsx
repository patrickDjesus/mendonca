import type { DocMeta } from '../types/doc'
import { SUBJECT_COLORS } from '../types/doc'

interface DocCardProps {
  doc: DocMeta
  onClick: () => void
  onDelete?: () => void
  onEditProps?: () => void
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocCard({ doc, onClick, onDelete, onEditProps }: DocCardProps) {
  const subjectColors = doc.subject ? SUBJECT_COLORS[doc.subject] : null

  return (
    <button className="doc-card" onClick={onClick} type="button">
      <div className={`doc-card-preview ${doc.type === 'editor' ? 'paper-bg' : ''}`}>
        {doc.type === 'pdf' ? (
          doc.thumbnail ? (
            <div className="doc-card-thumb pdf-thumb">
              <img src={doc.thumbnail} alt={doc.title} className="doc-card-thumb-img" />
            </div>
          ) : (
            <div className="doc-card-thumb pdf">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span className="doc-card-filetype">PDF</span>
            </div>
          )
        ) : (
          <div className="doc-card-thumb editor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
        )}
        {doc.isPublic && <span className="doc-card-badge">Public</span>}
        {onEditProps && (
          <button
            className="doc-card-edit"
            title="Editar propriedades"
            onClick={e => { e.stopPropagation(); onEditProps() }}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        )}
        {onDelete && (
          <button
            className="doc-card-delete"
            title="Excluir documento"
            onClick={e => { e.stopPropagation(); onDelete() }}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>
      <div className="doc-card-info">
        <span className="doc-card-title">{doc.title}</span>
        {doc.description && (
          <span className="doc-card-desc">{doc.description}</span>
        )}
        <div className="doc-card-bottom">
          <span className="doc-card-meta">
            {formatDate(doc.updatedAt)}
            {doc.type === 'pdf' && doc.fileSize && ` · ${fileSizeLabel(doc.fileSize)}`}
          </span>
          {doc.subject && subjectColors && (
            <span
              className="doc-card-subject"
              style={{ background: subjectColors.bg, color: subjectColors.text }}
            >
              {doc.subject}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
