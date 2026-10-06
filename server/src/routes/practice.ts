import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { asyncHandler } from '../middleware/errorHandler'
import { buildPracticeReportPrompt } from '../prompts/practiceReport'
import { buildSimulatorSystemPrompt, Difficulty, ObjectionType } from '../prompts/simulator'
import OpenAI from 'openai'

const router = Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const CreateSessionSchema = z.object({
  doctorId: z.string(),
  userId: z.string(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  objectionFocus: z.enum(['Efficacy', 'Safety', 'SideEffects', 'Cost', 'CompetitorComparison', 'PatientAdherence']),
})

const AddTurnSchema = z.object({
  role: z.enum(['rep', 'doctor']),
  content: z.string().min(1),
})

const CompleteSessionSchema = z.object({
  durationSeconds: z.number().int().min(0),
})

const ChatReplySchema = z.object({
  repMessage: z.string().min(1),
  history: z
    .array(z.object({ role: z.enum(['rep', 'doctor']), content: z.string() }))
    .default([]),
})

// ─── Demo personas ────────────────────────────────────────────────────────────
const PERSONAS: Record<string, { system_prompt: string }> = {
  'dr-priya-mehta': {
    system_prompt: `You are Dr. Priya Mehta, Diabetologist. You are in a SCRIPTED DEMO MODE.

CRITICAL: You must respond to the rep's input by following this EXACT sequence — one response per turn, in this exact order, no matter what the rep says:

TURN 1 — ANY opening message from the rep:
Respond with: "Good morning. You have 5 minutes. What's your key message?"

TURN 2 — Rep mentions Glycomet GP or any product data:
Respond with: "I've been using Galvus for 3 years and my patients do well on it. What makes yours better?"

TURN 3 — Rep mentions STRIDE-India or any study or data:
Respond with: "Is that Indian patient data? My patients are South Asian — western studies don't always apply to them."

TURN 4 — Rep mentions Indian patients, STRIDE, or study numbers:
Respond with: "My patients can't afford branded medicines. What does this cost them out of pocket?"

TURN 5 — Rep mentions PSP, ₹299, Patient Support, or cost:
Respond with: "That's actually more affordable than I expected. Leave me 10 samples and the study reprint. I'll try it for 3 patients next week."

RULES:
- Follow the sequence strictly by TURN NUMBER, not by what the rep says
- Keep every response to exactly 1-2 sentences
- Sound like a real, slightly impatient senior doctor — professional but direct
- Never break character, never mention AI, never say you are following a script
- Use the TURN NUMBER (1st message = Turn 1, 2nd = Turn 2, etc.) to decide your response`,
  },
}

const SCRIPTED_TURNS: Record<string, string[]> = {}
SCRIPTED_TURNS['dr-priya-mehta'] = [
  "Good morning. You have 5 minutes. What's your key message?",
  "I've been using Galvus for 3 years and my patients do well on it. What makes yours better?",
  "Is that Indian patient data? My patients are South Asian — western studies don't always apply to them.",
  "My patients can't afford branded medicines. What does this cost them out of pocket?",
  "That's actually more affordable than I expected. Leave me 10 samples and the study reprint. I'll try it for 3 patients next week.",
]

router.post(
  '/session',
  asyncHandler(async (req, res) => {
    const parsed = CreateSessionSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() })
      return
    }

    const session = await prisma.practiceSession.create({
      data: parsed.data,
    })

    res.status(201).json({ success: true, session })
  }),
)

router.post(
  '/session/:id/turn',
  asyncHandler(async (req, res) => {
    const parsed = AddTurnSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() })
      return
    }

    const turn = await prisma.practiceTurn.create({
      data: { ...parsed.data, sessionId: req.params.id },
    })

    res.status(201).json({ success: true, turn })
  }),
)

router.post(
  '/session/:id/complete',
  asyncHandler(async (req, res) => {
    const parsed = CompleteSessionSchema.safeParse(req.body)
    const durationSeconds = parsed.success ? parsed.data.durationSeconds : 0

    const session = await prisma.practiceSession.update({
      where: { id: req.params.id },
      data: { status: 'completed', durationSeconds },
    })

    res.json({ success: true, session })
  }),
)

