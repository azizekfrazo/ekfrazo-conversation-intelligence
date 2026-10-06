import { Router } from 'express'
import { z } from 'zod'
import OpenAI from 'openai'
import { asyncHandler } from '../middleware/errorHandler'
import { buildSimulatorSystemPrompt, Difficulty, ObjectionType } from '../prompts/simulator'
import { prisma } from '../lib/prisma'

const router = Router()

const SessionSchema = z.object({
  doctorId: z.string(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  objectionFocus: z.enum(['Efficacy', 'Safety', 'SideEffects', 'Cost', 'CompetitorComparison', 'PatientAdherence']),
})

router.post(
  '/session',
  asyncHandler(async (req, res) => {
    const parsed = SessionSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() })
      return
    }

    const { doctorId, difficulty, objectionFocus } = parsed.data

    const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } })
    if (!doctor) {
      res.status(404).json({ success: false, error: 'Doctor not found' })
      return
    }

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
      difficulty as Difficulty,
      objectionFocus as ObjectionType,
      doctor.targetProduct,
    )

    if (!process.env.OPENAI_API_KEY) {
      // Demo mode: return a fake session so the frontend falls back to text-chat mode
      res.json({
        success: true,
        sessionId: `demo_${Date.now()}`,
        clientSecret: 'demo_no_api_key',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      })
      return
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    try {
      const session = await openai.beta.realtime.sessions.create({
        model: 'gpt-4o-realtime-preview',
        voice: 'shimmer',
        instructions: systemPrompt,
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 600,
        },
        modalities: ['text', 'audio'],
      })

      res.json({
        success: true,
        sessionId: (session as any).id ?? session.client_secret.value.slice(0, 8),
        clientSecret: session.client_secret.value,
        expiresAt: session.client_secret.expires_at,
      })
    } catch (err: any) {
      const detail = err?.error?.message ?? err?.message ?? 'Unknown error'
      console.error('OpenAI Realtime session error:', detail, err)
      res.status(502).json({ success: false, error: `OpenAI: ${detail}` })
    }
  }),
)

export default router
