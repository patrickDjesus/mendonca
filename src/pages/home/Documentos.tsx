import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react'
import type { DocMeta, DocTab, Subject } from '../../types/doc'
import { SUBJECTS } from '../../types/doc'
import DocCard from '../../components/DocCard'
import AddDocCard from '../../components/AddDocCard'
import '../../styles/documentos.css'

const DocEditor = lazy(() => import('../../components/DocEditor'))

const SAMPLE_DOCS: DocMeta[] = [
  {
    id: '1',
    title: 'Apostila de Matemática — Cap. 3',
    type: 'editor',
    subject: 'Matemática',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    isPublic: false,
  },
  {
    id: '2',
    title: 'Notas de Literatura — Modernismo',
    type: 'editor',
    subject: 'Linguagens',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
    isPublic: false,
  },
  {
    id: '3',
    title: 'Resumo de História — Brasil Colônia',
    type: 'editor',
    subject: 'História',
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7,
    isPublic: false,
  },
]

const SAMPLE_PUBLIC: DocMeta[] = [
  {
    id: 'p1',
    title: 'Química Orgânica — Resumo Geral',
    type: 'editor',
    subject: 'Química',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
    isPublic: true,
    authorName: 'Maria S.',
  },
  {
    id: 'p2',
    title: 'Lista de Exercícios — Física Mecânica',
    type: 'pdf',
    subject: 'Física',
    fileName: 'fisica-mecanica-lista.pdf',
    fileSize: 204800,
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 4,
    isPublic: true,
    authorName: 'João P.',
  },
  {
    id: 'p3',
    title: 'Geografia — Mapas Mentais do ENEM',
    type: 'editor',
    subject: 'Geografia',
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 6,
    isPublic: true,
    authorName: 'Ana L.',
  },
  {
    id: 'p4',
    title: 'Redação — Modelos de Texto Dissertativo',
    type: 'pdf',
    subject: 'Linguagens',
    fileName: 'redacao-modelos.pdf',
    fileSize: 512000,
    createdAt: Date.now() - 86400000 * 8,
    updatedAt: Date.now() - 86400000 * 8,
    isPublic: true,
    authorName: 'Carlos M.',
  },
]

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export default function Documentos() {
  const [activeTab, setActiveTab] = useState<DocTab>('mine')
  const [myDocs, setMyDocs] = useState<DocMeta[]>(SAMPLE_DOCS)
  const [publicDocs] = useState<DocMeta[]>(SAMPLE_PUBLIC)
  const [searchQuery, setSearchQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<Subject | null>(null)
  const [editingDoc, setEditingDoc] = useState<DocMeta | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const docs = activeTab === 'mine' ? myDocs : publicDocs
  const filtered = docs.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchSubject = !subjectFilter || d.subject === subjectFilter
    return matchSearch && matchSubject
  })

  const openDoc = useCallback((doc: DocMeta) => {
    if (doc.type === 'pdf') return
    setEditingDoc(doc)
  }, [])

  const handleSave = useCallback((updated: DocMeta) => {
    setMyDocs(prev => prev.map(d => d.id === updated.id ? updated : d))
    setEditingDoc(null)
  }, [])

  const handleDelete = useCallback((id: string) => {
    setMyDocs(prev => prev.filter(d => d.id !== id))
  }, [])

  const handleCreate = useCallback(() => {
    const newDoc: DocMeta = {
      id: generateId(),
      title: 'Novo Documento',
      type: 'editor',
      subject: subjectFilter ?? undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublic: false,
    }
    setMyDocs(prev => [newDoc, ...prev])
    setEditingDoc(newDoc)
  }, [subjectFilter])

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const newDoc: DocMeta = {
      id: generateId(),
      title: file.name.replace(/\.pdf$/i, ''),
      type: 'pdf',
      subject: subjectFilter ?? undefined,
      fileName: file.name,
      fileSize: file.size,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublic: false,
    }
    setMyDocs(prev => [newDoc, ...prev])
    e.target.value = ''
  }, [subjectFilter])

  useEffect(() => {
    if (editingDoc) {
      const exists = myDocs.some(d => d.id === editingDoc.id)
      if (!exists) setEditingDoc(null)
    }
  }, [myDocs, editingDoc])

  if (editingDoc) {
    return (
      <Suspense fallback={<div className="doc-editor-overlay"><div className="doc-editor-loading">Carregando editor...</div></div>}>
        <DocEditor doc={editingDoc} onSave={handleSave} />
      </Suspense>
    )
  }

  return (
    <div className="docs-page">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="docs-file-input"
        onChange={handleFileChange}
      />

      <div className="docs-header">
        <div className="docs-tabs">
          <button
            className={`docs-tab ${activeTab === 'mine' ? 'active' : ''}`}
            onClick={() => { setActiveTab('mine'); setSearchQuery(''); setSubjectFilter(null) }}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Meus Documentos
          </button>
          <button
            className={`docs-tab ${activeTab === 'public' ? 'active' : ''}`}
            onClick={() => { setActiveTab('public'); setSearchQuery(''); setSubjectFilter(null) }}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Documentos Públicos
          </button>
        </div>

        <div className="docs-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="docs-search-input"
            placeholder={activeTab === 'mine' ? 'Buscar nos meus documentos...' : 'Buscar documentos públicos...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="docs-subjects">
        <button
          className={`docs-subject-chip ${subjectFilter === null ? 'active' : ''}`}
          onClick={() => setSubjectFilter(null)}
          type="button"
        >
          Todas
        </button>
        {SUBJECTS.map(s => (
          <button
            key={s}
            className={`docs-subject-chip ${subjectFilter === s ? 'active' : ''}`}
            onClick={() => setSubjectFilter(subjectFilter === s ? null : s)}
            type="button"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="docs-gallery">
        {activeTab === 'mine' && (
          <AddDocCard onUploadPdf={handleUploadClick} onCreateDoc={handleCreate} />
        )}
        {filtered.length === 0 && (
          <div className="docs-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p>{searchQuery || subjectFilter ? 'Nenhum documento encontrado.' : 'Nenhum documento ainda.'}</p>
          </div>
        )}
        {filtered.map(doc => (
          <DocCard
            key={doc.id}
            doc={doc}
            onClick={() => openDoc(doc)}
            onDelete={activeTab === 'mine' ? () => handleDelete(doc.id) : undefined}
          />
        ))}
      </div>

      {activeTab === 'public' && filtered.length > 0 && (
        <div className="docs-public-footer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>Documentos públicos são somente leitura. Clique para visualizar.</span>
        </div>
      )}
    </div>
  )
}
