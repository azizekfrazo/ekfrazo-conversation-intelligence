import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// POST /api/visits/punch-in
router.post('/punch-in', async (req: Request, res: Response) => {
  try {
    const { doctorId, repId, lat, lng } = req.body
    if (!doctorId || !repId) {
      return res.status(400).json({ error: 'doctorId and repId are required' })
    }

    // Return existing in-progress visit if one exists
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "VisitRecord"
      WHERE salesRepId = ${repId} AND doctorId = ${doctorId} AND visitStatus = 'in-progress'
      LIMIT 1
    `
    if (existing.length > 0) {
      return res.json({ visitId: existing[0].id, alreadyActive: true })
    }

    const now = new Date().toISOString()
    const id = `vi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    await prisma.$executeRaw`
      INSERT INTO "VisitRecord" (id, salesRepId, doctorId, date, outcome, visitStatus, punchInTime, punchInLat, punchInLng, createdAt)
      VALUES (${id}, ${repId}, ${doctorId}, ${now}, 'in-progress', 'in-progress', ${now}, ${lat ?? null}, ${lng ?? null}, ${now})
    `

    res.json({ visitId: id })
  } catch (error) {
    console.error('punch-in error:', error)
    res.status(500).json({ error: 'Failed to record punch-in' })
  }
})

// POST /api/visits/punch-out
router.post('/punch-out', async (req: Request, res: Response) => {
  try {
    const { visitId, lat, lng, outcome } = req.body
    if (!visitId || !outcome) {
      return res.status(400).json({ error: 'visitId and outcome are required' })
    }

    const dbOutcome = outcome === 'completed' ? 'visited_offline' : 'not_available'
    const now = new Date().toISOString()

    await prisma.$executeRaw`
      UPDATE "VisitRecord"
      SET
        visitStatus  = 'done',
        visitOutcome = ${outcome},
        outcome      = ${dbOutcome},
        punchOutTime = ${now},
        punchOutLat  = ${lat ?? null},
        punchOutLng  = ${lng ?? null}
      WHERE id = ${visitId}
    `

    res.json({ success: true })
  } catch (error) {
    console.error('punch-out error:', error)
    res.status(500).json({ error: 'Failed to record punch-out' })
  }
})

export default router
