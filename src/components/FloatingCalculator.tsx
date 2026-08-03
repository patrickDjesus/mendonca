import { useState, useEffect, useRef, useCallback } from 'react'

interface FloatingCalculatorProps {
  open: boolean
  onClose: () => void
}

export default function FloatingCalculator({ open, onClose }: FloatingCalculatorProps) {
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  const [resetNext, setResetNext] = useState(false)
  const [history, setHistory] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose])

  const calculate = useCallback((expr: string): string => {
    try {
      const sanitized = expr
        .replace(/[^-()\d/*+.%]/g, '')
        .replace(/%/g, '/100')
      if (!sanitized) return '0'
      // eslint-disable-next-line no-eval
      const result = Function(`"use strict"; return (${sanitized})`)()
      if (typeof result !== 'number' || !isFinite(result)) return 'Erro'
      return String(Math.round(result * 1e10) / 1e10)
    } catch {
      return 'Erro'
    }
  }, [])

  function handleButton(value: string) {
    inputRef.current?.focus()
    if (value === 'C') {
      setDisplay('0')
      setExpression('')
      setHistory('')
      setResetNext(false)
      return
    }
    if (value === '±') {
      setDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev)
      return
    }
    if (value === '=') {
      const full = expression + display
      const result = calculate(full)
      setHistory(full + ' =')
      setDisplay(result)
      setExpression('')
      setResetNext(true)
      return
    }
    if (['+', '-', '×', '÷'].includes(value)) {
      const op = value === '×' ? '*' : value === '÷' ? '/' : value
      const full = expression + display + ' ' + op + ' '
      setHistory(expression + display)
      setExpression(full)
      setResetNext(true)
      return
    }
    if (value === '.') {
      if (resetNext) {
        setDisplay('0.')
        setResetNext(false)
        return
      }
      if (!display.includes('.')) setDisplay(prev => prev + '.')
      return
    }
    // Number
    if (resetNext) {
      setDisplay(value)
      setResetNext(false)
    } else {
      setDisplay(prev => prev === '0' ? value : prev + value)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const key = e.key
    if (key >= '0' && key <= '9') { handleButton(key); return }
    if (key === '.') { handleButton('.'); return }
    if (key === '+') { handleButton('+'); return }
    if (key === '-') { handleButton('-'); return }
    if (key === '*') { handleButton('×'); return }
    if (key === '/') { e.preventDefault(); handleButton('÷'); return }
    if (key === '%') { handleButton('%'); return }
    if (key === 'Enter' || key === '=') { handleButton('='); return }
    if (key === 'Escape') { handleButton('C'); return }
    if (key === 'Backspace') {
      setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0')
    }
  }

  const buttons = [
    ['C', '±', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '='],
  ]

  return (
    open ? (
      <div className="calc-panel" ref={panelRef}>
        <div className="calc-header">
          <span className="calc-title">Calculadora</span>
          <button className="calc-close" onClick={onClose} type="button" aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="calc-display">
          <div className="calc-history">{history}</div>
          <input
            ref={inputRef}
            className="calc-screen"
            value={display}
            readOnly
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="calc-grid">
          {buttons.map((row, ri) => (
            <div className="calc-row" key={ri}>
              {row.map(btn => (
                <button
                  key={btn}
                  className={`calc-btn ${btn === '=' ? 'calc-btn-eq' : ''} ${['÷','×','-','+','%','±'].includes(btn) ? 'calc-btn-op' : ''} ${btn === '0' ? 'calc-btn-zero' : ''} ${btn === 'C' ? 'calc-btn-clear' : ''}`}
                  onClick={() => handleButton(btn)}
                  type="button"
                >
                  {btn}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    ) : null
  )
}
