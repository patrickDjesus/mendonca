import type { Subject } from './doc'

export type ChallengeDifficulty = 'facil' | 'medio' | 'dificil'

export type QuestionType =
  | 'multipla'
  | 'multipla_multipla'
  | 'verdadeiro_falso'
  | 'aberta'
  | 'ordem'
  | 'completar'

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multipla: 'Múltipla escolha',
  multipla_multipla: 'Múltiplas alternativas',
  verdadeiro_falso: 'Verdadeiro ou Falso',
  aberta: 'Aberta',
  ordem: 'Colocar em ordem',
  completar: 'Completar frase',
}

export interface ChallengeOption {
  id: string
  text: string
  correct: boolean
}

export interface TrueFalseStatement {
  id: string
  text: string
  correct: boolean
}

export interface OrderItem {
  id: string
  text: string
  correctOrder: number
}

export interface CompletarBlank {
  id: string
  answer: string
}

export interface ChallengeQuestion {
  id: string
  type: QuestionType
  title: string
  subject: Subject
  content?: string
  imageUrl?: string
  explanation?: string
  options: ChallengeOption[]
  statements: TrueFalseStatement[]
  orderItems: OrderItem[]
  blanks: CompletarBlank[]
  openExpectedText?: string
}

export interface Challenge {
  id: string
  userId?: string
  title: string
  description?: string
  subject: Subject
  crossSubjects?: Subject[]
  difficulty: ChallengeDifficulty
  questionIds: string[]
  xpBase: number
  isDaily: boolean
  dailyDate?: string
  createdAt: number
}

export interface QuestionAnswer {
  questionId: string
  type: QuestionType
  selectedOptionIds: string[]
  openText: string
  orderAnswers: string[]
  fillAnswers: Record<string, string>
  correct: boolean
}

export interface ChallengeAttempt {
  id: string
  challengeId: string
  answers: QuestionAnswer[]
  totalTimeMs: number
  correctCount: number
  wrongCount: number
  score: number
  xpEarned: number
  completedAt: number
}

export interface UserStreak {
  currentStreak: number
  longestStreak: number
  lastChallengeDate: string | null
  totalXp: number
}
