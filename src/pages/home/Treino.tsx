import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchRedacaoModels, createRedacaoModel, deleteRedacaoModel } from '../../lib/db'
import { PERIODIC_TABLE } from '../../data/periodicTable'
import type { PeriodicElement } from '../../data/periodicTable'
import type { RedacaoModel } from '../../types/redacao'
import '../../styles/treino.css'

type MathLevel = 'facil' | 'medio' | 'dificil'

type TableLevel = 'facil' | 'medio' | 'dificil'

const TABLE_LEVELS: { id: TableLevel; label: string; desc: string }[] = [
  { id: 'facil', label: 'Fácil', desc: 'Informações gerais e onde o elemento é usado' },
  { id: 'medio', label: 'Médio', desc: 'Número atômico, símbolo e massa' },
  { id: 'dificil', label: 'Difícil', desc: 'Apenas o símbolo' },
]

function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const MATH_LEVELS: { id: MathLevel; label: string; desc: string }[] = [
  { id: 'facil', label: 'Fácil', desc: 'Contas de 1 dígito' },
  { id: 'medio', label: 'Médio', desc: 'Contas de 2 dígitos' },
  { id: 'dificil', label: 'Difícil', desc: 'Contas decimais de 0,01 até 10,9' },
]

interface MathQuestion {
  a: number
  b: number
  op: string
  answerCents: number
  decimal: boolean
}

const MAX_PART_CHARS = 42

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function fmtPTBR(n: number): string {
  let s = (Math.round(n * 100) / 100).toFixed(2)
  s = s.replace('.', ',')
  s = s.replace(/0+$/, '').replace(/,$/, '')
  return s
}

function parseToCents(raw: string): number | null {
  const v = raw.trim().replace(',', '.')
  if (!v) return null
  const n = Number(v)
  if (!isFinite(n)) return null
  return Math.round(n * 100)
}

function generateDecimalQuestion(): MathQuestion {
  const ops = ['+', '-', '×', '÷']
  const op = ops[Math.floor(Math.random() * ops.length)]
  let aC = 0
  let bC = 0
  let answerC = 0

  if (op === '+') {
    aC = randInt(1, 1090)
    bC = randInt(1, 1090)
    answerC = aC + bC
  } else if (op === '-') {
    aC = randInt(1, 1090)
    bC = randInt(1, 1090)
    if (aC < bC) [aC, bC] = [bC, aC]
    answerC = aC - bC
  } else if (op === '×') {
    aC = randInt(1, 109) * 10
    bC = randInt(1, 109) * 10
    answerC = (aC * bC) / 100
  } else {
    const qC = randInt(1, 109) * 10
    const maxB10 = Math.min(109, Math.floor(109000 / qC / 10))
    bC = randInt(1, maxB10) * 10
    aC = (qC * bC) / 100
    answerC = qC
  }

  return { a: aC / 100, b: bC / 100, op, answerCents: answerC, decimal: true }
}

function generateQuestion(level: MathLevel): MathQuestion {
  if (level === 'dificil') return generateDecimalQuestion()

  const range = level === 'facil' ? [1, 9] : [10, 99]
  const [min, max] = range
  const ops = ['+', '-', '×', '÷']
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a = 0
  let b = 0
  let answer = 0

  if (op === '+') {
    a = randInt(min, max)
    b = randInt(min, max)
    answer = a + b
  } else if (op === '-') {
    a = randInt(min, max)
    b = randInt(min, max)
    if (a < b) [a, b] = [b, a]
    answer = a - b
  } else if (op === '×') {
    a = randInt(min, max)
    b = randInt(min, max)
    answer = a * b
  } else {
    b = randInt(min, max)
    const maxQ = Math.floor(max / b)
    const quotient = maxQ >= 2 ? randInt(2, maxQ) : maxQ
    a = b * quotient
    answer = quotient
  }

  return { a, b, op, answerCents: answer * 100, decimal: false }
}

