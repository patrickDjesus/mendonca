import type { VercelRequest, VercelResponse } from '@vercel/node'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
const MAX_TEXT_CHARS = 25000

interface RequestBody {
  themeTitle: string
  themeFonte: string
  themeInfo: string
  inspiration: string[]
  text: string
}

const COMPETENCES = [
  {
    code: 'C1',
    name: 'Dominar a norma culta da língua portuguesa',
  },
  {
    code: 'C2',
    name: 'Compreender a proposta e aplicar conceitos das várias áreas de conhecimento',
  },
  {
    code: 'C3',
    name: 'Selecionar, relacionar e organizar argumentos em defesa de um ponto de vista',
  },
  {
    code: 'C4',
    name: 'Demonstrar conhecimento dos mecanismos linguísticos de construção da argumentação',
  },
  {
    code: 'C5',
    name: 'Elaborar proposta de intervenção respeitando os direitos humanos',
  },
]

function buildPrompt(body: RequestBody): { system: string; user: string } {
  const tema = `TEMA: "${body.themeTitle}"
FONTE: "${body.themeFonte}"
ORIENTAÇÃO: ${body.themeInfo}
TEXTOS MOTIVADORES:\n${body.inspiration.map((t, i) => `${i + 1}. ${t}`).join('\n')}`

  return {
    system: `Você é um corretor oficial de redações do ENEM, rigoroso e justo, especialista na Matriz de Referência do ENEM.
Você receberá o tema da redação (com textos motivadores) e a redação de um estudante. Você deve avaliar o texto dissertativo-argumentativo de acordo com as 5 competências do ENEM, cada uma valendo de 0 a 200 pontos.

Competências avaliadas:
${COMPETENCES.map(c => `${c.code}: ${c.name}`).join('\n')}

Regras da avaliação:
- A nota total é a soma das 5 competências (0 a 1000).
- A nota de cada competência deve ser múltipla de 20 (0, 20, 40, ..., 200), como no ENEM.
- Se a redação tiver menos de 7 linhas, for tangente ao tema ou contiver conteúdo ofensivo aos direitos humanos, registre nota 0 nas competências correspondentes.
- Produza marcações no texto original apontando problemas e qualidades. "inicio" e "fim" são índices de caracteres (offset) no texto enviado (0-based, fim exclusivo) e "texto" deve ser exatamente o trecho contido entre esses índices. Tipos válidos: "erro_ortografico" (desvios de ortografia/gramática), "coesao" (problemas de coesão/coerência) e "ponto_positivo" (trechos bem elaborados).

Responda APENAS com um JSON válido (sem markdown, sem \`\`\`), exatamente neste formato:
{
  "nota_total": 0,
  "resumo": "Breve parecer geral em 2 a 3 frases.",
  "competencias": [
    { "codigo": "C1", "nome": "Dominar a norma culta da língua portuguesa", "nota": 0, "feedback": "Análise detalhada do desempenho na competência, em 2 a 3 frases." }
  ],
  "marcacoes": [
    { "tipo": "erro_ortografico", "inicio": 0, "fim": 1, "texto": "trecho", "nota": "Explicação breve do problema ou qualidade." }
  ],
  "comentarios": ["Comentário geral 1", "Comentário geral 2"],
  "sugestoes_reescrita": ["Sugestão de reescrita 1", "Sugestão de reescrita 2"],
  "conectivos": { "usados": ["portanto"], "sugestao": "Dica sobre o uso de conectivos." }
}

Importante: o JSON deve ter exatamente as chaves acima. "competencias" deve conter exatamente as 5 competências, na ordem C1 a C5.`,
    user: `${tema}\n\nREDAÇÃO DO ESTUDANTE:\n${body.text}`,
  }
}

async function callOpenAI(system: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error(`[corrigir-redacao] OpenAI error ${response.status}:`, err.slice(0, 300))
    throw new Error(`Erro ao comunicar com a IA (status ${response.status})`)
  }

  const data = await response.json()
  return (data.choices?.[0]?.message?.content || '').trim()
}

