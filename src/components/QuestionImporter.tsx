import { useState, useCallback, useRef } from 'react'
import type { ChallengeQuestion, QuestionType, ChallengeDifficulty } from '../types/challenge'
import { QUESTION_TYPE_LABELS } from '../types/challenge'
import type { Subject } from '../types/doc'
import { SUBJECTS } from '../types/doc'
import { getAllSubjects } from '../lib/subjects'

const VALID_TYPES: QuestionType[] = ['multipla', 'multipla_multipla', 'verdadeiro_falso', 'aberta', 'ordem', 'completar']
const VALID_DIFFICULTIES: ChallengeDifficulty[] = ['facil', 'medio', 'dificil']

const PLACEHOLDER_JSON = `[
  {
    "type": "multipla",
    "title": "Qual é a unidade de força no SI?",
    "subject": "Física",
    "difficulty": "facil",
    "explanation": "A força é medida em Newtons.",
    "options": [
      { "text": "Joule", "correct": false },
      { "text": "Newton", "correct": true },
      { "text": "Pascal", "correct": false },
      { "text": "Watt", "correct": false }
    ]
  },
  {
    "type": "verdadeiro_falso",
    "title": "Verdadeiro ou Falso sobre fotossíntese",
    "subject": "Biologia",
    "difficulty": "medio",
    "statements": [
      { "text": "A fotossíntese produz glicose e oxigênio", "correct": true },
      { "text": "A fotossíntese ocorre nas mitocôndrias", "correct": false }
    ]
  },
  {
    "type": "aberta",
    "title": "Explique a Lei de Newton",
    "subject": "Física",
    "difficulty": "dificil",
    "openExpectedText": "Resposta modelo opcional..."
  },
  {
    "type": "completar",
    "title": "A água é formada por __ de hidrogênio e __ de oxigênio",
    "subject": "Química",
    "difficulty": "facil",
    "blanks": [
      { "answer": "2 átomos" },
      { "answer": "1 átomo" }
    ]
  },
  {
    "type": "ordem",
    "title": "Coloque em ordem os planetas",
    "subject": "Geografia",
    "difficulty": "medio",
    "orderItems": [
      { "text": "Mercúrio", "correctOrder": 1 },
      { "text": "Vênus", "correctOrder": 2 },
      { "text": "Terra", "correctOrder": 3 }
    ]
  }
]`

interface ParsedQuestion {
  type?: string
  title?: string
  subject?: string
  difficulty?: string
  content?: string
  imageUrl?: string
  explanation?: string
  options?: Array<{ text?: string; correct?: boolean } | unknown>
  statements?: Array<{ text?: string; correct?: boolean } | unknown>
  orderItems?: Array<{ text?: string; correctOrder?: number } | unknown>
  blanks?: Array<{ answer?: string } | unknown>
  openExpectedText?: string
  source?: string
}

interface ValidationResult {
  valid: ChallengeQuestion[]
  errors: { index: number; message: string }[]
}

interface Props {
  onSave: (question: ChallengeQuestion) => void
  onCancel: () => void
}