function splitModel(text: string): string[] {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim()
  if (!normalized) return []

  const sentences = normalized.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [normalized]
  const parts: string[] = []

  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (!trimmed) continue

    if (trimmed.length <= MAX_PART_CHARS) {
      parts.push(trimmed)
      continue
    }

    const words = trimmed.split(/\s+/)
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (candidate.length > MAX_PART_CHARS && current) {
        parts.push(current)
        current = word
      } else {
        current = candidate
      }
    }
    if (current) parts.push(current)
  }

  return parts
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

type View = 'menu' | 'redacao' | 'matematica' | 'tabela'
type Stage = 'setup' | 'training' | 'done'

export default function Treino() {
  const [view, setView] = useState<View>('menu')
  const [stage, setStage] = useState<Stage>('setup')
  const [modelText, setModelText] = useState('')
  const [partIndex, setPartIndex] = useState(0)
  const [pos, setPos] = useState(0)
  const [error, setError] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [mathLevel, setMathLevel] = useState(MATH_LEVELS[0])
  const [savedModels, setSavedModels] = useState<RedacaoModel[]>([])
  const [selectedModelId, setSelectedModelId] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [modelsError, setModelsError] = useState(false)
  const [mathStage, setMathStage] = useState<'setup' | 'playing'>('setup')
  const [mathQuestion, setMathQuestion] = useState<MathQuestion | null>(null)
  const [mathInput, setMathInput] = useState('')
  const [mathFeedback, setMathFeedback] = useState<{ answerText: string } | null>(null)
  const [mathStats, setMathStats] = useState({ correct: 0, wrong: 0, streak: 0, best: 0 })
  const [mathRound, setMathRound] = useState(0)
  const [tableLevel, setTableLevel] = useState(TABLE_LEVELS[0])
  const [tableStage, setTableStage] = useState<'setup' | 'playing'>('setup')
  const [tableElement, setTableElement] = useState<PeriodicElement | null>(null)
  const [tableInput, setTableInput] = useState('')
  const [tableFeedback, setTableFeedback] = useState<{ name: string } | null>(null)
  const [tableStats, setTableStats] = useState({ correct: 0, wrong: 0, streak: 0, best: 0 })
  const [tableRound, setTableRound] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const mathInputRef = useRef<HTMLInputElement>(null)
  const mathTimerRef = useRef<number | null>(null)
  const tableInputRef = useRef<HTMLInputElement>(null)
  const tableTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (view !== 'redacao') return
    let mounted = true
    fetchRedacaoModels()
      .then(list => {
        if (mounted) setSavedModels(list)
      })
      .catch(err => {
        console.warn('Falha ao carregar modelos salvos', err)
        if (mounted) setModelsError(true)
      })
    return () => { mounted = false }
  }, [view])

  const parts = useMemo(() => splitModel(modelText), [modelText])
  const modelChars = useMemo(() => Array.from(parts[partIndex] ?? ''), [parts, partIndex])
  const totalChars = useMemo(() => parts.reduce((n, p) => n + p.length, 0), [parts])
  const doneChars = parts.slice(0, partIndex).reduce((n, p) => n + p.length, 0) + pos
  const overallPct = totalChars > 0 ? Math.round((doneChars / totalChars) * 100) : 0

  useEffect(() => {
    if (stage !== 'training') return
    const t = window.setInterval(() => setElapsed(e => e + 1), 1000)
    return () => window.clearInterval(t)
  }, [stage])

  useEffect(() => {
    return () => {
      if (mathTimerRef.current) window.clearTimeout(mathTimerRef.current)
      if (tableTimerRef.current) window.clearTimeout(tableTimerRef.current)
    }
  }, [])

  const startTraining = () => {
    setPartIndex(0)
    setPos(0)
    setError(false)
    setElapsed(0)
    setStage('training')
  }

  const handleSaveModel = async () => {
    const title = saveTitle.trim()
    if (!title || !modelText.trim()) return
    try {
      const model = await createRedacaoModel({ title, content: modelText.trim() })
      setSavedModels(prev => [model, ...prev.filter(m => m.id !== model.id)])
      setSelectedModelId(model.id)
      setShowSaveInput(false)
      setSaveTitle('')
    } catch (err) {
      console.warn('Falha ao salvar modelo', err)
    }
  }

  const handleImport = () => {
    const model = savedModels.find(m => m.id === selectedModelId)
    if (model) setModelText(model.content)
  }

  const handleDeleteModel = async () => {
    if (!selectedModelId) return
    try {
      await deleteRedacaoModel(selectedModelId)
      setSavedModels(prev => prev.filter(m => m.id !== selectedModelId))
      setSelectedModelId('')
    } catch (err) {
      console.warn('Falha ao excluir modelo', err)
    }
  }

  const commitChar = (char: string) => {
    if (char.length !== 1) return
    const expected = modelChars[pos]
    if (expected === undefined) return
    if (char === expected) {
      setError(false)
      const next = pos + 1
      if (next >= modelChars.length) {
        if (partIndex + 1 >= parts.length) {
          setStage('done')
        } else {
          setPartIndex(pi => pi + 1)
          setPos(0)
        }
      } else {
        setPos(next)
      }
    } else {
      setError(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (error) {
        setError(false)
        return
      }
      setPos(p => Math.max(0, p - 1))
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      return
    }
    if (e.key.length === 1) {
      e.preventDefault()
      commitChar(e.key)
    }
  }

  const handleBeforeInput = (e: React.FormEvent<HTMLInputElement>) => {
    const native = e.nativeEvent as InputEvent
    if (native.data && native.data.length > 0) {
      e.preventDefault()
      commitChar(native.data[native.data.length - 1])
    }
  }

  const startMath = () => {
    if (mathTimerRef.current) window.clearTimeout(mathTimerRef.current)
    setMathStage('playing')
    setMathStats({ correct: 0, wrong: 0, streak: 0, best: 0 })
    setMathInput('')
    setMathFeedback(null)
    setMathRound(r => r + 1)
    setMathQuestion(generateQuestion(mathLevel.id))
  }

  const resetMath = () => startMath()

  const exitMath = () => {
    if (mathTimerRef.current) window.clearTimeout(mathTimerRef.current)
    setMathStage('setup')
    setMathQuestion(null)
    setMathFeedback(null)
    setMathInput('')
  }

  const selectMathLevel = (level: (typeof MATH_LEVELS)[number]) => {
    setMathLevel(level)
    setMathStage('setup')
    setMathQuestion(null)
    setMathFeedback(null)
    setMathInput('')
  }

  const countResult = (correct: boolean) => {
    setMathStats(prev => {
      const streak = correct ? prev.streak + 1 : 0
      return {
        correct: prev.correct + (correct ? 1 : 0),
        wrong: prev.wrong + (correct ? 0 : 1),
        streak,
        best: Math.max(prev.best, streak),
      }
    })
  }

  const nextMath = () => {
    if (mathTimerRef.current) window.clearTimeout(mathTimerRef.current)
    setMathQuestion(generateQuestion(mathLevel.id))
    setMathRound(r => r + 1)
    setMathInput('')
    setMathFeedback(null)
    mathInputRef.current?.focus()
  }

  const submitMath = () => {
    if (!mathQuestion) return
    const cents = parseToCents(mathInput)
    if (cents === null) {
      if (mathFeedback) nextMath()
      return
    }
    if (cents === mathQuestion.answerCents) {
      countResult(true)
      nextMath()
      return
    }
    countResult(false)
    if (mathTimerRef.current) window.clearTimeout(mathTimerRef.current)
    setMathFeedback({ answerText: fmtPTBR(mathQuestion.answerCents / 100) })
    setMathInput('')
    mathTimerRef.current = window.setTimeout(nextMath, 800)
    mathInputRef.current?.focus()
  }

  const handleMathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mathFeedback) {
      setMathFeedback(null)
      if (mathTimerRef.current) window.clearTimeout(mathTimerRef.current)
    }
    const raw = e.target.value
    let v = raw.replace(/[^0-9,.]/g, '')
    const sep = v.search(/[.,]/)
    if (sep !== -1) v = v.slice(0, sep + 1) + v.slice(sep + 1).replace(/[.,]/g, '')
    setMathInput(v)
    if (mathQuestion) {
      const cents = parseToCents(v)
      if (cents !== null && cents === mathQuestion.answerCents) {
        countResult(true)
        nextMath()
      }
    }
  }

  const handleMathKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitMath()
    }
  }

  const randomElement = () => PERIODIC_TABLE[Math.floor(Math.random() * PERIODIC_TABLE.length)]

  const startTable = () => {
    if (tableTimerRef.current) window.clearTimeout(tableTimerRef.current)
    setTableStage('playing')
    setTableStats({ correct: 0, wrong: 0, streak: 0, best: 0 })
    setTableInput('')
    setTableFeedback(null)
    setTableRound(r => r + 1)
    setTableElement(randomElement())
  }

  const resetTable = () => startTable()

  const exitTable = () => {
    if (tableTimerRef.current) window.clearTimeout(tableTimerRef.current)
    setTableStage('setup')
    setTableElement(null)
    setTableFeedback(null)
    setTableInput('')
  }

  const selectTableLevel = (level: (typeof TABLE_LEVELS)[number]) => {
    setTableLevel(level)
    setTableStage('setup')
    setTableElement(null)
    setTableFeedback(null)
    setTableInput('')
  }

  const nextTable = () => {
    if (tableTimerRef.current) window.clearTimeout(tableTimerRef.current)
    setTableElement(randomElement())
    setTableRound(r => r + 1)
    setTableInput('')
    setTableFeedback(null)
    tableInputRef.current?.focus()
  }

  const countTableResult = (correct: boolean) => {
    setTableStats(prev => {
      const streak = correct ? prev.streak + 1 : 0
      return {
        correct: prev.correct + (correct ? 1 : 0),
        wrong: prev.wrong + (correct ? 0 : 1),
        streak,
        best: Math.max(prev.best, streak),
      }
    })
  }

  const submitTable = () => {
    if (!tableElement) return
    const normalized = normalizeText(tableInput)
    if (!normalized) {
      if (tableFeedback) nextTable()
      return
    }
    if (normalized === normalizeText(tableElement.name)) {
      countTableResult(true)
      nextTable()
      return
    }
    countTableResult(false)
    if (tableTimerRef.current) window.clearTimeout(tableTimerRef.current)
    setTableFeedback({ name: tableElement.name })
    setTableInput('')
    tableTimerRef.current = window.setTimeout(nextTable, 800)
    tableInputRef.current?.focus()
  }

  const handleTableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (tableFeedback) {
      setTableFeedback(null)
      if (tableTimerRef.current) window.clearTimeout(tableTimerRef.current)
    }
    const v = e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s-]/g, '')
    setTableInput(v)
    if (tableElement) {
      if (normalizeText(v) === normalizeText(tableElement.name)) {
        countTableResult(true)
        nextTable()
      }
    }
  }

  const handleTableKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitTable()
    }
  }

  if (view === 'menu') {
    return (
      <div className="treino-page">
        <div className="treino-header">
          <h1 className="treino-title">Treino</h1>
          <p className="treino-subtitle">Escolha o que deseja praticar</p>
        </div>

        <div className="treino-mode-grid">
          <button type="button" className="treino-mode-card" onClick={() => setView('redacao')}>
            <div className="treino-mode-icon treino-mode-icon-redacao">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="16" y2="17" />
              </svg>
            </div>
            <span className="treino-mode-name">Redação</span>
            <span className="treino-mode-desc">Cole um modelo e treine a escrita reescrevendo por cima</span>
          </button>

          <button type="button" className="treino-mode-card" onClick={() => setView('matematica')}>
            <div className="treino-mode-icon treino-mode-icon-matematica">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <span className="treino-mode-name">Matemática</span>
            <span className="treino-mode-desc">Treino por níveis escolhíveis</span>
          </button>

          <button type="button" className="treino-mode-card" onClick={() => setView('tabela')}>
            <div className="treino-mode-icon treino-mode-icon-tabela">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M4 9h16M4 14h16M9 4v16M14 4v16" />
              </svg>
            </div>
            <span className="treino-mode-name">Tabela Periódica</span>
            <span className="treino-mode-desc">Veja o símbolo e adivinhe o nome do elemento</span>
          </button>
        </div>
      </div>
    )
  }

  if (view === 'matematica') {
    return (
      <div className="treino-page">
        <button type="button" className="treino-back" onClick={() => setView('menu')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Voltar
        </button>

        <div className="treino-header">
          <h1 className="treino-title">Treino de Matemática</h1>
          <p className="treino-subtitle">Escolha o nível e pratique sem parar</p>
        </div>

        <div className="treino-math-levels">
          {MATH_LEVELS.map(level => (
            <button
              key={level.id}
              type="button"
              className={`treino-level-chip ${mathLevel.id === level.id ? 'active' : ''}`}
              onClick={() => selectMathLevel(level)}
            >
              {level.label}
            </button>
          ))}
        </div>

        {mathStage === 'setup' && (
          <div className="treino-math-setup">
            <p className="treino-math-level-desc">{mathLevel.desc}</p>
            <div className="treino-setup-hint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>É só digitar: quando a resposta estiver certa, a próxima conta entra na hora — sem clique. Se errar, aperte Enter para ver a resposta certa.</span>
            </div>
            <button type="button" className="treino-start-btn" onClick={startMath}>
              Começar
            </button>
          </div>
        )}

        {mathStage === 'playing' && mathQuestion && (
          <div className="treino-math-training">
            <div className="treino-math-stats">
              <div className="treino-math-stat">
                <span className="treino-math-stat-label">Acertos</span>
                <span className="treino-math-stat-value">{mathStats.correct}</span>
              </div>
              <div className="treino-math-stat">
                <span className="treino-math-stat-label">Erros</span>
                <span className="treino-math-stat-value">{mathStats.wrong}</span>
              </div>
              <div className="treino-math-stat">
                <span className="treino-math-stat-label">Sequência</span>
                <span className="treino-math-stat-value">{mathStats.streak}</span>
              </div>
              <div className="treino-math-stat">
                <span className="treino-math-stat-label">Melhor</span>
                <span className="treino-math-stat-value">{mathStats.best}</span>
              </div>
            </div>

            <div key={mathRound} className="treino-math-card" onClick={() => mathInputRef.current?.focus()}>
              <span className="treino-math-level-label">{mathLevel.label}</span>
              <div className="treino-math-question">
                {mathQuestion.decimal ? fmtPTBR(mathQuestion.a) : mathQuestion.a} {mathQuestion.op} {mathQuestion.decimal ? fmtPTBR(mathQuestion.b) : mathQuestion.b} = ?
              </div>
              <input
                ref={mathInputRef}
                className="treino-math-input"
                value={mathInput}
                onChange={handleMathChange}
                onKeyDown={handleMathKeyDown}
                inputMode={mathQuestion.decimal ? 'decimal' : 'numeric'}
                autoFocus
                autoComplete="off"
                placeholder={mathQuestion.decimal ? '0,00' : ''}
                aria-label="Digite sua resposta"
              />
              <div className="treino-math-feedback-slot">
                {mathFeedback && (
                  <div className="treino-math-feedback wrong">
                    Errou! Resposta: {mathFeedback.answerText}
                  </div>
                )}
              </div>
            </div>

            <div className="treino-actions">
              <button type="button" className="treino-ghost-btn" onClick={resetMath}>Reiniciar</button>
              <button type="button" className="treino-ghost-btn" onClick={exitMath}>Trocar nível</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (view === 'tabela') {
    return (
      <div className="treino-page">
        <button type="button" className="treino-back" onClick={() => setView('menu')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Voltar
        </button>

        <div className="treino-header">
          <h1 className="treino-title">Tabela Periódica</h1>
          <p className="treino-subtitle">Veja o símbolo e adivinhe o nome do elemento</p>
        </div>

        {tableStage === 'setup' && (
          <div className="treino-math-setup">
            <div className="treino-math-levels">
              {TABLE_LEVELS.map(level => (
                <button
                  key={level.id}
                  type="button"
                  className={`treino-level-chip ${tableLevel.id === level.id ? 'active' : ''}`}
                  onClick={() => selectTableLevel(level)}
                >
                  {level.label}
                </button>
              ))}
            </div>
            <p className="treino-math-level-desc">{tableLevel.desc}</p>
            <div className="treino-setup-hint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>É só digitar o nome do elemento (sem acento também vale). Quando acertar, o próximo aparece na hora. Se errar, aperte Enter para ver a resposta.</span>
            </div>
            <button type="button" className="treino-start-btn" onClick={startTable}>
              Começar
            </button>
          </div>
        )}

        {tableStage === 'playing' && tableElement && (
          <div className="treino-math-training">
            <div className="treino-math-stats">
              <div className="treino-math-stat">
                <span className="treino-math-stat-label">Acertos</span>
                <span className="treino-math-stat-value">{tableStats.correct}</span>
              </div>
              <div className="treino-math-stat">
                <span className="treino-math-stat-label">Erros</span>
                <span className="treino-math-stat-value">{tableStats.wrong}</span>
              </div>
              <div className="treino-math-stat">
                <span className="treino-math-stat-label">Sequência</span>
                <span className="treino-math-stat-value">{tableStats.streak}</span>
              </div>
              <div className="treino-math-stat">
                <span className="treino-math-stat-label">Melhor</span>
                <span className="treino-math-stat-value">{tableStats.best}</span>
              </div>
            </div>

            <div key={tableRound} className="treino-math-card" onClick={() => tableInputRef.current?.focus()}>
              <span className="treino-math-level-label">{tableLevel.label} · Qual o nome deste elemento?</span>
              <div className="treino-table-element">
                {tableLevel.id !== 'dificil' && (
                  <span className="treino-table-number">{tableElement.number}</span>
                )}
                <span className="treino-table-symbol">{tableElement.symbol}</span>
                {tableLevel.id !== 'dificil' && (
                  <span className="treino-table-mass">{tableElement.mass}</span>
                )}
              </div>
              {tableLevel.id === 'facil' && (
                <div className="treino-table-facts">
                  <p className="treino-table-fact"><strong>Informações:</strong> {tableElement.info}</p>
                  <p className="treino-table-fact"><strong>Onde é usado:</strong> {tableElement.use}</p>
                </div>
              )}
              <input
                ref={tableInputRef}
                className="treino-math-input"
                value={tableInput}
                onChange={handleTableChange}
                onKeyDown={handleTableKeyDown}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder="Digite o nome..."
                aria-label="Digite o nome do elemento"
              />
              <div className="treino-math-feedback-slot">
                {tableFeedback && (
                  <div className="treino-math-feedback wrong">
                    Errou! Nome: {tableFeedback.name}
                  </div>
                )}
              </div>
            </div>

            <div className="treino-actions">
              <button type="button" className="treino-ghost-btn" onClick={resetTable}>Reiniciar</button>
              <button type="button" className="treino-ghost-btn" onClick={exitTable}>Trocar modo</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="treino-page">
      <button type="button" className="treino-back" onClick={() => setView('menu')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Voltar
      </button>

      {stage === 'setup' && (
        <div className="treino-setup">
          <div className="treino-header">
            <h1 className="treino-title">Treino de Redação</h1>
            <p className="treino-subtitle">Cole o modelo que você quer treinar</p>
          </div>

          <div className="treino-saved-panel">
            <div className="treino-saved-header">
              <span className="treino-saved-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Modelos salvos
              </span>
              <button type="button" className="treino-saved-toggle" onClick={() => setShowSaveInput(s => !s)} disabled={!modelText.trim()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Salvar atual
              </button>
            </div>

            {modelsError ? (
              <p className="treino-saved-empty">Não foi possível carregar os modelos salvos.</p>
            ) : savedModels.length > 0 ? (
              <div className="treino-saved-row">
                <select
                  className="treino-saved-select"
                  value={selectedModelId}
                  onChange={e => setSelectedModelId(e.target.value)}
                >
                  <option value="">Selecione um modelo...</option>
                  {savedModels.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
                <button type="button" className="treino-saved-import" disabled={!selectedModelId} onClick={handleImport}>
                  Importar
                </button>
                <button type="button" className="treino-saved-delete" disabled={!selectedModelId} onClick={handleDeleteModel} aria-label="Excluir modelo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ) : (
              <p className="treino-saved-empty">Nenhum modelo salvo ainda.</p>
            )}
          </div>

          {showSaveInput && (
            <div className="treino-save-row">
              <input
                className="treino-save-input"
                value={saveTitle}
                onChange={e => setSaveTitle(e.target.value)}
                placeholder="Nome do modelo"
                autoFocus
              />
              <button type="button" className="treino-save-btn" disabled={!saveTitle.trim()} onClick={handleSaveModel}>
                Salvar
              </button>
              <button type="button" className="treino-save-cancel" onClick={() => { setShowSaveInput(false); setSaveTitle('') }}>
                Cancelar
              </button>
            </div>
          )}

          <textarea
            className="treino-textarea"
            value={modelText}
            onChange={e => setModelText(e.target.value)}
            placeholder={'Cole aqui o texto da redação que você quer usar como modelo...'}
            rows={10}
          />

          <div className="treino-setup-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span>O texto será dividido em partes. Cada parte aparece no meio da tela e você escreve por cima dela — as letras vão sumindo conforme você acerta.</span>
          </div>

          <button type="button" className="treino-start-btn" disabled={!modelText.trim()} onClick={startTraining}>
            Começar treino
          </button>
        </div>
      )}

      {stage === 'training' && (
        <div className="treino-training">
          <div className="treino-training-top">
            <div className="treino-progress-info">
              <span className="treino-part-label">Parte {partIndex + 1} de {parts.length}</span>
              <div className="treino-progress-bar">
                <div className="treino-progress-fill" style={{ width: `${overallPct}%` }} />
              </div>
              <span className="treino-overall">{overallPct}%</span>
            </div>
            <span className="treino-timer">{formatTime(elapsed)}</span>
          </div>

          <div className="treino-typing-card" onClick={() => inputRef.current?.focus()}>
            <div className="treino-ghost" key={partIndex}>
              {modelChars.map((ch, i) => {
                let cls = 'treino-char ghost'
                if (i < pos) cls = 'treino-char done'
                else if (i === pos) cls = error ? 'treino-char current error' : 'treino-char current'
                return <span key={i} className={cls}>{ch}</span>
              })}
            </div>

            <div className="treino-typing-hint">
              Escreva por cima do texto. O próximo caractere aparece destacado.
            </div>

            <input
              ref={inputRef}
              className="treino-hidden-input"
              value=""
              autoFocus
              aria-label="Digite o texto do modelo"
              onKeyDown={handleKeyDown}
              onBeforeInput={handleBeforeInput}
              onPaste={e => e.preventDefault()}
            />
          </div>

          <div className="treino-actions">
            <button type="button" className="treino-ghost-btn" onClick={startTraining}>Reiniciar</button>
            <button type="button" className="treino-ghost-btn" onClick={() => setStage('setup')}>Trocar modelo</button>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div className="treino-done">
          <div className="treino-done-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="treino-done-title">Redação completa!</h2>
          <p className="treino-done-stats">
            {parts.length} {parts.length === 1 ? 'parte' : 'partes'} · {totalChars} caracteres · {formatTime(elapsed)}
          </p>
          <div className="treino-actions">
            <button type="button" className="treino-start-btn" onClick={startTraining}>Treinar novamente</button>
            <button type="button" className="treino-ghost-btn" onClick={() => setStage('setup')}>Trocar modelo</button>
          </div>
        </div>
      )}
    </div>
  )
}