async function callGroq(system: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error(`[corrigir-redacao] Groq error ${response.status}:`, err.slice(0, 300))
    throw new Error(`Erro ao comunicar com a IA (status ${response.status})`)
  }

  const data = await response.json()
  return (data.choices?.[0]?.message?.content || '').trim()
}

function parseJsonResponse(raw: string): unknown {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }
  try {
    return JSON.parse(cleaned)
  } catch {
    console.error('[corrigir-redacao] Resposta da IA não é JSON válido:', cleaned.slice(0, 300))
    throw new Error('Resposta da IA em formato inválido')
  }
}

function sanitizeCorrection(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Resposta da IA em formato inválido')
  }
  const r = raw as Record<string, unknown>

  const competencias = Array.isArray(r.competencias)
    ? (r.competencias as Array<Record<string, unknown>>).slice(0, 5).map((c, i) => ({
        code: (c.codigo as string) || `C${i + 1}`,
        name: (c.nome as string) || COMPETENCES[i]?.name || '',
        score: typeof c.nota === 'number' ? c.nota : 0,
        feedback: typeof c.feedback === 'string' ? c.feedback : '',
      }))
    : COMPETENCES.map(c => ({ code: c.code, name: c.name, score: 0, feedback: '' }))

  const marcas = Array.isArray(r.marcacoes)
    ? (r.marcacoes as Array<Record<string, unknown>>).slice(0, 40).map(m => ({
        type: (m.tipo as string) || 'coesao',
        start: typeof m.inicio === 'number' ? m.inicio : 0,
        end: typeof m.fim === 'number' ? m.fim : 0,
        text: typeof m.texto === 'string' ? m.texto : '',
        note: typeof m.nota === 'string' ? m.nota : '',
      }))
    : []

  const conectivosRaw = r.conectivos as Record<string, unknown> | undefined
  const conectivos = {
    usados: Array.isArray(conectivosRaw?.usados) ? (conectivosRaw.usados as string[]) : [],
    sugestao: typeof conectivosRaw?.sugestao === 'string' ? conectivosRaw.sugestao : '',
  }

  return {
    grade: Math.max(0, Math.min(1000, typeof r.nota_total === 'number' ? Math.round(r.nota_total) : 0)),
    resumo: typeof r.resumo === 'string' ? r.resumo : '',
    competencias,
    marcas,
    comentarios: Array.isArray(r.comentarios) ? (r.comentarios as string[]).slice(0, 10) : [],
    sugestoesReescrita: Array.isArray(r.sugestoes_reescrita) ? (r.sugestoes_reescrita as string[]).slice(0, 10) : [],
    conectivos,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body: RequestBody = req.body

  if (typeof body?.text !== 'string' || !body.text.trim()) {
    return res.status(400).json({ error: 'text é obrigatório' })
  }
  if (body.text.length > MAX_TEXT_CHARS) {
    return res.status(400).json({ error: `Texto muito longo (máximo ${MAX_TEXT_CHARS} caracteres)` })
  }
  if (!GROQ_API_KEY && !OPENAI_API_KEY) {
    return res.status(500).json({
      error: 'Nenhuma chave de IA configurada. Configure GROQ_API_KEY ou OPENAI_API_KEY no ambiente (Vercel) ou no .env local.',
    })
  }

  try {
    const { system, user: userPrompt } = buildPrompt(body)

    let raw = ''
    if (OPENAI_API_KEY) {
      try {
        raw = await callOpenAI(system, userPrompt)
      } catch (e) {
        console.error('[corrigir-redacao] OpenAI falhou, tentando Groq:', e)
      }
    }
    if (!raw && GROQ_API_KEY) {
      raw = await callGroq(system, userPrompt)
    }

    if (!raw) {
      return res.status(502).json({ error: 'Erro ao comunicar com a IA. Tente novamente.' })
    }

    const correction = sanitizeCorrection(parseJsonResponse(raw))
    return res.status(200).json(correction)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[corrigir-redacao] ERRO FINAL:', message)
    const safeMessage = message.includes('Groq') || message.includes('status')
      ? 'Erro ao comunicar com a IA. Tente novamente.'
      : message
    return res.status(500).json({ error: safeMessage })
  }
}
