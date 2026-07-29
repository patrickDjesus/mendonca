import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const DISPLAY_PATTERNS = [
  { open: '$$', close: '$$', display: true },
  { open: '\\[', close: '\\]', display: true },
]

const INLINE_PATTERNS = [
  { open: '\\(', close: '\\)', display: false },
  { open: '$', close: '$', display: false },
]

function splitBlocks(text: string): { type: 'text' | 'math'; content: string; display: boolean }[] {
  const blocks: { type: 'text' | 'math'; content: string; display: boolean }[] = []
  let remaining = text

  while (remaining.length > 0) {
    const allPatterns = [...DISPLAY_PATTERNS, ...INLINE_PATTERNS]
    let earliest: { index: number; pattern: typeof allPatterns[0] } | null = null

    for (const p of allPatterns) {
      const idx = remaining.indexOf(p.open)
      if (idx !== -1 && (earliest === null || idx < earliest.index)) {
        earliest = { index: idx, pattern: p }
      }
    }

    if (!earliest) {
      blocks.push({ type: 'text', content: remaining, display: false })
      break
    }

    if (earliest.index > 0) {
      blocks.push({ type: 'text', content: remaining.slice(0, earliest.index), display: false })
    }

    const closeIdx = remaining.indexOf(earliest.pattern.close, earliest.index + earliest.pattern.open.length)
    if (closeIdx === -1) {
      blocks.push({ type: 'text', content: remaining.slice(earliest.index), display: false })
      break
    }

    const mathContent = remaining.slice(earliest.index + earliest.pattern.open.length, closeIdx)
    blocks.push({ type: 'math', content: mathContent, display: earliest.pattern.display })
    remaining = remaining.slice(closeIdx + earliest.pattern.close.length)
  }

  return blocks
}

interface Props {
  text: string
  inline?: boolean
}

export default function MathRenderer({ text, inline }: Props) {
  console.log('[MathRenderer] rendering text:', JSON.stringify(text))
  const rendered = useMemo(() => {
    const blocks = splitBlocks(text)
    console.log('[MathRenderer] blocks:', JSON.stringify(blocks))
    return blocks.map((block, i) => {
      if (block.type === 'text') {
        return <span key={i}>{block.content}</span>
      }
      try {
        const html = katex.renderToString(block.content, {
          displayMode: block.display,
          throwOnError: false,
        })
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
      } catch {
        return <span key={i} style={{ color: '#c85050' }}>{block.content}</span>
      }
    })
  }, [text])

  if (inline) {
    return <span className="math-renderer-inline">{rendered}</span>
  }
  return <>{rendered}</>
}
