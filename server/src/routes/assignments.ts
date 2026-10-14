import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// GET /api/assignments — all assignments with rep+doctor info
router.get('/', async (_req: Request, res: Response) => {
  try {
    const assignments = await prisma.$queryRaw<any[]>`
      SELECT da.id, da.salesRepId, da.doctorId, da.area, da.assignedAt,
             sr.name as repName, sr.territory, sr.avatarColor,
             dp.fullName, dp.specialty, dp.hospitalOrClinic, dp.area as doctorArea
      FROM "DoctorAssignment" da
      JOIN "SalesRep" sr ON da.salesRepId = sr.id
      JOIN "DoctorProfile" dp ON da.doctorId = dp.id
      ORDER BY da.assignedAt DESC
    `

    res.json(assignments.map((a: any) => ({
      id: a.id,
      salesRepId: a.salesRepId,
      doctorId: a.doctorId,
      area: a.area,
      assignedAt: a.assignedAt,
      salesRep: { id: a.salesRepId, name: a.repName, territory: a.territory, avatarColor: a.avatarColor },
      doctor: { id: a.doctorId, fullName: a.fullName, specialty: a.specialty, hospitalOrClinic: a.hospitalOrClinic, area: a.doctorArea },
    })))
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assignments' })
  }
})

// POST /api/assignments — assign a doctor to a rep
router.post('/', async (req: Request, res: Response) => {
  try {
    const { salesRepId, doctorId, area } = req.body
    if (!salesRepId || !doctorId) {
      return res.status(400).json({ error: 'salesRepId and doctorId required' })
    }

    const assignId = `assign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()

    // Check if doctor is already assigned to ANY rep
    const existingAssign = await prisma.$queryRaw<any[]>`
      SELECT da.id, sr.name as repName FROM "DoctorAssignment" da
      JOIN "SalesRep" sr ON da.salesRepId = sr.id
      WHERE da.doctorId = ${doctorId}
      LIMIT 1
    `
    if (existingAssign.length > 0) {
      const assignedTo = existingAssign[0].repName
      return res.status(409).json({
        error: `Doctor is already assigned to ${assignedTo}. Please unassign first.`,
        assignedTo,
      })
    }

    try {
      await prisma.$executeRaw`
        INSERT INTO "DoctorAssignment" (id, salesRepId, doctorId, area, assignedAt)
        VALUES (${assignId}, ${salesRepId}, ${doctorId}, ${area ?? null}, ${now})
      `
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Doctor already assigned to this rep' })
      }
      throw err
    }

    const assignments = await prisma.$queryRaw<any[]>`
      SELECT da.id, da.salesRepId, da.doctorId,
             sr.name as repName, dp.fullName
      FROM "DoctorAssignment" da
      JOIN "SalesRep" sr ON da.salesRepId = sr.id
      JOIN "DoctorProfile" dp ON da.doctorId = dp.id
      WHERE da.id = ${assignId}
    `
    const a = assignments[0]
    res.json({
      id: a.id,
      salesRepId: a.salesRepId,
      doctorId: a.doctorId,
      salesRep: { id: a.salesRepId, name: a.repName },
      doctor: { id: a.doctorId, fullName: a.fullName },
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create assignment' })
  }
})

// DELETE /api/assignments/:id — unassign
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    await prisma.$executeRaw`DELETE FROM "DoctorAssignment" WHERE id = ${id}`
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete assignment' })
  }
})

export default router
