import type { ChallengeQuestion, ChallengeOption } from '../types/challenge'
import type { Subject } from '../types/doc'
import { supabase } from './supabase'

const API_BASE = 'https://api.enem.dev/v1'

interface EnemAlternative {
  letter: string
  text: string | null
  file: string | null
  isCorrect: boolean
}

interface EnemQuestion {
  title: string
  index: number
  discipline: string | null
  language: string | null
  year: number
  context: string | null
  files: string[]
  correctAlternative: string
  alternatives: EnemAlternative[]
}

interface EnemApiResponse {
  metadata: { limit: number; offset: number; total: number; hasMore: boolean }
  questions: EnemQuestion[]
}

const DISCIPLINE_MAP: Record<string, Subject> = {
  'linguagens': 'Linguagens',
  'ciencias humanas': 'Ciências Humanas',
  'ciencias da natureza': 'Ciências da Natureza',
  'matematica': 'Matemática',
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function mapSubject(discipline: string | null): Subject {
  if (!discipline) return 'Linguagens'
  const key = discipline.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const [k, v] of Object.entries(DISCIPLINE_MAP)) {
    const normalized = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (key.includes(normalized)) return v
  }
  return 'Linguagens'
}

function transformQuestion(enem: EnemQuestion): ChallengeQuestion {
  const options: ChallengeOption[] = enem.alternatives.map(alt => ({
    id: crypto.randomUUID(),
    text: alt.text || `(Imagem ${alt.letter})`,
    correct: alt.isCorrect,
  }))

  const hasImages = enem.alternatives.some(a => a.text === null && a.file)
  const contextParts: string[] = []
  if (enem.context) contextParts.push(enem.context)
  if (hasImages) contextParts.push('(Esta questão contém imagens que estão disponíveis apenas na prova original)')

  return {
    id: crypto.randomUUID(),
    type: 'multipla',
    title: `Questão ${enem.index} — ENEM ${enem.year}`,
    subject: mapSubject(enem.discipline),
    difficulty: 'medio',
    content: contextParts.join('\n\n') || undefined,
    imageUrl: enem.files.length > 0 ? enem.files[0] : undefined,
    explanation: undefined,
    options,
    statements: [],
    orderItems: [],
    blanks: [],
  }
}

export interface ImportProgress {
  current: number
  total: number
  year: number
  phase: 'fetching' | 'inserting' | 'done'
}

export async function importEnemQuestions(
  years: number[],
  onProgress: (p: ImportProgress) => void,
): Promise<number> {
  const userId = await getUserId()
  let imported = 0

  for (const year of years) {
    let offset = 0
    const limit = 50
    let total = 0

    do {
      onProgress({ current: imported, total: total || 180 * years.length, year, phase: 'fetching' })

      const res = await fetch(`${API_BASE}/exams/${year}/questions?limit=${limit}&offset=${offset}`)
      if (!res.ok) {
        if (res.status === 429) {
          await sleep(2000)
          continue
        }
        throw new Error(`Erro ao buscar questões ENEM ${year}: ${res.status}`)
      }

      const data: EnemApiResponse = await res.json()
      total = data.metadata.total
      const questions = data.questions.map(transformQuestion)

      for (const q of questions) {
        onProgress({ current: imported, total: total || 180 * years.length, year, phase: 'inserting' })

        const { error } = await supabase
          .from('questions')
          .insert({
            id: q.id,
            user_id: userId,
            type: q.type,
            title: q.title,
            subject: q.subject,
            content: q.content || null,
            image_url: q.imageUrl || null,
            explanation: q.explanation || null,
            options: q.options,
            statements: q.statements,
            order_items: q.orderItems,
            blanks: q.blanks,
            open_expected_text: q.openExpectedText || null,
          })

        if (error) {
          console.warn(`Falha ao inserir questão ENEM: ${error.message}`)
          continue
        }

        imported++
        await sleep(1100)
      }

      offset += limit
    } while (offset < total)
  }

  onProgress({ current: imported, total: imported, year: years[years.length - 1], phase: 'done' })
  return imported
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  return user.id
}
