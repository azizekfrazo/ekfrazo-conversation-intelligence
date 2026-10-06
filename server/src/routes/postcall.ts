import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { asyncHandler } from '../middleware/errorHandler'
import { buildPostCallPrompt } from '../prompts/postcall'
import OpenAI from 'openai'

const router = Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const AnalyzeSchema = z.object({
  doctorId: z.string(),
  productId: z.string(),
  userId: z.string(),
  transcriptText: z.string().min(50),
  transcriptTitle: z.string().optional(),
  transcriptId: z.string().optional(),
})

router.post(
  '/analyze',
  asyncHandler(async (req, res) => {
    const parsed = AnalyzeSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() })
      return
    }

    const { doctorId, productId, userId, transcriptText, transcriptTitle, transcriptId } =
      parsed.data

    const [doctor, product] = await Promise.all([
      prisma.doctorProfile.findUnique({ where: { id: doctorId } }),
      prisma.product.findUnique({ where: { id: productId } }),
    ])

    if (!doctor || !product) {
      res.status(404).json({ success: false, error: 'Doctor or product not found' })
      return
    }

    let savedTranscriptId = transcriptId
    if (!savedTranscriptId) {
      const transcript = await prisma.meetingTranscript.create({
        data: {
          title: transcriptTitle ?? `Meeting on ${new Date().toLocaleDateString('en-IN')}`,
          content: transcriptText,
          doctorId,
          isDemo: false,
        },
      })
      savedTranscriptId = transcript.id
    }

    const prompt = buildPostCallPrompt(
      transcriptText,
      {
        fullName: doctor.fullName,
        specialty: doctor.specialty,
        personaType: doctor.personaType,
        therapyArea: doctor.therapyArea,
        likelyConcerns: JSON.parse(doctor.likelyConcerns),
      },
      {
        productName: product.productName,
        indication: product.indication,
        approvedClaims: JSON.parse(product.approvedClaims),
      },
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

    const parsed2 = JSON.parse(content) as {
      summary: string
      doctorConcerns: string[]
      wentWell: string[]
      couldImprove: string[]
      missedMoments: string[]
      doctorIntent: string
      nextBestActions: string[]
      followUpEmail: string
      crmNotes: string
      coachingSummary: string
    }

    const analysis = await prisma.postCallAnalysis.create({
      data: {
        doctorId,
        userId,
        transcriptId: savedTranscriptId,
        summary: parsed2.summary,
        doctorConcerns: JSON.stringify(parsed2.doctorConcerns),
        wentWell: JSON.stringify(parsed2.wentWell),
        couldImprove: JSON.stringify(parsed2.couldImprove),
        missedMoments: JSON.stringify(parsed2.missedMoments),
        doctorIntent: parsed2.doctorIntent,
        nextBestActions: JSON.stringify(parsed2.nextBestActions),
        followUpEmail: parsed2.followUpEmail,
        crmNotes: parsed2.crmNotes,
        coachingSummary: parsed2.coachingSummary,
      },
    })

    res.status(201).json({
      success: true,
      analysis: {
        ...analysis,
        doctorConcerns: JSON.parse(analysis.doctorConcerns),
        wentWell: JSON.parse(analysis.wentWell),
        couldImprove: JSON.parse(analysis.couldImprove),
        missedMoments: JSON.parse(analysis.missedMoments),
        nextBestActions: JSON.parse(analysis.nextBestActions),
      },
    })
  }),
)

router.get(
  '/:doctorId/postcall-analyses',
  asyncHandler(async (req, res) => {
    const analyses = await prisma.postCallAnalysis.findMany({
      where: { doctorId: req.params.doctorId },
      include: { transcript: { select: { id: true, title: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      success: true,
      analyses: analyses.map((a) => ({
        ...a,
        doctorConcerns: JSON.parse(a.doctorConcerns),
        wentWell: JSON.parse(a.wentWell),
        couldImprove: JSON.parse(a.couldImprove),
        missedMoments: JSON.parse(a.missedMoments),
        nextBestActions: JSON.parse(a.nextBestActions),
      })),
    })
  }),
)

router.get(
  '/analysis/:id',
  asyncHandler(async (req, res) => {
    const analysis = await prisma.postCallAnalysis.findUnique({
      where: { id: req.params.id },
      include: { transcript: true, doctor: true },
    })

    if (!analysis) {
      res.status(404).json({ success: false, error: 'Analysis not found' })
      return
    }

    res.json({
      success: true,
      analysis: {
        ...analysis,
        doctorConcerns: JSON.parse(analysis.doctorConcerns),
        wentWell: JSON.parse(analysis.wentWell),
        couldImprove: JSON.parse(analysis.couldImprove),
        missedMoments: JSON.parse(analysis.missedMoments),
        nextBestActions: JSON.parse(analysis.nextBestActions),
        doctor: analysis.doctor
          ? { ...analysis.doctor, likelyConcerns: JSON.parse(analysis.doctor.likelyConcerns) }
          : null,
      },
    })
  }),
)

router.get(
  '/transcripts/:doctorId',
  asyncHandler(async (req, res) => {
    const transcripts = await prisma.meetingTranscript.findMany({
      where: { doctorId: req.params.doctorId },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, transcripts })
  }),
)

export default router
