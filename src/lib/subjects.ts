import { useMemo, useSyncExternalStore } from 'react'
import type { Subject } from '../types/doc'
import { SUBJECTS, SUBJECT_COLORS, NA_SUBJECT } from '../types/doc'

export interface CustomSubject {
  name: string
  bg: string
  text: string
  emoji: string
}

export interface SubjectColor {
  bg: string
  text: string
}

const STORAGE_KEY = 'mendonca:custom_subjects'

export const SUBJECT_PALETTE: SubjectColor[] = [
  { bg: 'rgba(30,192,192,0.16)',  text: '#1ec0c0' },
  { bg: 'rgba(224,123,182,0.16)', text: '#e07bb6' },
  { bg: 'rgba(168,204,74,0.16)',  text: '#a8cc4a' },
  { bg: 'rgba(143,159,232,0.16)', text: '#8f9fe8' },
  { bg: 'rgba(232,150,62,0.16)',  text: '#e8963e' },
  { bg: 'rgba(168,101,210,0.16)', text: '#a865d2' },
  { bg: 'rgba(92,195,165,0.16)',  text: '#5cc3a5' },
  { bg: 'rgba(212,90,130,0.16)',  text: '#d45a82' },
  { bg: 'rgba(127,209,138,0.16)', text: '#7fd18a' },
  { bg: 'rgba(217,160,74,0.16)',  text: '#d9a04a' },
  { bg: 'rgba(109,179,232,0.16)', text: '#6db3e8' },
  { bg: 'rgba(199,126,232,0.16)', text: '#c77ee8' },
]

export function hexToColor(hex: string): SubjectColor {
  const value = hex.trim().replace(/^#/, '')
  const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  if ([r, g, b].some(n => Number.isNaN(n))) return SUBJECT_PALETTE[0]
  return { bg: `rgba(${r},${g},${b},0.16)`, text: `#${full.toLowerCase()}` }
}

export const FALLBACK_SUBJECT_COLOR = { bg: 'rgba(140,120,200,0.16)', text: '#8c78c8' }

export const SUBJECT_EMOJIS = [
  '📚',
  '✏️',
  '📝',
  '📖',
  '📐',
  '📏',
  '🖍️',
  '🖊️',
  '🔬',
  '🧪',
  '⚗️',
  '🔭',
  '🧬',
  '⚛️',
  '🧫',
  '🩺',
  '🧮',
  '💻',
  '🖥️',
  '⌨️',
  '🤖',
  '📊',
  '📈',
  '💰',
  '🌍',
  '🗺️',
  '🏔️',
  '🌊',
  '⛰️',
  '🪐',
  '🚀',
  '☀️',
  '🏛️',
  '⚖️',
  '🗿',
  '🕰️',
  '🏰',
  '📜',
  '🪙',
  '🎭',
  '🎨',
  '🎵',
  '🎬',
  '🎮',
  '🧩',
  '🎲',
  '♟️',
  '🗣️',
  '🧠',
  '💡',
  '🔍',
  '🔎',
  '⚙️',
  '🧭',
]

export const DEFAULT_SUBJECT_EMOJI = '📚'

const STANDARD_SUBJECT_EMOJIS: Record<string, string> = {
  'Física': '⚛️',
  'Química': '🧪',
  'Biologia': '🧬',
  'Matemática': '📐',
  'Linguagens': '✏️',
  'Geografia': '🌍',
  'História': '🏛️',
  'Filosofia': '💭',
}

export function getSubjectEmoji(name: string): string {
  if (STANDARD_SUBJECT_EMOJIS[name]) return STANDARD_SUBJECT_EMOJIS[name]
  const custom = getCustom().find(c => c.name === name)
  return custom?.emoji || DEFAULT_SUBJECT_EMOJI
}

type Listener = () => void
const listeners = new Set<Listener>()
let cache: CustomSubject[] | null = null

function readCustom(): CustomSubject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(c => c && typeof c.name === 'string' && typeof c.bg === 'string' && typeof c.text === 'string')
  } catch {
    return []
  }
}

export function getCustom(): CustomSubject[] {
  if (cache === null) cache = readCustom()
  return cache
}

function emit() {
  cache = null
  listeners.forEach(l => l())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

const getSnapshot = () => getCustom()

export function useCustomSubjects(): CustomSubject[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useSubjects(): Subject[] {
  const custom = useCustomSubjects()
  return useMemo(() => [...SUBJECTS, ...custom.map(c => c.name as Subject)], [custom])
}

export function getAllSubjects(): Subject[] {
  return [...SUBJECTS, ...getCustom().map(c => c.name as Subject)]
}

export function isKnownSubject(name: string): boolean {
  return getAllSubjects().some(s => s === name)
}

export function isCustomSubject(name: string): boolean {
  return getCustom().some(c => c.name === name)
}

export function getCustomSubject(name: string): CustomSubject | undefined {
  return getCustom().find(c => c.name === name)
}

export function addCustomSubject(name: string, color?: SubjectColor, emoji?: string): boolean {
  const trimmed = name.trim()
  if (!trimmed || trimmed === NA_SUBJECT) return false
  if (getAllSubjects().some(s => s === trimmed)) return false
  const palette = color ?? SUBJECT_PALETTE[getCustom().length % SUBJECT_PALETTE.length]
  const customs = [...getCustom(), { name: trimmed, bg: palette.bg, text: palette.text, emoji: emoji?.trim() || DEFAULT_SUBJECT_EMOJI }]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customs))
  emit()
  return true
}

export function updateCustomSubject(oldName: string, next: { name: string; color: SubjectColor; emoji?: string }): boolean {
  const trimmed = next.name.trim()
  if (!trimmed || trimmed === NA_SUBJECT) return false
  if (trimmed !== oldName && getAllSubjects().some(s => s === trimmed)) return false
  const customs = getCustom().map(c =>
    c.name === oldName
      ? { name: trimmed, bg: next.color.bg, text: next.color.text, emoji: next.emoji?.trim() || c.emoji || DEFAULT_SUBJECT_EMOJI }
      : c,
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customs))
  emit()
  return true
}

export function removeCustomSubject(name: string): void {
  const customs = getCustom().filter(c => c.name !== name)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customs))
  emit()
}

export function getSubjectColors(name: string): { bg: string; text: string } {
  const standard = SUBJECT_COLORS[name as Subject]
  if (standard) return standard
  const custom = getCustom().find(c => c.name === name)
  if (custom) return { bg: custom.bg, text: custom.text }
  return FALLBACK_SUBJECT_COLOR
}
