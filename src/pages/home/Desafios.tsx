import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { Challenge, ChallengeQuestion, QuestionAnswer, ChallengeAttempt, UserStreak, ChallengeDifficulty } from '../../types/challenge'
import { QUESTION_TYPE_LABELS } from '../../types/challenge'
import type { Subject } from '../../types/doc'
import { SUBJECTS, SUBJECT_COLORS } from '../../types/doc'
import QuestionBuilder from '../../components/QuestionBuilder'
import ChallengeBuilder from '../../components/ChallengeBuilder'
import { fetchQuestions, fetchChallenges, fetchAttempts, fetchStreak, createQuestion, updateQuestion, deleteQuestion, createChallenge, updateChallenge, deleteChallenge, createAttempt, upsertStreak, logActivity, recordAction, checkModeHardcore, checkMasoquista } from '../../lib/db'
import { supabase } from '../../lib/supabase'
import '../../styles/desafios.css'

const EMPTY_STREAK: UserStreak = { currentStreak: 0, longestStreak: 0, lastChallengeDate: null, totalXp: 0, totalWatchSeconds: 0, videosWatched: 0, docsCreated: 0, challengesCompleted: 0, simuladosCompleted: 0, notesCreated: 0, loginDays: 0, lastLoginDate: null, videosWatchedToday: 0, videosWatchedDate: null, watchedSubjects: [], completedSimuladoYears: [], bestSimuladoScore: 0, simuladosThisWeek: 0, lastSimuladoWeek: null }
const DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' }
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

