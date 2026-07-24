import type { VercelRequest, VercelResponse } from '@vercel/node'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const GROQ_API_KEY = process.env.GROQ_API_KEY || ''

interface RequestBody {
  notes: string[]
  videoTitle: string
  videoDescription: string
  stage: 'summary' | 'multiple_choice' | 'written'
  userAnswer?: string
  questions?: Array<{ id: string; question: string; options?: string[]; correctIndex?: number }>
}

function safeJsonParse(str: string): unknown {
  try { return JSON.parse(str) } catch { return null }
}

function buildPrompt(body: RequestBody): { system: string; user: string } {
  const context = `Título do vídeo: "${body.videoTitle}"
Descrição do vídeo: "${body.videoDescription}"
Anotações do usuário:\n${body.notes.map((n, i) => `${i + 1}. ${n}`).join('\n')}`

  switch (body.stage) {
    case 'summary':
      return {
        system: `Você é um professor avaliador educado e preciso. Avalie o resumo que o estudante escreveu sobre o conteúdo do vídeo.
Considere: acurácia dos conceitos, completude, uso de palavras-chave relevantes e clareza.
Responda APENAS com um JSON válido (sem markdown, sem \`\`\`), no formato:
{"score": <número 0-100>, "feedback": "<feedback em português, 2-3 frases, apontando pontos fortes e fracos>"}`,
        user: `CONTEÚDO DO VÍDEO:\n${context}\n\nRESUMO DO ESTUDANTE:\n${body.userAnswer || '(vazio)'}`,
      }

    case 'multiple_choice': {
      const mcQuestions = body.questions
      const parsedAnswer = body.userAnswer ? safeJsonParse(body.userAnswer) : null
      if (mcQuestions && mcQuestions.length > 0 && parsedAnswer) {
        return {
          system: `Você é um professor avaliador. O estudante respondeu a questões de múltipla escolha sobre o vídeo.
Corrija as respostas e responda APENAS com um JSON válido (sem markdown, sem \`\`\`), no formato:
{"results": [{"id": "<id>", "correct": <true/false>, "explanation": "<breve explicação>"}], "score": <0-100>}`,
          user: `QUESTÕES E RESPOSTAS:\n${JSON.stringify({ questions: mcQuestions, answers: parsedAnswer }, null, 2)}`,
        }
      }
      return {
        system: `Você é um professor criador de provas. Crie 5 questões de múltipla escolha (4 alternativas cada, apenas 1 correta) sobre o conteúdo do vídeo.
As questões devem testar compreensão real, não apenas memorização superficial.
Responda APENAS com um JSON válido (sem markdown, sem \`\`\`), no formato:
{"questions": [{"id": "q1", "question": "<pergunta>", "options": ["A", "B", "C", "D"], "correctIndex": <0-3>, "correctAnswer": "<texto da alternativa correta>"}]}`,
        user: `CONTEÚDO DO VÍDEO:\n${context}`,
      }
    }

    case 'written': {
      const wQuestions = body.questions
      const parsedAnswer = body.userAnswer ? safeJsonParse(body.userAnswer) : null
      if (wQuestions && wQuestions.length > 0 && parsedAnswer) {
        return {
          system: `Você é um professor avaliador. O estudante respondeu a questões abertas sobre o vídeo.
Avalie cada resposta considerando: acurácia, profundidade e clareza.
Responda APENAS com um JSON válido (sem markdown, sem \`\`\`), no formato:
{"results": [{"id": "<id>", "score": <0-100>, "feedback": "<feedback breve>"}], "averageScore": <0-100>}`,
          user: `QUESTÕES E RESPOSTAS:\n${JSON.stringify({ questions: wQuestions, answers: parsedAnswer }, null, 2)}`,
        }
      }
      return {
        system: `Você é um professor criador de provas. Crie 5 questões abertas (escritas) sobre o conteúdo do vídeo.
As questões devem exigir raciocínio e explicação, não apenas respostas curtas.
Responda APENAS com um JSON válido (sem markdown, sem \`\`\`), no formato:
{"questions": [{"id": "w1", "question": "<pergunta>", "hint": "<dica breve>"}]}`,
        user: `CONTEÚDO DO VÍDEO:\n${context}`,
      }
    }
  }
}

async function callOpenAI(system: string, user: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI error: ${res.status} - ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content.trim()
}

async function callGroq(system: string, user: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error: ${res.status} - ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content.trim()
}

async function callAI(system: string, user: string): Promise<string> {
  if (OPENAI_API_KEY) {
    try {
      console.log('[mastery-test] Tentando OpenAI (gpt-4o-mini)...')
      const result = await callOpenAI(system, user)
      console.log('[mastery-test] ✓ OpenAI respondeu com sucesso')
      return result
    } catch (e) {
      console.warn('[mastery-test] ✗ OpenAI falhou:', e)
    }
  } else {
    console.log('[mastery-test] OPENAI_API_KEY não configurada, pulando OpenAI')
  }

  if (GROQ_API_KEY) {
    try {
      console.log('[mastery-test] Tentando Groq (llama-3.3-70b-versatile)...')
      const result = await callGroq(system, user)
      console.log('[mastery-test] ✓ Groq respondeu com sucesso')
      return result
    } catch (e) {
      console.warn('[mastery-test] ✗ Groq falhou:', e)
    }
  } else {
    console.log('[mastery-test] GROQ_API_KEY não configurada, pulando Groq')
  }

  throw new Error('Nenhuma API de IA disponível')
}

function parseJsonResponse(raw: string): unknown {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }
  return JSON.parse(cleaned)
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

  try {
    const body: RequestBody = req.body

    if (!body.videoTitle || !body.stage) {
      return res.status(400).json({ error: 'Parâmetros inválidos' })
    }

    console.log(`[mastery-test] Stage: ${body.stage} | Video: "${body.videoTitle}"`)
    const { system, user: userPrompt } = buildPrompt(body)
    const raw = await callAI(system, userPrompt)
    const result = parseJsonResponse(raw)

    return res.status(200).json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('mastery-test error:', message)
    return res.status(500).json({ error: message })
  }
}
