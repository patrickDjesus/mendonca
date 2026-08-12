import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Redacao, RedacaoCorrection, RedacaoMark, RedacaoMarkType, RedacaoTheme } from '../../types/redacao'
import { REDACAO_THEMES, REDACAO_CONNECTIVES } from '../../data/redacao'
import { fetchRedacoes, createRedacao, deleteRedacao, logActivity } from '../../lib/db'
import '../../styles/redacao.css'

type View = 'themes' | 'editor' | 'results' | 'history'

const MARK_META: Record<RedacaoMarkType, { label: string; color: string }> = {
  erro_ortografico: { label: 'Desvio ortográfico/gramatical', color: '#e87070' },
  coesao: { label: 'Problema de coesão', color: '#d4a843' },
  ponto_positivo: { label: 'Ponto positivo', color: '#50b478' },
}

/* ── Análise de texto ─────────────────────────────────────── */

function countWords(text: string): number {
  const m = text.trim().match(/\S+/g)
  return m ? m.length : 0
}

function countSentences(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/[.!?…]+/).filter(s => s.trim().length > 0).length
}

function countParagraphs(text: string): number {
  return text.split(/\n+/).filter(p => p.trim().length > 0).length
}

function estimateLines(text: string): number {
  let lines = 0
  for (const para of text.split('\n')) {
    if (para.trim().length === 0) continue
    lines += Math.max(1, Math.ceil(para.length / 90))
  }
  return lines
}

function analyzeConnectives(text: string): { used: string[]; count: number } {
  const lower = text.toLowerCase()
  const used = REDACAO_CONNECTIVES.filter(c => lower.includes(c))
  return { used, count: used.length }
}

function findRepetitions(text: string): Array<{ word: string; count: number }> {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
  const freq: Record<string, number> = {}
  for (const w of words) freq[w] = (freq[w] || 0) + 1
  return Object.entries(freq)
    .map(([word, count]) => ({ word, count }))
    .filter(x => x.count >= 4)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
}

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/* ── Marcações sobre o texto ───────────────────────────────── */

interface Segment {
  key: number
  text: string
  mark?: RedacaoMark
}

function normalizeMarks(text: string, marks: RedacaoMark[]): RedacaoMark[] {
  const valid: RedacaoMark[] = []
  for (const m of marks) {
    const s = Math.max(0, Math.floor(m.start))
    let e = Math.min(text.length, Math.floor(m.end))
    if (e <= s) continue
    if (text.slice(s, e) !== m.text) {
      const found = text.indexOf(m.text)
      if (found === -1) continue
      e = found + m.text.length
      valid.push({ ...m, start: found, end: e })
    } else {
      valid.push(m)
    }
  }
  valid.sort((a, b) => a.start - b.start || a.end - b.end)
  const deduped: RedacaoMark[] = []
  for (const m of valid) {
    const last = deduped[deduped.length - 1]
    if (last && m.start < last.end) continue
    deduped.push(m)
  }
  return deduped
}

function buildSegments(paragraph: string, offset: number, marks: RedacaoMark[], keyBase: number): Segment[] {
  const paraMarks = normalizeMarks(paragraph, marks
    .filter(m => m.start >= offset && m.end <= offset + paragraph.length)
    .map(m => ({ ...m, start: m.start - offset, end: m.end - offset })))
  const segments: Segment[] = []
  let cursor = 0
  for (const m of paraMarks) {
    if (m.start > cursor) segments.push({ key: keyBase + cursor, text: paragraph.slice(cursor, m.start) })
    segments.push({ key: keyBase + m.start, text: paragraph.slice(m.start, m.end), mark: m })
    cursor = m.end
  }
  if (cursor < paragraph.length) segments.push({ key: keyBase + cursor, text: paragraph.slice(cursor) })
  if (segments.length === 0) segments.push({ key: keyBase, text: paragraph })
  return segments
}

