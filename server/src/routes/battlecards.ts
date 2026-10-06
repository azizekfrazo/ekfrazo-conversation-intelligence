import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { asyncHandler } from '../middleware/errorHandler'
import { buildBattlecardPrompt } from '../prompts/battlecard'
import OpenAI from 'openai'

const router = Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const GenerateSchema = z.object({
  doctorId: z.string(),
  productId: z.string(),
  userId: z.string(),
  repNotes: z.string().optional(),
})

router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const parsed = GenerateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() })
      return
    }

    const { doctorId, productId, userId, repNotes } = parsed.data

    const [doctor, product] = await Promise.all([
      prisma.doctorProfile.findUnique({ where: { id: doctorId } }),
      prisma.product.findUnique({ where: { id: productId } }),
    ])

    if (!doctor || !product) {
      res.status(404).json({ success: false, error: 'Doctor or product not found' })
      return
    }

    const prompt = buildBattlecardPrompt(
      {
        fullName: doctor.fullName,
        specialty: doctor.specialty,
        personaType: doctor.personaType,
        seniorityLevel: doctor.seniorityLevel,
        therapyArea: doctor.therapyArea,
        likelyConcerns: JSON.parse(doctor.likelyConcerns),
        competitorPreference: doctor.competitorPreference,
        notes: doctor.notes,
      },
      {
        productName: product.productName,
        therapyArea: product.therapyArea,
        indication: product.indication,
        keyBenefits: JSON.parse(product.keyBenefits),
        sideEffects: JSON.parse(product.sideEffects),
        differentiators: JSON.parse(product.differentiators),
        competitorNames: JSON.parse(product.competitorNames),
        approvedClaims: JSON.parse(product.approvedClaims),
        disclaimers: product.disclaimers,
      },
      repNotes,
    )

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      res.status(500).json({ success: false, error: 'No response from AI' })
      return
    }

    const battlecard = await prisma.battlecard.create({
      data: {
        content,
        repNotes: repNotes ?? null,
        doctorId,
        productId,
        userId,
      },
      include: { product: true },
    })

    res.status(201).json({
      success: true,
      battlecard: {
        ...battlecard,
        content: JSON.parse(battlecard.content),
      },
    })
  }),
)

router.get(
  '/:doctorId/battlecards',
  asyncHandler(async (req, res) => {
    const battlecards = await prisma.battlecard.findMany({
      where: { doctorId: req.params.doctorId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      success: true,
      battlecards: battlecards.map((b) => ({
        ...b,
        content: JSON.parse(b.content),
      })),
    })
  }),
)

export default router
