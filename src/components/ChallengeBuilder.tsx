import { useState, useCallback, useMemo, type ReactNode } from 'react'
import type { Challenge, ChallengeQuestion, ChallengeDifficulty, ChallengeModifier } from '../types/challenge'
import { QUESTION_TYPE_LABELS, MODIFIER_LABELS, MODIFIER_DESCRIPTIONS } from '../types/challenge'
import type { Subject } from '../types/doc'
import { SUBJECTS, SUBJECT_COLORS } from '../types/doc'

interface Props {
  allQuestions: ChallengeQuestion[]
  initial?: Challenge
  onSave: (challenge: Challenge, newQuestions: ChallengeQuestion[]) => void
  onCancel: () => void
}

const DIFFICULTY_OPTIONS: { value: ChallengeDifficulty; label: string; color: string; emoji: string; desc: string }[] = [
  { value: 'facil', label: 'Fácil', color: '#64b478', emoji: '🟢', desc: '100 XP base' },
  { value: 'medio', label: 'Médio', color: '#d4a843', emoji: '🟡', desc: '150 XP base' },
  { value: 'dificil', label: 'Difícil', color: '#c85050', emoji: '🔴', desc: '200 XP base' },
]

const ALL_MODIFIERS: ChallengeModifier[] = [
  'cronometro_em_chamas', 'contagem_regressiva_cegante', 'morte_subita',
  'memoria_curta', 'fio_da_navalha', 'ponte_de_vidro', 'aposta_cega',
]

const MODIFIER_ICONS: Record<ChallengeModifier, string> = {
  cronometro_em_chamas: '🔥',
  contagem_regressiva_cegante: '🙈',
  morte_subita: '💀',
  memoria_curta: '🧠',
  fio_da_navalha: '⚔️',
  ponte_de_vidro: '💔',
  aposta_cega: '🎰',
}

const MODIFIER_COLORS: Record<ChallengeModifier, string> = {
  cronometro_em_chamas: '#e05030',
  contagem_regressiva_cegante: '#8080c0',
  morte_subita: '#c83030',
  memoria_curta: '#9070d0',
  fio_da_navalha: '#d0a030',
  ponte_de_vidro: '#50a0d0',
  aposta_cega: '#d070b0',
}

const SUBJECT_ICONS: Record<Subject, ReactNode> = {
  'Física': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" />
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    </svg>
  ),
  'Química': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
      <path d="M8.5 2h7" />
      <path d="M7 16.5h10" />
    </svg>
  ),
  'Biologia': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  ),
  'Matemática': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="10" y2="10" />
      <line x1="14" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="16" y2="18" />
    </svg>
  ),
  'Linguagens': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      <path d="M8 7h6" />
      <path d="M8 11h8" />
    </svg>
  ),
  'Geografia': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  ),
  'História': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  'Filosofia': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M12 5v14" />
    </svg>
  ),
  'Ciências Humanas': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  'Ciências da Natureza': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  ),
}

type BuilderStep = 'info' | 'questions' | 'modifiers'

