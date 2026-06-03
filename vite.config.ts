import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'http'

export default defineConfig(({ mode }) => {
  // Load ALL env vars (not just VITE_ prefixed) for server-side use
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: '/ferdpilot/',
    plugins: [
      react(),
      {
        name: 'ai-analysis-api',
        configureServer(server) {
          server.middlewares.use(
            '/api/analyze',
            async (req: IncomingMessage, res: ServerResponse) => {
              // CORS preflight
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
              if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }
              if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }

              let body = ''
              req.on('data', (chunk: Buffer) => { body += chunk.toString() })
              req.on('end', async () => {
                try {
                  const { prompt } = JSON.parse(body) as { prompt: string }

                  const apiKey = env.ANTHROPIC_API_KEY
                  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
                    res.statusCode = 503
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY ikke konfigurert' }))
                    return
                  }

                  // Dynamic import keeps it server-side only
                  const { default: Anthropic } = await import('@anthropic-ai/sdk')
                  const client = new Anthropic({ apiKey })

                  const msg = await client.messages.create({
                    model: 'claude-opus-4-8',
                    max_tokens: 600,
                    messages: [{ role: 'user', content: prompt }],
                  })

                  const text = msg.content.find(b => b.type === 'text')?.text ?? ''
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ analysis: text }))
                } catch (err) {
                  console.error('[AI API]', err)
                  res.statusCode = 500
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: String(err) }))
                }
              })
            }
          )
        },
      },
    ],
  }
})
