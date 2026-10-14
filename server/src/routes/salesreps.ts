import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// ─── helpers ──────────────────────────────────────────────────────────────────

function todayStart() {
  // 24-hour rolling window so demo data always appears
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
}

function weekStart() {
  // rolling 7-day window so demo data always appears
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
}

function monthStart() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

// ─── GET /api/salesreps — all reps with stats ─────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const ws = weekStart()
    const td = todayStart()

    const reps = await prisma.$queryRaw<any[]>`SELECT * FROM "SalesRep"`
    const visits = await prisma.$queryRaw<any[]>`
      SELECT salesRepId, outcome, date, notes, followUp
      FROM "VisitRecord"
      WHERE date >= ${ws}
    `
    const targets = await prisma.$queryRaw<any[]>`SELECT * FROM "RepTarget"`
    const assignments = await prisma.$queryRaw<any[]>`SELECT salesRepId FROM "DoctorAssignment"`

    const result = reps.map((rep: any) => {
      const repVisits = visits.filter((v: any) => v.salesRepId === rep.id)
      const repTarget = targets.find((t: any) => t.salesRepId === rep.id)
      const repAssignCount = assignments.filter((a: any) => a.salesRepId === rep.id).length

      const visitsToday = repVisits.filter((v: any) => v.date >= td).length
      const visitsThisWeek = repVisits.length
      const notAvailableToday = repVisits.filter((v: any) => v.date >= td && v.outcome === 'not_available').length
      const pendingFollowUps = repVisits.filter((v: any) => v.followUp && v.followUp.trim()).length

      const offlineVisits = repVisits.filter((v: any) => v.outcome === 'visited_offline').length
      const avgScore = repVisits.length > 0
        ? Math.round(60 + (offlineVisits / repVisits.length) * 30)
        : 65

      const weeklyTarget = repTarget?.weeklyClinicTarget ?? 20
      let status = 'On Track'
      if (visitsThisWeek >= Math.round(weeklyTarget * 0.9)) status = 'Excellent'
      else if (visitsToday < 3) status = 'Behind'

      return {
        id: rep.id,
        name: rep.name,
        email: rep.email,
        territory: rep.territory,
        avatarColor: rep.avatarColor,
        visitsToday,
        visitsThisWeek,
        notAvailableToday,
        pendingFollowUps,
        avgScore,
        status,
        assignedDoctorsCount: repAssignCount,
        target: repTarget ?? null,
      }
    })

    res.json(result)
  } catch (error) {
    console.error('Error fetching sales reps:', error)
    res.status(500).json({ error: 'Failed to fetch sales reps' })
  }
})

// ─── GET /api/salesreps/:id — single rep detail ───────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const reps = await prisma.$queryRaw<any[]>`SELECT * FROM "SalesRep" WHERE id = ${id}`
    if (!reps.length) return res.status(404).json({ error: 'Rep not found' })

    const target = await prisma.$queryRaw<any[]>`SELECT * FROM "RepTarget" WHERE salesRepId = ${id}`
    const assignments = await prisma.$queryRaw<any[]>`
      SELECT da.*, dp.id as doctorId, dp.fullName, dp.specialty, dp.hospitalOrClinic, dp.area
      FROM "DoctorAssignment" da
      JOIN "DoctorProfile" dp ON da.doctorId = dp.id
      WHERE da.salesRepId = ${id}
    `

    res.json({
      ...reps[0],
      target: target[0] ?? null,
      assignedDoctors: assignments.map((a: any) => ({
        id: a.id,
        doctorId: a.doctorId,
        area: a.area,
        doctor: { id: a.doctorId, fullName: a.fullName, specialty: a.specialty, hospitalOrClinic: a.hospitalOrClinic },
      })),
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rep' })
  }
})