function MarkedEssay({ text, marks }: { text: string; marks: RedacaoMark[] }) {
  const normalized = normalizeMarks(text, marks)
  const paragraphs = text.split('\n')
  let offset = 0
  const rendered: ReactNode[] = []
  paragraphs.forEach((p, i) => {
    const segments = buildSegments(p, offset, normalized, offset)
    rendered.push(
      <p key={`p-${i}`} className="rd-marked-para">
        {segments.map(s =>
          s.mark ? (
            <mark
              key={s.key}
              className={`rd-mark rd-mark-${s.mark.type}`}
              title={s.mark.note}
            >
              {s.text}
            </mark>
          ) : (
            <span key={s.key}>{s.text}</span>
          ),
        )}
      </p>,
    )
    offset += p.length + 1
  })
  return <div className="rd-marked-doc">{rendered}</div>
}

/* ── Nota em anel ──────────────────────────────────────────── */

function GradeRing({ grade }: { grade: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, grade / 1000))
  const color = grade >= 700 ? '#50b478' : grade >= 500 ? '#d4a843' : '#e87070'
  return (
    <svg className="rd-ring" viewBox="0 0 130 130" width="130" height="130">
      <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(200,180,140,0.14)" strokeWidth="10" />
      <circle
        cx="65"
        cy="65"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 65 65)"
      />
      <text x="65" y="60" textAnchor="middle" fill="#e8dcc8" fontSize="30" fontWeight="800">{grade}</text>
      <text x="65" y="82" textAnchor="middle" fill="#8a7a6a" fontSize="11">de 1000</text>
    </svg>
  )
}

/* ── Gráfico de evolução ───────────────────────────────────── */

