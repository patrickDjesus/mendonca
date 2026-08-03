import { useEffect, useMemo, useState } from 'react'
import type { Flashcard, FlashcardGroup } from '../../types/flashcard'
import type { Subject } from '../../types/doc'
import { SUBJECTS, SUBJECT_COLORS } from '../../types/doc'
import {
  createFlashcard,
  deleteFlashcard,
  fetchFlashcards,
  fetchFlashcardGroups,
  updateFlashcard,
  createFlashcardGroup,
  updateFlashcardGroup,
  deleteFlashcardGroup,
  type FlashcardGroupInput,
} from '../../lib/db'
import FlashcardImporter, { type ImportedFlashcard } from '../../components/FlashcardImporter'
import MathRenderer from '../../components/MathRenderer'
import '../../styles/flashcards.css'

type FilterSubject = Subject | 'Todas'
type ModalState = { mode: 'create' } | { mode: 'edit'; card: Flashcard } | null
type GroupModalState = { mode: 'create' } | { mode: 'edit'; group: FlashcardGroup } | null

interface GroupCardDraft {
  key: string
  id?: string
  front: string
  back: string
  subject: Subject
}

interface GroupForm {
  name: string
  subject: Subject
  description: string
  cards: GroupCardDraft[]
}

const EMPTY_FORM = { front: '', back: '', subject: 'Matemática' as Subject }

function uid(): string {
  return crypto.randomUUID()
}

function subjectColor(subject: Subject) {
  const c = SUBJECT_COLORS[subject] ?? { bg: 'rgba(140,120,200,0.15)', text: '#8c78c8' }
  return { background: c.bg, color: c.text }
}

function newDraft(subject: Subject): GroupCardDraft {
  return { key: uid(), front: '', back: '', subject }
}

