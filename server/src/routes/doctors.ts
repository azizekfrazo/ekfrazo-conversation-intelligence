import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

const DoctorSchema = z.object({
  fullName: z.string().min(2),
  specialty: z.string().min(2),
  city: z.string().min(1),
  hospitalOrClinic: z.string().optional(),
  personaType: z.enum(['EvidenceDriven', 'Skeptical', 'PriceSensitive', 'BrandLoyal', 'Busy', 'FriendlyButReserved']),
  seniorityLevel: z.enum(['Junior', 'MidLevel', 'Senior', 'HoD']),
  therapyArea: z.string().min(1),
  targetProduct: z.string().min(1),
  likelyConcerns: z.array(z.string()),
  competitorPreference: z.string().optional().nullable(),
  lastInteractionDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  userId: z.string().min(1),
})

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { userId, search } = req.query as { userId?: string; search?: string }

    const doctors = await prisma.doctorProfile.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search } },
                { specialty: { contains: search } },
                { city: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { battlecards: true, practiceSessions: true, postCallAnalyses: true },
        },
      },
    })

    res.json({
      success: true,
      doctors: doctors.map((d) => ({
        ...d,
        likelyConcerns: JSON.parse(d.likelyConcerns),
      })),
    })
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { battlecards: true, practiceSessions: true, postCallAnalyses: true },
        },
      },
    })

    if (!doctor) {
      res.status(404).json({ success: false, error: 'Doctor not found' })
      return
    }

    res.json({
      success: true,
      doctor: { ...doctor, likelyConcerns: JSON.parse(doctor.likelyConcerns) },
    })
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = DoctorSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() })
      return
    }

    const data = parsed.data
    const doctor = await prisma.doctorProfile.create({
      data: {
        ...data,
        likelyConcerns: JSON.stringify(data.likelyConcerns),
        lastInteractionDate: data.lastInteractionDate
          ? new Date(data.lastInteractionDate)
          : null,
      },
    })

    res.status(201).json({
      success: true,
      doctor: { ...doctor, likelyConcerns: JSON.parse(doctor.likelyConcerns) },
    })
  }),
)

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = DoctorSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() })
      return
    }

    const { userId: _userId, likelyConcerns, lastInteractionDate, ...rest } = parsed.data
    const doctor = await prisma.doctorProfile.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(likelyConcerns ? { likelyConcerns: JSON.stringify(likelyConcerns) } : {}),
        ...(lastInteractionDate !== undefined
          ? { lastInteractionDate: lastInteractionDate ? new Date(lastInteractionDate) : null }
          : {}),
      },
    })

    res.json({
      success: true,
      doctor: { ...doctor, likelyConcerns: JSON.parse(doctor.likelyConcerns) },
    })
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.doctorProfile.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  }),
)

export default router
