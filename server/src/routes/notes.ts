import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

const NoteSchema = z.object({
  content: z.string().min(1),
  userId: z.string(),
})

router.get(
  '/:id/notes',
  asyncHandler(async (req, res) => {
    const notes = await prisma.note.findMany({
      where: { doctorId: req.params.id },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, notes })
  }),
)

router.post(
  '/:id/notes',
  asyncHandler(async (req, res) => {
    const parsed = NoteSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() })
      return
    }

    const note = await prisma.note.create({
      data: { ...parsed.data, doctorId: req.params.id },
    })
    res.status(201).json({ success: true, note })
  }),
)

router.delete(
  '/:doctorId/notes/:noteId',
  asyncHandler(async (req, res) => {
    await prisma.note.delete({ where: { id: req.params.noteId } })
    res.json({ success: true })
  }),
)

export default router
