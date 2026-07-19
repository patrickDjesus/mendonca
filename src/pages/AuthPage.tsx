import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FantasyScene from '../components/FantasyScene'
import LoadingBook from '../components/LoadingBook'
import { supabase } from '../lib/supabase'
import '../styles/auth.css'

type AuthMode = 'login' | 'register'

export default function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [animState, setAnimState] = useState<'idle' | 'falling' | 'landing'>('idle')
  const [loading, setLoading] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const [error, setError] = useState('')
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    return () => {
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'register') {
      if (formData.password !== formData.confirmPassword) {
        setError('As senhas não coincidem.')
        setLoading(false)
        return
      }

      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { name: formData.name },
        },
      })

      if (authError) {
        setError(authError.message === 'User already registered'
          ? 'Este email já está registrado.'
          : authError.message)
        setLoading(false)
        return
      }

      setShowLoading(true)
      navigateTimerRef.current = setTimeout(() => navigate('/home'), 2500)
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (authError) {
        setError(authError.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos.'
          : authError.message)
        setLoading(false)
        return
      }

      setShowLoading(true)
      navigateTimerRef.current = setTimeout(() => navigate('/home'), 2500)
    }

    setLoading(false)
  }

  const toggleMode = useCallback(() => {
    setAnimState('falling')
    setError('')
    setTimeout(() => {
      setMode(prev => (prev === 'login' ? 'register' : 'login'))
      setFormData({ name: '', email: '', password: '', confirmPassword: '' })
      setShowPassword(false)
      setAnimState('landing')
      setTimeout(() => setAnimState('idle'), 500)
    }, 400)
  }, [])

  return (
    <div className="auth-page">
      {showLoading && <LoadingBook />}

      <div className="auth-left">
        <FantasyScene />
      </div>

      <div className="auth-right">
        {/* Desk texture layers */}
        <div className="desk-wood" />
        <div className="desk-grain" />

        <div className="auth-container">
          {/* Paper card for the form */}
          <div className={`paper-card ${animState === 'falling' ? 'paper-fall' : ''} ${animState === 'landing' ? 'paper-land' : ''}`}>
            {/* Pushpin */}
            <div className="pushpin">
              <div className="pin-head" />
              <div className="pin-point" />
            </div>

            {/* Tape effect */}
            <div className="tape tape-1" />

            {/* Paper lines */}
            <div className="paper-lines" />

            {/* Red margin */}
            <div className="paper-margin" />

            <div className="paper-content">
              <div className="auth-header">
                <h1 className="auth-title">
                  {mode === 'login' ? 'entrar' : 'nova conta'}
                </h1>
                <p className="auth-subtitle">
                  {mode === 'login'
                    ? 'bora continuar estudando?'
                    : 'organize seus estudos aqui.'}
                </p>
              </div>

              {error && (
                <div className="auth-error">{error}</div>
              )}

              <form className="auth-form" onSubmit={handleSubmit}>
                {mode === 'register' && (
                  <div className="form-group anim-in">
                    <label htmlFor="name">nome</label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        id="name"
                        name="name"
                        placeholder="seu nome"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                      <div className="input-underline" />
                    </div>
                  </div>
                )}

                <div className="form-group anim-in">
                  <label htmlFor="email">email</label>
                  <div className="input-wrapper">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                    <div className="input-underline" />
                  </div>
                </div>

                <div className="form-group anim-in">
                  <label htmlFor="password">senha</label>
                  <div className="input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                    <div className="input-underline" />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(prev => !prev)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div className="form-group anim-in">
                    <label htmlFor="confirmPassword">confirmar senha</label>
                    <div className="input-wrapper">
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                      />
                      <div className="input-underline" />
                    </div>
                  </div>
                )}

                <button type="submit" className="btn-primary anim-in" disabled={loading}>
                  <span>{loading ? 'aguarde...' : (mode === 'login' ? 'entrar' : 'criar conta')}</span>
                  {!loading && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  )}
                </button>
              </form>

              <p className="auth-footer anim-in">
                {mode === 'login' ? (
                  <>
                    sem conta?{' '}
                    <button type="button" className="link-toggle" onClick={toggleMode}>
                      criar uma
                    </button>
                  </>
                ) : (
                  <>
                    já tem conta?{' '}
                    <button type="button" className="link-toggle" onClick={toggleMode}>
                      entrar
                    </button>
                  </>
                )}
              </p>
            </div>

            {/* Corner fold */}
            <div className="paper-fold" />
          </div>

          {/* Pencil doodle near the card */}
          <div className="desk-doodle">
            <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
              <path d="M2 14C8 6 18 2 38 2" stroke="rgba(160,140,100,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
