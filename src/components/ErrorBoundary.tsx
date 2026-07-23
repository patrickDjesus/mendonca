import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#1a1714',
          color: '#e8dcc8',
          fontFamily: 'inherit',
          padding: '40px 20px',
          textAlign: 'center',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#daa03c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48, marginBottom: 16 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2 style={{ color: '#daa03c', margin: '0 0 8px', fontSize: 20 }}>Algo deu errado</h2>
          <p style={{ color: '#8a7a6a', margin: '0 0 20px', fontSize: 14, maxWidth: 400 }}>
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: '1px solid rgba(218, 160, 60, 0.3)',
              background: 'rgba(218, 160, 60, 0.1)',
              color: '#daa03c',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Recarregar
          </button>
          {this.state.error && (
            <pre style={{
              marginTop: 20,
              padding: 12,
              borderRadius: 8,
              background: 'rgba(0,0,0,0.3)',
              color: '#6a5a4a',
              fontSize: 11,
              maxWidth: '100%',
              overflow: 'auto',
              textAlign: 'left',
            }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
