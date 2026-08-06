import { useEffect, useMemo, useState } from 'react'
import type { Flashcard, FlashcardGroup } from '../../types/flashcard'
import type { Subject } from '../../types/doc'
import { SUBJECTS, SUBJECT_COLORS } from '../../types/doc'
import {
  fetchFlashcards,
  fetchFlashcardGroups,
  updateFlashcard,
  createFlashcardGroup,
  updateFlashcardGroup,
  deleteFlashcardGroup,
  type FlashcardGroupInput,
} from '../../lib/db'
import FlashcardImporter, { type ImportedFlashcard } from '../../components/FlashcardImporter'
import FlashcardStudy from '../../components/FlashcardStudy'
import MathRenderer from '../../components/MathRenderer'
import '../../styles/flashcards.css'

type FilterSubject = Subject | 'Todas'
type GroupModalState = { mode: 'create' } | { mode: 'edit'; group: FlashcardGroup } | null
type StudyState = { cards: Flashcard[]; title: string } | null

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

const EXAMPLE_COLLECTIONS: Array<{
  name: string
  subject: Subject
  description: string
  cards: Array<{ front: string; back: string; known?: boolean }>
}> = [
  {
    name: 'Fórmulas de Matemática',
    subject: 'Matemática',
    description: 'Identidades, equações e derivadas para revisar antes da prova.',
    cards: [
      { front: 'Quadrado da soma de dois termos', back: '$(a+b)^2 = a^2 + 2ab + b^2$', known: true },
      { front: 'Fórmula de Bhaskara', back: '$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$', known: true },
      { front: 'Logaritmo de um produto', back: '$\\log_a(x \\cdot y) = \\log_a x + \\log_a y$' },
      { front: 'Derivada da função potência', back: '$\\frac{d}{dx} x^n = n \\cdot x^{n-1}$' },
      { front: 'Seno do arco duplo', back: '$\\sin(2\\theta) = 2 \\sin\\theta \\cos\\theta$' },
    ],
  },
  {
    name: 'Leis de Newton',
    subject: 'Física',
    description: 'As três leis fundamentais da mecânica clássica.',
    cards: [
      { front: 'Primeira lei de Newton (Inércia)', back: 'Um corpo tende a manter seu estado de repouso ou movimento retilíneo uniforme a menos que uma força atue sobre ele.', known: true },
      { front: 'Segunda lei de Newton', back: 'A força resultante é o produto da massa pela aceleração: $F = m \\cdot a$', known: true },
      { front: 'Terceira lei de Newton (Ação e reação)', back: 'A toda ação corresponde uma reação de mesma intensidade e sentido oposto.' },
      { front: 'Unidade de força no SI', back: 'Newton (N), onde $1\\,N = 1\\,kg \\cdot m/s^2$' },
    ],
  },
  {
    name: 'Funções Orgânicas',
    subject: 'Química',
    description: 'Principais grupos funcionais e seus sufixos.',
    cards: [
      { front: 'Álcool', back: 'Grupo hidroxila (-OH) ligado a carbono saturado. Sufixo: -ol.' },
      { front: 'Cetona', back: 'Carbonila (C=O) entre dois carbonos. Sufixo: -ona.', known: true },
      { front: 'Ácido carboxílico', back: 'Grupo -COOH na extremidade da cadeia. Sufixo: -oico.' },
      { front: 'Éster', back: 'Derivado de ácido carboxílico com substituição do H pelo grupo R. Sufixo: -oato.' },
    ],
  },
  {
    name: 'Revolução Francesa',
    subject: 'História',
    description: 'A grande ruptura política do fim do século XVIII.',
    cards: [
      { front: 'Em que ano começou a Revolução Francesa?', back: '1789, com a Queda da Bastilha em 14 de julho.', known: true },
      { front: 'Quais eram os lemas da revolução?', back: 'Liberdade, Igualdade e Fraternidade.' },
      { front: 'Quem foi Maximilien Robespierre?', back: 'Líder dos jacobinos e da fase do Terror.' },
      { front: 'O que foi a Queda da Bastilha?', back: 'A invasão da fortaleza-prisão de Paris, símbolo do absolutismo, em 14/07/1789.' },
    ],
  },
  {
    name: 'Modernismo Brasileiro',
    subject: 'Linguagens',
    description: 'A Semana de 22 e as vanguardas literárias.',
    cards: [
      { front: 'Quando e onde ocorreu a Semana de Arte Moderna?', back: 'Em 1922, no Teatro Municipal de São Paulo.', known: true },
      { front: 'Autor do Manifesto Antropófago', back: 'Oswald de Andrade, em 1928.' },
      { front: 'Principais autores da 1ª geração modernista', back: 'Mário e Oswald de Andrade, Manuel Bandeira e Carlos Drummond de Andrade.' },
      { front: 'Qual foi a principal revista da fase heroica?', back: 'A revista Klaxon (1922-1923).' },
    ],
  },
  {
    name: 'Genética Básica',
    subject: 'Biologia',
    description: 'Conceitos fundamentais de hereditariedade.',
    cards: [
      { front: 'O que significa DNA?', back: 'Ácido desoxirribonucleico, molécula que guarda a informação genética.', known: true },
      { front: 'Diferença entre genótipo e fenótipo', back: 'Genótipo é a constituição genética; fenótipo é a expressão visível influenciada pelo ambiente.' },
      { front: 'O que são alelos?', back: 'Formas alternativas de um mesmo gene que ocupam o mesmo lócus em cromossomos homólogos.' },
      { front: 'Quem formulou as leis da hereditariedade?', back: 'Gregor Mendel, no século XIX.' },
    ],
  },
]

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

