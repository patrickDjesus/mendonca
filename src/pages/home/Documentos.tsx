import { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from 'react'
import type { DocMeta, DocTab, Subject } from '../../types/doc'
import { SUBJECTS, SUBJECT_COLORS } from '../../types/doc'
import DocCard from '../../components/DocCard'
import AddDocCard from '../../components/AddDocCard'
import '../../styles/documentos.css'
import { generatePdfThumbnail } from '../../utils/pdfThumbnails'
import { fetchMyDocs, fetchPublicDocs, createDoc, updateDoc, deleteDoc, logActivity, recordAction, checkMaterialOuro } from '../../lib/db'

const DocEditor = lazy(() => import('../../components/DocEditor'))
const PdfViewer = lazy(() => import('../../components/PdfViewer'))

const PAGE_SIZE = 8

interface PickerForm {
  title: string
  description: string
  subject: Subject | null
  isPublic: boolean
}



export default function Documentos() {
  const [activeTab, setActiveTab] = useState<DocTab>('mine')
  const [myDocs, setMyDocs] = useState<DocMeta[]>([])
  const [publicDocs, setPublicDocs] = useState<DocMeta[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<Subject | null>(null)
  const [editingDoc, setEditingDoc] = useState<DocMeta | null>(null)
  const [viewingPdf, setViewingPdf] = useState<DocMeta | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DocMeta | null>(null)
  const [editPropsDoc, setEditPropsDoc] = useState<DocMeta | null>(null)
  const [propsForm, setPropsForm] = useState<PickerForm>({ title: '', description: '', subject: null, isPublic: false })
  const [subjectPicker, setSubjectPicker] = useState<'create' | 'upload' | null>(null)
  const [pickerForm, setPickerForm] = useState<PickerForm>({ title: '', description: '', subject: null, isPublic: false })
  const pickerFormRef = useRef(pickerForm)
  pickerFormRef.current = pickerForm
  const [wheelState, setWheelState] = useState<{ open: boolean; rect: DOMRect | null }>({ open: false, rect: null })
  const [galleryKey, setGalleryKey] = useState(0)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([fetchMyDocs(), fetchPublicDocs()]).then(([mine, pubs]) => {
      setMyDocs(mine)
      setPublicDocs(pubs)
    }).catch(console.error)
  }, [])

  const allDocs = useMemo(() => [...myDocs, ...publicDocs], [myDocs, publicDocs])
  const docs = useMemo(() => {
    if (activeTab === 'mine') return myDocs
    return allDocs.filter(d => d.isPublic)
  }, [activeTab, myDocs, allDocs])
  const filtered = useMemo(() => docs.filter(d => {
    const q = searchQuery.toLowerCase()
    const matchSearch = !q || d.title.toLowerCase().includes(q) || (d.description && d.description.toLowerCase().includes(q))
    const matchSubject = !subjectFilter || d.subject === subjectFilter
    return matchSearch && matchSubject
  }), [docs, searchQuery, subjectFilter])

  const visibleFiltered = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])

  const openDoc = useCallback((doc: DocMeta) => {
    if (doc.type === 'pdf') {
      setViewingPdf(doc)
    } else {
      setEditingDoc(doc)
    }
  }, [])

  const handleSave = useCallback(async (updated: DocMeta) => {
    const previousDocs = myDocs
    setMyDocs(prev => prev.map(d => d.id === updated.id ? updated : d))
    setEditingDoc(null)
    try {
      await updateDoc(updated)
      if (updated.content) checkMaterialOuro(updated.content).catch(() => {})
    } catch (e) {
      console.error('Erro ao salvar documento:', e)
      setMyDocs(previousDocs)
    }
  }, [myDocs])

  const handleDelete = useCallback(async (id: string) => {
    const previousDocs = myDocs
    setMyDocs(prev => prev.filter(d => d.id !== id))
    setDeleteTarget(null)
    try {
      await deleteDoc(id)
    } catch (e) {
      console.error('Erro ao deletar documento:', e)
      setMyDocs(previousDocs)
    }
  }, [myDocs])

  const handleCreateWithSubject = useCallback(async (subject: Subject) => {
    const form = pickerFormRef.current
    setSubjectPicker(null)
    const newDoc: DocMeta = {
      id: crypto.randomUUID(),
      title: form.title || 'Novo Documento',
      description: form.description || undefined,
      type: 'editor',
      subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublic: form.isPublic,
    }
    try {
      await createDoc(newDoc)
      setMyDocs(prev => [newDoc, ...prev])
      setEditingDoc(newDoc)
      logActivity('doc_created', `Criou "${newDoc.title}"`, 'book', '#508cc8').catch(() => {})
      recordAction('doc').catch(() => {})
    } catch (e) {
      console.error('Erro ao salvar documento:', e)
    }
    setPickerForm({ title: '', description: '', subject: null, isPublic: false })
  }, [])

  const handleUploadWithSubject = useCallback((subject: Subject) => {
    const form = { ...pickerFormRef.current }
    setSubjectPicker(null)
    setPickerForm({ title: '', description: '', subject: null, isPublic: false })
    const doUpload = () => {
      const input = fileInputRef.current
      if (!input) return
      const originalOnchange = input.onchange
      input.onchange = (e) => {
        const target = e.target as HTMLInputElement
        const file = target.files?.[0]
        if (!file) { input.onchange = originalOnchange; return }
        const fileUrl = URL.createObjectURL(file)
        const newDocId = crypto.randomUUID()
        const newDoc: DocMeta = {
          id: newDocId,
          title: form.title || file.name.replace(/\.pdf$/i, ''),
          description: form.description || undefined,
          type: 'pdf',
          subject,
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isPublic: form.isPublic,
        }
        createDoc(newDoc).then(() => {
          setMyDocs(prev => [newDoc, ...prev])
          logActivity('doc_created', `Fez upload de "${newDoc.title}"`, 'book', '#508cc8').catch(() => {})
          recordAction('doc').catch(() => {})
          generatePdfThumbnail(file).then(thumb => {
            if (thumb) {
              setMyDocs(prev => prev.map(d => d.id === newDocId ? { ...d, thumbnail: thumb } : d))
            }
          })
        }).catch(e => console.error('Erro ao salvar PDF:', e))
        target.value = ''
        input.onchange = originalOnchange
      }
      input.click()
    }
    setTimeout(doUpload, 50)
  }, [])

  const handleOpenWheel = useCallback((rect: DOMRect) => {
    setWheelState({ open: true, rect })
  }, [])

  const handleWheelSelect = useCallback((action: 'create' | 'upload') => {
    setWheelState({ open: false, rect: null })
    setTimeout(() => {
      setPickerForm({ title: action === 'create' ? '' : '', description: '', subject: null, isPublic: false })
      setSubjectPicker(action)
    }, 200)
  }, [])

  const handleWheelClose = useCallback(() => {
    setWheelState({ open: false, rect: null })
  }, [])

  const switchTab = useCallback((tab: DocTab) => {
    setSearchQuery('')
    setSubjectFilter(null)
    setActiveTab(tab)
    setGalleryKey(k => k + 1)
  }, [])

  const openEditProps = useCallback((doc: DocMeta) => {
    setEditPropsDoc(doc)
    setPropsForm({
      title: doc.title,
      description: doc.description || '',
      subject: doc.subject || null,
      isPublic: doc.isPublic,
    })
  }, [])

  const saveEditProps = useCallback(async () => {
    if (!editPropsDoc) return
    const updated = {
      ...editPropsDoc,
      title: propsForm.title || editPropsDoc.title,
      description: propsForm.description || undefined,
      subject: propsForm.subject || undefined,
      isPublic: propsForm.isPublic,
      updatedAt: Date.now(),
    }
    setMyDocs(prev => prev.map(d => d.id === editPropsDoc.id ? updated : d))
    setEditPropsDoc(null)
    try {
      await updateDoc(updated)
    } catch (e) {
      console.error('Erro ao salvar propriedades:', e)
    }
  }, [editPropsDoc, propsForm])

  useEffect(() => {
    if (editingDoc) {
      const exists = allDocs.some(d => d.id === editingDoc.id)
      if (!exists) setEditingDoc(null)
    }
  }, [allDocs, editingDoc])

  useEffect(() => {
    if (!deleteTarget) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDeleteTarget(null)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [deleteTarget])

  useEffect(() => {
    if (!wheelState.open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleWheelClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [wheelState.open, handleWheelClose])

  useEffect(() => {
    if (!viewingPdf) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setViewingPdf(null)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [viewingPdf])

  useEffect(() => {
    if (!editPropsDoc) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setEditPropsDoc(null)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [editPropsDoc])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [searchQuery, subjectFilter, activeTab])

  useEffect(() => {
    if (activeTab !== 'public' || visibleCount >= filtered.length) return
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filtered.length))
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [activeTab, visibleCount, filtered.length])

  if (editingDoc) {
    return (
      <Suspense fallback={<div className="doc-editor-overlay"><div className="doc-editor-loading">Carregando editor...</div></div>}>
        <DocEditor doc={editingDoc} onSave={handleSave} onCancel={() => setEditingDoc(null)} />
      </Suspense>
    )
  }

  const wheelRect = wheelState.rect

  return (
    <div className="docs-page">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="docs-file-input"
      />

      <div className="docs-header">
        <div className="docs-tabs">
          <button
            className={`docs-tab ${activeTab === 'mine' ? 'active' : ''}`}
            onClick={() => switchTab('mine')}
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
            onClick={() => switchTab('public')}
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

      <div className="docs-gallery-wrapper" key={galleryKey}>
        <div className="docs-gallery">
          {activeTab === 'mine' && (
            <AddDocCard onOpenWheel={handleOpenWheel} />
          )}
          {visibleFiltered.length === 0 && (activeTab === 'public' || (activeTab === 'mine' && !searchQuery && !subjectFilter)) && (
            <div className="docs-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p>{searchQuery || subjectFilter ? 'Nenhum documento encontrado.' : activeTab === 'mine' ? 'Nenhum documento ainda. Clique em "+" para criar!' : 'Nenhum documento público ainda.'}</p>
            </div>
          )}
          {visibleFiltered.map(doc => (
            <DocCard
              key={doc.id}
              doc={doc}
              onClick={() => openDoc(doc)}
              onDelete={activeTab === 'mine' ? () => setDeleteTarget(doc) : undefined}
              onEditProps={activeTab === 'mine' ? () => openEditProps(doc) : undefined}
            />
          ))}
          {activeTab === 'public' && visibleCount < filtered.length && (
            <div ref={sentinelRef} className="docs-sentinel">
              <div className="docs-loading-more">
                <div className="pdf-spinner" />
              </div>
            </div>
          )}
        </div>
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

      {viewingPdf && (
        viewingPdf.fileUrl ? (
          <Suspense fallback={
            <div className="pdf-viewer-overlay">
              <div className="pdf-viewer-topbar">
                <div className="pdf-viewer-info">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="pdf-viewer-title">{viewingPdf.fileName || viewingPdf.title}</span>
                </div>
                <button className="pdf-viewer-close" onClick={() => setViewingPdf(null)} type="button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="pdf-viewer-body">
                <div className="pdf-loading-spinner">
                  <div className="pdf-spinner" />
                  <span>Carregando visualizador...</span>
                </div>
              </div>
            </div>
          }>
            <PdfViewer
              fileUrl={viewingPdf.fileUrl}
              fileName={viewingPdf.fileName || viewingPdf.title}
              onClose={() => setViewingPdf(null)}
            />
          </Suspense>
        ) : (
          <div className="pdf-viewer-overlay">
            <div className="pdf-viewer-topbar">
              <div className="pdf-viewer-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="pdf-viewer-title">{viewingPdf.fileName || viewingPdf.title}</span>
                {viewingPdf.authorName && (
                  <span className="pdf-viewer-author">por {viewingPdf.authorName}</span>
                )}
              </div>
              <button className="pdf-viewer-close" onClick={() => setViewingPdf(null)} type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="pdf-viewer-body">
              <div className="pdf-viewer-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <p className="pdf-placeholder-title">{viewingPdf.title}</p>
                <p className="pdf-placeholder-desc">
                  {viewingPdf.fileName && `${viewingPdf.fileName}`}
                  {viewingPdf.fileSize && ` · ${(viewingPdf.fileSize / 1024).toFixed(0)} KB`}
                </p>
                <p className="pdf-placeholder-hint">Arquivo de demonstração — conteúdo não disponível</p>
              </div>
            </div>
          </div>
        )
      )}

      {wheelState.open && wheelRect && (
        <div className="wheel-overlay" onClick={handleWheelClose}>
          <div
            className="wheel-container"
            style={{ left: wheelRect.left + wheelRect.width / 2, top: wheelRect.top + wheelRect.height / 2 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="wheel-circle">
              <button
                className="wheel-segment wheel-segment-left"
                onClick={() => handleWheelSelect('create')}
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
                <span>Criar</span>
              </button>
              <div className="wheel-divider" />
              <button
                className="wheel-segment wheel-segment-right"
                onClick={() => handleWheelSelect('upload')}
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Upload</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="doc-confirm-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="doc-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="doc-confirm-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <h3 className="doc-confirm-title">Deletar documento?</h3>
            <p className="doc-confirm-text">"{deleteTarget.title}" será removido permanentemente.</p>
            <div className="doc-confirm-actions">
              <button className="doc-confirm-cancel" onClick={() => setDeleteTarget(null)} type="button">
                Cancelar
              </button>
              <button className="doc-confirm-delete" onClick={() => handleDelete(deleteTarget.id)} type="button">
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}

      {subjectPicker && (
        <div className="doc-confirm-overlay" onClick={() => { setSubjectPicker(null); setPickerForm({ title: '', description: '', subject: null, isPublic: false }) }}>
          <div className="doc-subject-picker" onClick={e => e.stopPropagation()}>
            <h3 className="doc-confirm-title">
              {subjectPicker === 'create' ? 'Criar novo documento' : 'Upload de PDF'}
            </h3>

            <div className="picker-field">
              <label className="picker-label">Nome</label>
              <input
                className="picker-input"
                type="text"
                placeholder={subjectPicker === 'create' ? 'Ex: Resumo de Física — Cap. 5' : 'Nome do documento'}
                value={pickerForm.title}
                onChange={e => setPickerForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="picker-field">
              <label className="picker-label">Descrição <span className="picker-optional">(opcional)</span></label>
              <textarea
                className="picker-textarea"
                placeholder="Breve descrição para facilitar a busca..."
                rows={2}
                value={pickerForm.description}
                onChange={e => setPickerForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="picker-field">
              <label className="picker-label">Disciplina</label>
              <div className="subject-picker-grid">
                {SUBJECTS.map(s => {
                  const colors = SUBJECT_COLORS[s]
                  const selected = pickerForm.subject === s
                  return (
                    <button
                      key={s}
                      className={`subject-picker-chip ${selected ? 'selected' : ''}`}
                      style={{
                        background: selected ? colors.text : colors.bg,
                        color: selected ? '#1a1714' : colors.text,
                        borderColor: selected ? colors.text : colors.text + '33',
                      }}
                      onClick={() => setPickerForm(f => ({ ...f, subject: selected ? null : s }))}
                      type="button"
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="picker-field picker-toggle-row">
              <div className="picker-toggle-info">
                <span className="picker-label" style={{ marginBottom: 0 }}>Tornar público</span>
                <span className="picker-toggle-desc">Visível para todos os alunos</span>
              </div>
              <button
                className={`picker-toggle ${pickerForm.isPublic ? 'on' : ''}`}
                onClick={() => setPickerForm(f => ({ ...f, isPublic: !f.isPublic }))}
                type="button"
              >
                <div className="picker-toggle-knob" />
              </button>
            </div>

            <div className="picker-actions">
              <button className="doc-confirm-cancel" onClick={() => { setSubjectPicker(null); setPickerForm({ title: '', description: '', subject: null, isPublic: false }) }} type="button">
                Cancelar
              </button>
              <button
                className="picker-confirm-btn"
                disabled={!pickerForm.subject}
                onClick={() => {
                  if (!pickerForm.subject) return
                  if (subjectPicker === 'create') handleCreateWithSubject(pickerForm.subject)
                  else handleUploadWithSubject(pickerForm.subject)
                }}
                type="button"
              >
                {subjectPicker === 'create' ? 'Criar documento' : 'Fazer upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editPropsDoc && (
        <div className="doc-confirm-overlay" onClick={() => setEditPropsDoc(null)}>
          <div className="doc-subject-picker" onClick={e => e.stopPropagation()}>
            <h3 className="doc-confirm-title">Editar propriedades</h3>

            <div className="picker-field">
              <label className="picker-label">Nome</label>
              <input
                className="picker-input"
                type="text"
                value={propsForm.title}
                onChange={e => setPropsForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="picker-field">
              <label className="picker-label">Descrição <span className="picker-optional">(opcional)</span></label>
              <textarea
                className="picker-textarea"
                placeholder="Breve descrição..."
                rows={2}
                value={propsForm.description}
                onChange={e => setPropsForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="picker-field">
              <label className="picker-label">Disciplina</label>
              <div className="subject-picker-grid">
                {SUBJECTS.map(s => {
                  const colors = SUBJECT_COLORS[s]
                  const selected = propsForm.subject === s
                  return (
                    <button
                      key={s}
                      className={`subject-picker-chip ${selected ? 'selected' : ''}`}
                      style={{
                        background: selected ? colors.text : colors.bg,
                        color: selected ? '#1a1714' : colors.text,
                        borderColor: selected ? colors.text : colors.text + '33',
                      }}
                      onClick={() => setPropsForm(f => ({ ...f, subject: selected ? null : s }))}
                      type="button"
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="picker-field picker-toggle-row">
              <div className="picker-toggle-info">
                <span className="picker-label" style={{ marginBottom: 0 }}>Tornar público</span>
                <span className="picker-toggle-desc">Visível para todos os alunos</span>
              </div>
              <button
                className={`picker-toggle ${propsForm.isPublic ? 'on' : ''}`}
                onClick={() => setPropsForm(f => ({ ...f, isPublic: !f.isPublic }))}
                type="button"
              >
                <div className="picker-toggle-knob" />
              </button>
            </div>

            <div className="picker-actions">
              <button className="doc-confirm-cancel" onClick={() => setEditPropsDoc(null)} type="button">
                Cancelar
              </button>
              <button className="picker-confirm-btn" onClick={saveEditProps} type="button">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