function EvolutionChart({ points }: { points: Array<{ label: string; grade: number }> }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 300
  const H = 160
  const padX = 34
  const padTop = 26
  const padBottom = 36

  if (points.length === 0) {
    return (
      <div className="rd-chart-empty">
        <p>Nenhuma redação anterior.</p>
        <span>Suas próximas notas aparecerão aqui.</span>
      </div>
    )
  }

  const maxX = W - 12
  const minX = padX
  const step = points.length === 1 ? 0 : (maxX - minX) / (points.length - 1)
  const x = (i: number) => (points.length === 1 ? (minX + maxX) / 2 : minX + step * i)
  const y = (g: number) => padTop + (H - padTop - padBottom) * (1 - g / 1000)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.grade)}`).join(' ')

  return (
    <div className="rd-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="rd-chart-svg" preserveAspectRatio="xMidYMid meet">
        {[0, 200, 400, 600, 800, 1000].map(g => (
          <g key={g}>
            <line x1={padX} x2={maxX} y1={y(g)} y2={y(g)} stroke="rgba(200,180,140,0.08)" strokeDasharray="3 4" />
            <text x={padX - 8} y={y(g) + 3} textAnchor="end" fontSize="9" fill="#6a5a4a">{g}</text>
          </g>
        ))}
        <path d={path} fill="none" stroke="#d4a843" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => {
          const isHover = hover === i
          return (
            <g key={i} className="rd-chart-point" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <circle cx={x(i)} cy={y(p.grade)} r={isHover ? 6 : 4} fill={isHover ? '#f0c46a' : '#d4a843'} stroke="#1a1612" strokeWidth="1.5" />
              <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="9" fill="#8a7a6a">{p.label}</text>
            </g>
          )
        })}
        {hover !== null && points[hover] && (
          <g>
            <rect
              x={Math.min(x(hover) - 30, W - 78)}
              y={y(points[hover].grade) - 30}
              width="60"
              height="20"
              rx="6"
              fill="#2a2420"
              stroke="rgba(212,168,67,0.4)"
            />
            <text x={Math.min(x(hover), W - 48)} y={y(points[hover].grade) - 16} textAnchor="middle" fontSize="11" fontWeight="700" fill="#f0c46a">
              {points[hover].grade} pts
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

/* ── Exportar PDF (impressão) ──────────────────────────────── */

function exportCorrigidaPdf(themeTitle: string, themeFonte: string, text: string, correction: RedacaoCorrection) {
  const date = new Date().toLocaleDateString('pt-BR')
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const competenciasHtml = correction.competencias
    .map(c => `
      <div style="margin-bottom:14px;padding:12px;border:1px solid #ddd;border-radius:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong>${c.code} · ${c.name}</strong>
          <span style="font-weight:700;color:#2a6090;">${c.score}/200</span>
        </div>
        <div style="font-size:12px;color:#444;">${c.feedback.replace(/</g, '&lt;')}</div>
      </div>`)
    .join('')
  const comentariosHtml = correction.comentarios.map(c => `<li>${c.replace(/</g, '&lt;')}</li>`).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Redação corrigida — ${themeTitle.replace(/</g, '')}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1816; max-width: 720px; margin: 40px auto; padding: 0 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
  h2 { font-size: 16px; margin: 28px 0 10px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
  .grade { font-size: 40px; font-weight: 800; color: #2a6090; }
  .essay { white-space: pre-wrap; line-height: 1.8; font-size: 14px; }
  .box { border: 1px solid #ddd; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
  .chip { display:inline-block; background:#eef3fa; border:1px solid #c9d6e8; border-radius:999px; padding:2px 10px; font-size:11px; margin:2px; }
  .footer { margin-top: 40px; color: #888; font-size: 11px; text-align: center; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>Redação corrigida — ${themeTitle.replace(/</g, '')}</h1>
  <div class="meta">Tema: ${themeTitle.replace(/</g, '')} · ${themeFonte.replace(/</g, '')} · Corrigida em ${date}</div>
  <div class="grade">${correction.grade} / 1000</div>
  <p>${correction.resumo.replace(/</g, '')}</p>
  <h2>Texto original</h2>
  <div class="essay">${escaped}</div>
  <h2>Notas por competência</h2>
  ${competenciasHtml}
  <h2>Comentários</h2>
  <ul style="font-size:13px;">${comentariosHtml}</ul>
  ${correction.conectivos.usados.length > 0 ? `<h2>Conectivos usados</h2><div>${correction.conectivos.usados.map(c => `<span class="chip">${c.replace(/</g, '')}</span>`).join('')}</div>` : ''}
  <div class="footer">Gerado pela plataforma Mendonça · Enem 2026</div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 300); }</script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
}

/* ── Temas ─────────────────────────────────────────────────── */

function ThemeCard({ theme, active, onClick }: { theme: RedacaoTheme; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`rd-theme-card ${active ? 'active' : ''}`} onClick={onClick} style={{ backgroundImage: theme.image }}>
      <span className="rd-theme-card-shade" />
      <span className="rd-theme-card-title">{theme.title}</span>
      <span className="rd-theme-card-fonte">{theme.fonte}</span>
    </button>
  )
}

/* ── Página ────────────────────────────────────────────────── */

export default function Redacao() {
  const [view, setView] = useState<View>('themes')
  const [search, setSearch] = useState('')
  const [selectedTheme, setSelectedTheme] = useState<RedacaoTheme | null>(null)
  const [draft, setDraft] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const [correctionError, setCorrectionError] = useState('')
  const [viewing, setViewing] = useState<Redacao | null>(null)
  const [redacoes, setRedacoes] = useState<Redacao[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const filteredThemes = useMemo(() => {
    if (!search.trim()) return REDACAO_THEMES
    const q = search.toLowerCase()
    return REDACAO_THEMES.filter(t => t.title.toLowerCase().includes(q) || t.fonte.toLowerCase().includes(q))
  }, [search])

  useEffect(() => {
    if (view !== 'editor') return
    const id = window.setInterval(() => setElapsed(e => e + 1), 1000)
    return () => window.clearInterval(id)
  }, [view])

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      setRedacoes(await fetchRedacoes())
    } catch {
      setRedacoes([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const openHistory = () => {
    loadHistory()
    setView('history')
  }

  const stats = useMemo(() => {
    const words = countWords(draft)
    const sentences = countSentences(draft)
    const paragraphs = countParagraphs(draft)
    const lines = estimateLines(draft)
    const conn = analyzeConnectives(draft)
    const reps = findRepetitions(draft)
    return { words, sentences, paragraphs, lines, conn, reps }
  }, [draft])

  const submitCorrection = async () => {
    if (!selectedTheme || !draft.trim()) return
    setCorrecting(true)
    setCorrectionError('')
    try {
      const res = await fetch('/api/corrigir-redacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeTitle: selectedTheme.title,
          themeFonte: selectedTheme.fonte,
          themeInfo: selectedTheme.info,
          inspiration: selectedTheme.inspiracao,
          text: draft,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Erro HTTP ${res.status}` }))
        throw new Error(err.error || `Erro HTTP ${res.status}`)
      }
      const correction = (await res.json()) as RedacaoCorrection
      const saved = await createRedacao({
        themeId: selectedTheme.id,
        themeTitle: selectedTheme.title,
        themeFonte: selectedTheme.fonte,
        text: draft,
        grade: correction.grade,
        correction,
      })
      logActivity('redacao', `Redação corrigida — ${selectedTheme.title}`, '✍️', '#d4a843').catch(() => {})
      setViewing(saved)
      setElapsed(0)
      setView('results')
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setCorrectionError(message)
    } finally {
      setCorrecting(false)
    }
  }

  const startRedo = () => {
    setViewing(null)
    setDraft('')
    setElapsed(0)
    setConfirmOpen(false)
    setView('editor')
  }

  const viewResult = (r: Redacao) => {
    setViewing(r)
    setView('results')
  }

  const handleDelete = async (r: Redacao) => {
    try {
      await deleteRedacao(r.id)
      setRedacoes(prev => prev.filter(x => x.id !== r.id))
    } catch {
      /* silencioso */
    }
  }

  const chartPoints = useMemo(() => {
    const points = [...redacoes]
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(r => ({ label: new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), grade: r.grade }))
    if (viewing && !points.some(p => p.grade === viewing.grade && p.label === new Date(viewing.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }))) {
      points.push({ label: 'Atual', grade: viewing.grade })
    }
    return points
  }, [redacoes, viewing])

  const correction = viewing?.correction ?? null

  /* ── Tela: seleção de temas ──────────────────────────────── */

  const renderThemes = () => (
    <div className="rd-page">
      <header className="rd-header">
        <div className="rd-header-left">
          <div className="rd-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <div className="rd-heading">
            <h1 className="rd-title">Modelos de Redação</h1>
            <span className="rd-subtitle">Escolha um tema e pratique o texto dissertativo</span>
          </div>
        </div>
        <button type="button" className="rd-history-link" onClick={openHistory}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v5h5" />
            <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
            <path d="M12 7v5l4 2" />
          </svg>
          <span>Minhas redações</span>
        </button>
      </header>

      <div className="rd-layout">
        <aside className="rd-side">
          <div className="rd-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              className="rd-search-input"
              placeholder="Pesquisar tema"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="rd-search-clear" onClick={() => setSearch('')} title="Limpar busca" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="rd-list">
            {filteredThemes.map(t => (
              <ThemeCard
                key={t.id}
                theme={t}
                active={selectedTheme?.id === t.id}
                onClick={() => setSelectedTheme(t)}
              />
            ))}
            {filteredThemes.length === 0 && (
              <div className="rd-list-empty">Nenhum tema encontrado para "{search}".</div>
            )}
          </div>
        </aside>

        <section className="rd-main">
          {!selectedTheme ? (
            <div className="rd-panel rd-panel-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <p>Selecione um tema na lista ao lado para visualizar a proposta e os textos de apoio.</p>
            </div>
          ) : (
            <div className="rd-panel">
              <span className="rd-panel-chip">{selectedTheme.fonte}</span>
              <h2 className="rd-panel-title">{selectedTheme.title}</h2>
              <div className="rd-panel-info">
                <h3>Orientação</h3>
                <p>{selectedTheme.info}</p>
              </div>
              <div className="rd-panel-info">
                <h3>Textos de inspiração</h3>
                {selectedTheme.inspiracao.map((txt, i) => (
                  <blockquote key={i} className="rd-inspiracao">
                    <span className="rd-inspiracao-num">T{i + 1}</span>
                    <p>{txt}</p>
                  </blockquote>
                ))}
              </div>
              <div className="rd-panel-actions">
                <button type="button" className="rd-primary-btn" onClick={() => {
                  setDraft('')
                  setElapsed(0)
                  setView('editor')
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Prosseguir para a redação
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )

  /* ── Tela: editor ────────────────────────────────────────── */

  const renderEditor = () => (
    <div className="rd-page rd-editor-page">
      <header className="rd-editor-top">
        <div className="rd-editor-top-left">
          <button type="button" className="rd-back-btn" onClick={() => setView('themes')} title="Voltar aos temas">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div className="rd-heading">
            <h1 className="rd-title">Redação em produção</h1>
            <span className="rd-subtitle">{selectedTheme?.title}</span>
          </div>
        </div>
        <button type="button" className="rd-submit-btn" onClick={() => setConfirmOpen(true)} disabled={!draft.trim()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          Enviar redação
        </button>
      </header>

      <div className="rd-editor-layout">
        <div className="rd-paper-wrap">
          <div className="rd-paper">
            <div className="rd-paper-head">
              <span>Dissertação — {selectedTheme?.fonte}</span>
              <span className="rd-paper-lines">{stats.lines} linha(s) · 30 disponíveis</span>
            </div>
            <textarea
              className="rd-paper-text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Escreva sua redação aqui. Lembre-se: um texto dissertativo-argumentativo possui introdução, desenvolvimento e conclusão, com proposta de intervenção."
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
        </div>

        <aside className="rd-stats-panel">
          <div className="rd-stats-block">
            <h3 className="rd-stats-title">Lembrete do tema</h3>
            <p className="rd-theme-reminder">{selectedTheme?.title}</p>
          </div>

          <div className="rd-stats-block">
            <h3 className="rd-stats-title">Cronômetro</h3>
            <div className={`rd-timer ${elapsed > 50 * 60 ? 'over' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l2 2" />
                <path d="M9 2h6" />
              </svg>
              {formatTime(elapsed)}
            </div>
            <div className="rd-timer-bar">
              <div className="rd-timer-fill" style={{ width: `${Math.min(100, (elapsed / (50 * 60)) * 100)}%` }} />
            </div>
            <span className="rd-timer-hint">Tempo ideal: 50 minutos</span>
          </div>

          <div className="rd-stats-block">
            <h3 className="rd-stats-title">Estatísticas em tempo real</h3>
            <div className="rd-stats-grid">
              <div className="rd-stat-item">
                <span className="rd-stat-value">{stats.words}</span>
                <span className="rd-stat-label">Palavras</span>
              </div>
              <div className="rd-stat-item">
                <span className="rd-stat-value">{stats.sentences}</span>
                <span className="rd-stat-label">Frases</span>
              </div>
              <div className="rd-stat-item">
                <span className="rd-stat-value">{stats.paragraphs}</span>
                <span className="rd-stat-label">Parágrafos</span>
              </div>
              <div className="rd-stat-item">
                <span className="rd-stat-value">{stats.lines}</span>
                <span className="rd-stat-label">Linhas (est.)</span>
              </div>
            </div>

            <div className="rd-stats-sub">
              <span className="rd-stats-sub-label">Conectivos</span>
              <span className={`rd-stats-sub-value ${stats.conn.count === 0 ? 'warn' : ''}`}>
                {stats.conn.count === 0 ? 'Nenhum detectado' : `${stats.conn.count} detectados`}
              </span>
              {stats.conn.used.length > 0 && (
                <div className="rd-conn-chips">
                  {stats.conn.used.map(c => (
                    <span key={c} className="rd-conn-chip">{c}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="rd-stats-sub">
              <span className="rd-stats-sub-label">Repetição de termos</span>
              {stats.reps.length === 0 ? (
                <span className="rd-stats-sub-value ok">Sem repetições excessivas</span>
              ) : (
                <div className="rd-rep-list">
                  {stats.reps.map(r => (
                    <div key={r.word} className="rd-rep-item">
                      <span className="rd-rep-word">"{r.word}"</span>
                      <span className="rd-rep-count">{r.count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )

  /* ── Tela: resultados ────────────────────────────────────── */

  const renderResults = () => {
    if (!viewing || !correction) return renderThemes()
    return (
      <div className="rd-page">
        <header className="rd-header">
          <div className="rd-header-left">
            <div className="rd-logo success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div className="rd-heading">
              <h1 className="rd-title">Correção concluída</h1>
              <span className="rd-subtitle">{viewing.themeTitle}</span>
            </div>
          </div>
          <button type="button" className="rd-history-link" onClick={openHistory}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v5h5" />
              <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
              <path d="M12 7v5l4 2" />
            </svg>
            <span>Minhas redações</span>
          </button>
        </header>

        <div className="rd-results-layout">
          <section className="rd-essay-col">
            <div className="rd-section-title">
              <h2>Redação original</h2>
            </div>
            <div className="rd-legend">
              {(Object.keys(MARK_META) as RedacaoMarkType[]).map(k => (
                <span key={k} className="rd-legend-item">
                  <span className="rd-legend-dot" style={{ background: MARK_META[k].color }} />
                  {MARK_META[k].label}
                </span>
              ))}
            </div>
            <MarkedEssay text={viewing.text} marks={correction.marcas} />
          </section>

          <aside className="rd-feedback-col">
            <div className="rd-grade-card">
              <GradeRing grade={viewing.grade} />
              <p className="rd-grade-resumo">{correction.resumo}</p>
            </div>

            <div className="rd-feedback-block">
              <h3>Pontuação por competência</h3>
              {correction.competencias.map(c => (
                <div key={c.code} className="rd-competencia" title={c.feedback}>
                  <div className="rd-competencia-head">
                    <span className="rd-competencia-code">{c.code}</span>
                    <span className="rd-competencia-name">{c.name}</span>
                    <span className="rd-competencia-score">{c.score}<small>/200</small></span>
                  </div>
                  <div className="rd-competencia-bar">
                    <div className="rd-competencia-fill" style={{ width: `${(c.score / 200) * 100}%` }} />
                  </div>
                  <p className="rd-competencia-feedback">{c.feedback}</p>
                </div>
              ))}
            </div>

            <div className="rd-feedback-block">
              <h3>Comentários</h3>
              <ul className="rd-comment-list">
                {correction.comentarios.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>

            <div className="rd-feedback-block">
              <h3>Sugestões de reescrita</h3>
              <ul className="rd-suggestion-list">
                {correction.sugestoesReescrita.map((s, i) => (
                  <li key={i}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {correction.conectivos.sugestao && (
              <div className="rd-feedback-block">
                <h3>Análise de conectivos</h3>
                <p className="rd-conn-sugestao">{correction.conectivos.sugestao}</p>
              </div>
            )}

            <div className="rd-feedback-block">
              <h3>Evolução do desempenho</h3>
              <EvolutionChart points={chartPoints} />
            </div>
          </aside>
        </div>

        <footer className="rd-results-footer">
          <button type="button" className="rd-footer-btn" onClick={() => exportCorrigidaPdf(viewing.themeTitle, viewing.themeFonte, viewing.text, correction)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar PDF
          </button>
          <button type="button" className="rd-footer-btn primary" onClick={startRedo}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Refazer com o mesmo tema
          </button>
          <button type="button" className="rd-footer-btn" onClick={openHistory}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v5h5" />
              <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
              <path d="M12 7v5l4 2" />
            </svg>
            Minhas redações
          </button>
        </footer>
      </div>
    )
  }

  /* ── Tela: histórico ─────────────────────────────────────── */

  const renderHistory = () => (
    <div className="rd-page">
      <header className="rd-header">
        <div className="rd-header-left">
          <button type="button" className="rd-back-btn" onClick={() => setView('themes')} title="Voltar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div className="rd-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v5h5" />
              <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
              <path d="M12 7v5l4 2" />
            </svg>
          </div>
          <div className="rd-heading">
            <h1 className="rd-title">Minhas redações</h1>
            <span className="rd-subtitle">{redacoes.length} {redacoes.length === 1 ? 'produção salva' : 'produções salvas'}</span>
          </div>
        </div>
      </header>

      <div className="rd-history-list">
        {historyLoading && <div className="rd-history-empty">Carregando redações...</div>}
        {!historyLoading && redacoes.length === 0 && (
          <div className="rd-history-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p>Você ainda não enviou nenhuma redação.</p>
            <button type="button" className="rd-primary-btn" onClick={() => setView('themes')}>Escolher um tema</button>
          </div>
        )}
        {redacoes.map(r => (
          <div key={r.id} className="rd-history-card">
            <div className="rd-history-main" onClick={() => viewResult(r)}>
              <div className="rd-history-grade" style={{ color: r.grade >= 700 ? '#50b478' : r.grade >= 500 ? '#d4a843' : '#e87070' }}>
                {r.grade}
              </div>
              <div className="rd-history-info">
                <h3>{r.themeTitle}</h3>
                <span className="rd-history-meta">{r.themeFonte} · {new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
              <span className="rd-history-open">Ver correção →</span>
            </div>
            <button
              type="button"
              className="rd-icon-btn danger"
              title="Excluir redação"
              onClick={() => handleDelete(r)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <>
      {view === 'themes' && renderThemes()}
      {view === 'editor' && renderEditor()}
      {view === 'results' && renderResults()}
      {view === 'history' && renderHistory()}

      {confirmOpen && (
        <div className="rd-modal-overlay" onClick={() => setConfirmOpen(false)}>
          <div className="rd-modal" onClick={e => e.stopPropagation()}>
            <div className="rd-modal-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </div>
            <h3 className="rd-modal-title">Enviar redação?</h3>
            <p className="rd-modal-text">Deseja realmente submeter seu texto para correção? Após o envio, a redação não poderá ser alterada.</p>
            <div className="rd-modal-actions">
              <button type="button" className="rd-cancel-btn" onClick={() => setConfirmOpen(false)}>Continuar escrevendo</button>
              <button type="button" className="rd-confirm-btn" onClick={() => {
                setConfirmOpen(false)
                submitCorrection()
              }}>Sim, enviar</button>
            </div>
          </div>
        </div>
      )}

      {correcting && (
        <div className="rd-loading-overlay">
          <div className="rd-loading-card">
            <div className="rd-loading-pen">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <h3 className="rd-loading-title">Corrigindo sua redação...</h3>
            <p className="rd-loading-text">Analisando o texto de acordo com as competências do ENEM. Isso pode levar alguns segundos.</p>
            <div className="rd-loading-bar">
              <div className="rd-loading-fill" />
            </div>
            {correctionError && (
              <div className="rd-loading-error">
                <p>{correctionError}</p>
                <button type="button" className="rd-confirm-btn" onClick={submitCorrection}>Tentar novamente</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