function CascadeCard({ group, count, onOpen, onEdit, onDelete }: {
  group: FlashcardGroup
  count: number
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="fc-cascade-card" onClick={onOpen}>
      <div className="fc-cascade-top">
        <span className="fc-subject-badge" style={subjectColor(group.subject)}>{group.subject}</span>
        <div className="fc-cascade-ctrl">
          <button
            className="fc-icon-btn"
            title="Editar grupo"
            type="button"
            onClick={e => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>
          <button
            className="fc-icon-btn danger"
            title="Excluir grupo"
            type="button"
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
        </div>
      </div>
      <h4 className="fc-cascade-title">{group.name}</h4>
      {group.description && <p className="fc-cascade-desc">{group.description}</p>}
      <div className="fc-cascade-foot">
        <span className="fc-cascade-count">
          <b>{count}</b> {count === 1 ? 'card' : 'cards'}
        </span>
        <span className="fc-cascade-open">Abrir →</span>
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
  const [search, setSearch] = useState('')
  const [activeGroup, setActiveGroup] = useState<FlashcardGroup | null>(null)
  const [groupOnlyUnknown, setGroupOnlyUnknown] = useState(false)
  const [groupModal, setGroupModal] = useState<GroupModalState>(null)
  const [groupForm, setGroupForm] = useState<GroupForm | null>(null)
  const [groupFormError, setGroupFormError] = useState('')
  const [groupSaving, setGroupSaving] = useState(false)
  const [groupDeleteTarget, setGroupDeleteTarget] = useState<FlashcardGroup | null>(null)
  const [groupImporterOpen, setGroupImporterOpen] = useState(false)
  const [studying, setStudying] = useState<StudyState>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedMessage, setSeedMessage] = useState('')

  const seedExampleCollections = async () => {
    if (seeding) return
    setSeeding(true)
    setSeedMessage('')
    try {
      for (const col of EXAMPLE_COLLECTIONS) {
        await createFlashcardGroup({
          name: col.name,
          subject: col.subject,
          description: col.description,
          cards: col.cards.map(c => ({ front: c.front, back: c.back, subject: col.subject })),
        })
      }
      const all = await fetchFlashcards()
      const knownTargets = new Set<string>()
      for (const col of EXAMPLE_COLLECTIONS) for (const c of col.cards) if (c.known) knownTargets.add(`${c.front}|${c.back}`)
      for (const card of all) {
        if (knownTargets.has(`${card.front}|${card.back}`)) {
          await updateFlashcard(card.id, { known: true })
        }
      }
      await refresh()
      setSeedMessage('Coleções de exemplo criadas!')
    } catch {
      setSeedMessage('Erro ao criar as coleções de exemplo. Tente novamente.')
    } finally {
      setSeeding(false)
    }
  }

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

  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      if (subjectFilter !== 'Todas' && g.subject !== subjectFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const name = g.name.toLowerCase()
        const desc = (g.description ?? '').toLowerCase()
        if (!name.includes(q) && !desc.includes(q)) return false
      }
      return true
    })
  }, [groups, subjectFilter, search])

  const { leftGroups, rightGroups } = useMemo(() => {
    const half = Math.ceil(filteredGroups.length / 2)
    return { leftGroups: filteredGroups.slice(0, half), rightGroups: filteredGroups.slice(half) }
  }, [filteredGroups])

  const renderCascade = (groups: FlashcardGroup[]) => (
    <div className="fc-cascade">
      <div className="fc-cascade-track">
        {[0, 1].map(copy => (
          <div key={copy} className="fc-cascade-copy">
            {groups.map(g => (
              <CascadeCard
                key={g.id}
                group={g}
                count={cards.filter(c => c.groupId === g.id).length}
                onOpen={() => setActiveGroup(g)}
                onEdit={() => openEditGroup(g)}
                onDelete={() => setGroupDeleteTarget(g)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )

  const stats = useMemo(() => {
    const known = cards.filter(c => c.known).length
    return { total: cards.length, known, review: cards.length - known, groupCount: groups.length }
  }, [cards, groups])

  const groupCards = useMemo(
    () => (activeGroup ? cards.filter(c => c.groupId === activeGroup.id) : []),
    [cards, activeGroup],
  )

  const startStudy = () => {
    const list = cards.filter(c => {
      if (subjectFilter !== 'Todas' && c.subject !== subjectFilter) return false
      if (onlyUnknown && c.known) return false
      if (search) {
        const q = search.toLowerCase()
        if (!c.front.toLowerCase().includes(q) && !c.back.toLowerCase().includes(q)) return false
      }
      return true
    })
    const title = subjectFilter === 'Todas' ? 'Todos os cards' : subjectFilter
    setStudying({ cards: list, title })
  }

  const startGroupStudy = () => {
    if (!activeGroup) return
    const visible = groupOnlyUnknown ? groupCards.filter(c => !c.known) : groupCards
    setStudying({ cards: visible, title: activeGroup.name })
  }

  const handleMark = (card: Flashcard, known: boolean) => {
    setCards(prev => prev.map(c => (c.id === card.id ? { ...c, known } : c)))
    updateFlashcard(card.id, { known }).catch(() => {})
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
            <button
              className="fc-create-btn study"
              onClick={startGroupStudy}
              disabled={groupCards.length === 0}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h6" />
                <circle cx="12" cy="16" r="4" />
                <path d="M14 14l2-2" />
              </svg>
              Estudar
            </button>
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
      {studying ? (
        <FlashcardStudy
          cards={studying.cards}
          title={studying.title}
          onExit={() => setStudying(null)}
          onGrade={(card, easy) => handleMark(card, easy)}
        />
      ) : activeGroup ? (
        renderGroupDetail()
      ) : (
        <>
          <div className="fc-header">
            <div className="fc-header-left">
              <div className="fc-logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <div className="fc-heading">
                <h1 className="fc-title">Flash Cards</h1>
                <span className="fc-subtitle">Centro de controle de revisão</span>
              </div>
              {!loading && <span className="fc-count">{stats.total} {stats.total === 1 ? 'card' : 'cards'} · {stats.groupCount} {stats.groupCount === 1 ? 'coleção' : 'coleções'}</span>}
              {import.meta.env.DEV && (
                <button className="fc-seed-btn" onClick={seedExampleCollections} disabled={seeding || loading} type="button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.4L12 17l-1.9-5.6L4.5 10l5.6-1.4L12 3z" />
                    <path d="M19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z" />
                  </svg>
                  {seeding ? 'Criando...' : 'Criar exemplos'}
                </button>
              )}
              {seedMessage && <span className="fc-seed-msg">{seedMessage}</span>}
            </div>
          </div>

          {loading ? (
            <div className="fc-loading">Carregando flash cards...</div>
          ) : loadError ? (
            <div className="fc-empty">{loadError}</div>
          ) : (
            <>
              <div className="fc-sym">
                <div className="fc-stack">
                  <div className="fc-stack-head">
                    <span className="fc-stack-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <path d="M8 8h8M8 12h8M8 16h5" />
                      </svg>
                      Coleções
                    </span>
                    <span className="fc-section-count">{filteredGroups.length}</span>
                  </div>
                  {leftGroups.length === 0 ? (
                    <div className="fc-stack-empty">
                      {groups.length === 0 ? 'Crie uma coleção para agrupar seus cards.' : 'Nada com esses filtros.'}
                    </div>
                  ) : (
                    renderCascade(leftGroups)
                  )}
                  <button className="fc-rail-add" onClick={openCreateGroup} type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Nova coleção
                  </button>
                </div>

                <div className="fc-center">
                  <div className="fc-bubbles">
                    <div className="fc-bubble known">
                      <span className="fc-bubble-value">{stats.known}</span>
                      <span className="fc-bubble-label">Já sei</span>
                    </div>
                    <div className="fc-bubble big">
                      <span className="fc-bubble-value">{stats.total}</span>
                      <span className="fc-bubble-label">Cards</span>
                    </div>
                    <div className="fc-bubble review">
                      <span className="fc-bubble-value">{stats.review}</span>
                      <span className="fc-bubble-label">Revisar</span>
                    </div>
                  </div>

                  <div className="fc-search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4.3-4.3" />
                    </svg>
                    <input
                      className="fc-search-input"
                      placeholder="Buscar por pergunta, resposta ou coleção..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                      <button className="fc-search-clear" onClick={() => setSearch('')} title="Limpar busca" type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="fc-tags">
                    <button
                      className={`fc-tag ${subjectFilter === 'Todas' ? 'active' : ''}`}
                      style={subjectFilter === 'Todas' ? { background: 'rgba(212,168,67,0.24)', color: '#e8dcc8', borderColor: 'rgba(212,168,67,0.5)' } : undefined}
                      onClick={() => setSubjectFilter('Todas')}
                      type="button"
                    >
                      <span className="fc-chip-dot" style={{ background: '#d4a843' }} />
                      Todas
                    </button>
                    {SUBJECTS.map(s => (
                      <button
                        key={s}
                        className={`fc-tag ${subjectFilter === s ? 'active' : ''}`}
                        style={subjectFilter === s ? subjectColor(s) : undefined}
                        onClick={() => setSubjectFilter(s)}
                        type="button"
                      >
                        <span className="fc-chip-dot" style={{ background: subjectColor(s).color }} />
                        {s}
                      </button>
                    ))}
                    <button
                      className={`fc-tag unknown-toggle ${onlyUnknown ? 'active' : ''}`}
                      onClick={() => setOnlyUnknown(v => !v)}
                      type="button"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                      </svg>
                      Só os que ainda não sei
                    </button>
                  </div>
                </div>

                <div className="fc-stack mirror">
                  <div className="fc-stack-head">
                    <span className="fc-stack-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <path d="M8 8h8M8 12h8M8 16h5" />
                      </svg>
                      Coleções
                    </span>
                    <span className="fc-section-count">{rightGroups.length}</span>
                  </div>
                  {rightGroups.length === 0 ? (
                    <div className="fc-stack-empty">Espaço para mais coleções.</div>
                  ) : (
                    renderCascade(rightGroups)
                  )}
                  <button className="fc-rail-add" onClick={openCreateGroup} type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Nova coleção
                  </button>
                </div>
              </div>

              <div className="fc-action">
                <button className="fc-action-big" onClick={startStudy} disabled={cards.length === 0} type="button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h6" />
                    <circle cx="12" cy="16" r="4" />
                    <path d="M14 14l2-2" />
                  </svg>
                  Estudar agora
                </button>
                <div className="fc-action-curve">
                  <button className="fc-curve-btn" title="Nova coleção" onClick={openCreateGroup} type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="8" y="2" width="8" height="4" rx="1" />
                      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                      <line x1="12" y1="11" x2="12" y2="17" />
                      <line x1="9" y1="14" x2="15" y2="14" />
                    </svg>
                  </button>
                </div>
              </div>

              {cards.length === 0 && groups.length === 0 && (
                <div className="fc-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  <p>
                    Nenhuma coleção ainda. Crie uma coleção para adicionar seus cards.
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {groupModal && groupForm && (
        <div className="fc-modal-overlay" onClick={() => setGroupModal(null)}>
          <div className="fc-modal fc-group-modal" onClick={e => e.stopPropagation()}>
            <div className="fc-modal-head">
              <span className="fc-modal-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="8" y="2" width="8" height="4" rx="1" />
                  <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
              </span>
              <h3 className="fc-modal-title">{groupModal.mode === 'create' ? 'Novo grupo' : 'Editar grupo'}</h3>
            </div>
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
