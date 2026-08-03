import { Plugin, PluginKey } from 'prosemirror-state'
import type { EditorState, Transaction } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import { Decoration, DecorationSet } from 'prosemirror-view'

export interface MappedMatch {
  from: number
  to: number
  word: string
  message: string
  category: string
  replacements: string[]
}

interface SpellPluginState {
  matches: MappedMatch[]
}

export type SpellMeta = { matches: MappedMatch[] }

export const spellKey = new PluginKey<SpellPluginState>('spellCheck')

export function createSpellPlugin() {
  return new Plugin<SpellPluginState>({
    key: spellKey,
    state: {
      init: (): SpellPluginState => ({ matches: [] }),
      apply(tr: Transaction, value: SpellPluginState, _oldState: EditorState, _newState: EditorState): SpellPluginState {
        const meta = tr.getMeta(spellKey) as SpellMeta | undefined
        if (tr.docChanged) return { matches: [] }
        if (meta) {
          return { matches: meta.matches ?? [] }
        }
        return value
      },
    },
    props: {
      decorations(state: EditorState) {
        const value = spellKey.getState(state)
        if (!value || value.matches.length === 0) return null
        return DecorationSet.create(
          state.doc,
          value.matches.map((m) =>
            Decoration.inline(m.from, m.to, {
              class: m.category === 'TYPOS' ? 'bn-spell-error' : 'bn-spell-grammar',
              'data-from': String(m.from),
              'data-to': String(m.to),
              'data-word': m.word,
            }),
          ),
        )
      },
    },
  })
}

export function getSpellMatches(state: EditorState): MappedMatch[] {
  const value = spellKey.getState(state)
  return value?.matches ?? []
}

export function setSpellMatches(view: EditorView, matches: MappedMatch[]) {
  view.dispatch(view.state.tr.setMeta(spellKey, { matches }))
}

export function clearSpellMatches(view: EditorView) {
  setSpellMatches(view, [])
}
