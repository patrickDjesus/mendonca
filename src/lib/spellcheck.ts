import type { EditorView } from 'prosemirror-view'
import { clearSpellMatches, setSpellMatches, spellKey } from './spellcheckPlugin'
import type { MappedMatch } from './spellcheckPlugin'

export interface LTMatch {
  message: string
  shortMessage?: string
  offset: number
  length: number
  replacements: Array<{ value: string }>
  rule: {
    id: string
    description: string
    category: { id: string; name: string }
  }
}

export interface SpellCheckStore {
  enabled: boolean
  ignored: Set<string>
  dictionary: Set<string>
  runToken: number
}

export interface SpellCheckStatus {
  text: string
  matches: number
  error?: string
}

export interface FlattenedDoc {
  text: string
  posAt: Array<number | null>
}

const MAX_CHUNK_LENGTH = 18000

const SKIP_CATEGORIES = new Set(['STYLE', 'UNCATEGORIZED'])

const IGNORED_STORAGE_PREFIX = 'mendonca:doc:ignored:'

export function createSpellCheckStore(ignored: Iterable<string> = []): SpellCheckStore {
  return {
    enabled: true,
    ignored: new Set(ignored),
    dictionary: new Set<string>(),
    runToken: 0,
  }
}

export function loadIgnoredWords(docId: string): Set<string> {
  try {
    const raw = localStorage.getItem(IGNORED_STORAGE_PREFIX + docId)
    if (!raw) return new Set<string>()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set<string>()
    return new Set(parsed.filter((w): w is string => typeof w === 'string'))
  } catch {
    return new Set<string>()
  }
}

export function saveIgnoredWords(docId: string, words: Set<string>): void {
  try {
    localStorage.setItem(IGNORED_STORAGE_PREFIX + docId, JSON.stringify([...words]))
  } catch {
    // localStorage indisponível (ex.: modo privado) — ignora
  }
}

/**
 * Extrai todo o texto editável do documento ProseMirror em uma única string,
 * separando blocos com `\n`, e constrói um mapa `posAt[i]` = posição ProseMirror
 * do caractere de índice `i` (e do limite final em `posAt[text.length]`).
 * Ignora blocos de código.
 */
export function flattenDocument(view: EditorView): FlattenedDoc {
  const doc = view.state.doc
  const text: string[] = []
  const posAt: Array<number | null> = []

  const append = (ch: string, pos: number) => {
    posAt.push(pos)
    text.push(ch)
  }

  doc.descendants((node, nodePos) => {
    if (node.type.spec.group === 'blockContent') {
      if (node.type.name === 'codeBlock') return false

      if (text.length > 0 && text[text.length - 1] !== '\n') {
        const last = posAt[text.length - 1]
        append('\n', last == null ? 0 : last + 1)
      }

      node.descendants((child, childPos) => {
        if (child.isText && child.text) {
          for (let i = 0; i < child.text.length; i++) {
            append(child.text[i], nodePos + 1 + childPos + i)
          }
        }
        return true
      })
      return false
    }
    return true
  })

  if (text.length > 0) {
    const last = posAt[text.length - 1]
    posAt.push(last == null ? 0 : last + 1)
  }

  return { text: text.join(''), posAt }
}

export function splitChunks(text: string): Array<{ start: number; end: number }> {
  if (text.length <= MAX_CHUNK_LENGTH) return [{ start: 0, end: text.length }]

  const chunks: Array<{ start: number; end: number }> = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + MAX_CHUNK_LENGTH, text.length)
    if (end < text.length) {
      const nl = text.lastIndexOf('\n', end - 1)
      if (nl > start) end = nl
    }
    chunks.push({ start, end })
    start = end
  }
  return chunks
}

