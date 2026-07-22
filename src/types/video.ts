import type { Subject } from './doc'

export interface VideoMeta {
  id: string
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
