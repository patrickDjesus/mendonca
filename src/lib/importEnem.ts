import type { ChallengeQuestion, ChallengeOption, ChallengeDifficulty } from '../types/challenge'
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

const SUBJECT_KEYWORDS: Record<Subject, string[]> = {
  'Física': [
    'força', 'velocidade', 'aceleração', 'movimento', 'energia', 'trabalho', 'potência',
    'circuito', 'tensão', 'resistência', 'corrente', 'elétrica', 'eletromagnetismo',
    'onda', 'luz', 'som', 'calor', 'temperatura', 'termodinâmica', 'entropia',
    'newton', 'gravidade', 'cinemática', 'dinâmica', 'momento', 'impulso',
    'arco elétrico', 'capacitor', 'indutor', 'transformador', 'ohm',
    'reflexão', 'refração', 'lente', 'espelho', 'espectro',
  ],
  'Química': [
    'átomo', 'átomos', 'molécula', 'moléculas', 'elemento', 'elementos',
    'reação', 'reações', 'composto', 'compostos', 'liga', 'ligas',
    'pH', 'ácido', 'ácidos', 'base', 'bases', 'neutralização',
    'tabela periódica', 'elétrons', 'prótons', 'nêutrons', 'camada',
    'orgânico', 'orgânica', 'hidrocarboneto', 'polímero', 'polímeros',
    'solução', 'soluções', 'concentração', 'diluição', 'solubilidade',
    'estequiometria', 'mol', 'massa molar', 'oxidação', 'redução',
    'eletroquímica', 'pilha', 'bateria', 'corrosão',
  ],
  'Biologia': [
    'célula', 'células', 'DNA', 'RNA', 'gene', 'genes', 'genética',
    'evolução', 'evolutiva', 'seleção natural', 'darwin',
    'ecossistema', 'ecossistemas', 'biodiversidade', 'cadeia alimentar',
    'fotossíntese', 'respiração celular', 'metabolismo',
    'bactéria', 'bactérias', 'vírus', 'microrganismo',
    'humano', 'corpo humano', 'sistema digestório', 'sistema nervoso',
    'saúde', 'doença', 'doenças', 'epidemia', 'pandemia', 'vacina',
    'hormônio', 'hormônios', 'enzima', 'enzimas', 'proteína', 'proteínas',
    'meio ambiente', 'desmatamento', 'poluição', 'sustentabilidade',
    'plantio', 'ciclo da água', 'bioma', 'biomas',
  ],
  'Matemática': [
    'equação', 'equações', 'função', 'funções', 'grau', 'polinômio',
    'geometria', 'triângulo', 'círculo', 'área', 'perímetro', 'volume',
    'estatística', 'probabilidade', 'combinatória', 'arranjo', 'combinação',
    'progressão', 'PA', 'PG', 'razão', 'diferença',
    'logaritmo', 'exponencial', 'raiz', 'potência',
    'trigonometria', 'seno', 'cosseno', 'tangente',
    'matriz', 'sistemas lineares', 'determinante',
    'cálculo', 'derivada', 'integral', 'limite',
    'porcentagem', 'razão', 'proporção', 'regra de três',
  ],
  'Linguagens': [
    'texto', 'letra', 'música', 'canção', 'poema', 'poesia',
    'gênero textual', 'gêneros', 'discurso', 'argumentação',
    'norma culta', 'gramática', 'sintaxe', 'semântica',
    'interpretação', 'linguagem', 'figuras de linguagem',
    'metáfora', 'ironia', 'ambiguidade',
    'literatura', 'romance', 'conto', 'crônica',
    'inglês', 'english', 'espanhol', 'español',
    'leitura', 'compreensão', 'coerência', 'coesão',
  ],
  'Geografia': [
    'população', 'populações', 'demografia', 'crescimento populacional',
    'cidade', 'cidades', 'urbanização', 'metropolização',
    'globalização', 'global', 'mundial',
    'relevo', 'continente', 'oceano', 'placa tectônica',
    'clima', 'climático', 'temperatura', 'precipitação',
    'agricultura', 'agropecuária', 'lavoura', 'plantio',
    'recurso', 'recursos naturais', 'matéria-prima',
    'fronteira', 'território', 'região', 'espaço',
    'desigualdade', 'exclusão social', 'fome', 'miséria',
    'energia renovável', 'sustentabilidade ambiental',
  ],
  'História': [
    'Brasil colonial', 'colônia', 'colonial', 'escravidão', 'escravatura',
    'independência', 'independente', 'proclamação',
    'república', 'monarquia', 'imperial',
    'ditadura', 'regime militar', 'AI-5',
    'guerra', 'guerras', 'mundial', 'primeira', 'segunda',
    'revolução', 'revoltas', 'revolta',
    'ditatorial', 'autoritário', 'regime',
    'século', 'Idade Média', 'Renascimento', 'Antiguidade',
    'civilização', 'império', 'república',
    'movimento social', 'trabalhador', 'sindicalismo',
    'imigração', 'imigrante',
  ],
  'Filosofia': [
    'ética', 'moral', 'justiça', 'justo',
    'liberdade', 'liberdades', 'direito', 'direitos',
    'cidadania', 'cidadão', 'cidadã',
    'democracia', 'democrático',
    'igualdade', 'desigualdade',
    'dignidade', 'dignidade humana',
    'pensador', 'filósofo', 'filósofa',
    'consciência', 'existencial', 'existencialismo',
    'virtude', 'bem', 'mal', 'verdade',
  ],
  'Ciências Humanas': [
    'população', 'sociedade', 'social', 'cultura',
    'economia', 'econômico', 'mercado', 'capitalismo',
    'política', 'político', 'governo', 'estado',
    'geopolítica', 'global', 'mundial',
    'desigualdade', 'exclusão', 'marginalização',
  ],
  'Ciências da Natureza': [
    'natureza', 'natural', 'ambiental', 'meio ambiente',
    'ecologia', 'sustentável', 'sustentabilidade',
    'recursos naturais', 'biodiversidade',
    'clima', 'atmosfera', 'hidrosfera',
  ],
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function classifySubject(discipline: string | null, context: string | null): Subject {
  const broad = mapBroadSubject(discipline)

  if (broad === 'Matemática' || broad === 'Linguagens') return broad

  if (!context) return broad

  const text = normalize(context)
  let bestSubject: Subject = broad
  let bestScore = 0

  const candidates = broad === 'Ciências Humanas'
    ? (['História', 'Geografia', 'Filosofia'] as Subject[])
    : broad === 'Ciências da Natureza'
      ? (['Física', 'Química', 'Biologia'] as Subject[])
      : [broad]

  for (const subject of candidates) {
    const keywords = SUBJECT_KEYWORDS[subject] || []
    let score = 0
    for (const kw of keywords) {
      if (text.includes(normalize(kw))) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestSubject = subject
    }
  }

  return bestSubject
}

function mapBroadSubject(discipline: string | null): Subject {
  if (!discipline) return 'Linguagens'
  const key = normalize(discipline)
  for (const [k, v] of Object.entries(DISCIPLINE_MAP)) {
    if (key.includes(normalize(k))) return v
  }
  return 'Linguagens'
}

function estimateDifficulty(index: number, context: string | null): ChallengeDifficulty {
  if (index <= 5) return 'facil'
  if (index > 35) return 'dificil'

  if (context) {
    const text = normalize(context)
    const hardSignals = [
      'considere', 'analise', 'relacao', 'relacione', 'interdependencia',
      'comparando', 'contraste', 'conflito', 'dialetica', 'contraditorio',
      'processo complexo', 'multiplas variaveis',
      'conceito de', 'segundo', 'de acordo com', 'com base',
    ]
    let score = 0
    for (const s of hardSignals) {
      if (text.includes(s)) score++
    }
    if (score >= 3) return 'dificil'
  }

  return 'medio'
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…'
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

  const prefix = `ENEM ${enem.year} Q${enem.index}`
  const title = enem.context
    ? `${prefix} — ${truncate(enem.context.replace(/\n+/g, ' ').trim(), 100)}`
    : `${prefix}`

  return {
    id: crypto.randomUUID(),
    type: 'multipla',
    title,
    subject: classifySubject(enem.discipline, enem.context),
    difficulty: estimateDifficulty(enem.index, enem.context),
    content: contextParts.join('\n\n') || undefined,
    imageUrl: enem.files.length > 0 ? enem.files[0] : undefined,
    explanation: undefined,
    source: 'enem',
    options,
    statements: [],
    orderItems: [],
    blanks: [],
  }
}

export interface ImportProgress {
  current: number
  total: number
  imported: number
  skipped: number
  year: number
  phase: 'fetching' | 'inserting' | 'done'
}

export async function deleteAllEnemQuestions(): Promise<number> {
  const { data, error } = await supabase
    .from('questions')
    .delete()
    .eq('source', 'enem')
    .select('id')

  if (error) throw error
  return data?.length || 0
}

export async function updateQuestionSubject(id: string, subject: Subject): Promise<void> {
  const { error } = await supabase
    .from('questions')
    .update({ subject })
    .eq('id', id)

  if (error) throw error
}

export async function importEnemQuestions(
  years: number[],
  onProgress: (p: ImportProgress) => void,
): Promise<{ imported: number; skipped: number }> {
  const userId = await getUserId()
  let imported = 0
  let skipped = 0

  const { data: existingRows } = await supabase
    .from('questions')
    .select('title')
    .eq('source', 'enem')

  const existingTitles = new Set((existingRows || []).map(r => r.title as string))

  for (const year of years) {
    let offset = 0
    const limit = 50
    let total = 0

    do {
      onProgress({ current: imported + skipped, total: total || 180 * years.length, imported, skipped, year, phase: 'fetching' })

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
        onProgress({ current: imported + skipped, total: total || 180 * years.length, imported, skipped, year, phase: 'inserting' })

        if (existingTitles.has(q.title)) {
          skipped++
          continue
        }

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
            source: q.source || null,
          })

        if (error) {
          console.warn(`Falha ao inserir questão ENEM: ${error.message}`)
          continue
        }

        existingTitles.add(q.title)
        imported++
        await sleep(1100)
      }

      offset += limit
    } while (offset < total)
  }

  onProgress({ current: imported + skipped, total: imported + skipped, imported, skipped, year: years[years.length - 1], phase: 'done' })
  return { imported, skipped }
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  return user.id
}
