import { useEffect, useState } from 'react'
import '../styles/loading.css'

export default function LoadingBook() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return Math.min(prev + Math.random() * 8 + 2, 100)
      })
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="loading-overlay">
      {/* Paper lines background */}
      <div className="loading-paper-bg" />

      {/* Red margin */}
      <div className="loading-margin" />

      {/* Spiral binding holes */}
      <div className="loading-spiral">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="spiral-hole" />
        ))}
      </div>

      {/* Content */}
      <div className="loading-content">
        <p className="loading-title">carregando</p>

        <div className="loading-bar-container">
          {/* Hand-drawn border */}
          <svg className="loading-bar-border" viewBox="0 0 500 50" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M5 5 C15 2, 40 3, 80 4 C140 5, 200 3, 250 4 C300 5, 380 3, 450 4 L495 5 C497 8, 496 15, 495 25 C494 35, 496 42, 495 45 L490 47 C450 48, 350 46, 250 47 C150 48, 80 46, 10 47 L5 45 C4 40, 5 30, 4 20 C3 12, 4 8, 5 5Z"
              stroke="#5a4a3a"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          {/* Fill bar */}
          <div className="loading-bar-fill-wrap">
            <div
              className="loading-bar-fill"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {/* Scribble decoration on the fill */}
          <svg className="loading-bar-scribble" viewBox="0 0 500 30" preserveAspectRatio="none" fill="none">
            <path d="M10 15 Q30 8, 50 15 T90 15 T130 15 T170 15 T210 15 T250 15 T290 15 T330 15 T370 15 T410 15 T450 15 T490 15" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M15 20 Q35 13, 55 20 T95 20 T135 20 T175 20 T215 20 T255 20 T295 20 T335 20 T375 20 T415 20 T455 20 T495 20" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeLinecap="round" fill="none" />
          </svg>

          {/* Writing pencil that follows the progress */}
          <div
            className={`loading-writing-pencil${progress >= 100 ? ' pencil-stopped' : ''}`}
            style={{ left: `${Math.min(progress, 100)}%` }}
          >
            <svg viewBox="0 0 28 70" fill="none">
              <rect x="8" y="0" width="14" height="50" rx="1" fill="#d4a843" stroke="#8a6a23" strokeWidth="1.5" />
              <rect x="8" y="0" width="14" height="8" rx="1" fill="#c09838" stroke="#8a6a23" strokeWidth="1" />
              <rect x="8" y="-3" width="14" height="5" rx="2" fill="#e07878" stroke="#a05050" strokeWidth="1" />
              <polygon points="8,50 14,65 20,50" fill="#f0d8a0" stroke="#8a6a23" strokeWidth="1.5" />
              <line x1="14" y1="62" x2="14" y2="65" stroke="#3a3a3a" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          {/* Ink trail behind the pencil */}
          <div className="loading-ink-trail">
            <div
              className="loading-ink-trail-fill"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
