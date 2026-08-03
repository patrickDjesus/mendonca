import type { Subject } from './doc'

export interface Flashcard {
  id: string
  front: string
  back: string
  subject: Subject
  known: boolean
  groupId?: string
  createdAt: number
  updatedAt: number
}

export interface FlashcardGroup {
  id: string
  name: string
  subject: Subject
  description?: string
  createdAt: number
  updatedAt: number
}