function validateAndTransform(raw: ParsedQuestion[]): ValidationResult {
  const valid: ChallengeQuestion[] = []
  const errors: { index: number; message: string }[] = []

  raw.forEach((item, idx) => {
    const problems: string[] = []

    if (!item.title || typeof item.title !== 'string' || !item.title.trim()) {
      problems.push('título obrigatório')
    }
    if (!item.type || !VALID_TYPES.includes(item.type as QuestionType)) {
      problems.push(`tipo inválido (use: ${VALID_TYPES.join(', ')})`)
    }
    if (!item.subject || !getAllSubjects().includes(item.subject)) {
      problems.push(`matéria inválida (use: ${SUBJECTS.join(', ')})`)
    }
    if (!item.difficulty || !VALID_DIFFICULTIES.includes(item.difficulty as ChallengeDifficulty)) {
      problems.push(`dificuldade inválida (use: facil, medio, dificil)`)
    }

    const type = item.type as QuestionType

    if (type === 'multipla' || type === 'multipla_multipla') {
      const opts = (item.options || []) as Array<{ text?: string; correct?: boolean }>
      if (opts.length < 2) problems.push('mínimo 2 alternativas')
      if (!opts.some(o => o.correct === true)) problems.push('marque ao menos uma alternativa correta')
    }
    if (type === 'verdadeiro_falso') {
      const stmts = (item.statements || []) as Array<{ text?: string; correct?: boolean }>
      if (stmts.length < 1) problems.push('adicione ao menos uma afirmação')
    }
    if (type === 'ordem') {
      const oItems = (item.orderItems || []) as Array<{ text?: string; correctOrder?: number }>
      if (oItems.length < 2) problems.push('mínimo 2 itens de ordem')
    }
    if (type === 'completar') {
      const bl = (item.blanks || []) as Array<{ answer?: string }>
      if (bl.length < 1) problems.push('adicione ao menos uma lacuna')
    }

    if (problems.length > 0) {
      errors.push({ index: idx, message: problems.join('; ') })
      return
    }

    valid.push({
      id: crypto.randomUUID(),
      type,
      title: item.title!.trim(),
      subject: item.subject as Subject,
      difficulty: item.difficulty as ChallengeDifficulty,
      content: item.content || undefined,
      imageUrl: item.imageUrl || undefined,
      explanation: item.explanation || undefined,
      options: ((item.options || []) as Array<{ text?: string; correct?: boolean }>).map(o => ({
        id: crypto.randomUUID(),
        text: o.text || '',
        correct: !!o.correct,
      })),
      statements: ((item.statements || []) as Array<{ text?: string; correct?: boolean }>).map(s => ({
        id: crypto.randomUUID(),
        text: s.text || '',
        correct: !!s.correct,
      })),
      orderItems: ((item.orderItems || []) as Array<{ text?: string; correctOrder?: number }>).map(o => ({
        id: crypto.randomUUID(),
        text: o.text || '',
        correctOrder: o.correctOrder ?? 0,
      })),
      blanks: ((item.blanks || []) as Array<{ answer?: string }>).map(b => ({
        id: crypto.randomUUID(),
        answer: b.answer || '',
      })),
      openExpectedText: item.openExpectedText || undefined,
      source: item.source || undefined,
    })
  })

  return { valid, errors }
}

type ImportStep = 'input' | 'preview' | 'importing' | 'done'