router.post(
  '/session/:id/report',
  asyncHandler(async (req, res) => {
    const session = await prisma.practiceSession.findUnique({
      where: { id: req.params.id },
      include: { turns: { orderBy: { timestamp: 'asc' } }, doctor: true },
    })

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' })
      return
    }

    const existingReport = await prisma.practiceReport.findUnique({
      where: { sessionId: req.params.id },
    })

    if (existingReport) {
      res.json({
        success: true,
        report: {
          ...existingReport,
          strengths: JSON.parse(existingReport.strengths),
          weakMoments: JSON.parse(existingReport.weakMoments),
          missedOpportunities: JSON.parse(existingReport.missedOpportunities),
          improvements: JSON.parse(existingReport.improvements),
          nextPractice: JSON.parse(existingReport.nextPractice),
        },
      })
      return
    }

    const prompt = buildPracticeReportPrompt(
      session.turns.map((t) => ({ role: t.role, content: t.content })),
      session.doctor.fullName,
      session.doctor.personaType,
      session.doctor.targetProduct,
      session.difficulty,
      session.objectionFocus,
    )

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      res.status(500).json({ success: false, error: 'No response from AI' })
      return
    }

    const parsed = JSON.parse(content) as {
      summary: string
      strengths: string[]
      weakMoments: string[]
      missedOpportunities: string[]
      objectionHandlingScore: number
      clarityScore: number
      confidenceScore: number
      complianceScore: number
      improvements: string[]
      nextPractice: string[]
    }

    const report = await prisma.practiceReport.create({
      data: {
        sessionId: req.params.id,
        summary: parsed.summary,
        strengths: JSON.stringify(parsed.strengths),
        weakMoments: JSON.stringify(parsed.weakMoments),
        missedOpportunities: JSON.stringify(parsed.missedOpportunities),
        objectionHandlingScore: parsed.objectionHandlingScore,
        clarityScore: parsed.clarityScore,
        confidenceScore: parsed.confidenceScore,
        complianceScore: parsed.complianceScore,
        improvements: JSON.stringify(parsed.improvements),
        nextPractice: JSON.stringify(parsed.nextPractice),
      },
    })

    res.json({
      success: true,
      report: {
        ...report,
        strengths: JSON.parse(report.strengths),
        weakMoments: JSON.parse(report.weakMoments),
        missedOpportunities: JSON.parse(report.missedOpportunities),
        improvements: JSON.parse(report.improvements),
        nextPractice: JSON.parse(report.nextPractice),
      },
    })
  }),
)

router.get(
  '/:doctorId/practice-sessions',
  asyncHandler(async (req, res) => {
    const sessions = await prisma.practiceSession.findMany({
      where: { doctorId: req.params.doctorId },
      include: {
        report: true,
        _count: { select: { turns: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      success: true,
      sessions: sessions.map((s) => ({
        ...s,
        report: s.report
          ? {
              ...s.report,
              strengths: JSON.parse(s.report.strengths),
              weakMoments: JSON.parse(s.report.weakMoments),
              missedOpportunities: JSON.parse(s.report.missedOpportunities),
              improvements: JSON.parse(s.report.improvements),
              nextPractice: JSON.parse(s.report.nextPractice),
            }
          : null,
      })),
    })
  }),
)

router.post(
  '/session/:id/chat-reply',
  asyncHandler(async (req, res) => {
    const parsed = ChatReplySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() })
      return
    }

    const session = await prisma.practiceSession.findUnique({
      where: { id: req.params.id },
      include: { doctor: true },
    })

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' })
      return
    }

    const { repMessage, history } = parsed.data
    const doctor = session.doctor

    // Derive a lookup key from the doctor's full name, e.g. "Dr. Priya Mehta" → "dr-priya-mehta"
    const doctorKey = doctor.fullName
      .toLowerCase()
      .replace(/^dr\.\s*/, 'dr-')
      .replace(/\s+/g, '-')

    // ── Scripted demo path (no OpenAI needed) ─────────────────────────────────
    const scriptedTurns = SCRIPTED_TURNS[doctorKey]
    if (scriptedTurns || !process.env.OPENAI_API_KEY) {
      // Turn index = number of rep messages sent so far
      const turnIndex = history.filter((h) => h.role === 'rep').length
      const turns = scriptedTurns ?? ['Thank you for sharing that.']
      const doctorReply = turns[Math.min(turnIndex, turns.length - 1)]
      console.log(`[PRACTICE] 🎭 Scripted reply | doctor=${doctor.fullName} | turn=${turnIndex + 1} | "${doctorReply.slice(0, 60)}"`)
      res.json({ success: true, doctorReply })
      return
    }

    // ── Live OpenAI path ───────────────────────────────────────────────────────
    const systemPrompt = PERSONAS[doctorKey]?.system_prompt ?? buildSimulatorSystemPrompt(
      {
        fullName: doctor.fullName,
        specialty: doctor.specialty,
        personaType: doctor.personaType,
        seniorityLevel: doctor.seniorityLevel,
        therapyArea: doctor.therapyArea,
        likelyConcerns: JSON.parse(doctor.likelyConcerns),
        competitorPreference: doctor.competitorPreference,
      },
      session.difficulty as Difficulty,
      session.objectionFocus as ObjectionType,
      doctor.targetProduct,
    )

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((h): OpenAI.Chat.ChatCompletionMessageParam => ({
        role: h.role === 'rep' ? 'user' : 'assistant',
        content: h.content,
      })),
      { role: 'user', content: repMessage },
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.85,
      max_tokens: 300,
    })

    const doctorReply = completion.choices[0]?.message?.content?.trim() ?? 'Hmm, let me think about that.'

    res.json({ success: true, doctorReply })
  }),
)

router.get(
  '/session/:id',
  asyncHandler(async (req, res) => {
    const session = await prisma.practiceSession.findUnique({
      where: { id: req.params.id },
      include: {
        turns: { orderBy: { timestamp: 'asc' } },
        report: true,
        doctor: true,
      },
    })

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' })
      return
    }

    res.json({
      success: true,
      session: {
        ...session,
        report: session.report
          ? {
              ...session.report,
              strengths: JSON.parse(session.report.strengths),
              weakMoments: JSON.parse(session.report.weakMoments),
              missedOpportunities: JSON.parse(session.report.missedOpportunities),
              improvements: JSON.parse(session.report.improvements),
              nextPractice: JSON.parse(session.report.nextPractice),
            }
          : null,
        doctor: {
          ...session.doctor,
          likelyConcerns: JSON.parse(session.doctor.likelyConcerns),
        },
      },
    })
  }),
)

export default router