export default function ChallengeBuilder({ allQuestions, initial, onSave, onCancel }: Props) {
  const [step, setStep] = useState<BuilderStep>('info')
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [subjects, setSubjects] = useState<Subject[]>(initial ? [initial.subject, ...(initial.crossSubjects || [])] : [])
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>(initial?.difficulty || 'medio')
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.questionIds || [])
  const [modifiers, setModifiers] = useState<ChallengeModifier[]>(initial?.modifiers || [])
  const [apostaCegaMin, setApostaCegaMin] = useState(initial?.apostaCegaMin || Math.max(1, Math.ceil((initial?.questionIds.length || 0) * 0.2)))
  const [filterSubject, setFilterSubject] = useState<Subject | 'Todas'>('Todas')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')

  const primarySubject = subjects[0] || 'Matemática'
  const crossSubjects = subjects.slice(1)

  const toggleSubject = useCallback((s: Subject) => {
    setSubjects(prev => {
      if (prev.includes(s)) {
        const next = prev.filter(x => x !== s)
        return next.length === 0 ? prev : next
      }
      return [...prev, s]
    })
  }, [])

  const toggleModifier = useCallback((m: ChallengeModifier) => {
    setModifiers(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }, [])

  const toggleQuestion = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }, [])

  const filtered = useMemo(() => {
    let list = filterSubject === 'Todas'
      ? allQuestions
      : allQuestions.filter(q => q.subject === filterSubject)

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      list = list.filter(q =>
        q.title.toLowerCase().includes(query) ||
        (q.content && q.content.toLowerCase().includes(query)) ||
        (q.difficulty === 'facil' && 'fácilfacil'.includes(query)) ||
        (q.difficulty === 'medio' && 'médio medio'.includes(query)) ||
        (q.difficulty === 'dificil' && 'difícildificil'.includes(query)) ||
        q.subject.toLowerCase().includes(query) ||
        QUESTION_TYPE_LABELS[q.type].toLowerCase().includes(query)
      )
    }

    return list
  }, [allQuestions, filterSubject, searchQuery])

  const validateInfo = useCallback((): boolean => {
    if (!title.trim()) { setError('Título obrigatório'); return false }
    if (subjects.length === 0) { setError('Selecione ao menos uma matéria'); return false }
    setError('')
    return true
  }, [title, subjects])

  const handleNextFromInfo = useCallback(() => {
    if (!validateInfo()) return
    setStep('questions')
  }, [validateInfo])

  const handleNextFromQuestions = useCallback(() => {
    if (selectedIds.length === 0) { setError('Selecione ao menos uma questão'); return }
    setError('')
    setStep('modifiers')
  }, [selectedIds])

  const handleSave = useCallback(() => {
    const baseXp = difficulty === 'facil' ? 100 : difficulty === 'medio' ? 150 : 200
    const challenge: Challenge = {
      id: initial?.id || crypto.randomUUID(),
      title: title.trim(),
      description: description.trim() || undefined,
      subject: primarySubject,
      crossSubjects: crossSubjects.length > 0 ? crossSubjects : undefined,
      difficulty,
      questionIds: selectedIds,
      xpBase: baseXp,
      isDaily: initial?.isDaily ?? false,
      dailyDate: initial?.dailyDate,
      createdAt: initial?.createdAt || Date.now(),
      modifiers,
      apostaCegaMin: modifiers.includes('aposta_cega') ? apostaCegaMin : undefined,
    }
    onSave(challenge, [])
  }, [title, description, primarySubject, crossSubjects, difficulty, selectedIds, initial, onSave, modifiers, apostaCegaMin])

  const xpPreview = useMemo(() => {
    const baseXp = difficulty === 'facil' ? 100 : difficulty === 'medio' ? 150 : 200
    const questionBonus = selectedIds.length * 10
    const modifierBonus = modifiers.length * 25
    return { base: baseXp, questions: questionBonus, modifiers: modifierBonus, total: baseXp + questionBonus + modifierBonus }
  }, [difficulty, selectedIds, modifiers])

  const steps: { key: BuilderStep; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: 'Informações', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> },
    { key: 'questions', label: 'Questões', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
    { key: 'modifiers', label: 'Modificadores', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg> },
  ]

  return (
    <div className="cb-container">
      <div className="cb-header">
        <h3 className="cb-title">{initial ? 'Editar desafio' : 'Novo desafio'}</h3>
        <div className="cb-header-actions">
          <button className="cb-cancel-btn" onClick={onCancel} type="button">Cancelar</button>
          {step === 'modifiers' && <button className="cb-save-btn" onClick={handleSave} type="button">Salvar desafio</button>}
        </div>
      </div>

      <div className="cb-step-nav">
        {steps.map((s, i) => (
          <button key={s.key} className={`cb-step-btn ${step === s.key ? 'active' : ''} ${steps.findIndex(x => x.key === step) > i ? 'completed' : ''}`} onClick={() => { if (i < steps.findIndex(x => x.key === step)) setStep(s.key) }} type="button" disabled={steps.findIndex(x => x.key === step) < i}>
            <span className="cb-step-icon">{s.icon}</span>
            <span className="cb-step-label">{s.label}</span>
            {i < steps.length - 1 && <span className="cb-step-line" />}
          </button>
        ))}
      </div>

      {error && <div className="qb-error">{error}</div>}

      {/* ── Step 1: Info ──────────────────────── */}
      {step === 'info' && (
        <div className="cb-step-content">
          <div className="cb-section-card cb-section-basic">
            <h4 className="cb-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              Informações básicas
            </h4>
            <div className="qb-field">
              <label className="qb-label">Título do desafio *</label>
              <input className="qb-input" value={title} placeholder="Ex: Desafio de Mecânica..." onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="qb-field">
              <label className="qb-label">Descrição (opcional)</label>
              <input className="qb-input" value={description} placeholder="Breve descrição do desafio..." onChange={e => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="cb-section-card cb-section-subjects">
            <h4 className="cb-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
              Matérias
            </h4>
            <p className="cb-section-desc">A primeira selecionada é a principal. Clique para adicionar ou remover matérias cruzadas.</p>
            <div className="cb-subject-grid-new">
              {SUBJECTS.map(s => {
                const colors = SUBJECT_COLORS[s]
                const isSelected = subjects.includes(s)
                const isPrimary = subjects[0] === s
                return (
                  <button key={s} className={`cb-subject-btn-new ${isSelected ? 'active' : ''} ${isPrimary ? 'primary' : ''}`} style={{ '--subject-color': colors.text, '--subject-bg': colors.bg } as React.CSSProperties} onClick={() => toggleSubject(s)} type="button">
                    <div className="cb-subject-icon-wrap">
                      {SUBJECT_ICONS[s]}
                    </div>
                    <span className="cb-subject-name">{s}</span>
                    {isPrimary && <span className="cb-subject-badge">Principal</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="cb-section-card cb-section-difficulty">
            <h4 className="cb-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>
              Dificuldade
            </h4>
            <div className="cb-difficulty-row-new">
              {DIFFICULTY_OPTIONS.map(d => (
                <button key={d.value} className={`cb-diff-btn-new diff-${d.value} ${difficulty === d.value ? 'active' : ''}`} onClick={() => setDifficulty(d.value)} type="button">
                  <span className="cb-diff-emoji">{d.emoji}</span>
                  <span className="cb-diff-info">
                    <span className="cb-diff-label">{d.label}</span>
                    <span className="cb-diff-desc">{d.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="cb-nav-footer">
            <button className="cb-cancel-btn" onClick={onCancel} type="button">Cancelar</button>
            <button className="cb-save-btn" onClick={handleNextFromInfo} type="button">
              Próximo: Selecionar questões
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Questions ─────────────────── */}
      {step === 'questions' && (
        <div className="cb-step-content">
          <div className="cb-section-card">
            <div className="cb-picker-header">
              <span className="cb-section-title">Questões ({selectedIds.length} selecionadas)</span>
              <div className="cb-picker-filters">
                <div className="cb-search-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cb-search-icon"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input className="cb-search-input" type="text" placeholder="Buscar por nome, matéria, tipo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  {searchQuery && <button className="cb-search-clear" onClick={() => setSearchQuery('')} type="button">×</button>}
                </div>
                <select className="qb-select qb-select-sm" value={filterSubject} onChange={e => { setFilterSubject(e.target.value as Subject | 'Todas'); setSearchQuery('') }}>
                  <option value="Todas">Todas as matérias</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {filtered.length === 0 && <div className="cb-empty">Nenhuma questão encontrada. {searchQuery || filterSubject !== 'Todas' ? 'Tente outro filtro.' : 'Crie questões primeiro.'}</div>}
            <div className="cb-question-list">
              {filtered.map(q => {
                const isSelected = selectedIds.includes(q.id)
                return (
                  <div key={q.id} className={`cb-question-item ${isSelected ? 'selected' : ''}`} onClick={() => toggleQuestion(q.id)}>
                    <div className="cb-q-check">
                      <div className={`cb-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      </div>
                    </div>
                    <div className="cb-q-info">
                      <span className="cb-q-title">{q.title}</span>
                      <span className="cb-q-meta">{q.subject} · {QUESTION_TYPE_LABELS[q.type]} · <span className={`cb-q-diff cb-q-diff-${q.difficulty}`}>{q.difficulty === 'facil' ? 'Fácil' : q.difficulty === 'medio' ? 'Médio' : 'Difícil'}</span></span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="cb-nav-footer">
            <button className="cb-cancel-btn" onClick={() => setStep('info')} type="button">Voltar</button>
            <button className="cb-save-btn" onClick={handleNextFromQuestions} type="button">
              Próximo: Modificadores
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Modifiers ────────────────── */}
      {step === 'modifiers' && (
        <div className="cb-step-content">
          <div className="cb-section-card">
            <h4 className="cb-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
              Modificadores de dificuldade
            </h4>
            <p className="cb-section-desc">Ative modificadores para tornar o desafio mais desafiador. Opcional.</p>
            <div className="cb-modifier-grid-new">
              {ALL_MODIFIERS.map(m => {
                const isActive = modifiers.includes(m)
                return (
                  <button key={m} className={`cb-modifier-card ${isActive ? 'active' : ''}`} style={{ '--mod-color': MODIFIER_COLORS[m] } as React.CSSProperties} onClick={() => toggleModifier(m)} type="button">
                    <div className="cb-modifier-card-bg" />
                    <span className="cb-modifier-icon">{MODIFIER_ICONS[m]}</span>
                    <span className="cb-modifier-name">{MODIFIER_LABELS[m]}</span>
                    <span className="cb-modifier-desc">{MODIFIER_DESCRIPTIONS[m]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {modifiers.includes('aposta_cega') && (
            <div className="cb-section-card">
              <h4 className="cb-section-title">Aposta Cega — mínimo de acertos</h4>
              <p className="cb-section-desc">O aluno deve apostar quantas questões vai acertar. Lance mínimo: {Math.max(1, Math.ceil(selectedIds.length * 0.2))} ({Math.round(20)}% de {selectedIds.length})</p>
              <div className="cb-aposta-input">
                <input type="range" min={Math.max(1, Math.ceil(selectedIds.length * 0.2))} max={selectedIds.length} value={apostaCegaMin} onChange={e => setApostaCegaMin(Number(e.target.value))} className="qb-range" />
                <span className="cb-aposta-value">{apostaCegaMin} questões</span>
              </div>
            </div>
          )}

          <div className="cb-xp-bar">
            <div className="cb-xp-bar-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              <span className="cb-xp-bar-title">XP Estimado</span>
            </div>
            <div className="cb-xp-breakdown">
              <div className="cb-xp-item">
                <span className="cb-xp-item-label">Dificuldade base</span>
                <span className="cb-xp-item-value">+{xpPreview.base} XP</span>
              </div>
              <div className="cb-xp-item">
                <span className="cb-xp-item-label">{selectedIds.length} questões</span>
                <span className="cb-xp-item-value">+{xpPreview.questions} XP</span>
              </div>
              {modifiers.length > 0 && (
                <div className="cb-xp-item">
                  <span className="cb-xp-item-label">{modifiers.length} modificador{modifiers.length > 1 ? 'es' : ''}</span>
                  <span className="cb-xp-item-value cb-xp-modifier">+{xpPreview.modifiers} XP</span>
                </div>
              )}
              <div className="cb-xp-total">
                <span className="cb-xp-total-label">Total</span>
                <span className="cb-xp-total-value">{xpPreview.total} XP</span>
              </div>
            </div>
            <div className="cb-xp-bar-track">
              <div className="cb-xp-bar-fill" style={{ width: `${Math.min(100, (xpPreview.total / 500) * 100)}%` }} />
            </div>
          </div>

          <div className="cb-nav-footer">
            <button className="cb-cancel-btn" onClick={() => setStep('questions')} type="button">Voltar</button>
            <button className="cb-save-btn" onClick={handleSave} type="button">
              Salvar desafio
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