function FlipCard({ card, onMark, onEdit, onDelete }: {
  card: Flashcard
  onMark: (known: boolean) => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  const [flipped, setFlipped] = useState(false)
  const toggle = () => setFlipped(f => !f)

  return (
    <div className="fc-card">
      <div className={`fc-card-inner ${flipped ? 'flipped' : ''}`}>
        <div className="fc-face fc-front" onClick={toggle}>
          <div className="fc-card-top">
            <span className="fc-subject-badge" style={subjectColor(card.subject)}>
              {card.subject}
            </span>
            {(onEdit || onDelete) && (
              <div className="fc-card-actions">
                {onEdit && (
                  <button
                    className="fc-icon-btn"
                    title="Editar card"
                    onClick={e => {
                      e.stopPropagation()
                      onEdit()
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>
                )}
                {onDelete && (
                  <button
                    className="fc-icon-btn danger"
                    title="Excluir card"
                    onClick={e => {
                      e.stopPropagation()
                      onDelete()
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                      <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="fc-card-text">
            <MathRenderer text={card.front} />
          </div>
          <div className="fc-card-foot">
            <span className={`fc-status ${card.known ? 'known' : 'unknown'}`}>
              {card.known ? 'Já sei' : 'Para revisar'}
            </span>
            <span className="fc-flip-hint">Clique para ver o verso</span>
          </div>
        </div>
        <div className="fc-face fc-back" onClick={toggle}>
          <div className="fc-card-top">
            <span className="fc-back-label">Verso</span>
          </div>
          <div className="fc-card-text">
            <MathRenderer text={card.back} />
          </div>
          <div className="fc-mark-btns">
            <button
              className={`fc-mark-btn ${card.known ? 'active' : ''}`}
              onClick={e => {
                e.stopPropagation()
                onMark(true)
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Sabia
            </button>
            <button
              className={`fc-mark-btn no ${!card.known ? 'active' : ''}`}
              onClick={e => {
                e.stopPropagation()
                onMark(false)
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
              Não sabia
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FlashCards() {
  const [cards, setCards] = useState<Flashcard[]>([])
  const [groups, setGroups] = useState<FlashcardGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<FilterSubject>('Todas')
  const [onlyUnknown, setOnlyUnknown] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Flashcard | null>(null)
  const [activeGroup, setActiveGroup] = useState<FlashcardGroup | null>(null)
  const [groupOnlyUnknown, setGroupOnlyUnknown] = useState(false)
  const [groupModal, setGroupModal] = useState<GroupModalState>(null)
  const [groupForm, setGroupForm] = useState<GroupForm | null>(null)
  const [groupFormError, setGroupFormError] = useState('')
  const [groupSaving, setGroupSaving] = useState(false)
  const [groupDeleteTarget, setGroupDeleteTarget] = useState<FlashcardGroup | null>(null)
  const [importerMode, setImporterMode] = useState<'standalone' | null>(null)
  const [groupImporterOpen, setGroupImporterOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    Promise.all([fetchFlashcards(), fetchFlashcardGroups()])
      .then(([cardList, groupList]) => {
        if (!mounted) return
        setCards(cardList)
        setGroups(groupList)
      })
      .catch(() => {
        if (mounted) setLoadError('Não foi possível carregar os flash cards.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const refresh = async (): Promise<{ cards: Flashcard[]; groups: FlashcardGroup[] }> => {
    const [cardList, groupList] = await Promise.all([fetchFlashcards(), fetchFlashcardGroups()])
    setCards(cardList)
    setGroups(groupList)
    return { cards: cardList, groups: groupList }
  }

  const standaloneCards = useMemo(() => cards.filter(c => !c.groupId), [cards])

  const filteredStandalone = useMemo(() => {
    let list = standaloneCards
    if (subjectFilter !== 'Todas') list = list.filter(c => c.subject === subjectFilter)
    if (onlyUnknown) list = list.filter(c => !c.known)
    return list
  }, [standaloneCards, subjectFilter, onlyUnknown])

  const filteredGroups = useMemo(() => {
    if (subjectFilter !== 'Todas') return groups.filter(g => g.subject === subjectFilter)
    return groups
  }, [groups, subjectFilter])

  const stats = useMemo(() => {
    const known = cards.filter(c => c.known).length
    return { total: cards.length, known, review: cards.length - known, groupCount: groups.length }
  }, [cards, groups])

  const groupCards = useMemo(
    () => (activeGroup ? cards.filter(c => c.groupId === activeGroup.id) : []),
    [cards, activeGroup],
  )

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setFormError('')
    setModal({ mode: 'create' })
  }

  const openEdit = (card: Flashcard) => {
    setForm({ front: card.front, back: card.back, subject: card.subject })
    setFormError('')
    setModal({ mode: 'edit', card })
  }

  const handleSubmit = () => {
    const front = form.front.trim()
    const back = form.back.trim()
    if (!front || !back) {
      setFormError('Preencha a frente e o verso do card.')
      return
    }
    setSaving(true)
    const patch = { front, back, subject: form.subject }
    if (modal?.mode === 'create') {
      createFlashcard(patch)
        .then(card => {
          setCards(prev => [card, ...prev])
          setModal(null)
        })
        .catch(() => setFormError('Erro ao salvar o card. Tente novamente.'))
        .finally(() => setSaving(false))
    } else if (modal?.mode === 'edit') {
      updateFlashcard(modal.card.id, patch)
        .then(() => {
          setCards(prev => prev.map(c => (c.id === modal.card.id ? { ...c, ...patch, updatedAt: Date.now() } : c)))
          setModal(null)
        })
        .catch(() => setFormError('Erro ao atualizar o card. Tente novamente.'))
        .finally(() => setSaving(false))
    }
  }

  const handleMark = (card: Flashcard, known: boolean) => {
    setCards(prev => prev.map(c => (c.id === card.id ? { ...c, known } : c)))
    updateFlashcard(card.id, { known }).catch(() => {})
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteFlashcard(deleteTarget.id)
      .then(() => {
        setCards(prev => prev.filter(c => c.id !== deleteTarget.id))
        setDeleteTarget(null)
      })
      .catch(() => {})
  }

  const openCreateGroup = () => {
    const subject: Subject = subjectFilter !== 'Todas' ? subjectFilter : 'Matemática'
    setGroupForm({ name: '', subject, description: '', cards: [newDraft(subject)] })
    setGroupFormError('')
    setGroupModal({ mode: 'create' })
  }

  const openEditGroup = (group: FlashcardGroup) => {
    const existing = cards.filter(c => c.groupId === group.id)
    setGroupForm({
      name: group.name,
      subject: group.subject,
      description: group.description || '',
      cards: existing.length > 0
        ? existing.map(c => ({ key: uid(), id: c.id, front: c.front, back: c.back, subject: c.subject }))
        : [newDraft(group.subject)],
    })
    setGroupFormError('')
    setGroupModal({ mode: 'edit', group })
  }

  const updateGroupCard = (key: string, patch: Partial<Pick<GroupCardDraft, 'front' | 'back' | 'subject'>>) => {
    setGroupForm(f => (f ? { ...f, cards: f.cards.map(c => (c.key === key ? { ...c, ...patch } : c)) } : f))
  }

  const addGroupCardRow = () => {
    setGroupForm(f => (f ? { ...f, cards: [...f.cards, newDraft(f.subject)] } : f))
  }

  const removeGroupCardRow = (key: string) => {
    setGroupForm(f => (f ? { ...f, cards: f.cards.filter(c => c.key !== key) } : f))
  }

  const handleGroupImportAdd = (imported: ImportedFlashcard[]) => {
    setGroupForm(f =>
      f
        ? { ...f, cards: [...f.cards, ...imported.map(c => ({ key: uid(), front: c.front, back: c.back, subject: c.subject }))] }
        : f,
    )
  }

  const handleSaveGroup = () => {
    if (!groupForm || !groupModal) return
    const name = groupForm.name.trim()
    if (!name) {
      setGroupFormError('Dê um nome ao grupo.')
      return
    }
    const incomplete = groupForm.cards.filter(c => (c.front.trim() && !c.back.trim()) || (!c.front.trim() && c.back.trim()))
    if (incomplete.length > 0) {
      setGroupFormError('Existem cards incompletos — preencha frente e verso ou remova-os.')
      return
    }
    const valid = groupForm.cards
      .filter(c => c.front.trim() && c.back.trim())
      .map(c => ({ id: c.id, front: c.front.trim(), back: c.back.trim(), subject: c.subject }))
    if (valid.length === 0) {
      setGroupFormError('Adicione ao menos um card completo (frente e verso).')
      return
    }

    const input: FlashcardGroupInput = {
      name,
      subject: groupForm.subject,
      description: groupForm.description.trim() || undefined,
      cards: valid,
    }
    const editingGroup = groupModal.mode === 'edit' ? groupModal.group : null

    setGroupSaving(true)
    const afterSave = () => {
      refresh()
        .then(({ groups: g }) => {
          if (editingGroup) setActiveGroup(g.find(x => x.id === editingGroup.id) ?? null)
          setGroupModal(null)
        })
        .catch(() => setGroupFormError('Erro ao recarregar os dados.'))
        .finally(() => setGroupSaving(false))
    }
    if (groupModal.mode === 'create') {
      createFlashcardGroup(input)
        .then(afterSave)
        .catch(() => setGroupFormError('Erro ao criar o grupo.'))
    } else {
      updateFlashcardGroup(editingGroup!.id, input)
        .then(afterSave)
        .catch(() => setGroupFormError('Erro ao atualizar o grupo.'))
    }
  }

  const handleDeleteGroup = () => {
    if (!groupDeleteTarget) return
    deleteFlashcardGroup(groupDeleteTarget.id)
      .then(() => refresh())
      .then(() => {
        setActiveGroup(null)
        setGroupDeleteTarget(null)
      })
      .catch(() => {})
  }

  const renderGroupDetail = () => {
    if (!activeGroup) return null
    const visible = groupOnlyUnknown ? groupCards.filter(c => !c.known) : groupCards
    const knownCount = groupCards.filter(c => c.known).length

    return (
      <>
        <div className="fc-header">
          <div className="fc-header-left">
            <button className="fc-back-btn" onClick={() => setActiveGroup(null)} title="Voltar" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <h1 className="fc-title">{activeGroup.name}</h1>
            <span className="fc-subject-badge" style={subjectColor(activeGroup.subject)}>{activeGroup.subject}</span>
            <span className="fc-count">{groupCards.length} {groupCards.length === 1 ? 'card' : 'cards'}</span>
          </div>
          <div className="fc-header-btns">
            <button className="fc-create-btn primary" onClick={() => openEditGroup(activeGroup)} type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              Editar grupo
            </button>
            <button className="fc-create-btn danger" onClick={() => setGroupDeleteTarget(activeGroup)} type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Excluir
            </button>
          </div>
        </div>

        {activeGroup.description && <p className="fc-group-desc-banner">{activeGroup.description}</p>}

        <div className="fc-filters">
          <span className="fc-progress">
            {knownCount}/{groupCards.length} já sei · {groupCards.length - knownCount} para revisar
          </span>
          <button className={`fc-unknown-toggle ${groupOnlyUnknown ? 'active' : ''}`} onClick={() => setGroupOnlyUnknown(v => !v)} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            Só os que ainda não sei
          </button>
        </div>

        {visible.length === 0 ? (
          <div className="fc-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <p>
              {groupCards.length === 0
                ? 'Este grupo ainda não tem cards. Clique em "Editar grupo" para adicionar.'
                : 'Nenhum card com esses filtros.'}
            </p>
          </div>
        ) : (
          <div className="fc-grid">
            {visible.map(card => (
              <FlipCard key={card.id} card={card} onMark={known => handleMark(card, known)} />
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="fc-page">
      {activeGroup ? (
        renderGroupDetail()
      ) : (
        <>
          <div className="fc-header">
            <div className="fc-header-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <h1 className="fc-title">Flash Cards</h1>
              {!loading && <span className="fc-count">{stats.total} {stats.total === 1 ? 'card' : 'cards'} · {stats.groupCount} {stats.groupCount === 1 ? 'grupo' : 'grupos'}</span>}
            </div>
            <div className="fc-header-btns">
              <button className="fc-create-btn primary" onClick={openCreate} type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Novo card
              </button>
              <button className="fc-create-btn import" onClick={() => setImporterMode('standalone')} type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Importar JSON
              </button>
              <button className="fc-create-btn secondary" onClick={openCreateGroup} type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="8" y="2" width="8" height="4" rx="1" />
                  <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
                Novo grupo
              </button>
            </div>
          </div>

          <div className="fc-stats">
            <div className="fc-stat-card">
              <div className="fc-stat-icon total">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <div className="fc-stat-info">
                <span className="fc-stat-value">{stats.total}</span>
                <span className="fc-stat-label">Cards criados</span>
              </div>
            </div>
            <div className="fc-stat-card">
              <div className="fc-stat-icon known">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div className="fc-stat-info">
                <span className="fc-stat-value">{stats.known}</span>
                <span className="fc-stat-label">Já sei</span>
              </div>
            </div>
            <div className="fc-stat-card">
              <div className="fc-stat-icon review">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className="fc-stat-info">
                <span className="fc-stat-value">{stats.review}</span>
                <span className="fc-stat-label">Para revisar</span>
              </div>
            </div>
            <div className="fc-stat-card">
              <div className="fc-stat-icon group">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="8" y="2" width="8" height="4" rx="1" />
                  <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
              </div>
              <div className="fc-stat-info">
                <span className="fc-stat-value">{stats.groupCount}</span>
                <span className="fc-stat-label">Grupos</span>
              </div>
            </div>
          </div>

          <div className="fc-filters">
            <div className="fc-subjects">
              <button
                className={`fc-subject-chip ${subjectFilter === 'Todas' ? 'active' : ''}`}
                onClick={() => setSubjectFilter('Todas')}
                type="button"
              >
                Todas
              </button>
              {SUBJECTS.map(s => (
                <button
                  key={s}
                  className={`fc-subject-chip ${subjectFilter === s ? 'active' : ''}`}
                  onClick={() => setSubjectFilter(s)}
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
            <button className={`fc-unknown-toggle ${onlyUnknown ? 'active' : ''}`} onClick={() => setOnlyUnknown(v => !v)} type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              Só os que ainda não sei
            </button>
          </div>

          {loading ? (
            <div className="fc-loading">Carregando flash cards...</div>
          ) : loadError ? (
            <div className="fc-empty">{loadError}</div>
          ) : (
            <>
              {filteredGroups.length > 0 && (
                <>
                  <div className="fc-section-head">
                    <h3 className="fc-section-label">Grupos</h3>
                    <span className="fc-section-count">{filteredGroups.length} {filteredGroups.length === 1 ? 'grupo' : 'grupos'}</span>
                  </div>
                  <div className="fc-group-grid">
                    {filteredGroups.map(g => {
                      const count = cards.filter(c => c.groupId === g.id).length
                      return (
                        <div key={g.id} className="fc-group-card" onClick={() => setActiveGroup(g)}>
                          <div className="fc-group-card-top">
                            <span className="fc-subject-badge" style={subjectColor(g.subject)}>{g.subject}</span>
                            <span className="fc-group-count">{count} {count === 1 ? 'card' : 'cards'}</span>
                          </div>
                          <h4 className="fc-group-name">{g.name}</h4>
                          {g.description && <p className="fc-group-desc">{g.description}</p>}
                          <div className="fc-group-foot">
                            <span className="fc-flip-hint">Clique para abrir</span>
                            <span className="fc-group-arrow">→</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {standaloneCards.length > 0 && (
                <>
                  <div className="fc-section-head">
                    <h3 className="fc-section-label">Cards soltos</h3>
                    <span className="fc-section-count">{filteredStandalone.length} de {standaloneCards.length}</span>
                  </div>
                  {filteredStandalone.length === 0 ? (
                    <div className="fc-empty">
                      <p>Nenhum card com esses filtros.</p>
                    </div>
                  ) : (
                    <div className="fc-grid">
                      {filteredStandalone.map(card => (
                        <FlipCard
                          key={card.id}
                          card={card}
                          onMark={known => handleMark(card, known)}
                          onEdit={() => openEdit(card)}
                          onDelete={() => setDeleteTarget(card)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {cards.length === 0 && groups.length === 0 && (
                <div className="fc-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  <p>
                    Nenhum flash card ainda. Crie um card solto, um grupo ou importe um JSON.
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {modal && (
        <div className="fc-modal-overlay" onClick={() => setModal(null)}>
          <div className="fc-modal" onClick={e => e.stopPropagation()}>
            <h3 className="fc-modal-title">{modal.mode === 'create' ? 'Novo card' : 'Editar card'}</h3>
            <div className="fc-field">
              <label className="fc-label">Frente *</label>
              <textarea
                className="fc-input"
                rows={3}
                value={form.front}
                placeholder="Pergunta ou termo (suporta fórmulas com $...$)"
                onChange={e => setForm(f => ({ ...f, front: e.target.value }))}
              />
            </div>
            <div className="fc-field">
              <label className="fc-label">Verso *</label>
              <textarea
                className="fc-input"
                rows={3}
                value={form.back}
                placeholder="Resposta ou definição"
                onChange={e => setForm(f => ({ ...f, back: e.target.value }))}
              />
            </div>
            <div className="fc-field">
              <label className="fc-label">Matéria</label>
              <select className="fc-input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value as Subject }))}>
                {SUBJECTS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {formError && <div className="fc-error">{formError}</div>}
            <div className="fc-form-actions">
              <button className="fc-cancel-btn" onClick={() => setModal(null)}>Cancelar</button>
              <button className="fc-save-btn" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Salvando...' : modal.mode === 'create' ? 'Criar card' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fc-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="fc-modal fc-confirm" onClick={e => e.stopPropagation()}>
            <div className="fc-confirm-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </div>
            <h3 className="fc-modal-title">Excluir card?</h3>
            <p className="fc-confirm-text">Esta ação não pode ser desfeita.</p>
            <div className="fc-form-actions">
              <button className="fc-cancel-btn" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="fc-delete-btn" onClick={handleDelete}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {groupModal && groupForm && (
        <div className="fc-modal-overlay" onClick={() => setGroupModal(null)}>
          <div className="fc-modal fc-group-modal" onClick={e => e.stopPropagation()}>
            <h3 className="fc-modal-title">{groupModal.mode === 'create' ? 'Novo grupo' : 'Editar grupo'}</h3>
            <div className="fc-field">
              <label className="fc-label">Nome do grupo *</label>
              <input
                className="fc-input"
                value={groupForm.name}
                placeholder="Ex: Fórmulas de Física"
                onChange={e => setGroupForm(f => (f ? { ...f, name: e.target.value } : f))}
              />
            </div>
            <div className="fc-field">
              <label className="fc-label">Matéria</label>
              <select className="fc-input" value={groupForm.subject} onChange={e => setGroupForm(f => (f ? { ...f, subject: e.target.value as Subject } : f))}>
                {SUBJECTS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="fc-field">
              <label className="fc-label">Descrição (opcional)</label>
              <input
                className="fc-input"
                value={groupForm.description}
                placeholder="Breve descrição..."
                onChange={e => setGroupForm(f => (f ? { ...f, description: e.target.value } : f))}
              />
            </div>

            <div className="fc-group-cards-head">
              <span className="fc-label">Cards do grupo</span>
              <div className="fc-group-cards-head-btns">
                <button className="fc-create-btn import" onClick={() => setGroupImporterOpen(true)} type="button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Importar JSON
                </button>
                <button className="fc-create-btn primary" onClick={addGroupCardRow} type="button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Adicionar card
                </button>
              </div>
            </div>

            <div className="fc-group-cards">
              {groupForm.cards.map((c, i) => (
                <div key={c.key} className="fc-group-card-row">
                  <span className="fc-group-card-idx">{i + 1}</span>
                  <textarea
                    className="fc-input fc-group-front"
                    rows={2}
                    value={c.front}
                    placeholder="Frente"
                    onChange={e => updateGroupCard(c.key, { front: e.target.value })}
                  />
                  <textarea
                    className="fc-input fc-group-back"
                    rows={2}
                    value={c.back}
                    placeholder="Verso"
                    onChange={e => updateGroupCard(c.key, { back: e.target.value })}
                  />
                  <select
                    className="fc-input fc-group-subject"
                    value={c.subject}
                    onChange={e => updateGroupCard(c.key, { subject: e.target.value as Subject })}
                  >
                    {SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button className="fc-icon-btn danger" title="Remover card" onClick={() => removeGroupCardRow(c.key)} type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {groupFormError && <div className="fc-error">{groupFormError}</div>}

            <div className="fc-form-actions">
              <button className="fc-cancel-btn" onClick={() => setGroupModal(null)}>Cancelar</button>
              <button className="fc-save-btn" onClick={handleSaveGroup} disabled={groupSaving}>
                {groupSaving ? 'Salvando...' : groupModal.mode === 'create' ? 'Criar grupo' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {groupDeleteTarget && (
        <div className="fc-modal-overlay" onClick={() => setGroupDeleteTarget(null)}>
          <div className="fc-modal fc-confirm" onClick={e => e.stopPropagation()}>
            <div className="fc-confirm-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </div>
            <h3 className="fc-modal-title">Excluir grupo?</h3>
            <p className="fc-confirm-text">Todos os {groupCards.length} cards deste grupo também serão excluídos.</p>
            <div className="fc-form-actions">
              <button className="fc-cancel-btn" onClick={() => setGroupDeleteTarget(null)}>Cancelar</button>
              <button className="fc-delete-btn" onClick={handleDeleteGroup}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {importerMode === 'standalone' && (
        <FlashcardImporter
          title="Importar flash cards (JSON)"
          defaultSubject={subjectFilter !== 'Todas' ? subjectFilter : 'Matemática'}
          onAdd={async imported => {
            for (const c of imported) {
              await createFlashcard({ front: c.front, back: c.back, subject: c.subject })
            }
            setCards(await fetchFlashcards())
          }}
          onClose={() => setImporterMode(null)}
        />
      )}

      {groupImporterOpen && groupForm && (
        <FlashcardImporter
          title="Importar cards para o grupo (JSON)"
          defaultSubject={groupForm.subject}
          onAdd={handleGroupImportAdd}
          onClose={() => setGroupImporterOpen(false)}
        />
      )}
    </div>
  )
}
