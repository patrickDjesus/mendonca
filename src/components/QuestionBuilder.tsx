import { useState, useCallback, type ReactNode } from 'react'
import type { ChallengeQuestion, QuestionType, ChallengeOption, TrueFalseStatement, OrderItem, CompletarBlank } from '../types/challenge'
import { QUESTION_TYPE_LABELS } from '../types/challenge'
import type { Subject } from '../types/doc'
import { SUBJECTS, SUBJECT_COLORS } from '../types/doc'

const QUESTION_TYPES: QuestionType[] = [
  'multipla',
  'multipla_multipla',
  'verdadeiro_falso',
  'aberta',
  'ordem',
  'completar',
]

const TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  multipla: 'Uma alternativa correta entre várias opções',
  multipla_multipla: 'Várias alternativas podem estar corretas',
  verdadeiro_falso: 'Cada afirmação deve ser marcada como verdadeira ou falsa',
  aberta: 'Resposta aberta — o próprio usuário avalia se acertou',
  ordem: 'Arrastar itens para colocá-los na ordem correta',
  completar: 'Preencher lacunas em uma frase',
}

const TYPE_ICONS: Record<QuestionType, ReactNode> = {
  multipla: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  multipla_multipla: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 7 17l-5-5" />
      <path d="m22 10-9.5 9.5L10 17" />
    </svg>
  ),
  verdadeiro_falso: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="5" width="22" height="14" rx="7" />
      <circle cx="16" cy="12" r="3" />
    </svg>
  ),
  aberta: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  ),
  ordem: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </svg>
  ),
  completar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 10H3" />
      <path d="M21 6H3" />
      <path d="M21 14H3" />
      <path d="M17 18H3" />
    </svg>
  ),
}

const TYPE_COLORS: Record<QuestionType, { default: string; hover: string; active: string }> = {
  multipla: { default: 'rgba(80,140,200,0.12)', hover: 'rgba(80,140,200,0.22)', active: 'rgba(80,140,200,0.30)' },
  multipla_multipla: { default: 'rgba(80,180,120,0.12)', hover: 'rgba(80,180,120,0.22)', active: 'rgba(80,180,120,0.30)' },
  verdadeiro_falso: { default: 'rgba(200,140,60,0.12)', hover: 'rgba(200,140,60,0.22)', active: 'rgba(200,140,60,0.30)' },
  aberta: { default: 'rgba(140,120,200,0.12)', hover: 'rgba(140,120,200,0.22)', active: 'rgba(140,120,200,0.30)' },
  ordem: { default: 'rgba(200,100,80,0.12)', hover: 'rgba(200,100,80,0.22)', active: 'rgba(200,100,80,0.30)' },
  completar: { default: 'rgba(180,80,180,0.12)', hover: 'rgba(180,80,180,0.22)', active: 'rgba(180,80,180,0.30)' },
}

const TYPE_TEXT_COLORS: Record<QuestionType, string> = {
  multipla: '#508cc8',
  multipla_multipla: '#50b478',
  verdadeiro_falso: '#c88c3c',
  aberta: '#8c78c8',
  ordem: '#c86450',
  completar: '#b450b4',
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
}

interface Props {
  initial?: ChallengeQuestion
  onSave: (question: ChallengeQuestion) => void
  onCancel: () => void
}

function newOption(text = '', correct = false): ChallengeOption {
  return { id: crypto.randomUUID(), text, correct }
}

function newStatement(text = '', correct = true): TrueFalseStatement {
  return { id: crypto.randomUUID(), text, correct }
}

function newOrderItem(text = '', correctOrder = 0): OrderItem {
  return { id: crypto.randomUUID(), text, correctOrder }
}

function newBlank(answer = ''): CompletarBlank {
  return { id: crypto.randomUUID(), answer }
}

function emptyQuestion(type: QuestionType = 'multipla', subject: Subject = 'Matemática'): ChallengeQuestion {
  return {
    id: crypto.randomUUID(),
    type,
    title: '',
    subject,
    content: '',
    explanation: '',
    options: [newOption('', true), newOption()],
    statements: [newStatement('', true), newStatement('', false)],
    orderItems: [newOrderItem('', 1), newOrderItem('', 2), newOrderItem('', 3)],
    blanks: [newBlank(), newBlank()],
  }
}

type WizardStep = 'count' | 'subject' | 'questions' | 'single_edit'

