import { useState, useCallback, useMemo } from 'react'
import type { MasteryQuestion, MasteryMCResult, MasteryWrittenResult, MasterySummaryResult, VideoNote } from '../types/video'
import { callMasteryTest, recordAction } from '../lib/db'

interface MasteryTestProps {
  notes: VideoNote[]
  videoTitle: string
  videoDescription: string
  onClose: () => void
}

type ViewState = 'loading' | 'summary_input' | 'summary_result' | 'mc_loading' | 'mc_questions' | 'mc_result' | 'written_loading' | 'written_questions' | 'written_result' | 'final'

export default function MasteryTest({ notes, videoTitle, videoDescription, onClose }: MasteryTestProps) {
  const [view, setView] = useState<ViewState>('summary_input')
  const [summaryText, setSummaryText] = useState('')
  const [summaryResult, setSummaryResult] = useState<MasterySummaryResult | null>(null)
  const [mcQuestions, setMcQuestions] = useState<MasteryQuestion[]>([])
  const [mcAnswers, setMcAnswers] = useState<Record<string, number>>({})
  const [mcResults, setMcResults] = useState<MasteryMCResult[]>([])
  const [mcScore, setMcScore] = useState(0)
  const [writtenQuestions, setWrittenQuestions] = useState<MasteryQuestion[]>([])
  const [writtenAnswers, setWrittenAnswers] = useState<Record<string, string>>({})
  const [writtenResults, setWrittenResults] = useState<MasteryWrittenResult[]>([])
  const [writtenScore, setWrittenScore] = useState(0)
  const [error, setError] = useState('')

  const noteTexts = useMemo(() => notes.map(n => n.text), [notes])

  const handleSummarySubmit = useCallback(async () => {
    if (!summaryText.trim()) return
    setView('loading')
    setError('')
    try {
      const res = await callMasteryTest({
        notes: noteTexts,
        videoTitle,
        videoDescription,
        stage: 'summary',
        userAnswer: summaryText,
      })
      setSummaryResult({
        score: Number(res.score) || 0,
        feedback: String(res.feedback || ''),
      })
      setView('summary_result')
    } catch {
      setError('Erro ao avaliar resumo. Tente novamente.')
      setView('summary_input')
    }
  }, [summaryText, noteTexts, videoTitle, videoDescription])

  const handleStartMC = useCallback(async () => {
    setMcQuestions([])
    setMcAnswers({})
    setMcResults([])
    setMcScore(0)
    setView('mc_loading')
    setError('')
    try {
      const res = await callMasteryTest({
        notes: noteTexts,
        videoTitle,
        videoDescription,
        stage: 'multiple_choice',
      })
      const data = res as unknown as { questions: MasteryQuestion[] }
      setMcQuestions(data.questions || [])
      setView('mc_questions')
    } catch {
      setError('Erro ao gerar questões. Tente novamente.')
      setView('summary_result')
    }
  }, [noteTexts, videoTitle, videoDescription])

  const handleMCSubmit = useCallback(async () => {
    setView('mc_loading')
    setError('')
    try {
      const res = await callMasteryTest({
        notes: noteTexts,
        videoTitle,
        videoDescription,
        stage: 'multiple_choice',
        userAnswer: JSON.stringify(mcAnswers),
        questions: mcQuestions,
      })
      const data = res as unknown as { results: MasteryMCResult[]; score: number }
      setMcResults(data.results || [])
      setMcScore(data.score || 0)
      setView('mc_result')
    } catch {
      setError('Erro ao corrigir. Tente novamente.')
      setView('mc_questions')
    }
  }, [mcAnswers, mcQuestions, noteTexts, videoTitle, videoDescription])

  const handleStartWritten = useCallback(async () => {
    setWrittenQuestions([])
    setWrittenAnswers({})
    setWrittenResults([])
    setWrittenScore(0)
    setView('written_loading')
    setError('')
    try {
      const res = await callMasteryTest({
        notes: noteTexts,
        videoTitle,
        videoDescription,
        stage: 'written',
      })
      const data = res as unknown as { questions: MasteryQuestion[] }
      setWrittenQuestions(data.questions || [])
      setView('written_questions')
    } catch {
      setError('Erro ao gerar questões. Tente novamente.')
      setView('mc_result')
    }
  }, [noteTexts, videoTitle, videoDescription])

  const handleWrittenSubmit = useCallback(async () => {
    setView('written_loading')
    setError('')
    try {
      const res = await callMasteryTest({
        notes: noteTexts,
        videoTitle,
        videoDescription,
        stage: 'written',
        userAnswer: JSON.stringify(writtenAnswers),
        questions: writtenQuestions,
      })
      const data = res as unknown as { results: MasteryWrittenResult[]; averageScore: number }
      setWrittenResults(data.results || [])
      setWrittenScore(data.averageScore || 0)
      recordAction('mastery').catch(() => {})
      setView('written_result')
    } catch {
      setError('Erro ao corrigir. Tente novamente.')
      setView('written_questions')
    }
  }, [writtenAnswers, writtenQuestions, noteTexts, videoTitle, videoDescription])

  const handleShowFinal = useCallback(() => {
    setView('final')
  }, [])

  const finalScore = summaryResult
    ? Math.round((summaryResult.score + mcScore + writtenScore) / 3)
    : 0

  const scoreColor = finalScore >= 70 ? '#6ab86a' : finalScore >= 40 ? '#daa03c' : '#c85050'
  const scoreLabel = finalScore >= 90 ? 'Excelente!' : finalScore >= 70 ? 'Muito bem!' : finalScore >= 40 ? 'Razoável' : 'Precisa estudar mais'

  return (
    <div className="mastery-overlay" onClick={onClose}>
      <div className="mastery-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="mastery-header">
          <div className="mastery-header-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15l-2 5l9-11h-7l2-5-9 11h7z" />
            </svg>
            <h2 className="mastery-title">Teste de Maestria</h2>
          </div>
          <button className="mastery-close" onClick={onClose} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Progress bar ── */}
        <div className="mastery-progress">
          <div className={`mastery-progress-step ${view !== 'summary_input' && view !== 'loading' ? 'done' : view === 'loading' ? 'active' : ''}`}>
            <span className="mastery-step-num">1</span>
            <span className="mastery-step-label">Resumo</span>
          </div>
          <div className={`mastery-progress-line ${mcQuestions.length > 0 || view === 'mc_loading' || view === 'mc_questions' || view === 'mc_result' ? 'done' : ''}`} />
          <div className={`mastery-progress-step ${view === 'mc_result' || view === 'written_loading' || view === 'written_questions' || view === 'written_result' || view === 'final' ? 'done' : view === 'mc_loading' ? 'active' : ''}`}>
            <span className="mastery-step-num">2</span>
            <span className="mastery-step-label">Alternativas</span>
          </div>
          <div className={`mastery-progress-line ${writtenResults.length > 0 || view === 'written_loading' || view === 'written_questions' || view === 'written_result' || view === 'final' ? 'done' : ''}`} />
          <div className={`mastery-progress-step ${view === 'final' || view === 'written_result' ? 'done' : view === 'written_loading' ? 'active' : ''}`}>
            <span className="mastery-step-num">3</span>
            <span className="mastery-step-label">Escritas</span>
          </div>
        </div>

        {error && <div className="mastery-error">{error}</div>}

        {/* ── Content ── */}

        {/* Loading */}
        {(view === 'loading' || view === 'mc_loading' || view === 'written_loading') && (
          <div className="mastery-loading">
            <div className="mastery-loading-spinner" />
            <p className="mastery-loading-text">
              {view === 'loading' && 'Avaliando seu resumo...'}
              {view === 'mc_loading' && !mcQuestions.length && 'Gerando questões de alternativas...'}
              {view === 'mc_loading' && mcQuestions.length > 0 && 'Corrigindo suas respostas...'}
              {view === 'written_loading' && !writtenQuestions.length && 'Gerando questões escritas...'}
              {view === 'written_loading' && writtenQuestions.length > 0 && 'Avaliando suas respostas...'}
            </p>
            <p className="mastery-loading-sub">A IA está processando, isso pode levar alguns segundos</p>
          </div>
        )}

        {/* Step 1: Summary input */}
        {view === 'summary_input' && (
          <div className="mastery-stage">
            <h3 className="mastery-stage-title">
              <span className="mastery-stage-num">Etapa 1</span>
              Resuma o vídeo
            </h3>
            <p className="mastery-stage-desc">
              Escreva um resumo do conteúdo do vídeo com base nas suas anotações.
              A IA avaliará sua compreensão de 0 a 100.
            </p>
            <textarea
              className="mastery-textarea"
              placeholder="Escreva seu resumo aqui..."
              rows={8}
              value={summaryText}
              onChange={e => setSummaryText(e.target.value)}
            />
            <div className="mastery-stage-actions">
              <button
                className="mastery-btn mastery-btn-primary"
                disabled={!summaryText.trim()}
                onClick={handleSummarySubmit}
                type="button"
              >
                Avaliar resumo
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Summary result */}
        {view === 'summary_result' && summaryResult && (
          <div className="mastery-stage">
            <h3 className="mastery-stage-title">
              <span className="mastery-stage-num">Etapa 1</span>
              Resultado do resumo
            </h3>
            <div className="mastery-score-card">
              <div className="mastery-score-gauge">
                <svg viewBox="0 0 120 120" className="mastery-gauge-svg">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(200,180,140,0.1)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke={summaryResult.score >= 70 ? '#6ab86a' : summaryResult.score >= 40 ? '#daa03c' : '#c85050'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(summaryResult.score / 100) * 314} 314`}
                    transform="rotate(-90 60 60)"
                  />
                  <text x="60" y="55" textAnchor="middle" className="mastery-gauge-score">{summaryResult.score}</text>
                  <text x="60" y="72" textAnchor="middle" className="mastery-gauge-label">de 100</text>
                </svg>
              </div>
              <p className="mastery-score-feedback">{summaryResult.feedback}</p>
            </div>
            <div className="mastery-stage-actions">
              <button className="mastery-btn mastery-btn-secondary" onClick={() => { setView('summary_input'); setSummaryText(''); setSummaryResult(null) }} type="button">
                Refazer
              </button>
              <button className="mastery-btn mastery-btn-primary" onClick={handleStartMC} type="button">
                Próxima etapa
              </button>
            </div>
          </div>
        )}

        {/* Step 2: MC questions */}
        {view === 'mc_questions' && (
          <div className="mastery-stage">
            <h3 className="mastery-stage-title">
              <span className="mastery-stage-num">Etapa 2</span>
              Questões de alternativas
            </h3>
            <div className="mastery-questions-list">
              {mcQuestions.map((q, i) => (
                <div key={q.id} className="mastery-question-card">
                  <p className="mastery-question-text">{i + 1}. {q.question}</p>
                  <div className="mastery-options">
                    {q.options?.map((opt, oi) => (
                      <label key={oi} className={`mastery-option ${mcAnswers[q.id] === oi ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name={`mc-${q.id}`}
                          checked={mcAnswers[q.id] === oi}
                          onChange={() => setMcAnswers(prev => ({ ...prev, [q.id]: oi }))}
                        />
                        <span className="mastery-option-letter">{String.fromCharCode(65 + oi)}</span>
                        <span className="mastery-option-text">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mastery-stage-actions">
              <button
                className="mastery-btn mastery-btn-primary"
                disabled={Object.keys(mcAnswers).length < mcQuestions.length}
                onClick={handleMCSubmit}
                type="button"
              >
                Verificar respostas
              </button>
            </div>
          </div>
        )}

        {/* Step 2: MC result */}
        {view === 'mc_result' && (
          <div className="mastery-stage">
            <h3 className="mastery-stage-title">
              <span className="mastery-stage-num">Etapa 2</span>
              Resultado das alternativas
            </h3>
            <div className="mastery-score-card">
              <div className="mastery-score-gauge">
                <svg viewBox="0 0 120 120" className="mastery-gauge-svg">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(200,180,140,0.1)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke={mcScore >= 70 ? '#6ab86a' : mcScore >= 40 ? '#daa03c' : '#c85050'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(mcScore / 100) * 314} 314`}
                    transform="rotate(-90 60 60)"
                  />
                  <text x="60" y="55" textAnchor="middle" className="mastery-gauge-score">{mcScore}</text>
                  <text x="60" y="72" textAnchor="middle" className="mastery-gauge-label">de 100</text>
                </svg>
              </div>
            </div>
            <div className="mastery-results-list">
              {mcQuestions.map((q, i) => {
                const r = mcResults.find(r => r.id === q.id)
                const userAns = mcAnswers[q.id]
                return (
                  <div key={q.id} className={`mastery-result-item ${r?.correct ? 'correct' : 'wrong'}`}>
                    <div className="mastery-result-header">
                      <span className="mastery-result-num">{i + 1}</span>
                      <span className="mastery-result-status">{r?.correct ? 'Correto' : 'Errado'}</span>
                    </div>
                    <p className="mastery-result-question">{q.question}</p>
                    <p className="mastery-result-answer">
                      Sua resposta: <strong>{q.options?.[userAns] || '—'}</strong>
                      {!r?.correct && q.correctAnswer && <>, Correto: <strong>{q.correctAnswer}</strong></>}
                    </p>
                    {r?.explanation && <p className="mastery-result-explanation">{r.explanation}</p>}
                  </div>
                )
              })}
            </div>
            <div className="mastery-stage-actions">
              <button className="mastery-btn mastery-btn-primary" onClick={handleStartWritten} type="button">
                Próxima etapa
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Written questions */}
        {view === 'written_questions' && (
          <div className="mastery-stage">
            <h3 className="mastery-stage-title">
              <span className="mastery-stage-num">Etapa 3</span>
              Questões escritas
            </h3>
            <div className="mastery-questions-list">
              {writtenQuestions.map((q, i) => (
                <div key={q.id} className="mastery-question-card">
                  <p className="mastery-question-text">{i + 1}. {q.question}</p>
                  {q.hint && <p className="mastery-question-hint">Dica: {q.hint}</p>}
                  <textarea
                    className="mastery-textarea mastery-textarea-sm"
                    placeholder="Sua resposta..."
                    rows={3}
                    value={writtenAnswers[q.id] || ''}
                    onChange={e => setWrittenAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="mastery-stage-actions">
              <button
                className="mastery-btn mastery-btn-primary"
                disabled={Object.values(writtenAnswers).filter(v => v.trim()).length < writtenQuestions.length}
                onClick={handleWrittenSubmit}
                type="button"
              >
                Enviar para avaliação
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Written result */}
        {view === 'written_result' && (
          <div className="mastery-stage">
            <h3 className="mastery-stage-title">
              <span className="mastery-stage-num">Etapa 3</span>
              Resultado das escritas
            </h3>
            <div className="mastery-score-card">
              <div className="mastery-score-gauge">
                <svg viewBox="0 0 120 120" className="mastery-gauge-svg">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(200,180,140,0.1)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke={writtenScore >= 70 ? '#6ab86a' : writtenScore >= 40 ? '#daa03c' : '#c85050'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(writtenScore / 100) * 314} 314`}
                    transform="rotate(-90 60 60)"
                  />
                  <text x="60" y="55" textAnchor="middle" className="mastery-gauge-score">{writtenScore}</text>
                  <text x="60" y="72" textAnchor="middle" className="mastery-gauge-label">de 100</text>
                </svg>
              </div>
            </div>
            <div className="mastery-results-list">
              {writtenQuestions.map((q, i) => {
                const r = writtenResults.find(r => r.id === q.id)
                return (
                  <div key={q.id} className="mastery-result-item">
                    <div className="mastery-result-header">
                      <span className="mastery-result-num">{i + 1}</span>
                      <span className="mastery-result-score">{r?.score || 0}/100</span>
                    </div>
                    <p className="mastery-result-question">{q.question}</p>
                    <p className="mastery-result-answer">Sua resposta: <strong>{writtenAnswers[q.id]}</strong></p>
                    {r?.feedback && <p className="mastery-result-explanation">{r.feedback}</p>}
                  </div>
                )
              })}
            </div>
            <div className="mastery-stage-actions">
              <button className="mastery-btn mastery-btn-primary" onClick={handleShowFinal} type="button">
                Ver resultado final
              </button>
            </div>
          </div>
        )}

        {/* Final */}
        {view === 'final' && (
          <div className="mastery-stage mastery-final">
            <div className="mastery-final-trophy">
              <svg viewBox="0 0 24 24" fill="none" stroke={scoreColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
            </div>
            <h3 className="mastery-final-title">Resultado Final</h3>
            <div className="mastery-final-gauge">
              <svg viewBox="0 0 160 160" className="mastery-gauge-svg mastery-gauge-lg">
                <circle cx="80" cy="80" r="65" fill="none" stroke="rgba(200,180,140,0.1)" strokeWidth="12" />
                <circle
                  cx="80" cy="80" r="65"
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(finalScore / 100) * 408} 408`}
                  transform="rotate(-90 80 80)"
                />
                <text x="80" y="72" textAnchor="middle" className="mastery-gauge-score mastery-gauge-score-lg">{finalScore}</text>
                <text x="80" y="95" textAnchor="middle" className="mastery-gauge-label">de 100</text>
              </svg>
            </div>
            <p className="mastery-final-label" style={{ color: scoreColor }}>{scoreLabel}</p>
            <div className="mastery-final-breakdown">
              <div className="mastery-breakdown-item">
                <span className="mastery-breakdown-label">Resumo</span>
                <span className="mastery-breakdown-value">{summaryResult?.score || 0}</span>
              </div>
              <div className="mastery-breakdown-item">
                <span className="mastery-breakdown-label">Alternativas</span>
                <span className="mastery-breakdown-value">{mcScore}</span>
              </div>
              <div className="mastery-breakdown-item">
                <span className="mastery-breakdown-label">Escritas</span>
                <span className="mastery-breakdown-value">{writtenScore}</span>
              </div>
            </div>
            <p className="mastery-final-xp">+50 XP ganhos!</p>
            <div className="mastery-stage-actions">
              <button className="mastery-btn mastery-btn-primary" onClick={onClose} type="button">
                Concluir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
