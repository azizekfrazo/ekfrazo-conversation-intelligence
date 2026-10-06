import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler } from '../middleware/errorHandler'
import { buildVisitPrepPrompt } from '../prompts/visitPrepPrompt'
import OpenAI from 'openai'

const router = Router()

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

interface PrepContent {
  lastVisitSummary: string
  whatTheyCareAbout: string[]
  likelyObjection: string
  keyStatToOpen: string
  doNotSay: string
  openingLine: string
}

function buildFallback(doctor: { fullName: string; personaType: string; targetProduct: string; likelyConcerns: string; competitorPreference: string | null }, hasHistory: boolean): PrepContent {
  let concerns: string[] = []
  try { concerns = JSON.parse(doctor.likelyConcerns) } catch {}
  const lastName = doctor.fullName.split(' ').slice(-1)[0]

  return {
    lastVisitSummary: hasHistory
      ? `Prior interaction on record. Review CRM notes before the visit for context on objections raised.`
      : 'First visit — no prior interaction recorded.',
    whatTheyCareAbout: concerns.slice(0, 3).length > 0
      ? concerns.slice(0, 3)
      : ['Clinical evidence quality', 'Patient affordability', 'Dosing convenience'],
    likelyObjection: doctor.personaType === 'EvidenceDriven'
      ? `Show me the head-to-head trial data — what makes ${doctor.targetProduct} better than what I already prescribe?`
      : doctor.personaType === 'PriceSensitive'
      ? `My patients cannot afford branded medications — what is the actual out-of-pocket cost?`
      : `I am satisfied with my current prescribing habits — what specifically makes ${doctor.targetProduct} worth considering?`,
    keyStatToOpen: `${doctor.targetProduct} demonstrated a clinically meaningful improvement in the primary endpoint in the STRIDE-India Phase III trial, with a particularly strong effect in South Asian patient populations.`,
    doNotSay: doctor.competitorPreference
      ? `Do not criticise ${doctor.competitorPreference} — position ${doctor.targetProduct} as a complementary option for specific patient types instead.`
      : `Do not lead with price or discounts — establish clinical value first.`,
    openingLine: `Good morning Dr. ${lastName}, thank you for your time. I wanted to share some new data on ${doctor.targetProduct} that I think is directly relevant to your patients — particularly around the outcome that came up in our last discussion.`,
  }
}

// POST /api/doctors/:id/visit-prep/generate
router.post(
  '/:id/visit-prep/generate',
  asyncHandler(async (req, res) => {
    const { id: doctorId } = req.params

    const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } })
    if (!doctor) {
      res.status(404).json({ success: false, error: 'Doctor not found' })
      return
    }

    const [lastAnalysis, product] = await Promise.all([
      prisma.postCallAnalysis.findFirst({
        where: { doctorId },
        orderBy: { createdAt: 'desc' },
        select: { summary: true, nextBestActions: true },
      }),
      prisma.product.findFirst({
        where: { productName: { contains: doctor.targetProduct.split(' ')[0] } },
        select: { productName: true, indication: true, differentiators: true, keyBenefits: true },
      }),
    ])

    const openai = getOpenAI()
    let content: PrepContent

    if (!openai) {
      content = buildFallback(doctor, !!lastAnalysis)
    } else {
      const prompt = buildVisitPrepPrompt(doctor, lastAnalysis, product)
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      })
      const raw = completion.choices[0]?.message?.content
      if (!raw) {
        res.status(500).json({ success: false, error: 'No AI response' })
        return
      }
      content = JSON.parse(raw) as PrepContent
    }

    const sheet = await prisma.visitPrepSheet.create({
      data: { doctorId, content: JSON.stringify(content) },
    })

    res.status(201).json({ success: true, sheet: { ...sheet, content } })
  }),
)

// GET /api/doctors/:id/visit-prep
router.get(
  '/:id/visit-prep',
  asyncHandler(async (req, res) => {
    const { id: doctorId } = req.params

    const sheets = await prisma.visitPrepSheet.findMany({
      where: { doctorId },
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      success: true,
      sheets: sheets.map((s) => {
        let content: PrepContent | null = null
        try { content = JSON.parse(s.content) } catch {}
        return { ...s, content }
      }),
    })
  }),
)

export default router
