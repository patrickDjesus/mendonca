import { useCallback } from 'react'
import '../styles/fantasy.css'

export default function FantasyScene() {
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    e.currentTarget.style.setProperty('--mx', `${x}%`)
    e.currentTarget.style.setProperty('--my', `${y}%`)
  }, [])

  return (
    <div className="shelf-scene" onMouseMove={handleMouseMove}>
      <div className="mouse-glow" />
      <div className="study-logo shelf-logo">
        <img src="/logo.png" alt="Mendonça" className="shelf-logo-img" />
        <span className="logo-text">Mendonça</span>
      </div>

      {/* Warm light cone */}
      <div className="shelf-light-cone" />
      <div className="shelf-ambient" />

      {/* The bookshelf */}
      <div className="bookshelf">

        {/* === SHELF 1 (top) === */}
        <div className="shelf">
          <div className="shelf-board" />
          <div className="books-row">
            <div className="book" style={{ '--bw': '18px', '--bh': '85px', '--bc': '#5a3a2a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '22px', '--bh': '90px', '--bc': '#2a4a5a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '16px', '--bh': '78px', '--bc': '#6a4a3a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '26px', '--bh': '95px', '--bc': '#3a3a4a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '14px', '--bh': '82px', '--bc': '#4a5a3a' } as React.CSSProperties} />
            <div className="book book-lean" style={{ '--bw': '20px', '--bh': '88px', '--bc': '#7a4a2a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '24px', '--bh': '92px', '--bc': '#3a4a5a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '15px', '--bh': '80px', '--bc': '#5a4a4a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '20px', '--bh': '87px', '--bc': '#4a3a2a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '18px', '--bh': '91px', '--bc': '#2a5a4a' } as React.CSSProperties} />
            <div className="book book-lean" style={{ '--bw': '16px', '--bh': '84px', '--bc': '#6a3a5a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '22px', '--bh': '93px', '--bc': '#4a4a3a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '14px', '--bh': '79px', '--bc': '#3a5a3a' } as React.CSSProperties} />
            <div className="shelf-obj shelf-candle">
              <div className="candle-body" />
              <div className="candle-flame" />
            </div>
          </div>
        </div>

        {/* === SHELF 2 === */}
        <div className="shelf">
          <div className="shelf-board" />
          <div className="books-row">
            <div className="book" style={{ '--bw': '28px', '--bh': '100px', '--bc': '#4a2a2a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '18px', '--bh': '88px', '--bc': '#2a3a4a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '20px', '--bh': '94px', '--bc': '#5a5a3a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '16px', '--bh': '82px', '--bc': '#4a3a5a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '22px', '--bh': '96px', '--bc': '#3a5a2a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '14px', '--bh': '80px', '--bc': '#5a2a3a' } as React.CSSProperties} />
            <div className="book-stack-h">
              <div className="book-h" style={{ '--bhc': '#5a3a3a' } as React.CSSProperties} />
              <div className="book-h" style={{ '--bhc': '#3a4a3a' } as React.CSSProperties} />
              <div className="book-h" style={{ '--bhc': '#3a3a5a' } as React.CSSProperties} />
            </div>
            <div className="book" style={{ '--bw': '22px', '--bh': '90px', '--bc': '#6a3a4a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '18px', '--bh': '86px', '--bc': '#3a5a4a' } as React.CSSProperties} />
            <div className="book book-lean" style={{ '--bw': '20px', '--bh': '92px', '--bc': '#5a4a2a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '16px', '--bh': '84px', '--bc': '#4a2a4a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '24px', '--bh': '98px', '--bc': '#3a3a3a' } as React.CSSProperties} />
            <div className="shelf-obj shelf-globe">
              <div className="globe-ring" />
              <div className="globe-ball" />
              <div className="globe-stand" />
            </div>
          </div>
        </div>

        {/* === SHELF 3 === */}
        <div className="shelf">
          <div className="shelf-board" />
          <div className="books-row">
            <div className="book book-lean" style={{ '--bw': '22px', '--bh': '88px', '--bc': '#3a4a4a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '16px', '--bh': '96px', '--bc': '#4a2a3a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '24px', '--bh': '92px', '--bc': '#3a3a2a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '18px', '--bh': '84px', '--bc': '#5a3a5a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '20px', '--bh': '98px', '--bc': '#2a4a3a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '14px', '--bh': '80px', '--bc': '#6a5a3a' } as React.CSSProperties} />
            <div className="shelf-obj shelf-hourglass">
              <div className="hg-top" />
              <div className="hg-mid" />
              <div className="hg-bottom" />
            </div>
            <div className="book" style={{ '--bw': '26px', '--bh': '90px', '--bc': '#4a4a2a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '14px', '--bh': '86px', '--bc': '#3a5a5a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '20px', '--bh': '94px', '--bc': '#5a2a4a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '16px', '--bh': '80px', '--bc': '#4a3a3a' } as React.CSSProperties} />
            <div className="book book-lean" style={{ '--bw': '18px', '--bh': '89px', '--bc': '#3a4a2a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '22px', '--bh': '95px', '--bc': '#2a3a5a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '15px', '--bh': '82px', '--bc': '#5a4a5a' } as React.CSSProperties} />
            <div className="shelf-obj shelf-frame" />
          </div>
        </div>

        {/* === SHELF 4 (bottom) === */}
        <div className="shelf">
          <div className="shelf-board" />
          <div className="books-row">
            <div className="book" style={{ '--bw': '22px', '--bh': '92px', '--bc': '#3a3a3a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '18px', '--bh': '88px', '--bc': '#5a4a3a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '16px', '--bh': '85px', '--bc': '#4a5a5a' } as React.CSSProperties} />
            <div className="book-stack-h">
              <div className="book-h" style={{ '--bhc': '#4a3a2a' } as React.CSSProperties} />
              <div className="book-h" style={{ '--bhc': '#3a4a4a' } as React.CSSProperties} />
              <div className="book-h" style={{ '--bhc': '#5a3a4a' } as React.CSSProperties} />
            </div>
            <div className="book" style={{ '--bw': '24px', '--bh': '96px', '--bc': '#2a3a3a' } as React.CSSProperties} />
            <div className="book book-lean" style={{ '--bw': '16px', '--bh': '84px', '--bc': '#4a5a4a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '20px', '--bh': '90px', '--bc': '#5a3a4a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '28px', '--bh': '98px', '--bc': '#3a4a3a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '14px', '--bh': '82px', '--bc': '#4a4a5a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '18px', '--bh': '94px', '--bc': '#5a5a5a' } as React.CSSProperties} />
            <div className="book" style={{ '--bw': '22px', '--bh': '88px', '--bc': '#3a5a3a' } as React.CSSProperties} />
            <div className="book book-lean" style={{ '--bw': '16px', '--bh': '86px', '--bc': '#5a2a2a' } as React.CSSProperties} />
            <div className="shelf-obj shelf-plant">
              <div className="plant-pot" />
              <div className="plant-leaf plant-l1" />
              <div className="plant-leaf plant-l2" />
              <div className="plant-leaf plant-l3" />
            </div>
            <div className="shelf-obj shelf-skull" />
          </div>
        </div>
      </div>

      {/* Floating dust particles */}
      {[...Array(20)].map((_, i) => (
        <div key={i} className="dust" style={{
          left: `${10 + (i * 4.2)}%`,
          top: `${15 + ((i * 7) % 65)}%`,
          animationDelay: `${i * 0.6}s`,
          animationDuration: `${4 + (i % 4) * 1.5}s`,
          width: `${1.5 + (i % 3)}px`,
          height: `${1.5 + (i % 3)}px`,
        }} />
      ))}
    </div>
  )
}
