import { useState, useEffect, useRef, useCallback } from 'react'
import type { ChallengeQuestion, ChallengeOption } from '../../types/challenge'
import type { Subject } from '../../types/doc'
import '../../styles/simulados.css'

const API_BASE = 'https://api.enem.dev/v1'
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

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

const ENEM_YEARS = [2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009]

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const DISCIPLINE_MAP: Record<string, Subject> = {
  'linguagens': 'Linguagens',
  'ciencias humanas': 'Ciências Humanas',
  'ciencias da natureza': 'Ciências da Natureza',
  'matematica': 'Matemática',
}

function mapBroadSubject(discipline: string | null): Subject | null {
  if (!discipline) return null
  const key = normalize(discipline)
  for (const [k, v] of Object.entries(DISCIPLINE_MAP)) {
    if (key.includes(normalize(k))) return v
  }
  return null
}

const SUBJECT_KEYWORDS: Record<Subject, string[]> = {
  'Física': [
    'forca', 'velocidade', 'aceleracao', 'movimento', 'energia', 'trabalho', 'potencia',
    'circuito', 'tensao', 'resistencia', 'corrente', 'eletrica', 'eletromagnetismo',
    'onda', 'luz', 'som', 'calor', 'temperatura', 'newton', 'gravidade',
    'cinematica', 'dinamica', 'momento', 'impulso', 'inercia', 'friccao', 'atrito',
    'colisao', 'frequuencia', 'amplitude', 'lei de ohm', 'lei de faraday',
    'massa', 'peso', 'pressao', 'densidade', 'arquimedes', 'hidrostatica',
    'calorimetria', 'dilatacao', 'cinetica', 'potencial', 'magnetismo',
    'semicondutor', 'nuclear', 'radioatividade', 'energia cinetica', 'energia potencial',
    'trabalho mecanico', 'alavanca', 'relatividade', 'einstein', 'foton',
  ],
  'Química': [
    'atomo', 'atomos', 'molecula', 'moleculas', 'elemento', 'elementos',
    'reacao', 'reacoes', 'composto', 'compostos', 'liga', 'ligas',
    'ph', 'acido', 'acidos', 'base', 'bases', 'neutralizacao',
    'tabela periodica', 'eletrons', 'protons', 'neutrons', 'camada',
    'organico', 'organica', 'hidrocarboneto', 'polimero', 'polimeros',
    'solucao', 'solucoes', 'concentracao', 'diluicao', 'solubilidade',
    'estequiometria', 'mol', 'massa molar', 'oxidacao', 'reducao',
    'eletroquimica', 'pilha', 'bateria', 'corrosao', 'carbono',
    'gás', 'gas', 'vapor', 'cristal', 'isomeria', 'combustao', 'combustivel',
  ],
  'Biologia': [
    'celula', 'celulas', 'dna', 'rna', 'gene', 'genes', 'genetica',
    'evolucao', 'evolutiva', 'selecao natural', 'darwin',
    'ecossistema', 'ecossistemas', 'biodiversidade', 'cadeia alimentar',
    'fotossintese', 'respiracao celular', 'metabolismo',
    'bacteria', 'bacterias', 'virus', 'microrganismo',
    'sistema digestorio', 'sistema nervoso', 'doenca', 'doencas',
    'vacina', 'hormonio', 'enzima', 'proteina', 'proteinas',
    'meio ambiente', 'desmatamento', 'bioma', 'biomas',
    'mitose', 'meiose', 'cromossomo', 'alelo', 'genotipo', 'fenotipo',
    'hereditario', 'mendel', 'teia alimentar', 'simbiose',
    'selecao artificial', 'especiacao', 'extincao', 'anatomia', 'fisiologia',
    'sangue', 'coracao', 'pulmao', 'sistema imunologico', 'clorofila',
    'aminoacido', 'lipideo', 'carboidrato', 'transgênico', 'covid', 'dengue',
  ],
  'Matemática': [
    'equacao', 'equacoes', 'funcao', 'funcoes', 'grau', 'polinomio',
    'geometria', 'triangulo', 'circulo', 'area', 'perimetro', 'volume',
    'estatistica', 'probabilidade', 'combinatoria', 'arranjo', 'combinacao',
    'progressão', 'pa', 'pg', 'razao', 'diferenca',
    'logaritmo', 'exponencial', 'raiz', 'potencia',
    'trigonometria', 'seno', 'cosseno', 'tangente',
    'matriz', 'sistemas lineares', 'determinante',
    'calculo', 'derivada', 'integral', 'limite',
    'porcentagem', 'proporcao', 'regra de tres',
    'plano cartesiano', 'hipotenusa', 'cateto', 'pitagoras', 'teorema',
    'prisma', 'piramide', 'cilindro', 'cone', 'esfera',
    'fracao', 'numeros racionais', 'desigualdade', 'modulo',
    'conjunto', 'media', 'mediana', 'moda', 'juros', 'vetor', 'vetores',
  ],
  'Linguagens': [
    'texto', 'letra', 'musica', 'cancao', 'poema', 'poesia',
    'genero textual', 'generos', 'discurso', 'argumentacao',
    'norma culta', 'gramatica', 'sintaxe', 'semantica',
    'interpretacao', 'linguagem', 'figuras de linguagem',
    'metafora', 'ironia', 'ambiguidade',
    'literatura', 'romance', 'conto', 'cronica',
    'ingles', 'english', 'espanhol',
    'leitura', 'compreensao', 'coerencia', 'coesao',
    'substantivo', 'adjetivo', 'verbo', 'sujeito', 'predicado',
    'oracao', 'frase', 'periodo', 'narrativo', 'descritivo',
    'verso', 'estrofe', 'rima', 'soneto', 'prosa', 'ficcao',
    'redacao', 'lingua portuguesa', 'genero do texto',
  ],
  'Geografia': [
    'populacao', 'populacoes', 'demografia', 'crescimento populacional',
    'cidade', 'cidades', 'urbanizacao', 'metropolizacao',
    'globalizacao', 'global', 'mundial',
    'relevo', 'continente', 'oceano', 'placa tectonica',
    'clima', 'climatico', 'temperatura', 'precipitacao',
    'agricultura', 'agropecuaria', 'lavoura',
    'recurso', 'recursos naturais', 'fronteira', 'territorio', 'regiao',
    'desigualdade', 'exclusao social', 'fome',
    'energia renovavel', 'sustentabilidade ambiental',
    'mapa', 'atlas', 'latitude', 'longitude', 'meridiano', 'equador',
    'brasil', 'americas', 'america do sul', 'portos', 'comercio',
    'pib', 'idh', 'migracao', 'indigena', 'quilombo',
    'bioma', 'amazonia', 'cerrado', 'mata atlantica', 'caatinga',
    'cambio climatico', 'aquecimento global', 'geopolitica', 'onu', 'mercosul',
  ],
  'História': [
    'brasil colonial', 'colonia', 'colonial', 'escravidao', 'escravatura',
    'independencia', 'independente', 'proclamacao',
    'republica', 'monarquia', 'imperial',
    'ditadura', 'regime militar', 'ai-5',
    'guerra', 'guerras', 'mundial', 'revolucao', 'revoltas', 'revolta',
    'seculo', 'idade media', 'renascimento', 'antiguidade',
    'civilizacao', 'imperio', 'movimento social', 'imigracao',
    'descobrimento', 'bandeirantes', 'jesuitas',
    'capitanias hereditarias', 'inconfidencia mineira', 'tiradentes',
    'independencia do brasil', 'guerra do paraguai',
    'lei aurea', 'era vargas', 'getulio vargas', 'estado novo',
    'juscelino kubitschek', 'golpe de 64', 'ditadura militar',
    'segunda guerra', 'holocausto', 'nazismo', 'fascismo',
    'guerra fria', 'feudalismo', 'iluminismo', 'revolucao francesa',
    'revolucao industrial', 'capitalismo', 'socialismo',
  ],
  'Filosofia': [
    'etica', 'moral', 'justica', 'justo',
    'liberdade', 'liberdades', 'direito', 'direitos',
    'cidadania', 'cida dao', 'cida da',
    'democracia', 'democratico', 'igualdade', 'desigualdade',
    'dignidade', 'dignidade humana', 'pensador', 'filosofo', 'filosofa',
    'consciencia', 'existencial', 'existencialismo',
    'virtude', 'bem', 'mal', 'verdade',
    'platon', 'aristoteles', 'socrates', 'descartes', 'kant', 'nietzsche',
    'sartre', 'camus', 'heidegger', 'fenomenologia',
    'ontologia', 'epistemologia', 'logica', 'dialetica',
    'dualismo', 'materialismo', 'idealismo',
    'contrato social', 'imperativo categorico', 'niilismo', 'absurdo',
    'bioetica', 'liberdade de consciencia', 'pluralismo',
  ],
  'Ciências Humanas': [],
  'Ciências da Natureza': [],
}

