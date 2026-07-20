import { useState, useCallback } from 'react'
import type { Challenge, ChallengeQuestion, ChallengeDifficulty } from '../types/challenge'
import { QUESTION_TYPE_LABELS } from '../types/challenge'
import type { Subject } from '../types/doc'
import { SUBJECTS } from '../types/doc'

let _cbid = 0
const cbuid = (prefix = 'ch') => `${prefix}_${Date.now()}_${++_cbid}`

interface Props {
  allQuestions: ChallengeQuestion[]
  initial?: Challenge
  onSave: (challenge: Challenge, newQuestions: ChallengeQuestion[]) => void
  onCancel: () => void
}

const DIFFICULTY_OPTIONS: { value: ChallengeDifficulty; label: string }[] = [
  { value: 'facil', label: 'Fácil' },
  { value: 'medio', label: 'Médio' },
  { value: 'dificil', label: 'Difícil' },
]

export default function ChallengeBuilder({ allQuestions, initial, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [subject, setSubject] = useState<Subject>(initial?.subject || 'Matemática')
  const [crossSubjects, setCrossSubjects] = useState<Subject[]>(initial?.crossSubjects || [])
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>(initial?.difficulty || 'medio')
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.questionIds || [])
  const [error, setError] = useState('')
  const [filterSubject, setFilterSubject] = useState<Subject | 'Todas'>('Todas')

  const toggleCrossSubject = useCallback((s: Subject) => {
    setCrossSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }, [])

  const toggleQuestion = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }, [])

  const filtered = filterSubject === 'Todas'
    ? allQuestions
    : allQuestions.filter(q => q.subject === filterSubject)

  const handleSave = useCallback(() => {
    if (!title.trim()) { setError('Título obrigatório'); return }
    if (selectedIds.length === 0) { setError('Selecione ao menos uma questão'); return }
    setError('')

    const baseXp = difficulty === 'facil' ? 100 : difficulty === 'medio' ? 150 : 200

    const challenge: Challenge = {
      id: initial?.id || cbuid('ch'),
      title: title.trim(),
      description: description.trim() || undefined,
      subject,
      crossSubjects: crossSubjects.length > 0 ? crossSubjects : undefined,
      difficulty,
      questionIds: selectedIds,
      xpBase: baseXp,
      isDaily: initial?.isDaily ?? false,
      dailyDate: initial?.dailyDate,
      createdAt: initial?.createdAt || Date.now(),
    }

    onSave(challenge, [])
  }, [title, description, subject, crossSubjects, difficulty, selectedIds, initial, onSave])

  return (
    <div className="cb-container">
      <div className="cb-header">
        <h3 className="cb-title">{initial ? 'Editar desafio' : 'Novo desafio'}</h3>
        <div className="cb-header-actions">
          <button className="cb-cancel-btn" onClick={onCancel} type="button">Cancelar</button>
          <button className="cb-save-btn" onClick={handleSave} type="button">Salvar desafio</button>
        </div>
      </div>

      {error && <div className="qb-error">{error}</div>}

      <div className="cb-body">
        <div className="cb-fields">
          <div className="qb-field-row">
            <div className="qb-field" style={{ flex: 2 }}>
              <label className="qb-label">Título do desafio *</label>
              <input
                className="qb-input"
                value={title}
                placeholder="Ex: Desafio de Mecânica..."
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div className="qb-field" style={{ flex: 1 }}>
              <label className="qb-label">Dificuldade *</label>
              <div className="cb-difficulty-row">
                {DIFFICULTY_OPTIONS.map(d => (
                  <button
                    key={d.value}
                    className={`cb-diff-btn diff-${d.value} ${difficulty === d.value ? 'active' : ''}`}
                    onClick={() => setDifficulty(d.value)}
                    type="button"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="qb-field-row">
            <div className="qb-field" style={{ flex: 1 }}>
              <label className="qb-label">Matéria principal</label>
              <select
                className="qb-select"
                value={subject}
                onChange={e => setSubject(e.target.value as Subject)}
              >
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="qb-field" style={{ flex: 2 }}>
              <label className="qb-label">Matérias cruzadas</label>
              <div className="cb-cross-chips">
                {SUBJECTS.filter(s => s !== subject).map(s => (
                  <button
                    key={s}
                    className={`cb-cross-chip ${crossSubjects.includes(s) ? 'active' : ''}`}
                    onClick={() => toggleCrossSubject(s)}
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="qb-field">
            <label className="qb-label">Descrição (opcional)</label>
            <input
              className="qb-input"
              value={description}
              placeholder="Breve descrição do desafio..."
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="cb-question-picker">
          <div className="cb-picker-header">
            <span className="cb-picker-title">Questões ({selectedIds.length} selecionadas)</span>
            <div className="cb-picker-filter">
              <select
                className="qb-select qb-select-sm"
                value={filterSubject}
                onChange={e => setFilterSubject(e.target.value as Subject | 'Todas')}
              >
                <option value="Todas">Todas as matérias</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="cb-empty">Nenhuma questão disponível. Crie questões primeiro.</div>
          )}

          <div className="cb-question-list">
            {filtered.map(q => {
              const isSelected = selectedIds.includes(q.id)
              return (
                <div
                  key={q.id}
                  className={`cb-question-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleQuestion(q.id)}
                >
                  <div className="cb-q-check">
                    <div className={`cb-checkbox ${isSelected ? 'checked' : ''}`}>
                      {isSelected && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="cb-q-info">
                    <span className="cb-q-title">{q.title}</span>
                    <span className="cb-q-meta">{q.subject} · {QUESTION_TYPE_LABELS[q.type]}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
