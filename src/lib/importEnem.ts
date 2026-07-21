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
    'forca', 'velocidade', 'aceleracao', 'movimento', 'energia', 'trabalho', 'potencia',
    'circuito', 'tensao', 'resistencia', 'corrente', 'eletrica', 'eletromagnetismo',
    'onda', 'luz', 'som', 'calor', 'temperatura', 'termodinamica', 'entropia',
    'newton', 'gravidade', 'cinematica', 'dinamica', 'momento', 'impulso',
    'arco eletrico', 'capacitor', 'indutor', 'transformador', 'ohm',
    'reflexao', 'refracao', 'lente', 'espelho', 'espectro',
    'inercia', 'friccao', 'atrito', 'colisao', 'projecao',
    'frequuencia', 'amplitude', 'velocidade da luz', 'indice de refracao',
    'lei de ohm', 'lei de faraday', 'lei de lenz', 'coulomb',
    'massa', 'peso', 'aceleracao da gravidade', 'campo gravitacional',
    'pressao', 'densidade', 'arquimedes', 'hidrostatica', 'hidrodinamica',
    'calorimetria', 'calor sensivel', 'calor latente', 'dilatacao',
    'cinetica', 'potencial', 'eletrico', 'magnetico', 'magnetismo',
    'semicondutor', 'diodo', 'transistor', 'led', 'fotoeletrico',
    'nuclear', 'radioatividade', 'fissao', 'fusao', 'massa atomica',
    'torricelli', 'pascal', 'energia cinetica', 'energia potencial',
    'trabalho mecanico', 'rendimento', 'maquina simples', 'alavanca',
    'relatividade', 'espaco-tempo', 'einstein', 'foton',
  ],
  'Química': [
    'atomo', 'atomos', 'molecula', 'moleculas', 'elemento', 'elementos',
    'reacao', 'reacoes', 'composto', 'compostos', 'liga', 'ligas',
    'ph', 'acido', 'acidos', 'base', 'bases', 'neutralizacao',
    'tabela periodica', 'eletrons', 'protons', 'neutrons', 'camada',
    'organico', 'organica', 'hidrocarboneto', 'polimero', 'polimeros',
    'solucao', 'solucoes', 'concentracao', 'diluicao', 'solubilidade',
    'estequiometria', 'mol', 'massa molar', 'oxidacao', 'reducao',
    'eletroquimica', 'pilha', 'bateria', 'corrosao',
    'carbono', 'hidrogenio', 'oxigenio', 'nitrogenio', 'enxofre',
    'sal', 'cloreto', 'sulfato', 'carbonato', 'bicarbonato',
    'gás', 'gas', 'vapor', 'condensacao', 'ebulicao', 'fusao',
    'cristal', 'cristalino', 'amorfo', 'estrutura cristalina',
    'isomeria', 'isomero', 'cadeia carbônica', 'funcao organica',
    'alcool', 'aldeido', 'cetona', 'acido carboxilico', 'amina',
    'coligativa', 'ebulioscopia', 'crioscopia', 'osmose',
    'ph', 'ionizacao', 'dissociacao', 'constante de equilibrio',
    'velocidade de reacao', 'catalisador', 'ativacao',
    'cinza', 'fogos', 'explosivo', 'nitroglicerina', 'dinitrotolueno',
    'combustao', 'combustivel', 'hidrocarboneto', 'petroleo', 'gas natural',
    'poluicao quimica', 'metais pesados', 'mercurio', 'chumbo',
    'ferro', 'aco', 'cobre', 'aluminio', 'ouro', 'prata',
    'gasolina', 'etanol', 'biodiesel', 'hidrogenio verde',
  ],
  'Biologia': [
    'celula', 'celulas', 'dna', 'rna', 'gene', 'genes', 'genetica',
    'evolucao', 'evolutiva', 'selecao natural', 'darwin',
    'ecossistema', 'ecossistemas', 'biodiversidade', 'cadeia alimentar',
    'fotossintese', 'respiracao celular', 'metabolismo',
    'bacteria', 'bacterias', 'virus', 'microrganismo',
    'humano', 'corpo humano', 'sistema digestorio', 'sistema nervoso',
    'saude', 'doenca', 'doencas', 'epidemia', 'pandemia', 'vacina',
    'hormonio', 'hormonios', 'enzima', 'enzimas', 'proteina', 'proteinas',
    'meio ambiente', 'desmatamento', 'poluicao', 'sustentabilidade',
    'plantio', 'ciclo da agua', 'bioma', 'biomas',
    'mitose', 'meiose', 'cromossomo', 'alelo', 'genotipo', 'fenotipo',
    'hereditario', 'hereditariedade', 'mendel', 'diibridismo',
    'teia alimentar', 'ciclo do carbono', 'ciclo do nitrogenio',
    'decompositor', 'produtor', 'consumidor', 'predador', 'presa',
    'simbiose', 'mutualismo', 'parasitismo', 'competicao',
    'selecao artificial', 'especiacao', 'extincao', 'fosseis',
    'anatomia', 'fisiologia', 'histologia', 'tecido',
    'sangue', 'coracao', 'pulmao', 'rim', 'figado', 'intestino',
    'sistema imunologico', 'anticorpo', 'antigeno', 'linfocito',
    'fotossintese', 'clorofila', 'ciclo de calvin', 'krebs',
    'glicolise', 'atp', 'mitocondria', 'ribossomo',
    'aminoacido', 'lipideo', 'carboidrato', 'acido nucleico',
    'biodiversidade', 'conservacao', 'desmatamento', 'queimada',
    'cambio climatico', 'efeito estufa', 'camada de ozonio',
    'transgênico', 'transgenico', 'engenharia genetica', 'clonagem',
    'covid', 'sars', 'coronavirus', 'gripe', 'dengue', 'zika',
    'antibiotico', 'antibacteriano', 'resistencia', 'mutacao',
  ],
  'Matemática': [
    'equacao', 'equacoes', 'funcao', 'funcoes', 'grau', 'polinomio',
    'geometria', 'triangulo', 'circulo', 'area', 'perimetro', 'volume',
    'estatistica', 'probabilidade', 'combinatoria', 'arranjo', 'combinacao',
    'progressao', 'pa', 'pg', 'razao', 'diferenca',
    'logaritmo', 'exponencial', 'raiz', 'potencia',
    'trigonometria', 'seno', 'cosseno', 'tangente',
    'matriz', 'sistemas lineares', 'determinante',
    'calculo', 'derivada', 'integral', 'limite',
    'porcentagem', 'proporcao', 'regra de tres',
    'plano cartesiano', 'reta', 'reta tangente', 'circunferencia',
    'hipotenusa', 'cateto', 'pitagoras', 'teorema',
    'congruencia', 'semelhanca', 'angulo', 'angulos',
    'simetria', 'translacao', 'rotacao', ' reflexao',
    'prisma', 'piramide', 'cilindro', 'cone', 'esfera',
    'conversao', 'unidade', 'sistema metrico',
    'mmc', 'mdc', 'divisao', 'divisivel', 'primo', 'primo',
    'fracao', 'numeros racionais', 'irracional',
    'desigualdade', 'modulo', 'valor absoluto',
    'conjunto', 'conjuntos', 'uniao', 'intersecao',
    'estatistica', 'media', 'mediana', 'moda', 'desvio',
    'grafico', 'grafico de barras', 'histograma',
    'juros simples', 'juros compostos', 'capital', 'taxa',
    'escala', 'razao grafica', 'proporcionalidade',
    'congruencia', 'lado', 'diagonal', 'poligono',
    'circulo', 'arco', 'corda', 'setor circular',
    'funcao afim', 'funcao quadratica', 'funcao exponencial',
    'funcao logaritmica', 'funcao trigonometrica',
    'permutacao', 'combinacao', 'principio multiplicativo',
    'bayes', 'problema', 'conta', 'calculo', 'numero',
    'quociente', 'dividendo', 'divisor', 'resto',
    'multiplo', 'divisor', 'criterio de divibilidade',
    'notacao cientifica', 'notacao decimal',
    'corpo', 'faces', 'arestas', 'vertices',
    'paralela', 'perpendicular', 'concotada',
    'vetor', 'vetores', 'produto escalar', 'produto vetorial',
  ],
  'Linguagens': [
    'texto', 'letra', 'musica', 'cancao', 'poema', 'poesia',
    'genero textual', 'generos', 'discurso', 'argumentacao',
    'norma culta', 'gramatica', 'sintaxe', 'semantica',
    'interpretacao', 'linguagem', 'figuras de linguagem',
    'metafora', 'ironia', 'ambiguidade',
    'literatura', 'romance', 'conto', 'cronica',
    'ingles', 'english', 'espanhol', 'espanhol',
    'leitura', 'compreensao', 'coerencia', 'coesao',
    'substantivo', 'adjetivo', 'verbo', 'adverbio', 'preposicao',
    'sujeito', 'predicado', 'objeto', 'complemento',
    'oracao', 'frase', 'periodo', 'paragrafo',
    'genero literario', 'narrativo', 'descritivo', 'dissertativo',
    'lirismo', 'subjetividade', 'eu lirico',
    'verso', 'estrofe', 'estrofe', 'rima', 'metrica',
    'soneto', 'ode', 'elegia', 'epigrama',
    'prosa', 'romance', 'novela', 'ficcao',
    'jornalistico', 'noticia', 'editorial', 'reportagem',
    'publicitario', 'propaganda', 'anuncio',
    'instrucional', 'receita', 'manual', 'bula',
    'dialogo', 'entrevista', 'debate',
    'plano de texto', 'introducao', 'conclusao', 'argumento',
    'redacao', 'redigir', 'escrever', 'escreva',
    'lingua portuguesa', 'linguagem verbal', 'linguagem nao verbal',
    'recurso expressivo', 'recurso linguistico',
    'conotacao', 'denotacao', 'polissemia', 'antonimo', 'sinonimo',
    'campos semanticos', 'jargao', 'gíria',
    'discurso indireto livre', 'fluxo de consciencia',
    'foco narrativo', 'tempo verbal', 'genero do texto',
    'tema', 'titulo', 'publico alvo', 'intencao',
    'ingles', 'spanish', 'idioma', 'idiomas', 'extrangeiro',
  ],
  'Geografia': [
    'populacao', 'populacoes', 'demografia', 'crescimento populacional',
    'cidade', 'cidades', 'urbanizacao', 'metropolizacao',
    'globalizacao', 'global', 'mundial',
    'relevo', 'continente', 'oceano', 'placa tectonica',
    'clima', 'climatico', 'temperatura', 'precipitacao',
    'agricultura', 'agropecuaria', 'lavoura', 'plantio',
    'recurso', 'recursos naturais', 'materia-prima',
    'fronteira', 'territorio', 'regiao', 'espaco',
    'desigualdade', 'exclusao social', 'fome', 'miseria',
    'energia renovavel', 'sustentabilidade ambiental',
    'mapa', 'atlas', 'coordenadas', 'latitude', 'longitude',
    'meridiano', 'equador', 'tropico', 'circulo polar',
    'brasilia', 'brasil', 'americas', 'america do sul',
    'oeste', 'leste', 'norte', 'sul',
    'portos', 'aeroportos', 'rodovia', 'ferrovia',
    'comercio', 'importacao', 'exportacao', 'balanca comercial',
    'piib', 'pib', 'desenvolvimento', 'idh', 'indicadores',
    'desemprego', 'informalidade', 'trabalho escravo',
    'migracao', 'migrante', 'refugiado', 'apatriado',
    'conflito fundiario', 'reforma agraria', 'sem terra',
    'indigena', 'quilombo', 'comunidade tradicional',
    'urbanizacao', 'crescimento urbano', 'periferia', 'favela',
    'megalopole', 'regiao metropolitana',
    'bacia hidrografica', 'rio', 'lago', 'represa', 'aquifero',
    'solo', 'erosao', 'desmatamento', 'reflorestamento',
    'bioma', 'amazonia', 'cerrado', 'mata atlantica', 'caatinga',
    'pantanal', 'pampa',
    'cambio climatico', 'aquecimento global', 'emissao', 'co2',
    'etica ambiental', 'desenvolvimento sustentavel',
    'geopolitica', 'onu', 'mercosul', 'brics',
    'imperialismo', 'neocolonialismo', 'dependencia',
  ],
  'História': [
    'brasil colonial', 'colonia', 'colonial', 'escravidao', 'escravatura',
    'independencia', 'independente', 'proclamacao',
    'republica', 'monarquia', 'imperial',
    'ditadura', 'regime militar', 'ai-5',
    'guerra', 'guerras', 'mundial', 'primeira', 'segunda',
    'revolucao', 'revoltas', 'revolta',
    'ditatorial', 'autoritario', 'regime',
    'seculo', 'idade media', 'renascimento', 'antiguidade',
    'civilizacao', 'imperio', 'republica',
    'movimento social', 'trabalhador', 'sindicalismo',
    'imigracao', 'imigrante',
    'descobrimento', 'pedro alvares cabral', 'tupinamba',
    'bandeirantes', 'missoes', 'jesuitas',
    'capitanias hereditarias', 'governo geral', 'administracao colonial',
    'ouro', 'mineracao', 'ciclo do ouro', 'minas gerais',
    'inconfidencia mineira', 'tiradentes', 'jacobinos',
    'revolta dos maloes', 'inconfidencia baiana',
    'pernambuco', 'revolucao pernambucana',
    'abertura dos portos', 'dom joao', 'd. joao',
    'independencia do brasil', 'dom pedro i', 'pedro i',
    'brasil imperial', 'casa da suplicacao', 'conselho de estado',
    'guerra do paraguai', 'triplice alianca',
    'ababolicao', 'lei aurea', 'princessa', 'abole',
    'republica da espada', 'republica velha', 'cafe com leite',
    'era vargas', 'getulio vargas', 'estado novo',
    'plebiscito', 'constituicao', 'carta de 37',
    'getulio', 'juscelino', 'juscelino kubitschek',
    'brasilia', '50 anos em 5',
    'golpe de 64', 'ai-5', 'censura', 'tortura',
    'ditadura militar', 'resistencia', 'armada',
    'abertura democratica', 'anistia', 'diretas ja',
    'nova republica', 'collor', 'impeachment',
    'era lula', 'dilma', 'golpe parlamentar',
    'segunda guerra', 'holocausto', 'nazismo', 'fascismo',
    'guerra fria', 'urss', 'europa feudal', 'feudalismo',
    'iluminismo', 'revolucao francesa', 'independencia americana',
    'revolucao industrial', 'capitalismo', 'socialismo',
    'messias', 'dom pedro ii', 'abolição',
  ],
  'Filosofia': [
    'etica', 'moral', 'justica', 'justo',
    'liberdade', 'liberdades', 'direito', 'direitos',
    'cidadania', 'cida dao', 'cida da',
    'democracia', 'democratico',
    'igualdade', 'desigualdade',
    'dignidade', 'dignidade humana',
    'pensador', 'filosofo', 'filosofa',
    'consciencia', 'existencial', 'existencialismo',
    'virtude', 'bem', 'mal', 'verdade',
    'platon', 'aristoteles', 'socrates', 'heraclito',
    'descartes', 'kant', 'nietzsche', 'spinoza',
    'locke', 'hobbes', 'rousseau', 'marx',
    'sartre', 'camus', 'heidegger', 'fenomenologia',
    'ontologia', 'epistemologia', 'logica', 'dialetica',
    'dualismo', 'monismo', 'materialismo', 'idealismo',
    'utilitarismo', 'deontologia', 'virtude',
    'contrato social', 'vontade geral',
    'imperativo categorico', 'etica kantiana',
    'niilismo', 'absurdo', 'angustia', 'autenticidade',
    'sujeito', 'objeto', 'fenomeno', 'noumen',
    'razao', 'entendimento', 'sensibilidade',
    'liberdade de consciencia', 'pluralismo',
    'igualdade de genero', 'etica ambiental',
    'bioetica', 'eutanasia', 'aborto',
    'propriedade intelectual', 'direitos autorais',
  ],
  'Ciências Humanas': [],
  'Ciências da Natureza': [],
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function classifySubject(discipline: string | null, context: string | null, altTexts: string[] = []): Subject {
  const broad = mapBroadSubject(discipline)

  const fullText = [
    context || '',
    ...altTexts,
  ].join(' ')

  const candidates: Subject[] = broad === 'Ciências Humanas'
    ? ['História', 'Geografia', 'Filosofia']
    : broad === 'Ciências da Natureza'
      ? ['Física', 'Química', 'Biologia']
      : broad === 'Matemática'
        ? ['Matemática']
        : broad === 'Linguagens'
          ? ['Linguagens']
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
    if (score > bestScore) {
      bestScore = score
      bestSubject = subject
    }
  }

  if (bestScore === 0 && (!broad || broad === 'Linguagens')) {
    return 'Linguagens'
  }

  return bestScore > 0 ? bestSubject : (broad || 'Linguagens')
}

function mapBroadSubject(discipline: string | null): Subject | null {
  if (!discipline) return null
  const key = normalize(discipline)
  for (const [k, v] of Object.entries(DISCIPLINE_MAP)) {
    if (key.includes(normalize(k))) return v
  }
  return null
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

  const altTexts = enem.alternatives.map(a => a.text || '').filter(Boolean)

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
    subject: classifySubject(enem.discipline, enem.context, altTexts),
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