export function mapMatches(
  matches: LTMatch[],
  posAt: Array<number | null>,
  text: string,
  chunkStart: number,
  chunkEnd: number,
): MappedMatch[] {
  const out: MappedMatch[] = []
  const chunkLen = chunkEnd - chunkStart

  for (const m of matches) {
    if (!m || typeof m.offset !== 'number' || typeof m.length !== 'number' || m.length <= 0) continue
    if (m.offset < 0 || m.offset + m.length > chunkLen) continue

    const category = m.rule?.category?.id ?? 'TYPOS'
    if (SKIP_CATEGORIES.has(category)) continue

    const from = posAt[chunkStart + m.offset]
    const to = posAt[chunkStart + m.offset + m.length]
    if (from == null || to == null || to <= from) continue

    const word = text.slice(chunkStart + m.offset, chunkStart + m.offset + m.length)
    if (!/\p{L}/u.test(word)) continue

    out.push({
      from,
      to,
      word,
      message: m.message ?? m.rule?.description ?? '',
      category,
      replacements: (m.replacements ?? []).map((r) => r.value).slice(0, 6),
    })
  }
  return out
}

async function fetchProxy(text: string, language: string): Promise<LTMatch[] | null> {
  try {
    const res = await fetch('/api/spellcheck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { matches?: LTMatch[] }
    return Array.isArray(data.matches) ? data.matches : []
  } catch {
    return null
  }
}

export async function fetchSpellcheck(text: string, language = 'pt-BR'): Promise<LTMatch[]> {
  const proxied = await fetchProxy(text, language)
  if (proxied) return proxied

  const body = new URLSearchParams()
  body.set('text', text)
  body.set('language', language)

  const res = await fetch('https://api.languagetool.org/v2/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    throw new Error(`LanguageTool error ${res.status}`)
  }
  const data = (await res.json()) as { matches?: LTMatch[] }
  const matches = Array.isArray(data.matches) ? data.matches : []
  return matches
}

function ignoreSet(store: SpellCheckStore) {
  return new Set([...store.ignored, ...store.dictionary])
}

export function runSpellCheck(view: EditorView, store: SpellCheckStore, onStatus?: (s: SpellCheckStatus) => void) {
  if (!store.enabled) return

  const token = ++store.runToken
  const doc = view.state.doc
  const flat = flattenDocument(view)

  if (!flat.text.trim()) {
    if (view.state.doc === doc) clearSpellMatches(view)
    if (onStatus) onStatus({ text: '', matches: 0 })
    return
  }

  const chunks = splitChunks(flat.text)
  const results: MappedMatch[] = []
  const errors: unknown[] = []

  const run = (index: number): Promise<void> => {
    if (index >= chunks.length) return Promise.resolve()
    const { start, end } = chunks[index]
    return fetchSpellcheck(flat.text.slice(start, end))
      .then((matches) => {
        results.push(...mapMatches(matches, flat.posAt, flat.text, start, end))
      })
      .catch((err) => {
        errors.push(err)
        // falha de rede/proxy — ignora silenciosamente
      })
      .then(() => run(index + 1))
  }

  run(0).then(() => {
    if (store.runToken !== token) return
    if (view.state.doc !== doc) return
    const ignored = ignoreSet(store)
    const filtered = results.filter((m) => !ignored.has(m.word.toLowerCase()))
    if (onStatus) {
      onStatus({
        text: flat.text,
        matches: filtered.length,
        error: errors.length > 0 ? String(errors[0]) : undefined,
      })
    }
    setSpellMatches(view, filtered)
  })
}

export async function suggestForWord(word: string): Promise<string[]> {
  if (!word.trim()) return []
  try {
    const matches = await fetchSpellcheck(word)
    const posAt = Array.from({ length: word.length + 1 }, (_, i) => i)
    const mapped = mapMatches(matches, posAt, word, 0, word.length)
    const best = mapped[0]
    return best ? best.replacements : []
  } catch {
    return []
  }
}

export function findMatchAt(
  state: ReturnType<typeof spellKey.getState>,
  from: number,
  to: number,
): MappedMatch | undefined {
  return state?.matches.find((m) => m.from === from && m.to === to)
}
