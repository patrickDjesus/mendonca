import { readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Connect, Plugin } from 'vite'

interface HandlerModule {
  default: (req: unknown, res: unknown) => unknown | Promise<unknown>
}

const API_ROUTES: Record<string, string> = {
  '/api/spellcheck': 'spellcheck.ts',
  '/api/doc-ai': 'doc-ai.ts',
  '/api/mastery-test': 'mastery-test.ts',
}

function loadLocalEnv(dir: string): void {
  try {
    const content = readFileSync(path.join(dir, '.env'), 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = value
    }
  } catch {
    /* sem .env local */
  }
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve({})
      }
    })
    req.on('error', reject)
  })
}

function createVercelResponseLike(res: ServerResponse) {
  const state = { statusCode: 200, jsonBody: undefined as unknown }
  const wrapped = {
    setHeader(name: string, value: string | number | readonly string[]) {
      res.setHeader(name, value as string | number)
      return wrapped
    },
    status(code: number) {
      state.statusCode = code
      return wrapped
    },
    end(body?: unknown) {
      res.statusCode = state.statusCode
      if (state.jsonBody !== undefined) {
        res.setHeader('Content-Type', 'application/json')
        res.end(typeof state.jsonBody === 'string' ? state.jsonBody : JSON.stringify(state.jsonBody))
      } else if (body !== undefined) {
        res.end(body as string)
      } else {
        res.end()
      }
    },
    json(body: unknown) {
      state.jsonBody = body
      wrapped.end()
      return wrapped
    },
  }
  return wrapped
}

function apiDevMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const pathname = (req.url || '').split('?')[0]
    const fileName = API_ROUTES[pathname]
    if (!fileName) {
      next()
      return
    }

    try {
      const mod = (await import(pathToFileURL(path.join(process.cwd(), 'api', fileName)).href)) as HandlerModule
      if (typeof mod.default !== 'function') throw new Error(`Handler inválido em api/${fileName}`)
      const body = await readJsonBody(req)
      const vReq = { method: req.method, headers: req.headers, body }
      const vRes = createVercelResponseLike(res)
      await mod.default(vReq, vRes)
    } catch (err) {
      console.error(`[api-dev] Erro ao processar ${pathname}:`, err)
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Erro interno do servidor de desenvolvimento' }))
      }
    }
  }
}

export function apiDevPlugin(): Plugin {
  return {
    name: 'mendonca-api-dev',
    configResolved(config) {
      loadLocalEnv(config.envDir || process.cwd())
    },
    configureServer(server) {
      server.middlewares.use(apiDevMiddleware())
    },
  }
}