export default function QuestionBuilder({ initial, onSave, onCancel }: Props) {
  const [q, setQ] = useState<ChallengeQuestion>(initial || emptyQuestion())
  const [error, setError] = useState('')

  const [wizardStep, setWizardStep] = useState<WizardStep>(initial ? 'single_edit' : 'count')
  const [totalCount, setTotalCount] = useState(1)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [batchSubject, setBatchSubject] = useState<Subject>('Matemática')
  const [batchQuestions, setBatchQuestions] = useState<ChallengeQuestion[]>([])

  const setField = useCallback(<K extends keyof ChallengeQuestion>(key: K, val: ChallengeQuestion[K]) => {
    setQ(prev => ({ ...prev, [key]: val }))
  }, [])

  const validate = useCallback((): boolean => {
    if (!q.title.trim()) { setError('Título obrigatório'); return false }
    if (q.type === 'multipla' || q.type === 'multipla_multipla') {
      if (q.options.length < 2) { setError('Mínimo 2 alternativas'); return false }
      if (!q.options.some(o => o.correct)) { setError('Marque ao menos uma alternativa correta'); return false }
    }
    if (q.type === 'verdadeiro_falso') {
      if (q.statements.length < 1) { setError('Adicione ao menos uma afirmação'); return false }
    }
    if (q.type === 'ordem') {
      if (q.orderItems.length < 2) { setError('Mínimo 2 itens de ordem'); return false }
    }
    if (q.type === 'completar') {
      if (q.blanks.length < 1) { setError('Adicione ao menos uma lacuna'); return false }
    }
    setError('')
    return true
  }, [q])

  const handleSave = useCallback(() => {
    if (!validate()) return
    onSave(q)
  }, [q, validate, onSave])

  const handleSaveWizard = useCallback(() => {
    if (!validate()) return
    const updated = [...batchQuestions]
    updated[currentIndex] = q
    setBatchQuestions(updated)

    if (currentIndex < totalCount - 1) {
      setCurrentIndex(prev => prev + 1)
      setQ(emptyQuestion(batchQuestions[0]?.type || 'multipla', batchSubject))
      setError('')
    } else {
      updated.forEach(qq => onSave(qq))
    }
  }, [q, validate, batchQuestions, currentIndex, totalCount, batchSubject, onSave])

  /* ── Options Editor ─────────────────────────── */

  const renderOptionsEditor = () => {
    const isMulti = q.type === 'multipla_multipla'
    return (
      <div className="qb-section">
        <div className="qb-section-header">
          <span className="qb-section-title">{isMulti ? 'Alternativas (marque as corretas)' : 'Alternativas (marque a correta)'}</span>
          <button className="qb-add-btn" onClick={() => setField('options', [...q.options, newOption()])} type="button">+ Adicionar</button>
        </div>
        {q.options.map((opt, idx) => (
          <div key={opt.id} className="qb-option-row">
            {isMulti ? (
              <input
                type="checkbox"
                className="qb-checkbox"
                checked={opt.correct}
                onChange={e => {
                  const updated = q.options.map(o => o.id === opt.id ? { ...o, correct: e.target.checked } : o)
                  setField('options', updated)
                }}
              />
            ) : (
              <input
                type="radio"
                name="qb-correct"
                className="qb-radio"
                checked={opt.correct}
                onChange={() => {
                  const updated = q.options.map(o => ({ ...o, correct: o.id === opt.id }))
                  setField('options', updated)
                }}
              />
            )}
            <input
              className="qb-input"
              value={opt.text}
              placeholder={`Alternativa ${idx + 1}`}
              onChange={e => {
                const updated = q.options.map(o => o.id === opt.id ? { ...o, text: e.target.value } : o)
                setField('options', updated)
              }}
            />
            <button
              className="qb-remove-btn"
              onClick={() => setField('options', q.options.filter(o => o.id !== opt.id))}
              disabled={q.options.length <= 2}
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    )
  }

  /* ── True/False Editor ──────────────────────── */

  const renderTrueFalseEditor = () => (
    <div className="qb-section">
      <div className="qb-section-header">
        <span className="qb-section-title">Afirmações</span>
        <button className="qb-add-btn" onClick={() => setField('statements', [...q.statements, newStatement()])} type="button">+ Adicionar</button>
      </div>
      {q.statements.map(st => (
        <div key={st.id} className="qb-option-row">
          <select
            className="qb-select qb-select-sm"
            value={st.correct ? 'true' : 'false'}
            onChange={e => {
              const updated = q.statements.map(s => s.id === st.id ? { ...s, correct: e.target.value === 'true' } : s)
              setField('statements', updated)
            }}
          >
            <option value="true">V</option>
            <option value="false">F</option>
          </select>
          <input
            className="qb-input"
            value={st.text}
            placeholder="Afirmação..."
            onChange={e => {
              const updated = q.statements.map(s => s.id === st.id ? { ...s, text: e.target.value } : s)
              setField('statements', updated)
            }}
          />
          <button
            className="qb-remove-btn"
            onClick={() => setField('statements', q.statements.filter(s => s.id !== st.id))}
            disabled={q.statements.length <= 1}
            type="button"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )

  /* ── Order Editor ───────────────────────────── */

  const renderOrderEditor = () => (
    <div className="qb-section">
      <div className="qb-section-header">
        <span className="qb-section-title">Itens na ordem correta</span>
        <button className="qb-add-btn" onClick={() => setField('orderItems', [...q.orderItems, newOrderItem('', q.orderItems.length + 1)])} type="button">+ Adicionar</button>
      </div>
      {q.orderItems.map((item, idx) => (
        <div key={item.id} className="qb-option-row">
          <span className="qb-order-num">{idx + 1}°</span>
          <input
            className="qb-input"
            value={item.text}
            placeholder={`Item ${idx + 1}`}
            onChange={e => {
              const updated = q.orderItems.map(oi => oi.id === item.id ? { ...oi, text: e.target.value, correctOrder: idx + 1 } : oi)
              setField('orderItems', updated)
            }}
          />
          <button
            className="qb-remove-btn"
            onClick={() => setField('orderItems', q.orderItems.filter(oi => oi.id !== item.id))}
            disabled={q.orderItems.length <= 2}
            type="button"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )

  /* ── Fill-in Editor ─────────────────────────── */

  const renderCompletarEditor = () => (
    <div className="qb-section">
      <div className="qb-section-header">
        <span className="qb-section-title">Lacunas (use _ para marcar o espaço)</span>
        <button className="qb-add-btn" onClick={() => setField('blanks', [...q.blanks, newBlank()])} type="button">+ Adicionar</button>
      </div>
      <div className="qb-hint">Escreva a frase usando _ no lugar das palavras que o aluno deve preencher</div>
      {q.blanks.map((blank, idx) => (
        <div key={blank.id} className="qb-option-row">
          <span className="qb-order-num">{idx + 1}°</span>
          <input
            className="qb-input"
            value={blank.answer}
            placeholder={`Resposta da lacuna ${idx + 1}`}
            onChange={e => {
              const updated = q.blanks.map(b => b.id === blank.id ? { ...b, answer: e.target.value } : b)
              setField('blanks', updated)
            }}
          />
          <button
            className="qb-remove-btn"
            onClick={() => setField('blanks', q.blanks.filter(b => b.id !== blank.id))}
            disabled={q.blanks.length <= 1}
            type="button"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )

  /* ── Open Text Editor ───────────────────────── */

  const renderOpenEditor = () => (
    <div className="qb-section">
      <div className="qb-section-header">
        <span className="qb-section-title">Resposta esperada (opcional)</span>
      </div>
      <div className="qb-hint">Escreva uma resposta modelo. O próprio usuário irá avaliar se acertou.</div>
      <textarea
        className="qb-textarea"
        value={q.openExpectedText || ''}
        placeholder="Resposta esperada ou pontos-chave..."
        rows={3}
        onChange={e => setField('openExpectedText', e.target.value)}
      />
    </div>
  )

  /* ── Type-specific editor ───────────────────── */

  const renderTypeEditor = () => {
    switch (q.type) {
      case 'multipla':
      case 'multipla_multipla':
        return renderOptionsEditor()
      case 'verdadeiro_falso':
        return renderTrueFalseEditor()
      case 'ordem':
        return renderOrderEditor()
      case 'completar':
        return renderCompletarEditor()
      case 'aberta':
        return renderOpenEditor()
    }
  }

  /* ── Wizard Step: Count ─────────────────────── */

  if (wizardStep === 'count') {
    return (
      <div className="qb-container">
        <div className="qb-header">
          <h3 className="qb-title">Nova questão</h3>
          <button className="qb-cancel-btn" onClick={onCancel} type="button">Cancelar</button>
        </div>
        <div className="qb-wizard">
          <div className="qb-wizard-step-indicator">
            <div className="qb-wizard-dot active" />
            <div className="qb-wizard-line" />
            <div className="qb-wizard-dot" />
            <div className="qb-wizard-line" />
            <div className="qb-wizard-dot" />
          </div>
          <h2 className="qb-wizard-title">Quantas questões quer criar?</h2>
          <p className="qb-wizard-desc">Escolha a quantidade de questões para este lote.</p>
          <div className="qb-wizard-count-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button
                key={n}
                className={`qb-wizard-count-btn ${totalCount === n ? 'active' : ''}`}
                onClick={() => setTotalCount(n)}
                type="button"
              >
                <span className="qb-wizard-count-num">{n}</span>
              </button>
            ))}
          </div>
          <div className="qb-wizard-actions">
            <button className="qb-cancel-btn" onClick={onCancel} type="button">Cancelar</button>
            <button
              className="qb-save-btn"
              onClick={() => {
                setBatchQuestions(Array.from({ length: totalCount }, () => emptyQuestion('multipla', batchSubject)))
                setWizardStep('subject')
              }}
              type="button"
            >
              Próximo
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Wizard Step: Subject ───────────────────── */

  if (wizardStep === 'subject') {
    return (
      <div className="qb-container">
        <div className="qb-header">
          <h3 className="qb-title">Nova questão</h3>
          <button className="qb-cancel-btn" onClick={onCancel} type="button">Cancelar</button>
        </div>
        <div className="qb-wizard">
          <div className="qb-wizard-step-indicator">
            <div className="qb-wizard-dot completed" />
            <div className="qb-wizard-line completed" />
            <div className="qb-wizard-dot active" />
            <div className="qb-wizard-line" />
            <div className="qb-wizard-dot" />
          </div>
          <h2 className="qb-wizard-title">Qual a matéria?</h2>
          <p className="qb-wizard-desc">Todas as {totalCount} questões serão dessa matéria.</p>
          <div className="qb-wizard-subject-grid">
            {SUBJECTS.map(s => {
              const colors = SUBJECT_COLORS[s]
              const selected = batchSubject === s
              return (
                <button
                  key={s}
                  className={`qb-wizard-subject-btn ${selected ? 'active' : ''}`}
                  style={{
                    '--subject-color': colors.text,
                    '--subject-bg': colors.bg,
                  } as React.CSSProperties}
                  onClick={() => setBatchSubject(s)}
                  type="button"
                >
                  <div className="qb-wizard-subject-icon">
                    {SUBJECT_ICONS[s]}
                  </div>
                  <span className="qb-wizard-subject-name">{s}</span>
                </button>
              )
            })}
          </div>
          <div className="qb-wizard-actions">
            <button className="qb-cancel-btn" onClick={() => setWizardStep('count')} type="button">Voltar</button>
            <button
              className="qb-save-btn"
              onClick={() => {
                const qs = Array.from({ length: totalCount }, () => emptyQuestion('multipla', batchSubject))
                setBatchQuestions(qs)
                setQ(qs[0])
                setCurrentIndex(0)
                setWizardStep('questions')
              }}
              type="button"
            >
              Criar questões
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Wizard Step: Questions (one by one) ────── */

  if (wizardStep === 'questions') {
    const progress = ((currentIndex + 1) / totalCount) * 100
    const isLast = currentIndex >= totalCount - 1

    return (
      <div className="qb-container">
        <div className="qb-header">
          <div className="qb-header-left">
            <h3 className="qb-title">Questão {currentIndex + 1} de {totalCount}</h3>
            <span className="qb-wizard-subject-badge" style={{ background: SUBJECT_COLORS[batchSubject]?.bg, color: SUBJECT_COLORS[batchSubject]?.text }}>
              {batchSubject}
            </span>
          </div>
          <div className="qb-header-actions">
            {currentIndex > 0 && (
              <button className="qb-cancel-btn" onClick={() => {
                const updated = [...batchQuestions]
                updated[currentIndex] = q
                setBatchQuestions(updated)
                setCurrentIndex(prev => prev - 1)
                setQ(batchQuestions[currentIndex - 1])
                setError('')
              }} type="button">
                Anterior
              </button>
            )}
            <button className="qb-cancel-btn" onClick={onCancel} type="button">Cancelar</button>
          </div>
        </div>

        <div className="qb-wizard-progress">
          <div className="qb-wizard-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {error && <div className="qb-error">{error}</div>}

        <div className="qb-body">
          <div className="qb-field">
            <label className="qb-label">Título da questão *</label>
            <input
              className="qb-input"
              value={q.title}
              placeholder="Ex: Qual é o resultado de 2 + 2?"
              onChange={e => setField('title', e.target.value)}
            />
          </div>

          <div className="qb-field">
            <label className="qb-label">Tipo de questão *</label>
            <div className="qb-wizard-type-grid">
              {QUESTION_TYPES.map(t => {
                const colors = TYPE_COLORS[t]
                const isSelected = q.type === t
                return (
                  <button
                    key={t}
                    className={`qb-wizard-type-btn ${isSelected ? 'active' : ''}`}
                    style={{
                      '--type-default': colors.default,
                      '--type-hover': colors.hover,
                      '--type-active': colors.active,
                      '--type-color': TYPE_TEXT_COLORS[t],
                    } as React.CSSProperties}
                    onClick={() => setField('type', t)}
                    type="button"
                  >
                    <div className="qb-wizard-type-icon">
                      {TYPE_ICONS[t]}
                    </div>
                    <span className="qb-wizard-type-name">{QUESTION_TYPE_LABELS[t]}</span>
                    <span className="qb-wizard-type-desc">{TYPE_DESCRIPTIONS[t]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="qb-field">
            <label className="qb-label">Conteúdo / Contexto (opcional)</label>
            <textarea
              className="qb-textarea"
              value={q.content || ''}
              placeholder="Texto, imagem contextual ou enunciado mais detalhado..."
              rows={3}
              onChange={e => setField('content', e.target.value)}
            />
          </div>

          <div className="qb-field">
            <label className="qb-label">URL da imagem (opcional)</label>
            <input
              className="qb-input"
              value={q.imageUrl || ''}
              placeholder="https://..."
              onChange={e => setField('imageUrl', e.target.value)}
            />
          </div>

          {renderTypeEditor()}

          <div className="qb-field">
            <label className="qb-label">Explicação (opcional)</label>
            <textarea
              className="qb-textarea"
              value={q.explanation || ''}
              placeholder="Explicação exibida após o aluno responder..."
              rows={2}
              onChange={e => setField('explanation', e.target.value)}
            />
          </div>
        </div>

        <div className="qb-wizard-footer">
          <button className="qb-save-btn" onClick={handleSaveWizard} type="button">
            {isLast ? (
              <>
                Salvar todas
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </>
            ) : (
              <>
                Próxima
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  /* ── Single Edit Mode (when editing existing) ── */

  return (
    <div className="qb-container">
      <div className="qb-header">
        <h3 className="qb-title">Editar questão</h3>
        <div className="qb-header-actions">
          <button className="qb-cancel-btn" onClick={onCancel} type="button">Cancelar</button>
          <button className="qb-save-btn" onClick={handleSave} type="button">Salvar questão</button>
        </div>
      </div>

      {error && <div className="qb-error">{error}</div>}

      <div className="qb-body">
        <div className="qb-field-row">
          <div className="qb-field" style={{ flex: 2 }}>
            <label className="qb-label">Título da questão *</label>
            <input
              className="qb-input"
              value={q.title}
              placeholder="Ex: Cinética newtoniana..."
              onChange={e => setField('title', e.target.value)}
            />
          </div>
          <div className="qb-field" style={{ flex: 1 }}>
            <label className="qb-label">Matéria *</label>
            <select
              className="qb-select"
              value={q.subject}
              onChange={e => setField('subject', e.target.value as Subject)}
            >
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="qb-field">
          <label className="qb-label">Tipo de questão *</label>
          <div className="qb-wizard-type-grid">
            {QUESTION_TYPES.map(t => {
              const colors = TYPE_COLORS[t]
              const isSelected = q.type === t
              return (
                <button
                  key={t}
                  className={`qb-wizard-type-btn ${isSelected ? 'active' : ''}`}
                  style={{
                    '--type-default': colors.default,
                    '--type-hover': colors.hover,
                    '--type-active': colors.active,
                    '--type-color': TYPE_TEXT_COLORS[t],
                  } as React.CSSProperties}
                  onClick={() => setField('type', t)}
                  type="button"
                >
                  <div className="qb-wizard-type-icon">
                    {TYPE_ICONS[t]}
                  </div>
                  <span className="qb-wizard-type-name">{QUESTION_TYPE_LABELS[t]}</span>
                  <span className="qb-wizard-type-desc">{TYPE_DESCRIPTIONS[t]}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="qb-field">
          <label className="qb-label">Conteúdo / Contexto (opcional)</label>
          <textarea
            className="qb-textarea"
            value={q.content || ''}
            placeholder="Texto, imagem contextual ou enunciado mais detalhado..."
            rows={3}
            onChange={e => setField('content', e.target.value)}
          />
        </div>

        <div className="qb-field">
          <label className="qb-label">URL da imagem (opcional)</label>
          <input
            className="qb-input"
            value={q.imageUrl || ''}
            placeholder="https://..."
            onChange={e => setField('imageUrl', e.target.value)}
          />
        </div>

        {renderTypeEditor()}

        <div className="qb-field">
          <label className="qb-label">Explicação (opcional)</label>
          <textarea
            className="qb-textarea"
            value={q.explanation || ''}
            placeholder="Explicação exibida após o aluno responder..."
            rows={2}
            onChange={e => setField('explanation', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
