import { Router, Request, Response } from 'express'
import OpenAI from 'openai'

const router = Router()

// Lazy-init so the server starts even without an API key
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

const SYSTEM_PROMPT = `You are a real-time coaching assistant for a pharma sales representative during a call with a doctor.
Your job: give the rep concise, evidence-based guidance on exactly what to say and do next.

Output EXACTLY these four labelled fields in this EXACT order, each on its own line:
SAY_EN: <1-2 sentences the rep should say aloud — direct speech, not instructions about speech>
MOOD: <one word only — Warm | Sceptical | Neutral | Urgent>
NEXT_EN: <one sentence coaching note on the next action to take>
ALERT: <optional compliance or escalation warning, or leave blank>

Rules:
- SAY_EN is what the rep says, not a description of what to say
- Keep SAY_EN to 2 sentences max; NEXT_EN to 1 sentence max
- All claims must be evidence-based and reference trial names or data where possible
- Never coach the rep to make exaggerated or unapproved claims
- Reflect the doctor's profile and concerns if profileContext is provided`

// OPTIONS pre-flight (SSE routes can trigger a pre-flight)
router.options('/cuecard', (_req: Request, res: Response) => {
  res.sendStatus(204)
})

router.post('/cuecard', async (req: Request, res: Response) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // disable nginx buffering if behind proxy
  res.flushHeaders()

  const {
    statement,
    context,
    customerName,
    profileContext,
    instruction,
  } = req.body as {
    statement: string
    context: string
    transcript: string[]
    customerName: string
    profileContext: string | null
    instruction: string
  }

  const userContent = [
    profileContext ? `Doctor profile context:\n${profileContext}` : null,
    context ? `Recent conversation:\n${context}` : null,
    customerName ? `Doctor name: ${customerName}` : null,
    instruction || `The doctor just said: "${statement}". Provide coaching guidance.`,
  ]
    .filter(Boolean)
    .join('\n\n')

  if (!process.env.OPENAI_API_KEY) {
    // Graceful fallback — emit a static card so the client doesn't hang
    const fallback = [
      'SAY_EN: Thank you for sharing that concern — let me address it directly with the relevant clinical data.',
      'MOOD: Neutral',
      'NEXT_EN: OpenAI API key not configured — set OPENAI_API_KEY in server/.env for live coaching.',
      'ALERT: Running without OpenAI key — Tier 1 keyword matching is still active.',
    ].join('\n')

    for (const char of fallback) {
      res.write(`data: ${JSON.stringify({ text: char })}\n\n`)
    }
    res.write('data: [DONE]\n\n')
    res.end()
    return
  }

  try {
    const stream = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      temperature: 0.65,
      max_tokens: 350,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    })

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? ''
      if (token) {
        res.write(`data: ${JSON.stringify({ text: token })}\n\n`)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    res.write(`data: ${JSON.stringify({ text: `\nALERT: OpenAI error — ${msg}` })}\n\n`)
  }

  res.write('data: [DONE]\n\n')
  res.end()
})

export default router