function classifySubject(discipline: string | null, context: string | null, altTexts: string[] = []): Subject {
  const broad = mapBroadSubject(discipline)
  const fullText = [context || '', ...altTexts].join(' ')
  const candidates: Subject[] = broad === 'Ciências Humanas'
    ? ['História', 'Geografia', 'Filosofia']
    : broad === 'Ciências da Natureza'
      ? ['Física', 'Química', 'Biologia']
      : broad === 'Matemática' ? ['Matemática']
        : broad === 'Linguagens' ? ['Linguagens']
          : ['Física', 'Química', 'Biologia', 'Matemática', 'Linguagens', 'História', 'Geografia', 'Filosofia']
  if (!fullText.trim()) return broad || 'Linguagens'
  const text = normalize(fullText)
  let bestSubject: Subject = broad || 'Linguagens'
  let bestScore = 0
  for (const subject of candidates) {
    const keywords = SUBJECT_KEYWORDS[subject] || []
    let score = 0
    for (const kw of keywords) {
      const nkw = normalize(kw)
      if (nkw.length < 3) continue
      if (text.includes(nkw)) score++
    }
    if (score > bestScore) { bestScore = score; bestSubject = subject }
  }
  return bestScore > 0 ? bestSubject : (broad || 'Linguagens')
}

