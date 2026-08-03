import { useCallback, useRef, useState } from 'react'
import type { Subject } from '../types/doc'
import { SUBJECTS } from '../types/doc'

export interface ImportedFlashcard {
  front: string
  back: string
  subject: Subject
}

interface ParsedItem {
  front?: string
  back?: string
  subject?: string
}

interface Validation {
  valid: ImportedFlashcard[]
  errors: { index: number; message: string }[]
}

interface Props {
  title: string
  defaultSubject: Subject
  onAdd: (cards: ImportedFlashcard[]) => Promise<void> | void
  onClose: () => void
}

const PLACEHOLDER_JSON = `[
  {
    "front": "Qual a unidade de força no SI?",
    "back": "Newton (N)",
    "subject": "Física"
  },
  {
    "front": "Segunda lei de Newton",
    "back": "$F = m \\\\cdot a$",
    "subject": "Física"
  },
  {
    "front": "O que é fotossíntese?",
    "back": "Processo que produz glicose e oxigênio"
  }
]`

function validateAndTransform(raw: ParsedItem[], defaultSubject: Subject): Validation {
  const valid: ImportedFlashcard[] = []
  const errors: { index: number; message: string }[] = []

  raw.forEach((item, idx) => {
    const problems: string[] = []

    if (!item.front || typeof item.front !== 'string' || !item.front.trim()) {
      problems.push('campo "front" obrigatório')
    }
    if (!item.back || typeof item.back !== 'string' || !item.back.trim()) {
      problems.push('campo "back" obrigatório')
    }
    let subject = defaultSubject
    if (item.subject !== undefined) {
      if (typeof item.subject !== 'string' || !SUBJECTS.includes(item.subject as Subject)) {
        problems.push(`matéria inválida (use: ${SUBJECTS.join(', ')})`)
      } else {
        subject = item.subject as Subject
      }
    }

    if (problems.length > 0) {
      errors.push({ index: idx, message: problems.join('; ') })
      return
    }

    valid.push({ front: item.front!.trim(), back: item.back!.trim(), subject })
  })

  return { valid, errors }
}

type ImportStep = 'input' | 'preview' | 'importing' | 'done'