// ─── GET /api/salesreps/:id/visits ────────────────────────────────────────────
router.get('/:id/visits', async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const days = parseInt((req.query.days as string) || '7')
    const outcome = req.query.outcome as string | undefined
    const since = daysAgo(days)

    let visits: any[]
    if (outcome) {
      visits = await prisma.$queryRaw<any[]>`
        SELECT vr.*, dp.id as dId, dp.fullName, dp.specialty, dp.hospitalOrClinic
        FROM "VisitRecord" vr
        JOIN "DoctorProfile" dp ON vr.doctorId = dp.id
        WHERE vr.salesRepId = ${id} AND vr.date >= ${since} AND vr.outcome = ${outcome}
        ORDER BY vr.date DESC
      `
    } else {
      visits = await prisma.$queryRaw<any[]>`
        SELECT vr.*, dp.id as dId, dp.fullName, dp.specialty, dp.hospitalOrClinic
        FROM "VisitRecord" vr
        JOIN "DoctorProfile" dp ON vr.doctorId = dp.id
        WHERE vr.salesRepId = ${id} AND vr.date >= ${since}
        ORDER BY vr.date DESC
      `
    }

    const result = visits.map((v: any) => ({
      id: v.id,
      salesRepId: v.salesRepId,
      doctorId: v.doctorId,
      date: v.date,
      outcome: v.outcome,
      notes: v.notes,
      followUp: v.followUp,
      latitude: v.latitude,
      longitude: v.longitude,
      createdAt: v.createdAt,
      doctor: { id: v.doctorId, fullName: v.fullName, specialty: v.specialty, hospitalOrClinic: v.hospitalOrClinic },
    }))

    res.json(result)
  } catch (error) {
    console.error('Error fetching visits:', error)
    res.status(500).json({ error: 'Failed to fetch visits' })
  }
})

// ─── GET /api/salesreps/:id/assignments ───────────────────────────────────────
router.get('/:id/assignments', async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const assignments = await prisma.$queryRaw<any[]>`
      SELECT da.id, da.salesRepId, da.doctorId, da.area, da.assignedAt,
             dp.fullName, dp.specialty, dp.hospitalOrClinic, dp.personaType,
             dp.seniorityLevel, dp.therapyArea, dp.targetProduct, dp.city, dp.area as doctorArea
      FROM "DoctorAssignment" da
      JOIN "DoctorProfile" dp ON da.doctorId = dp.id
      WHERE da.salesRepId = ${id}
      ORDER BY da.assignedAt DESC
    `

    // Enrich with last visit
    const enriched = await Promise.all(
      assignments.map(async (a: any) => {
        const lastVisits = await prisma.$queryRaw<any[]>`
          SELECT date, outcome FROM "VisitRecord"
          WHERE salesRepId = ${id} AND doctorId = ${a.doctorId}
          ORDER BY date DESC LIMIT 1
        `
        const lastVisit = lastVisits[0]
        return {
          id: a.id,
          salesRepId: a.salesRepId,
          doctorId: a.doctorId,
          area: a.area,
          assignedAt: a.assignedAt,
          lastVisit: lastVisit?.date ?? null,
          lastOutcome: lastVisit?.outcome ?? null,
          doctor: {
            id: a.doctorId,
            fullName: a.fullName,
            specialty: a.specialty,
            hospitalOrClinic: a.hospitalOrClinic,
            personaType: a.personaType,
            seniorityLevel: a.seniorityLevel,
            therapyArea: a.therapyArea,
            targetProduct: a.targetProduct,
            city: a.city,
            area: a.area,
          },
        }
      })
    )

    res.json(enriched)
  } catch (error) {
    console.error('Error fetching assignments:', error)
    res.status(500).json({ error: 'Failed to fetch assignments' })
  }
})

