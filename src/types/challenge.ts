import type { Subject } from './doc'

export type ChallengeDifficulty = 'facil' | 'medio' | 'dificil'

export type QuestionType =
  | 'multipla'
  | 'multipla_multipla'
  | 'verdadeiro_falso'
  | 'aberta'
  | 'arrastar'
  | 'ordem'
  | 'completar'
  | 'palavras_cruzadas'

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multipla: 'Múltipla escolha',
  multipla_multipla: 'Múltiplas alternativas',
  verdadeiro_falso: 'Verdadeiro ou Falso',
  aberta: 'Aberta',
  arrastar: 'Arrastar e corresponder',
  ordem: 'Colocar em ordem',
  completar: 'Completar frase',
  palavras_cruzadas: 'Palavras cruzadas',
}

export const QUESTION_TYPE_ICONS: Record<QuestionType, string> = {
  multipla: 'circle-check',
  multipla_multipla: 'checks',
  verdadeiro_falso: 'toggle-right',
  aberta: 'pen-line',
  arrastar: ' grip-vertical',
  ordem: 'list-ordered',
  completar: 'text-cursor-input',
  palavras_cruzadas: 'grid-3x3',
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

export interface MatchPair {
  id: string
  left: string
  right: string
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

export interface CrosswordClue {
  id: string
  word: string
  clue: string
  direction: 'across' | 'down'
  row: number
  col: number
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
  matchPairs: MatchPair[]
  orderItems: OrderItem[]
  blanks: CompletarBlank[]
  openExpectedText?: string
  crosswordClues: CrosswordClue[]
  crosswordSize: number
}

export interface Challenge {
  id: string
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
  matchAnswers: Record<string, string>
  orderAnswers: string[]
  fillAnswers: Record<string, string>
  crosswordAnswers: Record<string, string>
  correct: boolean
}

export interface ChallengeAttempt {
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
