import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

router.get(
  '/:id/timeline',
  asyncHandler(async (req, res) => {
    const doctorId = req.params.id

    const [doctor, battlecards, sessions, analyses, notes] = await Promise.all([
      prisma.doctorProfile.findUnique({ where: { id: doctorId } }),
      prisma.battlecard.findMany({
        where: { doctorId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, productId: true, product: { select: { productName: true } } },
      }),
      prisma.practiceSession.findMany({
        where: { doctorId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, difficulty: true, objectionFocus: true, status: true },
      }),
      prisma.postCallAnalysis.findMany({
        where: { doctorId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, summary: true },
      }),
      prisma.note.findMany({
        where: { doctorId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, content: true },
      }),
    ])

    if (!doctor) {
      res.status(404).json({ success: false, error: 'Doctor not found' })
      return
    }

    const events = [
      {
        id: `doctor-created-${doctor.id}`,
        type: 'doctor_created',
        label: 'Doctor profile created',
        timestamp: doctor.createdAt,
        data: {},
      },
      ...battlecards.map((b) => ({
        id: `battlecard-${b.id}`,
        type: 'battlecard_generated',
        label: `Battlecard generated — ${b.product.productName}`,
        timestamp: b.createdAt,
        data: { battlecardId: b.id },
      })),
      ...sessions.map((s) => ({
        id: `session-${s.id}`,
        type: 'practice_session',
        label: `Practice session — ${s.difficulty} / ${s.objectionFocus}`,
        timestamp: s.createdAt,
        data: { sessionId: s.id, status: s.status },
      })),
      ...analyses.map((a) => ({
        id: `analysis-${a.id}`,
        type: 'postcall_analysis',
        label: 'Post-call analysis completed',
        timestamp: a.createdAt,
        data: { analysisId: a.id },
      })),
      ...notes.map((n) => ({
        id: `note-${n.id}`,
        type: 'note_added',
        label: `Note: ${n.content.slice(0, 60)}${n.content.length > 60 ? '…' : ''}`,
        timestamp: n.createdAt,
        data: { noteId: n.id },
      })),
    ]

    events.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )

    res.json({ success: true, events })
  }),
)

export default router