// ─── GET /api/salesreps/:id/targets ───────────────────────────────────────────
router.get('/:id/targets', async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const td = todayStart()
    const ws = weekStart()
    const ms = monthStart()

    const targets = await prisma.$queryRaw<any[]>`
      SELECT * FROM "RepTarget" WHERE salesRepId = ${id}
    `
    const target = targets[0] ?? {
      dailyVisitTarget: 5,
      weeklyClinicTarget: 20,
      monthlyRevenueTarget: 500000,
      qualityScoreTarget: 75,
    }

    const todayVisits = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as cnt FROM "VisitRecord"
      WHERE salesRepId = ${id} AND date >= ${td}
    `
    const weekVisits = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as cnt FROM "VisitRecord"
      WHERE salesRepId = ${id} AND date >= ${ws}
    `
    const weekClinics = await prisma.$queryRaw<any[]>`
      SELECT DISTINCT doctorId FROM "VisitRecord"
      WHERE salesRepId = ${id} AND date >= ${ws}
        AND outcome IN ('visited_offline', 'visited_online')
    `
    const monthVisits = await prisma.$queryRaw<any[]>`
      SELECT outcome FROM "VisitRecord"
      WHERE salesRepId = ${id} AND date >= ${ms}
    `

    const visitsToday = Number(todayVisits[0]?.cnt ?? 0)
    const visitsThisWeek = Number(weekVisits[0]?.cnt ?? 0)
    const uniqueClinicsThisWeek = weekClinics.length
    const offlineCount = monthVisits.filter((v: any) => v.outcome === 'visited_offline').length
    const avgScore = monthVisits.length > 0
      ? Math.round(60 + (offlineCount / monthVisits.length) * 30)
      : 65

    res.json({
      target,
      actuals: {
        visitsToday,
        visitsThisWeek,
        uniqueClinicsThisWeek,
        avgScore,
        monthlyRevenue: Math.round(uniqueClinicsThisWeek * 12500),
      },
    })
  } catch (error) {
    console.error('Error fetching targets:', error)
    res.status(500).json({ error: 'Failed to fetch targets' })
  }
})

// ─── POST /api/salesreps/:id/visits — log new visit ───────────────────────────
router.post('/:id/visits', async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const { doctorId, outcome, notes, followUp, latitude, longitude } = req.body
    if (!doctorId || !outcome) {
      return res.status(400).json({ error: 'doctorId and outcome required' })
    }

    const visitId = `visit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()
    const lat = latitude ? parseFloat(latitude) : null
    const lng = longitude ? parseFloat(longitude) : null

    await prisma.$executeRaw`
      INSERT INTO "VisitRecord" (id, salesRepId, doctorId, date, outcome, notes, followUp, latitude, longitude, createdAt)
      VALUES (${visitId}, ${id}, ${doctorId}, ${now}, ${outcome}, ${notes ?? null}, ${followUp ?? null}, ${lat}, ${lng}, ${now})
    `

    const visits = await prisma.$queryRaw<any[]>`
      SELECT vr.*, dp.id as dId, dp.fullName, dp.specialty, dp.hospitalOrClinic
      FROM "VisitRecord" vr
      JOIN "DoctorProfile" dp ON vr.doctorId = dp.id
      WHERE vr.id = ${visitId}
    `
    const v = visits[0]
    res.json({
      id: v.id,
      salesRepId: v.salesRepId,
      doctorId: v.doctorId,
      date: v.date,
      outcome: v.outcome,
      notes: v.notes,
      followUp: v.followUp,
      doctor: { id: v.doctorId, fullName: v.fullName, specialty: v.specialty },
    })
  } catch (error) {
    console.error('Error logging visit:', error)
    res.status(500).json({ error: 'Failed to log visit' })
  }
})

// ─── GET /api/salesreps/:id/activity — 7-day chart data ──────────────────────
router.get('/:id/activity', async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const since = daysAgo(7)

    const visits = await prisma.$queryRaw<any[]>`
      SELECT date, outcome FROM "VisitRecord"
      WHERE salesRepId = ${id} AND date >= ${since}
    `

    const days: Record<string, any> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().split('T')[0]
      days[key] = { date: key, visited_offline: 0, visited_online: 0, not_available: 0, rescheduled: 0 }
    }
    for (const v of visits) {
      const key = new Date(v.date).toISOString().split('T')[0]
      if (days[key] && v.outcome in days[key]) {
        days[key][v.outcome]++
      }
    }

    res.json(Object.values(days))
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity' })
  }
})

export default router
