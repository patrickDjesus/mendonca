import { useState, useCallback } from 'react'
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

const DIFFICULTY_OPTIONS: { value: ChallengeDifficulty; label: string; color: string }[] = [
  { value: 'facil', label: 'Fácil', color: '#64b478' },
  { value: 'medio', label: 'Médio', color: '#d4a843' },
  { value: 'dificil', label: 'Difícil', color: '#c85050' },
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

  const filtered = filterSubject === 'Todas'
    ? allQuestions
    : allQuestions.filter(q => q.subject === filterSubject)

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
          <div className="cb-section-card">
            <h4 className="cb-section-title">Informações básicas</h4>
            <div className="qb-field">
              <label className="qb-label">Título do desafio *</label>
              <input className="qb-input" value={title} placeholder="Ex: Desafio de Mecânica..." onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="qb-field">
              <label className="qb-label">Descrição (opcional)</label>
              <input className="qb-input" value={description} placeholder="Breve descrição do desafio..." onChange={e => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="cb-section-card">
            <h4 className="cb-section-title">Matérias</h4>
            <p className="cb-section-desc">A primeira selecionada é a principal. Clique para adicionar ou remover matérias cruzadas.</p>
            <div className="cb-subject-grid">
              {SUBJECTS.map(s => {
                const colors = SUBJECT_COLORS[s]
                const isSelected = subjects.includes(s)
                const isPrimary = subjects[0] === s
                return (
                  <button key={s} className={`cb-subject-btn ${isSelected ? 'active' : ''} ${isPrimary ? 'primary' : ''}`} style={{ '--subject-color': colors.text, '--subject-bg': colors.bg } as React.CSSProperties} onClick={() => toggleSubject(s)} type="button">
                    <span className="cb-subject-name">{s}</span>
                    {isPrimary && <span className="cb-subject-badge">Principal</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="cb-section-card">
            <h4 className="cb-section-title">Dificuldade</h4>
            <div className="cb-difficulty-row">
              {DIFFICULTY_OPTIONS.map(d => (
                <button key={d.value} className={`cb-diff-btn diff-${d.value} ${difficulty === d.value ? 'active' : ''}`} onClick={() => setDifficulty(d.value)} type="button">
                  <span className="cb-diff-dot" style={{ background: d.color }} />
                  <span className="cb-diff-label">{d.label}</span>
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
              <select className="qb-select qb-select-sm" value={filterSubject} onChange={e => setFilterSubject(e.target.value as Subject | 'Todas')}>
                <option value="Todas">Todas as matérias</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {filtered.length === 0 && <div className="cb-empty">Nenhuma questão disponível. Crie questões primeiro.</div>}
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
                      <span className="cb-q-meta">{q.subject} · {QUESTION_TYPE_LABELS[q.type]} · {q.difficulty === 'facil' ? 'Fácil' : q.difficulty === 'medio' ? 'Médio' : 'Difícil'}</span>
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
            <h4 className="cb-section-title">Modificadores de dificuldade</h4>
            <p className="cb-section-desc">Ative modificadores para tornar o desafio mais desafiador. Opcional.</p>
            <div className="cb-modifier-grid">
              {ALL_MODIFIERS.map(m => {
                const isActive = modifiers.includes(m)
                return (
                  <button key={m} className={`cb-modifier-btn ${isActive ? 'active' : ''}`} style={{ '--mod-color': MODIFIER_COLORS[m] } as React.CSSProperties} onClick={() => toggleModifier(m)} type="button">
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
