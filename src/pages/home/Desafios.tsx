import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { Challenge, ChallengeQuestion, QuestionAnswer, ChallengeAttempt, UserStreak, ChallengeDifficulty } from '../../types/challenge'
import { QUESTION_TYPE_LABELS } from '../../types/challenge'
import type { Subject } from '../../types/doc'
import { SUBJECTS, SUBJECT_COLORS } from '../../types/doc'
import QuestionBuilder from '../../components/QuestionBuilder'
import ChallengeBuilder from '../../components/ChallengeBuilder'
import { fetchQuestions, fetchChallenges, fetchAttempts, fetchStreak, createQuestion, updateQuestion, deleteQuestion, createChallenge, updateChallenge, deleteChallenge, createAttempt, upsertStreak, logActivity } from '../../lib/db'
import { supabase } from '../../lib/supabase'
import '../../styles/desafios.css'

/* ── Default empty state ─────────────────────────── */

const EMPTY_STREAK: UserStreak = {
  currentStreak: 0, longestStreak: 0, lastChallengeDate: null, totalXp: 0,
}

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

type View = 'list' | 'quiz' | 'results' | 'create_question' | 'create_challenge' | 'edit_question' | 'edit_challenge'

export default function Desafios() {
  const [questions, setQuestions] = useState<ChallengeQuestion[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [attempts, setAttempts] = useState<ChallengeAttempt[]>([])
  const [streak, setStreak] = useState<UserStreak>(EMPTY_STREAK)
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'Todas'>('Todas')
  const [view, setView] = useState<View>('list')
  const [currentUserId, setCurrentUserId] = useState<string>('')

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
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<ChallengeQuestion | null>(null)

  const startTimeRef = useRef<number>(0)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const dailyChallenge = useMemo(() => challenges.find(c => c.isDaily) || null, [challenges])
  const questionMap = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions])

  const filteredChallenges = useMemo(() => {
    const pool = challenges.filter(c => !c.isDaily)
    if (selectedSubject === 'Todas') return pool
    return pool.filter(c => c.subject === selectedSubject || c.crossSubjects?.includes(selectedSubject))
  }, [challenges, selectedSubject])

  const attemptIds = useMemo(() => new Set(attempts.map(a => a.challengeId)), [attempts])

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])
  useEffect(() => () => stopTimer(), [stopTimer])

  /* ── Load data from Supabase ───────────────────── */

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [qs, chs, ats, st] = await Promise.all([
          fetchQuestions(), fetchChallenges(), fetchAttempts(), fetchStreak(),
        ])
        if (!mounted) return
        setQuestions(qs)
        setChallenges(chs)
        setAttempts(ats)
        setStreak(st)
      } catch {
        // offline or not authenticated — stay empty
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    }).catch(() => {})
  }, [])

  const resetQuizState = useCallback(() => {
    setSelectedOptionIds([])
    setTfAnswers({})
    setShowFeedback(false)
    setDragOrder([])
    setFillAnswers({})
    setOpenText('')
    setSelfEval(null)
  }, [])

  /* ── Start Challenge ──────────────────────────── */

  const startChallenge = useCallback((challenge: Challenge) => {
    setActiveChallenge(challenge)
    setCurrentQIndex(0)
    setAnswers([])
    resetQuizState()
    setLastResult(null)
    setView('quiz')
    startTimeRef.current = Date.now()
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(Date.now() - startTimeRef.current), 200)
  }, [resetQuizState])

  /* ── Answer Logic per Type ────────────────────── */

  const getCurrentQuestion = useCallback((): ChallengeQuestion | null => {
    if (!activeChallenge) return null
    const qId = activeChallenge.questionIds[currentQIndex]
    return questionMap.get(qId) || null
  }, [activeChallenge, currentQIndex, questionMap])

  const isAnswerReady = useCallback((): boolean => {
    const q = getCurrentQuestion()
    if (!q) return false
    switch (q.type) {
      case 'multipla':
      case 'multipla_multipla':
        return selectedOptionIds.length > 0
      case 'verdadeiro_falso':
        return Object.keys(tfAnswers).length === q.statements.length
      case 'aberta':
        return true
      case 'ordem':
        return dragOrder.length === q.orderItems.length
      case 'completar':
        return q.blanks.every(b => fillAnswers[b.id]?.trim())
    }
  }, [getCurrentQuestion, selectedOptionIds, tfAnswers, dragOrder, fillAnswers])

  const checkAnswer = useCallback((): boolean => {
    const q = getCurrentQuestion()
    if (!q) return false
    switch (q.type) {
      case 'multipla':
        return q.options.find(o => selectedOptionIds.includes(o.id))?.correct ?? false
      case 'multipla_multipla': {
        const correctIds = new Set(q.options.filter(o => o.correct).map(o => o.id))
        const selectedSet = new Set(selectedOptionIds)
        return correctIds.size === selectedSet.size && [...correctIds].every(id => selectedSet.has(id))
      }
      case 'verdadeiro_falso':
        return q.statements.every(s => {
          const selectedCorrect = tfAnswers[s.id] === 'true'
          return s.correct === selectedCorrect
        })
      case 'aberta':
        return selfEval === 'correct'
      case 'ordem': {
        const correctOrder = [...q.orderItems].sort((a, b) => a.correctOrder - b.correctOrder).map(i => i.id)
        return dragOrder.every((id, idx) => id === correctOrder[idx])
      }
      case 'completar':
        return q.blanks.every(b => fillAnswers[b.id]?.trim().toLowerCase() === b.answer.toLowerCase())
    }
  }, [getCurrentQuestion, selectedOptionIds, tfAnswers, dragOrder, fillAnswers, selfEval])

  /* ── Confirm / Next ───────────────────────────── */

  const handleConfirm = useCallback(() => {
    if (!activeChallenge) return
    setShowFeedback(true)
    const q = getCurrentQuestion()
    if (!q) return
    const correct = checkAnswer()
    setAnswers(prev => [...prev, {
      questionId: q.id, type: q.type, selectedOptionIds: q.type === 'verdadeiro_falso' ? Object.values(tfAnswers) : [...selectedOptionIds],
      openText, orderAnswers: [...dragOrder], fillAnswers: { ...fillAnswers }, correct,
    }])
  }, [activeChallenge, getCurrentQuestion, checkAnswer, selectedOptionIds, tfAnswers, openText, dragOrder, fillAnswers])

  const handleNext = useCallback(() => {
    if (!activeChallenge) return
    const isLast = currentQIndex >= activeChallenge.questionIds.length - 1
    if (isLast) {
      stopTimer()
      const totalTimeMs = Date.now() - startTimeRef.current
      const correctCount = answers.filter(a => a.correct).length
      const wrongCount = answers.length - correctCount
      const { score, xpEarned } = calculateScore(correctCount, wrongCount, totalTimeMs, activeChallenge.questionIds.length, activeChallenge.difficulty)
      const attempt: ChallengeAttempt = {
        id: crypto.randomUUID(), challengeId: activeChallenge.id, answers: [...answers], totalTimeMs,
        correctCount, wrongCount, score, xpEarned, completedAt: Date.now(),
      }
      setAttempts(prev => [...prev, attempt])
      setLastResult(attempt)
      setStreak(prev => {
        const ns = {
          currentStreak: correctCount > wrongCount ? prev.currentStreak + 1 : 0,
          longestStreak: correctCount > wrongCount ? Math.max(prev.longestStreak, prev.currentStreak + 1) : prev.longestStreak,
          totalXp: prev.totalXp + xpEarned,
          lastChallengeDate: new Date().toISOString().split('T')[0],
        }
        createAttempt(attempt).catch(() => {})
        upsertStreak(ns).catch(() => {})
        const isWin = correctCount > wrongCount
        logActivity(
          'challenge_done',
          `${isWin ? 'Acertou' : 'Errou'} "${activeChallenge.title}" (${correctCount}/${activeChallenge.questionIds.length})`,
          'challenge',
          isWin ? '#b450b4' : '#c86450',
        ).catch(() => {})
        return ns
      })
      setView('results')
    } else {
      setCurrentQIndex(i => i + 1)
      resetQuizState()
    }
  }, [activeChallenge, currentQIndex, answers, stopTimer, resetQuizState])

  const handleBackToList = useCallback(() => { setView('list'); setActiveChallenge(null); setLastResult(null); stopTimer() }, [stopTimer])

  /* ── Builder Callbacks ────────────────────────── */

  const handleSaveQuestion = useCallback((q: ChallengeQuestion) => {
    setQuestions(prev => {
      const idx = prev.findIndex(p => p.id === q.id)
      if (idx >= 0) { const updated = [...prev]; updated[idx] = q; updateQuestion(q).catch(() => {}); return updated }
      createQuestion(q).catch(() => {})
      return [...prev, q]
    })
    setView('list')
    setEditingQuestion(null)
  }, [])

  const handleSaveChallenge = useCallback((_c: Challenge, _newQs: ChallengeQuestion[]) => {
    setChallenges(prev => {
      const idx = prev.findIndex(p => p.id === _c.id)
      if (idx >= 0) { const updated = [...prev]; updated[idx] = _c; updateChallenge(_c).catch(() => {}); return updated }
      createChallenge(_c).catch(() => {})
      return [...prev, _c]
    })
    setView('list')
  }, [])

  const handleDeleteChallenge = useCallback(async () => {
    if (!deleteChallengeTarget) return
    try {
      await deleteChallenge(deleteChallengeTarget.id)
      setChallenges(prev => prev.filter(c => c.id !== deleteChallengeTarget.id))
      logActivity('challenge_deleted', `Deletou "${deleteChallengeTarget.title}"`, 'challenge', '#c85050').catch(() => {})
    } catch (e) {
      console.error('Erro ao deletar desafio:', e)
    }
    setDeleteChallengeTarget(null)
  }, [deleteChallengeTarget])

  const handleEditChallenge = useCallback((challenge: Challenge) => {
    setEditingChallenge(challenge)
    setView('edit_challenge')
  }, [])

  const handleEditQuestionFromList = useCallback((q: ChallengeQuestion) => {
    setEditingQuestion(q)
    setView('edit_question')
  }, [])

  const handleDeleteQuestionFromList = useCallback(async () => {
    if (!deleteQuestionTarget) return
    try {
      await deleteQuestion(deleteQuestionTarget.id)
      setQuestions(prev => prev.filter(q => q.id !== deleteQuestionTarget.id))
      setChallenges(prev => prev.map(c => ({
        ...c,
        questionIds: c.questionIds.filter(id => id !== deleteQuestionTarget.id),
      })))
      logActivity('question_deleted', `Deletou questão "${deleteQuestionTarget.title}"`, 'challenge', '#c85050').catch(() => {})
    } catch (e) {
      console.error('Erro ao deletar questão:', e)
    }
    setDeleteQuestionTarget(null)
  }, [deleteQuestionTarget])

  /* ── Initialize drag order on mount ───────────── */

  useEffect(() => {
    if (view === 'quiz') {
      const q = getCurrentQuestion()
      if (q?.type === 'ordem' && dragOrder.length === 0) {
        setDragOrder(shuffleArray(q.orderItems.map(i => i.id)))
      }
    }
  }, [view, getCurrentQuestion, dragOrder.length])

  /* ═══════════════════════════════════════════════════
     QUIZ VIEW
     ═══════════════════════════════════════════════════ */

  if (view === 'quiz' && activeChallenge) {
    const q = getCurrentQuestion()
    if (!q) return null
    const progress = ((currentQIndex + 1) / activeChallenge.questionIds.length) * 100

    const renderQuizBody = () => {
      if (q.content && q.type !== 'completar') {
        return <p className="quiz-content-text">{q.content}</p>
      }
      return null
    }

    const renderTypeSpecific = () => {
      switch (q.type) {
        case 'multipla':
          return (
            <div className="quiz-options">
              {q.options.map((opt, idx) => {
                let cls = 'quiz-option'
                if (showFeedback) { if (opt.correct) cls += ' correct'; else if (selectedOptionIds.includes(opt.id)) cls += ' wrong' }
                else if (selectedOptionIds.includes(opt.id)) cls += ' selected'
                return (
                  <div key={opt.id} className={cls} onClick={() => !showFeedback && setSelectedOptionIds([opt.id])}>
                    <span className="quiz-option-letter">{LETTERS[idx]}</span>
                    <span className="quiz-option-text">{opt.text}</span>
                    {showFeedback && opt.correct && <svg className="quiz-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
                    {showFeedback && selectedOptionIds.includes(opt.id) && !opt.correct && <svg className="quiz-option-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
                  </div>
                )
              })}
            </div>
          )
        case 'multipla_multipla':
          return (
            <div className="quiz-options">
              {q.options.map((opt, idx) => {
                let cls = 'quiz-option'
                if (showFeedback) { if (opt.correct) cls += ' correct'; else if (selectedOptionIds.includes(opt.id)) cls += ' wrong' }
                else if (selectedOptionIds.includes(opt.id)) cls += ' selected'
                return (
                  <div key={opt.id} className={cls} onClick={() => { if (!showFeedback) setSelectedOptionIds(prev => prev.includes(opt.id) ? prev.filter(x => x !== opt.id) : [...prev, opt.id]) }}>
                    <span className="quiz-option-letter">{LETTERS[idx]}</span>
                    <span className="quiz-option-text">{opt.text}</span>
                    {showFeedback && opt.correct && <svg className="quiz-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
                    {showFeedback && selectedOptionIds.includes(opt.id) && !opt.correct && <svg className="quiz-option-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
                  </div>
                )
              })}
              <p className="qb-hint">Selecione todas as alternativas corretas</p>
            </div>
          )
        case 'verdadeiro_falso':
          return (
            <div className="quiz-options">
              {q.statements.map(st => {
                const selectedVal = tfAnswers[st.id]
                let cls = 'quiz-option'
                if (showFeedback) {
                  const isCorrect = (selectedVal === 'true') === st.correct
                  cls += isCorrect ? ' correct' : ' wrong'
                } else if (selectedVal) cls += ' selected'
                return (
                  <div key={st.id} className={cls}>
                    <span className="quiz-option-text" style={{ flex: 1 }}>{st.text}</span>
                    {!showFeedback && (
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button className={`quiz-tf-btn ${selectedVal === 'true' ? 'active' : ''}`} onClick={() => { setTfAnswers(prev => ({ ...prev, [st.id]: 'true' })) }} type="button">V</button>
                        <button className={`quiz-tf-btn ${selectedVal === 'false' ? 'active' : ''}`} onClick={() => { setTfAnswers(prev => ({ ...prev, [st.id]: 'false' })) }} type="button">F</button>
                      </div>
                    )}
                    {showFeedback && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: ((selectedVal === 'true') === st.correct) ? '#64b478' : '#c85050' }}>
                        {st.correct ? 'V' : 'F'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        case 'aberta':
          return (
            <div className="quiz-selfeval">
              <textarea className="quiz-selfeval-input" value={openText} placeholder="Digite sua resposta aqui..." onChange={e => setOpenText(e.target.value)} disabled={showFeedback} />
              {showFeedback && (
                <div className="quiz-selfeval-actions">
                  <span className="qb-hint" style={{ flex: 1 }}>Você acertou?</span>
                  <button className="quiz-selfeval-btn correct" onClick={() => { setSelfEval('correct') }} type="button">Acertei</button>
                  <button className="quiz-selfeval-btn wrong" onClick={() => { setSelfEval('wrong') }} type="button">Errei</button>
                </div>
              )}
              {showFeedback && q.openExpectedText && (
                <div className="quiz-explanation">
                  <span className="quiz-explanation-label">Resposta esperada</span>
                  <p>{q.openExpectedText}</p>
                </div>
              )}
            </div>
          )
        case 'ordem': {
          const ordered = dragOrder.map(id => q.orderItems.find(i => i.id === id)!).filter(Boolean)
          return (
            <div className="quiz-drag-list">
              {ordered.map((item, idx) => (
                <div key={item.id} className="quiz-drag-item" onClick={() => {
                  if (showFeedback) return
                  if (idx < ordered.length - 1) {
                    const newOrder = [...dragOrder]
                    ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
                    setDragOrder(newOrder)
                  }
                }}>
                  <span className="quiz-drag-num">{idx + 1}°</span>
                  <span className="quiz-drag-text">{item.text}</span>
                  <span className="quiz-drag-handle">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" /></svg>
                  </span>
                  {showFeedback && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: item.correctOrder === idx + 1 ? '#64b478' : '#c85050', flexShrink: 0 }}>
                      {item.correctOrder === idx + 1 ? '✓' : `${item.correctOrder}°`}
                    </span>
                  )}
                </div>
              ))}
              {!showFeedback && <p className="qb-hint">Clique em um item para trocar com o próximo</p>}
            </div>
          )
        }
        case 'completar': {
          const textParts = q.content?.split('_') || ['']
          return (
            <div className="quiz-fill-text">
              {textParts.map((part, i) => (
                <span key={i}>
                  {part}
                  {i < q.blanks.length && (
                    <span className="quiz-fill-blank">
                      <input
                        className={`quiz-fill-input ${showFeedback ? (fillAnswers[q.blanks[i].id]?.toLowerCase() === q.blanks[i].answer.toLowerCase() ? 'correct' : 'wrong') : ''}`}
                        value={fillAnswers[q.blanks[i].id] || ''}
                        placeholder={`Lacuna ${i + 1}`}
                        disabled={showFeedback}
                        onChange={e => setFillAnswers(prev => ({ ...prev, [q.blanks[i].id]: e.target.value }))}
                      />
                      {showFeedback && (
                        <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 700, color: fillAnswers[q.blanks[i].id]?.toLowerCase() === q.blanks[i].answer.toLowerCase() ? '#64b478' : '#c85050' }}>
                          ({q.blanks[i].answer})
                        </span>
                      )}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )
        }
      }
    }

    return (
      <div className="desafios-page">
        <div className="quiz-header">
          <button className="quiz-back-btn" onClick={handleBackToList} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          </button>
          <div className="quiz-info">
            <span className="quiz-challenge-name">{activeChallenge.title}</span>
            <span className="quiz-progress-text">{currentQIndex + 1} / {activeChallenge.questionIds.length}</span>
          </div>
          <div className="quiz-timer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            <span>{formatTime(elapsed)}</span>
          </div>
        </div>
        <div className="quiz-progress-bar"><div className="quiz-progress-fill" style={{ width: `${progress}%` }} /></div>
        <div className="quiz-body">
          <div className="quiz-question-type-badge">{QUESTION_TYPE_LABELS[q.type]}</div>
          <p className="quiz-question-text">{q.title}</p>
          {renderQuizBody()}
          {q.imageUrl && <img src={q.imageUrl} alt="" className="quiz-image" />}
          {renderTypeSpecific()}
          {showFeedback && q.explanation && (
            <div className="quiz-explanation">
              <span className="quiz-explanation-label">Explicação</span>
              <p>{q.explanation}</p>
            </div>
          )}
        </div>
        <div className="quiz-footer">
          {!showFeedback ? (
            <button className="quiz-confirm-btn" disabled={!isAnswerReady()} onClick={handleConfirm} type="button">Confirmar</button>
          ) : (
            <button className="quiz-next-btn" onClick={handleNext} type="button">
              {currentQIndex >= activeChallenge.questionIds.length - 1 ? 'Ver resultado' : 'Próxima'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
          )}
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════
     RESULTS VIEW
     ═══════════════════════════════════════════════════ */

  if (view === 'results' && lastResult && activeChallenge) {
    const accuracy = Math.round((lastResult.correctCount / activeChallenge.questionIds.length) * 100)
    const isWin = lastResult.correctCount > lastResult.wrongCount
    return (
      <div className="desafios-page">
        <div className="results-container">
          <div className={`results-icon ${isWin ? 'win' : 'lose'}`}>
            {isWin ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
          </div>
          <h2 className="results-title">{isWin ? 'Parabéns!' : 'Continue tentando!'}</h2>
          <p className="results-challenge-name">{activeChallenge.title}</p>
          <div className="results-score"><span className="results-score-value">{lastResult.score}</span><span className="results-score-label">pontos</span></div>
          <div className="results-grid">
            <div className="results-stat"><div className="results-stat-value correct">{lastResult.correctCount}</div><div className="results-stat-label">Acertos</div></div>
            <div className="results-stat"><div className="results-stat-value wrong">{lastResult.wrongCount}</div><div className="results-stat-label">Erros</div></div>
            <div className="results-stat"><div className="results-stat-value time">{formatTime(lastResult.totalTimeMs)}</div><div className="results-stat-label">Tempo</div></div>
            <div className="results-stat"><div className="results-stat-value xp">+{lastResult.xpEarned}</div><div className="results-stat-label">XP</div></div>
          </div>
          <div className="results-accuracy">
            <span className="results-accuracy-label">Precisão</span>
            <div className="results-accuracy-bar"><div className="results-accuracy-fill" style={{ width: `${accuracy}%` }} /></div>
            <span className="results-accuracy-value">{accuracy}%</span>
          </div>
          <button className="quiz-next-btn results-back-btn" onClick={handleBackToList} type="button">Voltar aos desafios</button>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════
     CREATE QUESTION VIEW
     ═══════════════════════════════════════════════════ */

  if (view === 'create_question' || view === 'edit_question') {
    return (
      <div className="desafios-page">
        <QuestionBuilder
          initial={editingQuestion || undefined}
          onSave={handleSaveQuestion}
          onCancel={() => { setView('list'); setEditingQuestion(null) }}
        />
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════
     CREATE / EDIT CHALLENGE VIEW
     ═══════════════════════════════════════════════════ */

  if (view === 'create_challenge' || view === 'edit_challenge') {
    return (
      <div className="desafios-page">
        <ChallengeBuilder
          allQuestions={questions}
          initial={editingChallenge || undefined}
          onSave={handleSaveChallenge}
          onCancel={() => { setView('list'); setEditingChallenge(null) }}
        />
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════
      LIST VIEW
      ═══════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="desafios-page">
        <div className="desafios-empty">
          <div className="quiz-spinner" />
          <h4 className="desafios-empty-title">Carregando desafios...</h4>
        </div>
      </div>
    )
  }

  return (
    <div className="desafios-page">
      <div className="desafios-header">
        <div className="desafios-header-left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
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

      <div className="desafios-create-bar">
        <button className="desafios-create-btn primary" onClick={() => setView('create_question')} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nova questão
        </button>
        <button className="desafios-create-btn secondary" onClick={() => setView('create_challenge')} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          Novo desafio
        </button>
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
          const isOwner = currentUserId && challenge.userId === currentUserId
          return (
            <div key={challenge.id} className={`desafio-card ${isAttempted ? 'attempted' : ''}`} onClick={() => !isAttempted && startChallenge(challenge)}>
              <div className="desafio-card-top">
                <div className="desafio-card-badges">
                  <span className={`desafio-badge difficulty-${challenge.difficulty}`}>{DIFFICULTY_LABELS[challenge.difficulty]}</span>
                  <span className="desafio-badge questions-badge">{challenge.questionIds.length} questões</span>
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                    <span>Ver questões</span>
                  </button>
                  {isOwner && (
                    <>
                      <button className="desafio-card-action-btn edit" onClick={() => handleEditChallenge(challenge)} type="button" title="Editar desafio">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </button>
                      <button className="desafio-card-action-btn delete" onClick={() => setDeleteChallengeTarget(challenge)} type="button" title="Deletar desafio">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {filteredChallenges.length === 0 && (
          <div className="desafios-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M8 15h8" /></svg>
            <h4 className="desafios-empty-title">Nenhum desafio nessa matéria</h4>
            <p className="desafios-empty-desc">Crie um novo desafio ou tente outro filtro.</p>
          </div>
        )}
      </div>

      {deleteChallengeTarget && (
        <div className="desafio-modal-overlay" onClick={() => setDeleteChallengeTarget(null)}>
          <div className="desafio-modal desafio-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="desafio-confirm-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
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

      {viewingQuestionsChallenge && (
        <div className="desafio-modal-overlay" onClick={() => setViewingQuestionsChallenge(null)}>
          <div className="qb-container questions-view-modal" onClick={e => e.stopPropagation()}>
            <div className="qb-header">
              <div>
                <h3 className="qb-title">Questões de "{viewingQuestionsChallenge.title}"</h3>
                <span style={{ fontSize: 13, color: '#7a6a5a' }}>{viewingQuestionsChallenge.questionIds.length} questões</span>
              </div>
              <button className="qb-cancel-btn" onClick={() => setViewingQuestionsChallenge(null)} type="button">Fechar</button>
            </div>
            <div className="qb-body">
              {viewingQuestionsChallenge.questionIds.length === 0 && (
                <div className="cb-empty">Nenhuma questão neste desafio.</div>
              )}
              {viewingQuestionsChallenge.questionIds.map((qId, idx) => {
                const q = questionMap.get(qId)
                if (!q) return null
                return (
                  <div key={qId} className="question-view-item">
                    <div className="question-view-num">{idx + 1}</div>
                    <div className="question-view-info">
                      <span className="question-view-title">{q.title}</span>
                      <div className="question-view-meta">
                        <span className="question-view-type">{QUESTION_TYPE_LABELS[q.type]}</span>
                        <span className="question-view-subject" style={{ background: SUBJECT_COLORS[q.subject]?.bg, color: SUBJECT_COLORS[q.subject]?.text }}>{q.subject}</span>
                      </div>
                      {q.content && <p className="question-view-content">{q.content}</p>}
                    </div>
                    <div className="question-view-actions">
                      <button className="desafio-card-action-btn edit" onClick={() => { setViewingQuestionsChallenge(null); handleEditQuestionFromList(q) }} type="button" title="Editar questão">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </button>
                      <button className="desafio-card-action-btn delete" onClick={() => setDeleteQuestionTarget(q)} type="button" title="Deletar questão">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {deleteQuestionTarget && (
        <div className="desafio-modal-overlay" onClick={() => setDeleteQuestionTarget(null)}>
          <div className="desafio-modal desafio-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="desafio-confirm-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <h3 className="desafio-modal-title">Deletar questão?</h3>
            <p className="desafio-confirm-text">"{deleteQuestionTarget.title}" será removida permanentemente de todos os desafios.</p>
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