export default function FlashcardImporter({ title, defaultSubject, onAdd, onClose }: Props) {
  const [jsonText, setJsonText] = useState('')
  const [step, setStep] = useState<ImportStep>('input')
  const [validation, setValidation] = useState<Validation | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleParse = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText)
      if (!Array.isArray(parsed)) {
        setValidation({ valid: [], errors: [{ index: -1, message: 'O JSON deve ser um array ([...])' }] })
        setStep('preview')
        return
      }
      setValidation(validateAndTransform(parsed as ParsedItem[], defaultSubject))
      setStep('preview')
    } catch {
      setValidation({ valid: [], errors: [{ index: -1, message: 'JSON inválido — verifique a sintaxe' }] })
      setStep('preview')
    }
  }, [jsonText, defaultSubject])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result
      if (typeof text === 'string') setJsonText(text)
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const handleAdd = useCallback(async () => {
    if (!validation || validation.valid.length === 0) return
    setStep('importing')
    setProgress({ current: 0, total: validation.valid.length })

    for (let i = 0; i < validation.valid.length; i++) {
      await onAdd([validation.valid[i]])
      setProgress({ current: i + 1, total: validation.valid.length })
    }

    setStep('done')
  }, [validation, onAdd])

  const reset = useCallback(() => {
    setJsonText('')
    setValidation(null)
    setStep('input')
  }, [])

  if (step === 'done') {
    return (
      <div className="fc-modal-overlay">
        <div className="fc-modal fi-modal">
          <div className="fi-done-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h3 className="fc-modal-title">{validation?.valid.length} {validation?.valid.length === 1 ? 'card adicionado' : 'cards adicionados'}!</h3>
          <p className="fi-done-desc">Os cards foram salvos.</p>
          <div className="fc-form-actions fi-center">
            <button className="fc-cancel-btn" onClick={reset} type="button">Adicionar mais</button>
            <button className="fc-save-btn" onClick={onClose} type="button">Fechar</button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'importing') {
    return (
      <div className="fc-modal-overlay">
        <div className="fc-modal fi-modal">
          <h3 className="fc-modal-title">{title}</h3>
          <div className="fi-importing">
            <div className="fi-spinner" />
            <p className="fi-importing-text">Salvando... {progress.current}/{progress.total}</p>
            <div className="fi-progress-bar">
              <div className="fi-progress-fill" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'preview' && validation) {
    return (
      <div className="fc-modal-overlay">
        <div className="fc-modal fi-modal">
          <div className="fc-modal-title-row">
            <h3 className="fc-modal-title">{title}</h3>
            <button className="fc-cancel-btn" onClick={() => { setStep('input'); setValidation(null) }} type="button">Editar JSON</button>
          </div>
          <div className="fi-badges">
            <span className="fi-badge valid">{validation.valid.length} válida{validation.valid.length !== 1 ? 's' : ''}</span>
            {validation.errors.length > 0 && <span className="fi-badge error">{validation.errors.length} erro{validation.errors.length !== 1 ? 's' : ''}</span>}
          </div>

          {validation.errors.length > 0 && (
            <div className="fi-errors">
              {validation.errors.map((err, i) => (
                <div key={i} className="fi-error-row">
                  <span className="fi-error-idx">{err.index >= 0 ? `#${err.index + 1}` : '!'}</span>
                  <span className="fi-error-msg">{err.message}</span>
                </div>
              ))}
            </div>
          )}

          {validation.valid.length > 0 && (
            <>
              <div className="fi-preview-list">
                {validation.valid.map((c, i) => (
                  <div key={i} className="fi-preview-card">
                    <span className="fi-preview-num">{i + 1}</span>
                    <div className="fi-preview-info">
                      <span className="fi-preview-front">{c.front}</span>
                      <span className="fi-preview-back">{c.back}</span>
                    </div>
                    <span className="fc-subject-badge" style={{ background: 'rgba(140,120,200,0.15)', color: '#8c78c8' }}>{c.subject}</span>
                  </div>
                ))}
              </div>
              <div className="fc-form-actions fi-center">
                <button className="fc-cancel-btn" onClick={() => { setStep('input'); setValidation(null) }} type="button">Voltar</button>
                <button className="fc-save-btn" onClick={handleAdd} type="button">
                  Adicionar {validation.valid.length} card{validation.valid.length !== 1 ? 's' : ''}
                </button>
              </div>
            </>
          )}

          {validation.valid.length === 0 && validation.errors.length > 0 && (
            <div className="fc-form-actions fi-center">
              <button className="fc-cancel-btn" onClick={() => { setStep('input'); setValidation(null) }} type="button">Voltar</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fc-modal-overlay">
      <div className="fc-modal fi-modal">
        <div className="fc-modal-title-row">
          <h3 className="fc-modal-title">{title}</h3>
          <button className="fc-cancel-btn" onClick={onClose} type="button">Cancelar</button>
        </div>

        <div className="fi-hint">
          <p>Cole um array JSON com seus flash cards. Cada objeto deve ter <code>front</code> e <code>back</code>; o campo <code>subject</code> é opcional (usa a matéria do grupo/filtro por padrão).</p>
        </div>

        <div className="fi-textarea-wrap">
          <textarea
            className="fi-textarea"
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            placeholder={PLACEHOLDER_JSON}
            spellCheck={false}
          />
        </div>

        <div className="fi-file-row">
          <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="fi-file-btn" onClick={() => fileInputRef.current?.click()} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            Carregar arquivo .json
          </button>
          {jsonText.trim() && <span className="fi-file-info">{jsonText.trim().split('\n').length} linhas</span>}
        </div>

        <div className="fc-form-actions fi-center">
          <button className="fc-cancel-btn" onClick={onClose} type="button">Cancelar</button>
          <button className="fc-save-btn" onClick={handleParse} disabled={!jsonText.trim()} type="button">
            Validar JSON
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