function transformQuestion(enem: EnemQuestion): ChallengeQuestion {
  const options: ChallengeOption[] = enem.alternatives.map(alt => ({
    id: crypto.randomUUID(),
    text: alt.text || `(Imagem ${alt.letter})`,
    correct: alt.isCorrect,
  }))
  const altTexts = enem.alternatives.map(a => a.text || '').filter(Boolean)
  const prefix = `ENEM ${enem.year} Q${enem.index}`
  const title = enem.context
    ? `${prefix} — ${enem.context.replace(/\n+/g, ' ').trim().slice(0, 100)}`
    : prefix

  return {
    id: crypto.randomUUID(),
    type: 'multipla',
    title,
    subject: classifySubject(enem.discipline, enem.context, altTexts),
    difficulty: enem.index <= 5 ? 'facil' : enem.index > 35 ? 'dificil' : 'medio',
    content: enem.context || undefined,
    imageUrl: enem.files.length > 0 ? enem.files[0] : undefined,
    options,
    statements: [],
    orderItems: [],
    blanks: [],
  }
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

type View = 'gallery' | 'exam'

export default function Simulados() {
  const [view, setView] = useState<View>('gallery')
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [questions, setQuestions] = useState<ChallengeQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const questionRefs = useRef<Map<number, HTMLDivElement | null>>(new Map())
  const navigatorRef = useRef<HTMLDivElement>(null)

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => () => stopTimer(), [stopTimer])

  useEffect(() => {
    setLoading(false)
  }, [])

  const startExam = useCallback(async (year: number) => {
    setSelectedYear(year)
    setQuestions([])
    setAnswers({})
    setElapsed(0)

    const res = await fetch(`${API_BASE}/exams/${year}/questions?limit=180&offset=0`)
    if (!res.ok) throw new Error(`Erro ao buscar questões ENEM ${year}: ${res.status}`)
    const data: EnemApiResponse = await res.json()
    const qs = data.questions.map(transformQuestion)
    setQuestions(qs)
    setView('exam')

    startTimeRef.current = Date.now()
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(Date.now() - startTimeRef.current), 200)
  }, [])

  const handleAnswer = useCallback((questionId: string, optionId: string) => {
    setAnswers(prev => {
      const next = { ...prev }
      if (next[questionId] === optionId) {
        delete next[questionId]
      } else {
        next[questionId] = optionId
      }
      return next
    })
  }, [])

  const scrollToQuestion = useCallback((index: number) => {
    const el = questionRefs.current.get(index)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const handleFinish = useCallback(() => {
    stopTimer()
  }, [stopTimer])

  if (view === 'gallery') {
    return (
      <div className="simulados-page">
        <div className="simulados-header">
          <div className="simulados-header-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <h1 className="simulados-title">Simulados ENEM</h1>
          </div>
          <span className="simulados-count">{ENEM_YEARS.length} provas disponíveis</span>
        </div>

        {loading ? (
          <div className="simulados-empty">
            <div className="quiz-spinner" />
            <h4 className="simulados-empty-title">Carregando...</h4>
          </div>
        ) : (
          <div className="simulados-grid">
            {ENEM_YEARS.map((year, idx) => (
              <div
                key={year}
                className={`simulado-card ${idx >= 5 ? 'disabled' : ''}`}
                onClick={() => idx < 5 && startExam(year)}
              >
                <div className="simulado-card-top">
                  <span className="simulado-card-year">{year}</span>
                  {idx < 5 ? (
                    <span className="simulado-card-badge available">Disponível</span>
                  ) : (
                    <span className="simulado-card-badge coming">Em breve</span>
                  )}
                </div>
                <div className="simulado-card-body">
                  <div className="simulado-card-info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span>Até 180 questões</span>
                  </div>
                  <div className="simulado-card-info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Sem tempo limite</span>
                  </div>
                  <div className="simulado-card-info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span>Múltipla escolha</span>
                  </div>
                </div>
                {idx < 5 && (
                  <button className="simulado-card-btn" type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Iniciar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const answeredCount = Object.keys(answers).length
  const totalQuestions = questions.length

  return (
    <div className="simulados-page exam-view">
      <div className="exam-header">
        <button className="exam-back-btn" onClick={() => { stopTimer(); setView('gallery') }} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="exam-header-info">
          <span className="exam-year">ENEM {selectedYear}</span>
          <span className="exam-progress-text">{answeredCount}/{totalQuestions} respondidas</span>
        </div>
        <div className="exam-header-right">
          <span className="exam-timer">{formatTime(elapsed)}</span>
          {answeredCount === totalQuestions && totalQuestions > 0 && (
            <button className="exam-finish-btn" onClick={handleFinish} type="button">
              Finalizar
            </button>
          )}
        </div>
      </div>

      <div className="exam-layout">
        <div className="exam-questions">
          {questions.map((q, idx) => {
            const isAnswered = !!answers[q.id]
            return (
              <div
                key={q.id}
                ref={el => { questionRefs.current.set(idx, el) }}
                className={`exam-question ${isAnswered ? 'answered' : ''}`}
              >
                <div className="exam-q-header">
                  <span className="exam-q-num">{idx + 1}</span>
                  <span className="exam-q-subject">{q.subject}</span>
                </div>
                {q.content && <p className="exam-q-content">{q.content}</p>}
                {q.imageUrl && <img className="exam-q-image" src={q.imageUrl} alt="" />}
                <div className="exam-q-options">
                  {q.options.map((opt, oi) => (
                    <button
                      key={opt.id}
                      className={`exam-option ${answers[q.id] === opt.id ? 'selected' : ''}`}
                      onClick={() => handleAnswer(q.id, opt.id)}
                      type="button"
                    >
                      <span className="exam-option-letter">{LETTERS[oi]}</span>
                      <span className="exam-option-text">{opt.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="exam-navigator" ref={navigatorRef}>
          <div className="navigator-header">
            <span className="navigator-title">Questões</span>
            <span className="navigator-count">{answeredCount}/{totalQuestions}</span>
          </div>
          <div className="navigator-grid">
            {questions.map((q, idx) => {
              const isAnswered = !!answers[q.id]
              return (
                <button
                  key={q.id}
                  className={`navigator-btn ${isAnswered ? 'answered' : 'unanswered'}`}
                  onClick={() => scrollToQuestion(idx)}
                  type="button"
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
