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
  difficulty: ChallengeDifficulty
  content?: string
  imageUrl?: string
  explanation?: string
  options: ChallengeOption[]
  statements: TrueFalseStatement[]
  orderItems: OrderItem[]
  blanks: CompletarBlank[]
  openExpectedText?: string
  source?: string
}

export type ChallengeModifier =
  | 'cronometro_em_chamas'
  | 'contagem_regressiva_cegante'
  | 'morte_subita'
  | 'memoria_curta'
  | 'fio_da_navalha'
  | 'ponte_de_vidro'
  | 'aposta_cega'

export const MODIFIER_LABELS: Record<ChallengeModifier, string> = {
  cronometro_em_chamas: 'Cronômetro em Chamas',
  contagem_regressiva_cegante: 'Contagem Regressiva Cegante',
  morte_subita: 'Morte Súbita',
  memoria_curta: 'Memória Curta',
  fio_da_navalha: 'Fio da Navalha',
  ponte_de_vidro: 'Ponte de Vidro',
  aposta_cega: 'Aposta Cega',
}

export const MODIFIER_DESCRIPTIONS: Record<ChallengeModifier, string> = {
  cronometro_em_chamas: 'Tempo reduzido pela metade',
  contagem_regressiva_cegante: 'O aluno não sabe quanto tempo falta',
  morte_subita: 'Barra de tempo desce mais rápido, mas sobe ao acertar',
  memoria_curta: 'Questão desaparece após alguns segundos',
  fio_da_navalha: 'Pontos triplicados, mas perde tudo se errar',
  ponte_de_vidro: 'Se errar uma questão, perde o desafio',
  aposta_cega: 'Aluno aposta quantas questões vai acertar',
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
  modifiers: ChallengeModifier[]
  apostaCegaMin?: number
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
  totalWatchSeconds: number
  videosWatched: number
  docsCreated: number
  challengesCompleted: number
  simuladosCompleted: number
  notesCreated: number
  loginDays: number
  lastLoginDate: string | null
  videosWatchedToday: number
  videosWatchedDate: string | null
  watchedSubjects: string[]
  completedSimuladoYears: number[]
  bestSimuladoScore: number
  simuladosThisWeek: number
  lastSimuladoWeek: string | null
}
