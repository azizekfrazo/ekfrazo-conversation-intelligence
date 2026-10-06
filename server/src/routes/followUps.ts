import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

const UpdateSchema = z.object({
  status: z.enum(['pending', 'done']),
})

// GET /api/follow-ups?status=pending|done&doctorId=xxx
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, doctorId } = req.query as { status?: string; doctorId?: string }

    const where: Record<string, unknown> = {}
    if (status === 'pending' || status === 'done') where.status = status
    if (doctorId) where.doctorId = doctorId

    const actions = await prisma.followUpAction.findMany({
      where,
      include: {
        doctor: { select: { id: true, fullName: true, specialty: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, actions })
  }),
)

// PATCH /api/follow-ups/:id
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = UpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() })
      return
    }

    const { status } = parsed.data
    const action = await prisma.followUpAction.update({
      where: { id: req.params.id },
      data: {
        status,
        completedAt: status === 'done' ? new Date() : null,
      },
      include: {
        doctor: { select: { id: true, fullName: true, specialty: true } },
      },
    })

    res.json({ success: true, action })
  }),
)

export default router
