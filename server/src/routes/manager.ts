import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function weekStart() {
  // rolling 7-day window so demo data always appears
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
}

// GET /api/manager/overview
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const td = todayStart()
    const ws = weekStart()

    const reps = await prisma.$queryRaw<any[]>`SELECT * FROM "SalesRep"`
    const allVisitsWeek = await prisma.$queryRaw<any[]>`
      SELECT salesRepId, outcome, date, followUp FROM "VisitRecord" WHERE date >= ${ws}
    `
    const allVisitsToday = await prisma.$queryRaw<any[]>`
      SELECT salesRepId, outcome FROM "VisitRecord" WHERE date >= ${td}
    `
    const targets = await prisma.$queryRaw<any[]>`SELECT * FROM "RepTarget"`
    const assignments = await prisma.$queryRaw<any[]>`SELECT salesRepId, doctorId FROM "DoctorAssignment"`

    const totalAssignedClinics = assignments.length
    const visitsToday = allVisitsToday.length
    const visitsThisWeek = allVisitsWeek.length
    const notAvailableToday = allVisitsToday.filter((v: any) => v.outcome === 'not_available').length

    const repBreakdown = reps.map((rep: any) => {
      const repVisitsWeek = allVisitsWeek.filter((v: any) => v.salesRepId === rep.id)
      const repVisitsToday = allVisitsToday.filter((v: any) => v.salesRepId === rep.id).length
      const repVisitsThisWeek = repVisitsWeek.length
      const offlineCount = repVisitsWeek.filter((v: any) => v.outcome === 'visited_offline').length
      const score = repVisitsThisWeek > 0
        ? Math.round(60 + (offlineCount / repVisitsThisWeek) * 30)
        : 65
      const pendingFollowUps = repVisitsWeek.filter((v: any) => v.followUp && v.followUp.trim()).length
      const repAssignedDocs = assignments.filter((a: any) => a.salesRepId === rep.id).length
      const repTarget = targets.find((t: any) => t.salesRepId === rep.id)

      // Status
      const weeklyTarget = repTarget?.weeklyClinicTarget ?? 20
      let status = 'On Track'
      if (repVisitsThisWeek >= Math.round(weeklyTarget * 0.9)) status = 'Excellent'
      else if (repVisitsToday < 3) status = 'Behind'

      return {
        repId: rep.id,
        name: rep.name,
        territory: rep.territory,
        avatarColor: rep.avatarColor,
        visitsToday: repVisitsToday,
        visitsThisWeek: repVisitsThisWeek,
        score,
        status,
        pendingFollowUps,
        assignedDoctors: repAssignedDocs,
        coverage: repAssignedDocs > 0
          ? Math.min(100, Math.round((repVisitsThisWeek / repAssignedDocs) * 100))
          : 0,
      }
    })

    const allScores = repBreakdown.map((r) => r.score).filter((s) => s > 0)
    const avgQualityScore = allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0

    res.json({
      totalReps: reps.length,
      totalAssignedClinics,
      visitsToday,
      visitsThisWeek,
      avgQualityScore,
      notAvailableToday,
      repBreakdown,
    })
  } catch (error) {
    console.error('Manager overview error:', error)
    res.status(500).json({ error: 'Failed to fetch manager overview' })
  }
})

// GET /api/manager/rep/:repId/timeline — today's timeline for a rep
router.get('/rep/:repId/timeline', async (req: Request, res: Response) => {
  try {
    const { repId } = req.params
    const td = todayStart()

    const visits = await prisma.$queryRaw<any[]>`
      SELECT vr.id, vr.date, vr.outcome, vr.notes, vr.followUp, vr.latitude, vr.longitude,
             dp.fullName, dp.specialty, dp.hospitalOrClinic, dp.city
      FROM "VisitRecord" vr
      JOIN "DoctorProfile" dp ON vr.doctorId = dp.id
      WHERE vr.salesRepId = ${repId} AND vr.date >= ${td}
      ORDER BY vr.date ASC
    `

    res.json(visits.map((v: any) => ({
      id: v.id,
      date: v.date,
      outcome: v.outcome,
      notes: v.notes,
      followUp: v.followUp,
      latitude: v.latitude,
      longitude: v.longitude,
      doctor: {
        fullName: v.fullName,
        specialty: v.specialty,
        hospitalOrClinic: v.hospitalOrClinic,
        city: v.city,
      },
    })))
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch timeline' })
  }
})

export default router
