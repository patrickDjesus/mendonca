import type { VercelRequest, VercelResponse } from '@vercel/node'

const LT_URL = 'https://api.languagetool.org/v2/check'

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

  const text = typeof req.body?.text === 'string' ? req.body.text : ''
  const language = typeof req.body?.language === 'string' ? req.body.language : 'pt-BR'

  if (!text.trim()) {
    return res.status(400).json({ error: 'text é obrigatório' })
  }

  try {
    const body = new URLSearchParams()
    body.set('text', text)
    body.set('language', language)

    const upstream = await fetch(LT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!upstream.ok) {
      const err = await upstream.text()
      console.error(`[spellcheck] LanguageTool error ${upstream.status}:`, err.slice(0, 200))
      return res.status(502).json({ error: `LanguageTool respondeu com status ${upstream.status}` })
    }

    const data = await upstream.json()
    return res.status(200).json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[spellcheck] ERRO FINAL:', message)
    return res.status(500).json({ error: 'Erro ao comunicar com o LanguageTool' })
  }
}
