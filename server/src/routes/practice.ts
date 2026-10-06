import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { asyncHandler } from '../middleware/errorHandler'
import { buildPracticeReportPrompt } from '../prompts/practiceReport'
import { buildSimulatorSystemPrompt, Difficulty, ObjectionType } from '../prompts/simulator'
import OpenAI from 'openai'

const router = Router()

// Lazy OpenAI — prevents crash at module load when OPENAI_API_KEY is absent
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

const CreateSessionSchema = z.object({
  doctorId: z.string(),
  userId: z.string().optional(),
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
const SCRIPTED_TURNS: Record<string, string[]> = {
  'dr-priya-mehta': [
    "Good morning. You have 5 minutes. What's your key message?",
    "I've been using Galvus for 3 years and my patients do well on it. What makes yours better?",
    "Is that Indian patient data? My patients are South Asian — western studies don't always apply to them.",
    "My patients can't afford branded medicines. What does this cost them out of pocket?",
    "That's actually more affordable than I expected. Leave me 10 samples and the study reprint. I'll try it for 3 patients next week.",
  ],
}

// ─── Heuristic report when no OpenAI key ─────────────────────────────────────
function buildHeuristicReport(turns: { role: string; content: string }[], difficulty: string) {
  const repTurns = turns.filter((t) => t.role === 'rep' && t.content !== '[SESSION_INIT]')
  const n = repTurns.length
  const base = difficulty === 'Hard' ? 60 : difficulty === 'Medium' ? 67 : 74
  const bonus = Math.min(20, n * 4)
  const oh = Math.min(94, base + bonus)
  const cl = Math.min(94, base + 5 + bonus)
  const co = Math.min(94, base - 2 + bonus)
  const cm = Math.min(95, 78 + Math.floor(bonus / 2))

  return {
    summary: `${n} rep exchange${n !== 1 ? 's' : ''} completed. ${n >= 4 ? 'Good engagement — the doctor challenged on multiple fronts.' : 'Short session — aim for 4+ exchanges to build fluency.'}`,
    strengths: JSON.stringify([
      'Maintained professional tone throughout the session',
      n >= 3 ? 'Responded directly to doctor concerns without losing composure' : 'Showed willingness to engage with the doctor',
    ]),
    weakMoments: JSON.stringify([
      'Could reference more specific clinical trial data by name',
      'Closing lacked a concrete, confirmed next step',
    ]),
    missedOpportunities: JSON.stringify([
      'Patient Support Programme details not introduced',
      'Head-to-head comparative data not highlighted',
    ]),
    objectionHandlingScore: oh,
    clarityScore: cl,
    confidenceScore: co,
    complianceScore: cm,
    improvements: JSON.stringify([
      'Prepare 2-3 named trial data points before the meeting',
      'Ask about patient demographics earlier in the call',
      'Close each objection with a summary before moving on',
    ]),
    nextPractice: JSON.stringify([
      'Try a Hard difficulty session with the same doctor',
      'Focus a session on cost + competitor combined objection',
      'Practice the full call arc from greeting through close',
    ]),
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post(
  '/session',
  asyncHandler(async (req, res) => {
    const parsed = CreateSessionSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() })
      return
    }

    const { doctorId, userId, difficulty, objectionFocus } = parsed.data

    // Verify doctor exists
    const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } })
    if (!doctor) {
      res.status(404).json({ success: false, error: 'Doctor not found' })
      return
    }

    // Resolve userId — fall back to first user if not provided or not found
    let resolvedUserId = userId
      ? (await prisma.user.findUnique({ where: { id: userId } }))?.id
      : undefined
    if (!resolvedUserId) {
      resolvedUserId = (await prisma.user.findFirst())?.id
    }
    if (!resolvedUserId) {
      res.status(500).json({ success: false, error: 'No user found in database' })
      return
    }

    const session = await prisma.practiceSession.create({
      data: { doctorId, userId: resolvedUserId, difficulty, objectionFocus },
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

    const formatReport = (r: typeof existingReport & NonNullable<unknown>) => ({
      ...r,
      strengths: JSON.parse(r!.strengths),
      weakMoments: JSON.parse(r!.weakMoments),
      missedOpportunities: JSON.parse(r!.missedOpportunities),
      improvements: JSON.parse(r!.improvements),
      nextPractice: JSON.parse(r!.nextPractice),
      overallScore: Math.round(
        (r!.objectionHandlingScore + r!.clarityScore + r!.confidenceScore + r!.complianceScore) / 4,
      ),
    })

    if (existingReport) {
      res.json({ success: true, report: formatReport(existingReport) })
      return
    }

    const openai = getOpenAI()

    // Heuristic fallback when no OpenAI key
    if (!openai) {
      const turns = session.turns.map((t) => ({ role: t.role, content: t.content }))
      const data = buildHeuristicReport(turns, session.difficulty)
      const report = await prisma.practiceReport.create({
        data: { ...data, sessionId: req.params.id },
      })
      res.json({ success: true, report: formatReport(report) })
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

    res.json({ success: true, report: formatReport(report) })
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
              overallScore: Math.round(
                (s.report.objectionHandlingScore + s.report.clarityScore +
                  s.report.confidenceScore + s.report.complianceScore) / 4,
              ),
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

    const doctorKey = doctor.fullName
      .toLowerCase()
      .replace(/^dr\.\s*/, 'dr-')
      .replace(/\s+/g, '-')

    // ── Scripted demo path ─────────────────────────────────────────────────────
    const scriptedTurns = SCRIPTED_TURNS[doctorKey]
    if (scriptedTurns || !process.env.OPENAI_API_KEY) {
      const turnIndex = history.filter((h) => h.role === 'rep').length
      const turns = scriptedTurns ?? [
        "Good morning. You have 5 minutes — what is your key message?",
        "I'm listening, but I'll need to see the data before I change my current prescribing habits.",
        "What specific patient population was studied? Western data doesn't always translate to Indian patients.",
        "My patients struggle with affordability. What does this cost out of pocket?",
        "That's more reasonable than I expected. Leave me some samples and the clinical summary.",
      ]
      const doctorReply = turns[Math.min(turnIndex, turns.length - 1)]
      res.json({ success: true, doctorReply })
      return
    }

    // ── Live OpenAI path ───────────────────────────────────────────────────────
    const openai = getOpenAI()!
    const systemPrompt = buildSimulatorSystemPrompt(
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

    const doctorReply =
      completion.choices[0]?.message?.content?.trim() ?? 'Hmm, let me think about that.'

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
              overallScore: Math.round(
                (session.report.objectionHandlingScore + session.report.clarityScore +
                  session.report.confidenceScore + session.report.complianceScore) / 4,
              ),
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
