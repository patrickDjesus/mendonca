import { useState, useCallback } from 'react'
import type { ChallengeQuestion, QuestionType, ChallengeOption, TrueFalseStatement, MatchPair, OrderItem, CompletarBlank, CrosswordClue } from '../types/challenge'
import { QUESTION_TYPE_LABELS } from '../types/challenge'
import type { Subject } from '../types/doc'
import { SUBJECTS } from '../types/doc'

const QUESTION_TYPES: QuestionType[] = [
  'multipla',
  'multipla_multipla',
  'verdadeiro_falso',
  'aberta',
  'arrastar',
  'ordem',
  'completar',
  'palavras_cruzadas',
]

const TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  multipla: 'Uma alternativa correta entre várias opções',
  multipla_multipla: 'Várias alternativas podem estar corretas',
  verdadeiro_falso: 'Cada afirmação deve ser marcada como verdadeira ou falsa',
  aberta: 'Resposta aberta — o próprio usuário avalia se acertou',
  arrastar: 'Corresponder itens do lado esquerdo com os do lado direito',
  ordem: 'Arrastar itens para colocá-los na ordem correta',
  completar: 'Preencher lacunas em uma frase',
  palavras_cruzadas: 'Palavras cruzadas com dicas',
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

function newPair(left = '', right = ''): MatchPair {
  return { id: crypto.randomUUID(), left, right }
}

function newOrderItem(text = '', correctOrder = 0): OrderItem {
  return { id: crypto.randomUUID(), text, correctOrder }
}

function newBlank(answer = ''): CompletarBlank {
  return { id: crypto.randomUUID(), answer }
}

function newClue(word = '', clue = '', direction: 'across' | 'down' = 'across', row = 0, col = 0): CrosswordClue {
  return { id: crypto.randomUUID(), word, clue, direction, row, col }
}

function emptyQuestion(): ChallengeQuestion {
  return {
    id: crypto.randomUUID(),
    type: 'multipla',
    title: '',
    subject: 'Matemática',
    content: '',
    explanation: '',
    options: [newOption('', true), newOption()],
    statements: [newStatement('', true), newStatement('', false)],
    matchPairs: [newPair(), newPair()],
    orderItems: [newOrderItem('', 1), newOrderItem('', 2), newOrderItem('', 3)],
    blanks: [newBlank(), newBlank()],
    crosswordClues: [newClue()],
    crosswordSize: 5,
  }
}

export default function QuestionBuilder({ initial, onSave, onCancel }: Props) {
  const [q, setQ] = useState<ChallengeQuestion>(initial || emptyQuestion)
  const [error, setError] = useState('')

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
    if (q.type === 'arrastar') {
      const valid = q.matchPairs.filter(p => p.left.trim() && p.right.trim())
      if (valid.length < 2) { setError('Mínimo 2 pares válidos'); return false }
    }
    if (q.type === 'ordem') {
      if (q.orderItems.length < 2) { setError('Mínimo 2 itens de ordem'); return false }
    }
    if (q.type === 'completar') {
      if (q.blanks.length < 1) { setError('Adicione ao menos uma lacuna'); return false }
    }
    if (q.type === 'palavras_cruzadas') {
      if (q.crosswordClues.length < 2) { setError('Mínimo 2 palavras'); return false }
    }
    setError('')
    return true
  }, [q])

  const handleSave = useCallback(() => {
    if (!validate()) return
    onSave(q)
  }, [q, validate, onSave])

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

  /* ── Match Pairs Editor ─────────────────────── */

  const renderMatchEditor = () => (
    <div className="qb-section">
      <div className="qb-section-header">
        <span className="qb-section-title">Pares de correspondência</span>
        <button className="qb-add-btn" onClick={() => setField('matchPairs', [...q.matchPairs, newPair()])} type="button">+ Adicionar</button>
      </div>
      {q.matchPairs.map(pair => (
        <div key={pair.id} className="qb-match-row">
          <input
            className="qb-input"
            value={pair.left}
            placeholder="Lado esquerdo"
            onChange={e => {
              const updated = q.matchPairs.map(p => p.id === pair.id ? { ...p, left: e.target.value } : p)
              setField('matchPairs', updated)
            }}
          />
          <span className="qb-match-arrow">↔</span>
          <input
            className="qb-input"
            value={pair.right}
            placeholder="Lado direito"
            onChange={e => {
              const updated = q.matchPairs.map(p => p.id === pair.id ? { ...p, right: e.target.value } : p)
              setField('matchPairs', updated)
            }}
          />
          <button
            className="qb-remove-btn"
            onClick={() => setField('matchPairs', q.matchPairs.filter(p => p.id !== pair.id))}
            disabled={q.matchPairs.length <= 2}
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

  /* ── Crossword Editor ───────────────────────── */

  const renderCrosswordEditor = () => (
    <div className="qb-section">
      <div className="qb-section-header">
        <span className="qb-section-title">Palavras e dicas</span>
        <button className="qb-add-btn" onClick={() => setField('crosswordClues', [...q.crosswordClues, newClue()])} type="button">+ Adicionar</button>
      </div>
      <div className="qb-field-row">
        <label className="qb-label">Tamanho da grade</label>
        <input
          type="number"
          className="qb-input qb-input-sm"
          min={3}
          max={15}
          value={q.crosswordSize}
          onChange={e => setField('crosswordSize', parseInt(e.target.value) || 5)}
        />
      </div>
          {q.crosswordClues.map((clue) => (
        <div key={clue.id} className="qb-crossword-row">
          <input
            className="qb-input"
            value={clue.word}
            placeholder="Palavra"
            onChange={e => {
              const updated = q.crosswordClues.map(c => c.id === clue.id ? { ...c, word: e.target.value.toUpperCase() } : c)
              setField('crosswordClues', updated)
            }}
          />
          <input
            className="qb-input"
            value={clue.clue}
            placeholder="Dica"
            onChange={e => {
              const updated = q.crosswordClues.map(c => c.id === clue.id ? { ...c, clue: e.target.value } : c)
              setField('crosswordClues', updated)
            }}
          />
          <select
            className="qb-select"
            value={clue.direction}
            onChange={e => {
              const updated = q.crosswordClues.map(c => c.id === clue.id ? { ...c, direction: e.target.value as 'across' | 'down' } : c)
              setField('crosswordClues', updated)
            }}
          >
            <option value="across">Horizontal</option>
            <option value="down">Vertical</option>
          </select>
          <button
            className="qb-remove-btn"
            onClick={() => setField('crosswordClues', q.crosswordClues.filter(c => c.id !== clue.id))}
            disabled={q.crosswordClues.length <= 1}
            type="button"
          >
            ×
          </button>
        </div>
      ))}
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
      case 'arrastar':
        return renderMatchEditor()
      case 'ordem':
        return renderOrderEditor()
      case 'completar':
        return renderCompletarEditor()
      case 'aberta':
        return renderOpenEditor()
      case 'palavras_cruzadas':
        return renderCrosswordEditor()
    }
  }

  return (
    <div className="qb-container">
      <div className="qb-header">
        <h3 className="qb-title">{initial ? 'Editar questão' : 'Nova questão'}</h3>
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
          <div className="qb-type-grid">
            {QUESTION_TYPES.map(t => (
              <button
                key={t}
                className={`qb-type-card ${q.type === t ? 'active' : ''}`}
                onClick={() => setField('type', t)}
                type="button"
              >
                <span className="qb-type-name">{QUESTION_TYPE_LABELS[t]}</span>
                <span className="qb-type-desc">{TYPE_DESCRIPTIONS[t]}</span>
              </button>
            ))}
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