function calculateScore(correct: number, _wrong: number, timeMs: number, total: number, diff: ChallengeDifficulty) {
  const base = diff === 'facil' ? 100 : diff === 'medio' ? 150 : 200
  const pts = correct * base
  const budget = total * 30_000
  const bonus = Math.round((1 - Math.min(1, timeMs / budget)) * 500)
  return { score: pts + bonus, xpEarned: Math.round((pts + bonus) * 0.8) }
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type View = 'list' | 'quiz' | 'results' | 'create_question' | 'create_challenge' | 'edit_question' | 'edit_challenge' | 'list_questions' | 'list_challenges'

export default function Desafios() {
  const [questions, setQuestions] = useState<ChallengeQuestion[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [attempts, setAttempts] = useState<ChallengeAttempt[]>([])
  const [streak, setStreak] = useState<UserStreak>(EMPTY_STREAK)
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'Todas'>('Todas')
  const [view, setView] = useState<View>('list')

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null)
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [answers, setAnswers] = useState<QuestionAnswer[]>([])
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])
  const [tfAnswers, setTfAnswers] = useState<Record<string, 'true' | 'false'>>({})
  const [showFeedback, setShowFeedback] = useState(false)
  const [lastResult, setLastResult] = useState<ChallengeAttempt | null>(null)

  const [dragOrder, setDragOrder] = useState<string[]>([])
  const [fillAnswers, setFillAnswers] = useState<Record<string, string>>({})
  const [openText, setOpenText] = useState('')
  const [selfEval, setSelfEval] = useState<'correct' | 'wrong' | null>(null)

  const [editingQuestion, setEditingQuestion] = useState<ChallengeQuestion | null>(null)
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null)
  const [deleteChallengeTarget, setDeleteChallengeTarget] = useState<Challenge | null>(null)
  const [viewingQuestionsChallenge, setViewingQuestionsChallenge] = useState<Challenge | null>(null)
  const [expandedQVQuestion, setExpandedQVQuestion] = useState<string | null>(null)
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<ChallengeQuestion | null>(null)

  const startTimeRef = useRef<number>(0)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [questionHidden, setQuestionHidden] = useState(false)
  const [memoryTimeLeft, setMemoryTimeLeft] = useState(15)
  const memoryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [openDropdown, setOpenDropdown] = useState<'questions' | 'challenges' | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [tableFilter, setTableFilter] = useState('')
  const [tableSubjectFilter, setTableSubjectFilter] = useState<Subject | 'Todas'>('Todas')

  const dailyChallenge = useMemo(() => challenges.find(c => c.isDaily) || null, [challenges])
  const questionMap = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions])

  const filteredChallenges = useMemo(() => {
    const pool = challenges.filter(c => !c.isDaily)
    if (selectedSubject === 'Todas') return pool
    return pool.filter(c => c.subject === selectedSubject || c.crossSubjects?.includes(selectedSubject))
  }, [challenges, selectedSubject])

  const attemptIds = useMemo(() => new Set(attempts.map(a => a.challengeId)), [attempts])

  const filteredTableQuestions = useMemo(() => {
    let list = questions
    if (tableSubjectFilter !== 'Todas') list = list.filter(q => q.subject === tableSubjectFilter)
    if (tableFilter.trim()) {
      const lf = tableFilter.toLowerCase()
      list = list.filter(q => q.title.toLowerCase().includes(lf) || q.subject.toLowerCase().includes(lf) || QUESTION_TYPE_LABELS[q.type].toLowerCase().includes(lf))
    }
    return list
  }, [questions, tableFilter, tableSubjectFilter])

  const filteredTableChallenges = useMemo(() => {
    let list = challenges
    if (tableSubjectFilter !== 'Todas') list = list.filter(c => c.subject === tableSubjectFilter || c.crossSubjects?.includes(tableSubjectFilter))
    if (tableFilter.trim()) {
      const lf = tableFilter.toLowerCase()
      list = list.filter(c => c.title.toLowerCase().includes(lf) || c.subject.toLowerCase().includes(lf))
    }
    return list
  }, [challenges, tableFilter, tableSubjectFilter])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdown(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const stopTimer = useCallback(() => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }, [])
  useEffect(() => () => stopTimer(), [stopTimer])

  const stopMemoryTimer = useCallback(() => {
    if (memoryTimerRef.current) { clearInterval(memoryTimerRef.current); memoryTimerRef.current = null }
  }, [])

  useEffect(() => () => stopMemoryTimer(), [stopMemoryTimer])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [qs, chs, ats, st] = await Promise.all([fetchQuestions(), fetchChallenges(), fetchAttempts(), fetchStreak()])
        if (!mounted) return
        setQuestions(qs); setChallenges(chs); setAttempts(ats); setStreak(st)
      } catch { } finally { if (mounted) setLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [])

  useEffect(() => { supabase.auth.getUser().catch(() => {}) }, [])

  const resetQuizState = useCallback(() => { setSelectedOptionIds([]); setTfAnswers({}); setShowFeedback(false); setDragOrder([]); setFillAnswers({}); setOpenText(''); setSelfEval(null) }, [])

  const startChallenge = useCallback((challenge: Challenge) => {
    setActiveChallenge(challenge); setCurrentQIndex(0); setAnswers([]); resetQuizState(); setLastResult(null); setView('quiz')
    startTimeRef.current = Date.now(); setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(Date.now() - startTimeRef.current), 200)
    if (challenge.modifiers?.includes('memoria_curta')) {
      setTimeout(() => {
        setQuestionHidden(false); setMemoryTimeLeft(15)
        if (memoryTimerRef.current) clearInterval(memoryTimerRef.current)
        memoryTimerRef.current = setInterval(() => {
          setMemoryTimeLeft(prev => {
            if (prev <= 1) {
              if (memoryTimerRef.current) { clearInterval(memoryTimerRef.current); memoryTimerRef.current = null }
              setQuestionHidden(true)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }, 0)
    }
  }, [resetQuizState])

  const getCurrentQuestion = useCallback((): ChallengeQuestion | null => {
    if (!activeChallenge) return null
    return questionMap.get(activeChallenge.questionIds[currentQIndex]) || null
  }, [activeChallenge, currentQIndex, questionMap])

  const isAnswerReady = useCallback((): boolean => {
    const q = getCurrentQuestion()
    if (!q) return false
    switch (q.type) {
      case 'multipla': case 'multipla_multipla': return selectedOptionIds.length > 0
      case 'verdadeiro_falso': return Object.keys(tfAnswers).length === q.statements.length
      case 'aberta': return true
      case 'ordem': return dragOrder.length === q.orderItems.length
      case 'completar': return q.blanks.every(b => fillAnswers[b.id]?.trim())
    }
  }, [getCurrentQuestion, selectedOptionIds, tfAnswers, dragOrder, fillAnswers])

  const checkAnswer = useCallback((): boolean => {
    const q = getCurrentQuestion()
    if (!q) return false
    switch (q.type) {
      case 'multipla': return q.options.find(o => selectedOptionIds.includes(o.id))?.correct ?? false
      case 'multipla_multipla': { const correctIds = new Set(q.options.filter(o => o.correct).map(o => o.id)); const selectedSet = new Set(selectedOptionIds); return correctIds.size === selectedSet.size && [...correctIds].every(id => selectedSet.has(id)) }
      case 'verdadeiro_falso': return q.statements.every(s => (tfAnswers[s.id] === 'true') === s.correct)
      case 'aberta': return selfEval === 'correct'
      case 'ordem': { const correctOrder = [...q.orderItems].sort((a, b) => a.correctOrder - b.correctOrder).map(i => i.id); return dragOrder.every((id, idx) => id === correctOrder[idx]) }
      case 'completar': return q.blanks.every(b => fillAnswers[b.id]?.trim().toLowerCase() === b.answer.toLowerCase())
    }
  }, [getCurrentQuestion, selectedOptionIds, tfAnswers, dragOrder, fillAnswers, selfEval])

  const handleConfirmAnswer = useCallback(() => {
    const q = getCurrentQuestion()
    if (!q) return
    const correct = checkAnswer()
    const answer: QuestionAnswer = { questionId: q.id, type: q.type, selectedOptionIds: q.type === 'verdadeiro_falso' ? Object.values(tfAnswers) : [...selectedOptionIds], openText, orderAnswers: [...dragOrder], fillAnswers: { ...fillAnswers }, correct }
    setAnswers(prev => [...prev, answer])
    setShowFeedback(true)
    stopMemoryTimer()
    setQuestionHidden(false)
  }, [getCurrentQuestion, checkAnswer, selectedOptionIds, tfAnswers, openText, dragOrder, fillAnswers, stopMemoryTimer])

  const handleNext = useCallback(() => {
    if (!activeChallenge) return
    if (currentQIndex >= activeChallenge.questionIds.length - 1) {
      stopTimer()
      const totalTimeMs = Date.now() - startTimeRef.current
      const correctCount = answers.filter(a => a.correct).length
      const wrongCount = answers.length - correctCount
      const { score, xpEarned } = calculateScore(correctCount, wrongCount, totalTimeMs, activeChallenge.questionIds.length, activeChallenge.difficulty)
      const attempt: ChallengeAttempt = { id: crypto.randomUUID(), challengeId: activeChallenge.id, answers: [...answers], totalTimeMs, correctCount, wrongCount, score, xpEarned, completedAt: Date.now() }
      setAttempts(prev => [...prev, attempt]); setLastResult(attempt)
      const ns: UserStreak = { ...streak, currentStreak: correctCount > wrongCount ? streak.currentStreak + 1 : 0, longestStreak: correctCount > wrongCount ? Math.max(streak.longestStreak, streak.currentStreak + 1) : streak.longestStreak, totalXp: streak.totalXp + xpEarned, lastChallengeDate: new Date().toISOString().split('T')[0] }
      setStreak(ns)
      createAttempt(attempt).catch(() => {}); upsertStreak(ns).catch(() => {})
      logActivity('challenge_done', `${correctCount > wrongCount ? 'Acertou' : 'Errou'} "${activeChallenge.title}" (${correctCount}/${activeChallenge.questionIds.length})`, 'challenge', correctCount > wrongCount ? '#b450b4' : '#c86450').catch(() => {})
      recordAction('challenge').catch(() => {})
      checkModeHardcore(activeChallenge.id, correctCount > wrongCount, activeChallenge.modifiers?.length || 0).catch(() => {})
      checkMasoquista(activeChallenge.id, correctCount > wrongCount).catch(() => {})
      setView('results')
      stopMemoryTimer()
    } else {
      setCurrentQIndex(i => i + 1); resetQuizState()
      if (activeChallenge.modifiers?.includes('memoria_curta')) {
        setTimeout(() => {
          setQuestionHidden(false); setMemoryTimeLeft(15)
          if (memoryTimerRef.current) clearInterval(memoryTimerRef.current)
          memoryTimerRef.current = setInterval(() => {
            setMemoryTimeLeft(prev => {
              if (prev <= 1) {
                if (memoryTimerRef.current) { clearInterval(memoryTimerRef.current); memoryTimerRef.current = null }
                setQuestionHidden(true)
                return 0
              }
              return prev - 1
            })
          }, 1000)
        }, 0)
      }
    }
  }, [activeChallenge, currentQIndex, answers, stopTimer, resetQuizState, stopMemoryTimer, streak])

  const handleBackToList = useCallback(() => { setView('list'); setActiveChallenge(null); setLastResult(null); stopTimer(); stopMemoryTimer(); setQuestionHidden(false) }, [stopTimer, stopMemoryTimer])

  const handleSaveQuestion = useCallback((q: ChallengeQuestion) => {
    setQuestions(prev => {
      const idx = prev.findIndex(p => p.id === q.id)
      if (idx >= 0) { const updated = [...prev]; updated[idx] = q; updateQuestion(q).catch(() => {}); return updated }
      createQuestion(q).catch(() => {})
      return [...prev, q]
    })
    setView(v => v === 'edit_question' ? 'list_questions' : v === 'create_question' ? 'list_questions' : 'list'); setEditingQuestion(null)
  }, [])

  const handleSaveChallenge = useCallback((_c: Challenge, _newQs: ChallengeQuestion[]) => {
    setChallenges(prev => {
      const idx = prev.findIndex(p => p.id === _c.id)
      if (idx >= 0) { const updated = [...prev]; updated[idx] = _c; updateChallenge(_c).catch(() => {}); return updated }
      createChallenge(_c).catch(() => {})
      return [...prev, _c]
    })
    setView(v => v === 'edit_challenge' ? 'list_challenges' : v === 'create_challenge' ? 'list_challenges' : 'list')
  }, [])

  const handleDeleteChallenge = useCallback(async () => {
    if (!deleteChallengeTarget) return
    try { await deleteChallenge(deleteChallengeTarget.id); setChallenges(prev => prev.filter(c => c.id !== deleteChallengeTarget.id)); logActivity('challenge_deleted', `Deletou "${deleteChallengeTarget.title}"`, 'challenge', '#c85050').catch(() => {}) } catch (e) { console.error('Erro ao deletar desafio:', e) }
    setDeleteChallengeTarget(null)
  }, [deleteChallengeTarget])

  const handleEditChallenge = useCallback((challenge: Challenge) => { setEditingChallenge(challenge); setView('edit_challenge') }, [])
  const handleEditQuestionFromList = useCallback((q: ChallengeQuestion) => { setEditingQuestion(q); setView('edit_question') }, [])

  const handleDeleteQuestionFromList = useCallback(async () => {
    if (!deleteQuestionTarget) return
    try { await deleteQuestion(deleteQuestionTarget.id); setQuestions(prev => prev.filter(q => q.id !== deleteQuestionTarget.id)); setChallenges(prev => prev.map(c => ({ ...c, questionIds: c.questionIds.filter(id => id !== deleteQuestionTarget.id) }))); logActivity('question_deleted', `Deletou questão "${deleteQuestionTarget.title}"`, 'challenge', '#c85050').catch(() => {}) } catch (e) { console.error('Erro ao deletar questão:', e) }
    setDeleteQuestionTarget(null)
  }, [deleteQuestionTarget])

  useEffect(() => { if (view === 'quiz') { const q = getCurrentQuestion(); if (q?.type === 'ordem' && dragOrder.length === 0) setDragOrder(shuffleArray(q.orderItems.map(i => i.id))) } }, [view, getCurrentQuestion, dragOrder.length])

  /* ═══════════════════════════════════════════════
     QUIZ VIEW
     ═══════════════════════════════════════════════ */

  if (view === 'quiz' && activeChallenge) {
    const q = getCurrentQuestion()
    if (!q) return null
    const progress = ((currentQIndex + 1) / activeChallenge.questionIds.length) * 100
    const showMemory = activeChallenge.modifiers?.includes('memoria_curta') && !showFeedback

    const renderQuizBody = () => {
      if (q.content && q.type !== 'completar') return <p className="quiz-content-text">{q.content}</p>
      return null
    }

    const renderTypeSpecific = () => {
      switch (q.type) {
        case 'multipla': return (<div className="quiz-options">{q.options.map((opt, i) => <button key={opt.id} className={`quiz-option ${selectedOptionIds.includes(opt.id) ? 'selected' : ''}`} onClick={() => setSelectedOptionIds([opt.id])} type="button"><span className="quiz-option-letter">{LETTERS[i]}</span><span className="quiz-option-text">{opt.text}</span></button>)}</div>)
        case 'multipla_multipla': return (<div className="quiz-options">{q.options.map((opt, i) => <button key={opt.id} className={`quiz-option ${selectedOptionIds.includes(opt.id) ? 'selected' : ''}`} onClick={() => setSelectedOptionIds(prev => prev.includes(opt.id) ? prev.filter(x => x !== opt.id) : [...prev, opt.id])} type="button"><span className="quiz-option-letter">{LETTERS[i]}</span><span className="quiz-option-text">{opt.text}</span></button>)}</div>)
        case 'verdadeiro_falso': return (<div className="quiz-tf-list">{q.statements.map(st => (<div key={st.id} className="quiz-tf-row"><p className="quiz-tf-text">{st.text}</p><div className="quiz-tf-btns"><button className={`quiz-tf-btn ${tfAnswers[st.id] === 'true' ? 'selected' : ''}`} onClick={() => setTfAnswers(prev => ({ ...prev, [st.id]: 'true' }))} type="button">V</button><button className={`quiz-tf-btn ${tfAnswers[st.id] === 'false' ? 'selected' : ''}`} onClick={() => setTfAnswers(prev => ({ ...prev, [st.id]: 'false' }))} type="button">F</button></div></div>))}</div>)
        case 'aberta': return (<div className="quiz-open"><textarea className="qb-textarea" value={openText} onChange={e => setOpenText(e.target.value)} placeholder="Digite sua resposta..." rows={4} /></div>)
        case 'ordem': return (<div className="quiz-order-list">{dragOrder.map((id, idx) => { const item = q.orderItems.find(oi => oi.id === id); return item ? (<div key={id} className="quiz-order-item"><span className="quiz-order-num">{idx + 1}°</span><span>{item.text}</span></div>) : null })}</div>)
        case 'completar': return (<div className="quiz-fill-list">{q.blanks.map((blank, idx) => (<div key={blank.id} className="quiz-fill-row"><span className="quiz-fill-label">Lacuna {idx + 1}:</span><input className="qb-input" value={fillAnswers[blank.id] || ''} onChange={e => setFillAnswers(prev => ({ ...prev, [blank.id]: e.target.value }))} placeholder="Sua resposta..." /></div>))}</div>)
      }
    }

    return (
      <div className="desafios-page">
        <div className="quiz-header">
          <button className="quiz-back-btn" onClick={handleBackToList} type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg></button>
          <div className="quiz-info"><span className="quiz-challenge-name">{activeChallenge.title}</span><span className="quiz-progress-text">{currentQIndex + 1}/{activeChallenge.questionIds.length}</span></div>
          <div className="quiz-header-right">
            {showMemory && !questionHidden && <span className="quiz-memory-timer">🧠 {memoryTimeLeft}s</span>}
            {showMemory && questionHidden && <span className="quiz-memory-hidden">🔒 Pergunta oculta</span>}
            <span className="quiz-timer">{formatTime(elapsed)}</span>
          </div>
        </div>
        <div className="quiz-progress"><div className="quiz-progress-fill" style={{ width: `${progress}%` }} /></div>
        {showMemory && !questionHidden && (
          <div className="quiz-memory-bar">
            <div className="quiz-memory-bar-fill" style={{ width: `${(memoryTimeLeft / 15) * 100}%` }} />
          </div>
        )}
        <div className="quiz-card">
          <div className="quiz-q-header">
            <span className="quiz-q-badge subject" style={{ background: SUBJECT_COLORS[q.subject]?.bg, color: SUBJECT_COLORS[q.subject]?.text }}>{q.subject}</span>
            <span className="quiz-q-badge type">{QUESTION_TYPE_LABELS[q.type]}</span>
            <span className={`quiz-q-badge diff diff-${q.difficulty}`}>{DIFFICULTY_LABELS[q.difficulty]}</span>
            {q.source === 'enem' && (
              <span className="quiz-q-badge enem-badge" data-tooltip="Questão do ENEM. Matéria e dificuldade foram estimadas por análise de palavras-chave e podem estar imprecisas.">
                ENEM
              </span>
            )}
          </div>
          {!questionHidden && <h3 className="quiz-q-title">{q.title}</h3>}
          {!questionHidden && renderQuizBody()}
          {questionHidden && <div className="quiz-question-hidden-msg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg><span>Memória Curta: a pergunta desapareceu!</span></div>}
          {renderTypeSpecific()}
          {showFeedback && q.explanation && <div className="quiz-explanation"><strong>Explicação:</strong> {q.explanation}</div>}
          <div className="quiz-actions">
            {!showFeedback ? <button className="quiz-confirm-btn" onClick={handleConfirmAnswer} disabled={!isAnswerReady()} type="button">Confirmar</button> : <button className="quiz-next-btn" onClick={handleNext} type="button">{currentQIndex >= activeChallenge.questionIds.length - 1 ? 'Ver resultado' : 'Próxima'}</button>}
          </div>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════
     RESULTS VIEW
     ═══════════════════════════════════════════════ */

  if (view === 'results' && lastResult) {
    const total = lastResult.correctCount + lastResult.wrongCount
    const accuracy = total > 0 ? Math.round((lastResult.correctCount / total) * 100) : 0
    return (
      <div className="desafios-page">
        <div className="results-container">
          <h2 className="results-title">{accuracy >= 70 ? 'Parabéns!' : 'Continue tentando!'}</h2>
          <div className="results-stats">
            <div className="results-stat"><span className="results-stat-value correct">{lastResult.correctCount}</span><span className="results-stat-label">Acertos</span></div>
            <div className="results-stat"><span className="results-stat-value wrong">{lastResult.wrongCount}</span><span className="results-stat-label">Erros</span></div>
            <div className="results-stat"><span className="results-stat-value">{lastResult.score}</span><span className="results-stat-label">Pontos</span></div>
            <div className="results-stat"><span className="results-stat-value">{formatTime(lastResult.totalTimeMs)}</span><span className="results-stat-label">Tempo</span></div>
          </div>
          <div className="results-accuracy"><span className="results-accuracy-value">{accuracy}%</span></div>
          <button className="quiz-next-btn results-back-btn" onClick={handleBackToList} type="button">Voltar aos desafios</button>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════
     CREATE / EDIT VIEWS
     ═══════════════════════════════════════════════ */

  if (view === 'create_question' || view === 'edit_question') {
    return (
      <div className="desafios-page">
        <QuestionBuilder initial={editingQuestion || undefined} onSave={handleSaveQuestion} onCancel={() => { setView(v => v === 'edit_question' ? 'list_questions' : 'list'); setEditingQuestion(null) }} />
      </div>
    )
  }

  if (view === 'create_challenge' || view === 'edit_challenge') {
    return (
      <div className="desafios-page">
        <ChallengeBuilder allQuestions={questions} initial={editingChallenge || undefined} onSave={handleSaveChallenge} onCancel={() => { setView(v => v === 'edit_challenge' ? 'list_challenges' : 'list'); setEditingChallenge(null) }} />
      </div>
    )
  }

  /* ═══════════════════════════════════════════════
     LIST QUESTIONS TABLE
     ═══════════════════════════════════════════════ */

  if (view === 'list_questions') {
    return (
      <div className="desafios-page">
        <div className="desafios-header">
          <div className="desafios-header-left">
            <button className="desafios-back-btn" onClick={() => setView('list')} type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg></button>
            <h1 className="desafios-title">Todas as Questões</h1>
            <span className="desafios-count">{filteredTableQuestions.length} questões</span>
          </div>
          <button className="desafios-create-btn primary" onClick={() => setView('create_question')} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Nova questão
          </button>
        </div>
        <div className="dt-toolbar">
          <input className="dt-search" value={tableFilter} onChange={e => setTableFilter(e.target.value)} placeholder="Buscar questões..." />
          <select className="qb-select" value={tableSubjectFilter} onChange={e => setTableSubjectFilter(e.target.value as Subject | 'Todas')}>
            <option value="Todas">Todas as matérias</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="dt-table-wrap">
          <table className="dt-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Matéria</th>
                <th>Tipo</th>
                <th>Dificuldade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTableQuestions.map(q => (
                <tr key={q.id}>
                  <td className="dt-cell-title">{q.title}</td>
                  <td><span className="dt-badge" style={{ background: SUBJECT_COLORS[q.subject]?.bg, color: SUBJECT_COLORS[q.subject]?.text }}>{q.subject}</span></td>
                  <td><span className="dt-badge type">{QUESTION_TYPE_LABELS[q.type]}</span></td>
                  <td><span className={`dt-badge diff-${q.difficulty}`}>{DIFFICULTY_LABELS[q.difficulty]}</span></td>
                  <td className="dt-actions">
                    <button className="dt-action-btn edit" onClick={() => handleEditQuestionFromList(q)} title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg></button>
                    <button className="dt-action-btn delete" onClick={() => setDeleteQuestionTarget(q)} title="Deletar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>
                  </td>
                </tr>
              ))}
              {filteredTableQuestions.length === 0 && <tr><td colSpan={5} className="dt-empty">Nenhuma questão encontrada</td></tr>}
            </tbody>
          </table>
        </div>

        {deleteQuestionTarget && (
          <div className="desafio-modal-overlay" onClick={() => setDeleteQuestionTarget(null)}>
            <div className="desafio-modal desafio-confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="desafio-confirm-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
              </div>
              <h3 className="desafio-modal-title">Deletar questão?</h3>
              <p className="desafio-confirm-text">"{deleteQuestionTarget.title}" será removida permanentemente.</p>
              <div className="desafio-form-actions">
                <button className="desafio-form-cancel" onClick={() => setDeleteQuestionTarget(null)} type="button">Cancelar</button>
                <button className="desafio-form-confirm desafio-form-delete" onClick={handleDeleteQuestionFromList} type="button">Deletar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ═══════════════════════════════════════════════
     LIST CHALLENGES TABLE
     ═══════════════════════════════════════════════ */

  if (view === 'list_challenges') {
    return (
      <div className="desafios-page">
        <div className="desafios-header">
          <div className="desafios-header-left">
            <button className="desafios-back-btn" onClick={() => setView('list')} type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg></button>
            <h1 className="desafios-title">Todos os Desafios</h1>
            <span className="desafios-count">{filteredTableChallenges.length} desafios</span>
          </div>
          <button className="desafios-create-btn secondary" onClick={() => setView('create_challenge')} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            Novo desafio
          </button>
        </div>
        <div className="dt-toolbar">
          <input className="dt-search" value={tableFilter} onChange={e => setTableFilter(e.target.value)} placeholder="Buscar desafios..." />
          <select className="qb-select" value={tableSubjectFilter} onChange={e => setTableSubjectFilter(e.target.value as Subject | 'Todas')}>
            <option value="Todas">Todas as matérias</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="dt-table-wrap">
          <table className="dt-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Matéria</th>
                <th>Dificuldade</th>
                <th>Questões</th>
                <th>XP</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTableChallenges.map(c => (
                <tr key={c.id}>
                  <td className="dt-cell-title">{c.title}</td>
                  <td><span className="dt-badge" style={{ background: SUBJECT_COLORS[c.subject]?.bg, color: SUBJECT_COLORS[c.subject]?.text }}>{c.subject}</span></td>
                  <td><span className={`dt-badge diff-${c.difficulty}`}>{DIFFICULTY_LABELS[c.difficulty]}</span></td>
                  <td>{c.questionIds.length}</td>
                  <td>{c.xpBase} XP</td>
                  <td className="dt-actions">
                    <button className="dt-action-btn view" onClick={() => setViewingQuestionsChallenge(c)} title="Ver questões"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg></button>
                    <button className="dt-action-btn edit" onClick={() => handleEditChallenge(c)} title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg></button>
                    <button className="dt-action-btn delete" onClick={() => setDeleteChallengeTarget(c)} title="Deletar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>
                  </td>
                </tr>
              ))}
              {filteredTableChallenges.length === 0 && <tr><td colSpan={6} className="dt-empty">Nenhum desafio encontrado</td></tr>}
            </tbody>
          </table>
        </div>

        {deleteChallengeTarget && (
          <div className="desafio-modal-overlay" onClick={() => setDeleteChallengeTarget(null)}>
            <div className="desafio-modal desafio-confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="desafio-confirm-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
              </div>
              <h3 className="desafio-modal-title">Deletar desafio?</h3>
              <p className="desafio-confirm-text">"{deleteChallengeTarget.title}" será removido permanentemente.</p>
              <div className="desafio-form-actions">
                <button className="desafio-form-cancel" onClick={() => setDeleteChallengeTarget(null)} type="button">Cancelar</button>
                <button className="desafio-form-confirm desafio-form-delete" onClick={handleDeleteChallenge} type="button">Deletar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ═══════════════════════════════════════════════
     MAIN LIST VIEW
     ═══════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="desafios-page">
        <div className="desafios-empty"><div className="quiz-spinner" /><h4 className="desafios-empty-title">Carregando desafios...</h4></div>
      </div>
    )
  }

  return (
    <div className="desafios-page">
      <div className="desafios-header">
        <div className="desafios-header-left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          <h1 className="desafios-title">Desafios</h1>
        </div>
      </div>

      <div className="desafios-stats">
        <div className="desafio-stat-card">
          <div className="desafio-stat-icon streak"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg></div>
          <div className="desafio-stat-info"><span className="desafio-stat-value">{streak.currentStreak}</span><span className="desafio-stat-label">Sequência</span></div>
        </div>
        <div className="desafio-stat-card">
          <div className="desafio-stat-icon xp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg></div>
          <div className="desafio-stat-info"><span className="desafio-stat-value">{streak.totalXp.toLocaleString()}</span><span className="desafio-stat-label">XP total</span></div>
        </div>
        <div className="desafio-stat-card">
          <div className="desafio-stat-icon total"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div>
          <div className="desafio-stat-info"><span className="desafio-stat-value">{attempts.length}/{challenges.length}</span><span className="desafio-stat-label">Resolvidos</span></div>
        </div>
      </div>

      <div className="desafios-create-bar" ref={dropdownRef}>
        <div className="desafios-dropdown-wrap">
          <button className="desafios-create-btn primary" onClick={() => setOpenDropdown(prev => prev === 'questions' ? null : 'questions')} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
            Questões
            <svg className="desafios-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {openDropdown === 'questions' && (
            <div className="desafios-dropdown">
              <button className="desafios-dropdown-item" onClick={() => { setOpenDropdown(null); setView('create_question') }} type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                <div><span className="dd-item-title">Criar nova questão</span><span className="dd-item-desc">Crie uma questão para usar em desafios</span></div>
              </button>
              <button className="desafios-dropdown-item" onClick={() => { setOpenDropdown(null); setView('list_questions'); setTableFilter(''); setTableSubjectFilter('Todas') }} type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                <div><span className="dd-item-title">Listar questões</span><span className="dd-item-desc">{questions.length} questões criadas</span></div>
              </button>
            </div>
          )}
        </div>
        <div className="desafios-dropdown-wrap">
          <button className="desafios-create-btn secondary" onClick={() => setOpenDropdown(prev => prev === 'challenges' ? null : 'challenges')} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            Desafios
            <svg className="desafios-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {openDropdown === 'challenges' && (
            <div className="desafios-dropdown">
              <button className="desafios-dropdown-item" onClick={() => { setOpenDropdown(null); setView('create_challenge') }} type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                <div><span className="dd-item-title">Criar novo desafio</span><span className="dd-item-desc">Monte um desafio com questões</span></div>
              </button>
              <button className="desafios-dropdown-item" onClick={() => { setOpenDropdown(null); setView('list_challenges'); setTableFilter(''); setTableSubjectFilter('Todas') }} type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                <div><span className="dd-item-title">Listar desafios</span><span className="dd-item-desc">{challenges.length} desafios criados</span></div>
              </button>
            </div>
          )}
        </div>
      </div>

      {dailyChallenge && !attemptIds.has(dailyChallenge.id) && (
        <div className="desafios-daily" onClick={() => startChallenge(dailyChallenge)}>
          <div className="desafios-daily-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>Desafio do dia</div>
          <h2 className="desafios-daily-title">{dailyChallenge.title}</h2>
          <p className="desafios-daily-desc">{dailyChallenge.description}</p>
          <div className="desafios-daily-meta">
            <span className="desafios-daily-tag difficulty">{DIFFICULTY_LABELS[dailyChallenge.difficulty]}</span>
            <span className="desafios-daily-tag subject">{dailyChallenge.subject}</span>
            <span className="desafios-daily-tag questions">{dailyChallenge.questionIds.length} questões</span>
          </div>
        </div>
      )}

      <div className="desafios-filters">
        <div className="desafios-subjects">
          <button className={`desafios-subject-chip ${selectedSubject === 'Todas' ? 'active' : ''}`} onClick={() => setSelectedSubject('Todas')} type="button">Todas</button>
          {SUBJECTS.map(s => <button key={s} className={`desafios-subject-chip ${selectedSubject === s ? 'active' : ''}`} onClick={() => setSelectedSubject(s)} type="button">{s}</button>)}
        </div>
      </div>

      <h3 className="desafios-section-label">Todos os desafios</h3>
      <div className="desafios-grid">
        {filteredChallenges.map(challenge => {
          const isAttempted = attemptIds.has(challenge.id)
          const best = attempts.filter(a => a.challengeId === challenge.id).sort((a, b) => b.score - a.score)[0]
          return (
            <div key={challenge.id} className={`desafio-card ${isAttempted ? 'attempted' : ''}`} onClick={() => !isAttempted && startChallenge(challenge)}>
              <div className="desafio-card-top">
                <div className="desafio-card-badges">
                  <span className={`desafio-badge difficulty-${challenge.difficulty}`}>{DIFFICULTY_LABELS[challenge.difficulty]}</span>
                  <span className="desafio-badge questions-badge">{challenge.questionIds.length} questões</span>
                  {challenge.modifiers && challenge.modifiers.length > 0 && <span className="desafio-badge modifiers-badge">{challenge.modifiers.length} mod</span>}
                </div>
                {isAttempted && best ? <span className="desafio-card-score">★ {best.score} pts</span> : <span className="desafio-card-xp">+{challenge.xpBase} XP</span>}
              </div>
              <h4 className="desafio-card-title">{challenge.title}</h4>
              <p className="desafio-card-desc">{challenge.description}</p>
              <div className="desafio-card-footer">
                <span className="desafio-card-subject" style={{ background: SUBJECT_COLORS[challenge.subject]?.bg, color: SUBJECT_COLORS[challenge.subject]?.text }}>{challenge.subject}</span>
                {challenge.crossSubjects && challenge.crossSubjects.length > 0 && <span className="desafio-card-cross">+ {challenge.crossSubjects.join(', ')}</span>}
                <div className="desafio-card-actions" onClick={e => e.stopPropagation()}>
                  <button className="desafio-card-action-btn view-questions" onClick={() => setViewingQuestionsChallenge(challenge)} type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                    <span>Ver questões</span>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {filteredChallenges.length === 0 && (
          <div className="desafios-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M8 15h8" /></svg>
            <h4 className="desafios-empty-title">Nenhum desafio encontrado</h4>
            <p className="desafios-empty-desc">Crie um novo desafio ou mude o filtro.</p>
          </div>
        )}
      </div>

      {viewingQuestionsChallenge && (
        <div className="qv-overlay" onClick={() => { setViewingQuestionsChallenge(null); setExpandedQVQuestion(null) }}>
          <div className="qv-modal" onClick={e => e.stopPropagation()}>
            <div className="qv-header">
              <div className="qv-header-left">
                <div className="qv-header-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                </div>
                <div>
                  <h3 className="qv-title">{viewingQuestionsChallenge.title}</h3>
                  <span className="qv-subtitle">{viewingQuestionsChallenge.questionIds.length} {viewingQuestionsChallenge.questionIds.length === 1 ? 'questão' : 'questões'}</span>
                </div>
              </div>
              <button className="qv-close" onClick={() => { setViewingQuestionsChallenge(null); setExpandedQVQuestion(null) }} type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="qv-body">
              {viewingQuestionsChallenge.questionIds.length === 0 && (
                <div className="qv-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M8 15h8" /></svg>
                  <span>Nenhuma questão neste desafio</span>
                </div>
              )}

              {viewingQuestionsChallenge.questionIds.map((qId, idx) => {
                const q = questionMap.get(qId)
                if (!q) return null
                const isExpanded = expandedQVQuestion === qId
                const detailCount = q.type === 'multipla' || q.type === 'multipla_multipla' ? q.options.length
                  : q.type === 'verdadeiro_falso' ? q.statements.length
                  : q.type === 'ordem' ? q.orderItems.length
                  : q.type === 'completar' ? q.blanks.length
                  : 0

                return (
                  <div key={qId} className={`qv-card ${isExpanded ? 'expanded' : ''}`}>
                    <button className="qv-card-header" onClick={() => setExpandedQVQuestion(isExpanded ? null : qId)} type="button">
                      <div className="qv-card-left">
                        <span className="qv-card-num">{String(idx + 1).padStart(2, '0')}</span>
                        <div className="qv-card-info">
                          <span className="qv-card-title">{q.title}</span>
                          <div className="qv-card-badges">
                            <span className="qv-badge subject" style={{ background: SUBJECT_COLORS[q.subject]?.bg, color: SUBJECT_COLORS[q.subject]?.text }}>{q.subject}</span>
                            <span className="qv-badge type">{QUESTION_TYPE_LABELS[q.type]}</span>
                            <span className={`qv-badge difficulty diff-${q.difficulty}`}>{DIFFICULTY_LABELS[q.difficulty]}</span>
                            {detailCount > 0 && <span className="qv-badge detail-count">{detailCount} itens</span>}
                          </div>
                        </div>
                      </div>
                      <svg className={`qv-expand-icon ${isExpanded ? 'rotated' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>

                    {isExpanded && (
                      <div className="qv-card-detail">
                        {q.content && <p className="qv-card-content">{q.content}</p>}
                        {q.imageUrl && <img className="qv-card-img" src={q.imageUrl} alt="" />}

                        {(q.type === 'multipla' || q.type === 'multipla_multipla') && q.options.length > 0 && (
                          <div className="qv-options-preview">
                            {q.options.map((opt, oi) => (
                              <div key={opt.id} className={`qv-option-row ${opt.correct ? 'correct' : ''}`}>
                                <span className="qv-option-letter">{LETTERS[oi]}</span>
                                <span className="qv-option-text">{opt.text}</span>
                                {opt.correct && <svg className="qv-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === 'verdadeiro_falso' && q.statements.length > 0 && (
                          <div className="qv-options-preview">
                            {q.statements.map(st => (
                              <div key={st.id} className={`qv-option-row ${st.correct ? 'correct' : ''}`}>
                                <span className={`qv-tf-badge ${st.correct ? 'true' : 'false'}`}>{st.correct ? 'V' : 'F'}</span>
                                <span className="qv-option-text">{st.text}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === 'ordem' && q.orderItems.length > 0 && (
                          <div className="qv-options-preview">
                            {[...q.orderItems].sort((a, b) => a.correctOrder - b.correctOrder).map((item, oi) => (
                              <div key={item.id} className="qv-option-row">
                                <span className="qv-order-num">{oi + 1}°</span>
                                <span className="qv-option-text">{item.text}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === 'completar' && q.blanks.length > 0 && (
                          <div className="qv-options-preview">
                            {q.blanks.map((blank, bi) => (
                              <div key={blank.id} className="qv-option-row correct">
                                <span className="qv-fill-label">Lacuna {bi + 1}</span>
                                <span className="qv-option-text">→ {blank.answer}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {q.explanation && (
                          <div className="qv-explanation">
                            <strong>Explicação:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