export default function QuestionImporter({ onSave, onCancel }: Props) {
  const [jsonText, setJsonText] = useState('')
  const [step, setStep] = useState<ImportStep>('input')
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleParse = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText)
      if (!Array.isArray(parsed)) {
        setValidation({ valid: [], errors: [{ index: -1, message: 'O JSON deve ser um array ([...])' }] })
        return
      }
      const result = validateAndTransform(parsed)
      setValidation(result)
      setStep('preview')
    } catch {
      setValidation({ valid: [], errors: [{ index: -1, message: 'JSON inválido — verifique a sintaxe' }] })
      setStep('preview')
    }
  }, [jsonText])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text === 'string') setJsonText(text)
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const handleImport = useCallback(async () => {
    if (!validation || validation.valid.length === 0) return
    setStep('importing')
    const total = validation.valid.length
    setImportProgress({ current: 0, total })

    for (let i = 0; i < validation.valid.length; i++) {
      onSave(validation.valid[i])
      setImportProgress({ current: i + 1, total })
      await new Promise(r => setTimeout(r, 50))
    }

    setStep('done')
  }, [validation, onSave])

  const handleBackToEdit = useCallback(() => {
    setStep('input')
    setValidation(null)
  }, [])

  if (step === 'done') {
    return (
      <div className="qi-container">
        <div className="qi-header">
          <h3 className="qi-title">Importar questões (JSON)</h3>
        </div>
        <div className="qi-done">
          <div className="qi-done-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h4 className="qi-done-title">{validation?.valid.length} questões importadas!</h4>
          <p className="qi-done-desc">As questões foram salvas e já estão disponíveis para uso em desafios.</p>
          <div className="qi-done-actions">
            <button className="qi-cancel-btn" onClick={onCancel} type="button">Voltar</button>
            <button className="qi-save-btn" onClick={() => { setJsonText(''); setStep('input'); setValidation(null) }} type="button">Importar mais</button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'importing') {
    return (
      <div className="qi-container">
        <div className="qi-header">
          <h3 className="qi-title">Importar questões (JSON)</h3>
        </div>
        <div className="qi-importing">
          <div className="quiz-spinner" />
          <p className="qi-importing-text">Importando... {importProgress.current}/{importProgress.total}</p>
          <div className="qi-progress-bar">
            <div className="qi-progress-fill" style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }} />
          </div>
        </div>
      </div>
    )
  }

  if (step === 'preview' && validation) {
    return (
      <div className="qi-container">
        <div className="qi-header">
          <div className="qi-header-left">
            <h3 className="qi-title">Importar questões (JSON)</h3>
            <span className="qi-badge valid">{validation.valid.length} válida{validation.valid.length !== 1 ? 's' : ''}</span>
            {validation.errors.length > 0 && <span className="qi-badge error">{validation.errors.length} erro{validation.errors.length !== 1 ? 's' : ''}</span>}
          </div>
          <button className="qi-cancel-btn" onClick={handleBackToEdit} type="button">Editar JSON</button>
        </div>

        {validation.errors.length > 0 && (
          <div className="qi-errors">
            {validation.errors.map((err, i) => (
              <div key={i} className="qi-error-row">
                <span className="qi-error-idx">{err.index >= 0 ? `#${err.index + 1}` : '!'}</span>
                <span className="qi-error-msg">{err.message}</span>
              </div>
            ))}
          </div>
        )}

        {validation.valid.length > 0 && (
          <>
            <div className="qi-preview-list">
              {validation.valid.map((q, i) => (
                <div key={q.id} className="qi-preview-card">
                  <div className="qi-preview-num">{i + 1}</div>
                  <div className="qi-preview-info">
                    <span className="qi-preview-title">{q.title}</span>
                    <div className="qi-preview-meta">
                      <span className="qi-preview-tag">{q.subject}</span>
                      <span className="qi-preview-tag">{QUESTION_TYPE_LABELS[q.type]}</span>
                      <span className={`qi-preview-tag diff-${q.difficulty}`}>{q.difficulty === 'facil' ? 'Fácil' : q.difficulty === 'medio' ? 'Médio' : 'Difícil'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="qi-footer">
              <button className="qi-cancel-btn" onClick={handleBackToEdit} type="button">Voltar</button>
              <button className="qi-save-btn" onClick={handleImport} type="button">
                Importar {validation.valid.length} questão{validation.valid.length !== 1 ? 'ões' : ''}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12" /></svg>
              </button>
            </div>
          </>
        )}

        {validation.valid.length === 0 && validation.errors.length > 0 && (
          <div className="qi-footer">
            <button className="qi-cancel-btn" onClick={handleBackToEdit} type="button">Voltar</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="qi-container">
      <div className="qi-header">
        <h3 className="qi-title">Importar questões (JSON)</h3>
        <button className="qi-cancel-btn" onClick={onCancel} type="button">Cancelar</button>
      </div>

      <div className="qi-body">
        <div className="qi-hint">
          <p>Cole um array JSON com suas questões. Cada objeto deve conter os campos <code>type</code>, <code>title</code>, <code>subject</code> e <code>difficulty</code>, além dos campos específicos do tipo.</p>
          <div className="qi-hint-fields">
            <div className="qi-hint-field"><code>type</code> <span>multipla | multipla_multipla | verdadeiro_falso | aberta | ordem | completar</span></div>
            <div className="qi-hint-field"><code>subject</code> <span>{SUBJECTS.join(' | ')}</span></div>
            <div className="qi-hint-field"><code>difficulty</code> <span>facil | medio | dificil</span></div>
          </div>
        </div>

        <div className="qi-textarea-wrap">
          <textarea
            className="qi-textarea"
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            placeholder={PLACEHOLDER_JSON}
            spellCheck={false}
          />
        </div>

        <div className="qi-file-row">
          <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="qi-file-btn" onClick={() => fileInputRef.current?.click()} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            Carregar arquivo .json
          </button>
          {jsonText.trim() && <span className="qi-file-info">{jsonText.trim().split('\n').length} linhas</span>}
        </div>

        <div className="qi-footer">
          <button className="qi-cancel-btn" onClick={onCancel} type="button">Cancelar</button>
          <button className="qi-save-btn" onClick={handleParse} disabled={!jsonText.trim()} type="button">
            Validar JSON
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
