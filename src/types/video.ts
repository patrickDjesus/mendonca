import type { Subject } from './doc'

export interface VideoMeta {
  id: string
  userId?: string
  title: string
  description?: string
  subject: Subject
  videoUrl: string
  thumbnail?: string
  duration?: string
  authorName?: string
  isPublic: boolean
  createdAt: number
  updatedAt: number
}

export interface VideoNote {
  id: string
  videoId: string
  text: string
  timestamp: number
  createdAt: number
  groupId?: string | null
}

export interface MasteryQuestion {
  id: string
  question: string
  options?: string[]
  correctIndex?: number
  correctAnswer?: string
  hint?: string
}

export interface MasteryMCResult {
  id: string
  correct: boolean
  explanation: string
}

export interface MasteryWrittenResult {
  id: string
  score: number
  feedback: string
}

export interface MasterySummaryResult {
  score: number
  feedback: string
}

export type MasteryStage = "summary" | "multiple_choice" | "written"
