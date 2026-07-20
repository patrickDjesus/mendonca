import type { Block } from '@blocknote/core'

export type DocType = 'editor' | 'pdf'

export type Subject =
  | 'Física'
  | 'Química'
  | 'Biologia'
  | 'Matemática'
  | 'Linguagens'
  | 'Geografia'
  | 'História'
  | 'Filosofia'

export const SUBJECTS: Subject[] = [
  'Física',
  'Química',
  'Biologia',
  'Matemática',
  'Linguagens',
  'Geografia',
  'História',
  'Filosofia',
]

export const SUBJECT_COLORS: Record<Subject, { bg: string; text: string }> = {
  'Física':      { bg: 'rgba(80,140,200,0.15)',  text: '#508cc8' },
  'Química':     { bg: 'rgba(80,180,120,0.15)',  text: '#50b478' },
  'Biologia':    { bg: 'rgba(80,180,80,0.15)',   text: '#50b450' },
  'Matemática':  { bg: 'rgba(200,140,60,0.15)',  text: '#c88c3c' },
  'Linguagens':  { bg: 'rgba(180,80,180,0.15)',  text: '#b450b4' },
  'Geografia':   { bg: 'rgba(60,160,100,0.15)',  text: '#3ca064' },
  'História':    { bg: 'rgba(200,100,80,0.15)',  text: '#c86450' },
  'Filosofia':   { bg: 'rgba(140,120,200,0.15)', text: '#8c78c8' },
}

export type PaperStyle = 'default' | 'white'

export interface DocMeta {
  id: string
  title: string
  description?: string
  type: DocType
  content?: Block[]
  subject?: Subject
  paperStyle?: PaperStyle
  fileName?: string
  fileUrl?: string
  fileSize?: number
  thumbnail?: string
  createdAt: number
  updatedAt: number
  isPublic: boolean
  authorName?: string
}

export type DocTab = 'mine' | 'public'
