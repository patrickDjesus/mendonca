import { useCallback, useEffect, useRef, useState } from 'react'
import { pushNotification } from './NotificationProvider'

interface FloatingTimerProps {
  open: boolean
  onClose: () => void
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export default function FloatingTimer({ open, onClose }: FloatingTimerProps) {
  const [inputMin, setInputMin] = useState('5')
  const [inputSec, setInputSec] = useState('0')
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [done, setDone] = useState(false)
  const firedRef = useRef(false)
  const hasStartedRef = useRef(false)
  const audioRef = useRef<AudioContext | null>(null)

  const ensureAudio = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext()
      if (audioRef.current.state === 'suspended') audioRef.current.resume()
    } catch {
      /* audio not available */
    }
  }, [])

  const playAlarm = useCallback(() => {
    try {
      const ctx = audioRef.current || new AudioContext()
      const now = ctx.currentTime
      for (let i = 0; i < 8; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = i % 2 === 0 ? 880 : 660
        const t = now + i * 0.35
        gain.gain.setValueAtTime(0.0001, t)
        gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.32)
      }
    } catch {
      /* audio not available */
    }
  }, [])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setRemaining(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => window.clearInterval(id)
  }, [running])

  useEffect(() => {
    if (remaining === 0 && running) setRunning(false)
  }, [remaining, running])

  useEffect(() => {
    if (running || remaining > 0 || !hasStartedRef.current || firedRef.current) return
    firedRef.current = true
    setDone(true)
    playAlarm()
    pushNotification({ type: 'info', title: 'Tempo esgotado!', message: 'Seu timer terminou.' })
  }, [running, remaining, playAlarm])

  const start = () => {
    const mins = Math.max(0, parseInt(inputMin, 10) || 0)
    const secs = Math.max(0, parseInt(inputSec, 10) || 0)
    const total = mins * 60 + secs
    if (total <= 0) return
    ensureAudio()
    hasStartedRef.current = true
    firedRef.current = false
    setDone(false)
    setRemaining(total)
    setRunning(true)
  }

  const reset = () => {
    setRunning(false)
    setRemaining(0)
    hasStartedRef.current = false
    firedRef.current = false
    setDone(false)
  }

  const mm = Math.floor(remaining / 60)
  const ss = remaining % 60

  return (
    open ? (
      <div className="timer-panel">
        <div className="timer-header">
          <span className="timer-title">Timer</span>
          <button className="timer-close" onClick={onClose} type="button" aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={`timer-display ${done ? 'timer-done' : ''} ${running ? 'timer-running' : ''}`}>
          <span className="timer-time">{pad(mm)}:{pad(ss)}</span>
          <span className="timer-status">
            {done ? 'Tempo esgotado!' : running ? 'Rodando...' : remaining > 0 ? 'Pausado' : 'Pronto'}
          </span>
        </div>

        {!hasStartedRef.current || done ? (
          <div className="timer-inputs">
            <label className="timer-field">
              <span>Min</span>
              <input
                className="timer-input"
                type="number"
                min="0"
                max="99"
                value={inputMin}
                onChange={e => setInputMin(e.target.value)}
              />
            </label>
            <label className="timer-field">
              <span>Seg</span>
              <input
                className="timer-input"
                type="number"
                min="0"
                max="59"
                value={inputSec}
                onChange={e => setInputSec(e.target.value)}
              />
            </label>
          </div>
        ) : null}

        <div className="timer-actions">
          {!hasStartedRef.current || done ? (
            <button className="timer-btn timer-btn-start" onClick={start} type="button">Iniciar</button>
          ) : (
            <>
              <button className="timer-btn" onClick={() => setRunning(prev => !prev)} type="button">
                {running ? 'Pausar' : 'Continuar'}
              </button>
              <button className="timer-btn timer-btn-reset" onClick={reset} type="button">Reiniciar</button>
            </>
          )}
        </div>
      </div>
    ) : null
  )
}
