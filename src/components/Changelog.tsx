import { useEffect, useState } from 'react'
import { CHANGELOG } from '../data/changelog'
import { fetchLastSeenChangelogId, saveSeenChangelogId } from '../lib/db'
import '../styles/changelog.css'

const STORAGE_KEY = 'mendonca_last_seen_changelog'

function latestEntryId(): string | null {
  return CHANGELOG.length > 0 ? CHANGELOG[0].id : null
}

export default function Changelog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const latest = latestEntryId()
      if (!latest) return
      let lastSeen: string | null = null
      try {
        lastSeen = await fetchLastSeenChangelogId()
      } catch (err) {
        console.warn('Falha ao verificar novidades no banco', err)
        try {
          lastSeen = localStorage.getItem(STORAGE_KEY)
        } catch { }
      }
      if (mounted && lastSeen !== latest) setOpen(true)
    })()
    return () => { mounted = false }
  }, [])

  const markSeen = () => {
    const latest = latestEntryId()
    if (!latest) return
    try {
      void saveSeenChangelogId(latest).catch(err => console.warn('Falha ao registrar novidades vistas', err))
    } catch (err) {
      console.warn('Falha ao registrar novidades vistas', err)
    }
    try {
      localStorage.setItem(STORAGE_KEY, latest)
    } catch { }
  }

  const handleClose = () => {
    setOpen(false)
    markSeen()
  }

  if (!open) return null

  return (
    <div className="changelog-overlay" onClick={handleClose}>
      <div className="changelog-modal" onClick={e => e.stopPropagation()}>
        <div className="changelog-header">
          <h2 className="changelog-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l2.5 2.5" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            Novidades
          </h2>
          <button type="button" className="changelog-close" onClick={handleClose} aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="changelog-subtitle">Veja o que chegou de novo na plataforma</p>

        <div className="changelog-list">
          {CHANGELOG.map(entry => (
            <div key={entry.id} className="changelog-entry">
              <div className="changelog-entry-top">
                <span className="changelog-date">{entry.date}</span>
                <h3 className="changelog-entry-title">{entry.title}</h3>
              </div>
              {entry.description && <p className="changelog-desc">{entry.description}</p>}
              <ul className="changelog-features">
                {entry.features.map((feature, i) => (
                  <li key={i}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <button type="button" className="changelog-done" onClick={handleClose}>
          Entendi
        </button>
      </div>
    </div>
  )
}
