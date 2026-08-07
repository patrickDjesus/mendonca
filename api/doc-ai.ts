import type { VercelRequest, VercelResponse } from '@vercel/node'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
const MAX_TEXT_CHARS = 25000
const MAX_INSTRUCTION_CHARS = 2000
const MODEL = 'llama-3.3-70b-versatile'

type AiAction =
  | 'corrigir'
  | 'melhorar'
  | 'formal'
  | 'simples'
  | 'resumir'
  | 'expandir'
  | 'traduzir'
  | 'continuar'

const AI_ACTIONS: AiAction[] = [
  'corrigir',
  'melhorar',
  'formal',
  'simples',
  'resumir',
  'expandir',
  'traduzir',
  'continuar',
]

function buildPrompt(opts: { action?: AiAction; instruction?: string }, text: string): { system: string; user: string } {
  const user = `TEXTO:\n${text}`

  if (opts.instruction) {
    return {
      system: `Você é um assistente de escrita em português (PT-BR) integrado a um editor de documentos. O usuário selecionou um texto e deu uma instrução para alterá-lo. Aplique a instrução fielmente, preservando ao máximo o conteúdo e o formato original.
Responda APENAS com o texto resultante, sem comentários, sem aspas e sem markdown.`,
      user: `INSTRUÇÃO DO USUÁRIO:\n${opts.instruction}\n\n${user}`,
    }
  }

  const action = opts.action as AiAction
  switch (action) {
    case 'corrigir':
      return {
        system: `Você é um assistente de escrita em português (PT-BR). Corrija ortografia e gramática do texto do usuário, preservando o conteúdo, o tom e o formato original.
Responda APENAS com o texto corrigido, sem comentários, sem aspas e sem markdown.`,
        user,
      }

    case 'melhorar':
      return {
        system: `Você é um assistente de escrita em português (PT-BR). Reescreva o texto do usuário deixando-o mais claro, coeso e bem redigido, mantendo o significado e o nível de formalidade originais.
Responda APENAS com o texto melhorado, sem comentários, sem aspas e sem markdown.`,
        user,
      }

    case 'formal':
      return {
        system: `Você é um assistente de escrita em português (PT-BR). Reescreva o texto do usuário em um registro formal, acadêmico e polido, sem alterar o conteúdo.
Responda APENAS com o texto reescrito, sem comentários, sem aspas e sem markdown.`,
        user,
      }

    case 'simples':
      return {
        system: `Você é um assistente de escrita em português (PT-BR). Reescreva o texto do usuário em linguagem simples e fácil de entender, adequada para estudo, sem perder as ideias principais.
Responda APENAS com o texto reescrito, sem comentários, sem aspas e sem markdown.`,
        user,
      }

    case 'resumir':
      return {
        system: `Você é um assistente de estudo em português (PT-BR). Produza um resumo conciso e organizado do texto do usuário, destacando os pontos principais.
Responda APENAS com o resumo, sem comentários, sem aspas e sem markdown.`,
        user,
      }

    case 'expandir':
      return {
        system: `Você é um assistente de estudo em português (PT-BR). Expanda o texto do usuário acrescentando explicações, exemplos e detalhes que ajudem no aprendizado, mantendo o tom original.
Responda APENAS com o texto expandido, sem comentários, sem aspas e sem markdown.`,
        user,
      }

    case 'traduzir':
      return {
        system: `Você é um tradutor para o português (PT-BR). Traduza o texto do usuário para o português brasileiro, preservando o sentido e o tom.
Responda APENAS com a tradução, sem comentários, sem aspas e sem markdown.`,
        user,
      }

    case 'continuar':
      return {
        system: `Você é um assistente de escrita em português (PT-BR). Continue escrevendo a partir do texto do usuário, seguindo o estilo, o tom e o assunto. Não repita o texto original, apenas dê continuidade.
Responda APENAS com a continuação, sem comentários, sem aspas e sem markdown.`,
        user,
      }
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

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
  const instruction = typeof req.body?.instruction === 'string' ? req.body.instruction.trim() : ''
  const action = req.body?.action as AiAction | undefined

  if (!text) {
    return res.status(400).json({ error: 'text é obrigatório' })
  }
  if (!instruction && (!action || !AI_ACTIONS.includes(action))) {
    return res.status(400).json({ error: 'instruction ou action é obrigatória' })
  }
  if (instruction.length > MAX_INSTRUCTION_CHARS) {
    return res.status(400).json({ error: `Instrução muito longa (máximo ${MAX_INSTRUCTION_CHARS} caracteres)` })
  }
  if (text.length > MAX_TEXT_CHARS) {
    return res.status(400).json({ error: `Texto muito longo (máximo ${MAX_TEXT_CHARS} caracteres)` })
  }
  if (!GROQ_API_KEY && !OPENAI_API_KEY) {
    return res.status(500).json({
      error: 'Nenhuma chave de IA configurada. Configure GROQ_API_KEY ou OPENAI_API_KEY no ambiente (Vercel) ou no .env local.',
    })
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
        temperature: 0.5,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error(`[doc-ai] OpenAI error ${response.status}:`, err.slice(0, 300))
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
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error(`[doc-ai] Groq error ${response.status}:`, err.slice(0, 300))
      throw new Error(`Erro ao comunicar com a IA (status ${response.status})`)
    }

    const data = await response.json()
    return (data.choices?.[0]?.message?.content || '').trim()
  }

  try {
    const { system, user: userPrompt } = buildPrompt({ action, instruction }, text)

    let result = ''
    if (OPENAI_API_KEY) {
      try {
        result = await callOpenAI(system, userPrompt)
      } catch (e) {
        console.error('[doc-ai] OpenAI falhou, tentando Groq:', e)
      }
    }
    if (!result && GROQ_API_KEY) {
      result = await callGroq(system, userPrompt)
    }

    if (!result) {
      return res.status(502).json({ error: 'Erro ao comunicar com a IA. Tente novamente.' })
    }
    return res.status(200).json({ result })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[doc-ai] ERRO FINAL:', message)
    return res.status(500).json({ error: message })
  }
}
