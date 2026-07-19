import { useOutletContext } from 'react-router-dom'

export default function Perfil() {
  const { userName } = useOutletContext<{ userName: string }>()

  return (
    <div className="placeholder-page">
      <div className="placeholder-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <h1 className="placeholder-title">Perfil</h1>
      <p className="placeholder-desc">Olá, {userName || 'estudante'}! Em breve você poderá gerenciar suas configurações aqui.</p>
    </div>
  )
}
