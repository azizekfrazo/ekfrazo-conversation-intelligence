import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/salesreps — all reps with today/week visit stats
router.get('/', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());

    const reps = await prisma.salesRep.findMany({
      include: {
        visitRecords: {
          where: { date: { gte: weekStart } },
          select: { outcome: true, date: true, notes: true, followUp: true },
        },
        target: true,
        assignedDoctors: { include: { doctor: true } },
      },
    });

    const result = reps.map((rep) => {
      const visitsToday = rep.visitRecords.filter(
        (v) => new Date(v.date) >= todayStart
      ).length;
      const visitsThisWeek = rep.visitRecords.length;
      const notAvailableToday = rep.visitRecords.filter(
        (v) => new Date(v.date) >= todayStart && v.outcome === 'not_available'
      ).length;
      const pendingFollowUps = rep.visitRecords.filter(
        (v) => v.followUp && v.followUp.trim() !== ''
      ).length;

      // Simple quality score based on offline visit ratio
      const totalVisits = rep.visitRecords.length;
      const offlineVisits = rep.visitRecords.filter(
        (v) => v.outcome === 'visited_offline'
      ).length;
      const avgScore =
        totalVisits > 0
          ? Math.round(60 + (offlineVisits / totalVisits) * 30)
          : 0;

      let status = 'On Track';
      if (visitsThisWeek >= (rep.target?.weeklyClinicTarget || 20)) {
        status = 'Excellent';
      } else if (visitsToday < 3) {
        status = 'Behind';
      }

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
        assignedDoctorsCount: rep.assignedDoctors.length,
        target: rep.target,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching sales reps:', error);
    res.status(500).json({ error: 'Failed to fetch sales reps' });
  }
});

// GET /api/salesreps/:id — single rep detail
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const rep = await prisma.salesRep.findUnique({
      where: { id: req.params.id },
      include: {
        target: true,
        assignedDoctors: { include: { doctor: true } },
      },
    });
    if (!rep) return res.status(404).json({ error: 'Rep not found' });
    res.json(rep);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rep' });
  }
});

// GET /api/salesreps/:id/visits
router.get('/:id/visits', async (req: Request, res: Response) => {
  try {
    const days = parseInt((req.query.days as string) || '7');
    const outcome = req.query.outcome as string | undefined;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where: any = { salesRepId: req.params.id, date: { gte: since } };
    if (outcome) where.outcome = outcome;

    const visits = await prisma.visitRecord.findMany({
      where,
      include: { doctor: { select: { id: true, fullName: true, specialty: true, hospitalOrClinic: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(visits);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

// GET /api/salesreps/:id/assignments
router.get('/:id/assignments', async (req: Request, res: Response) => {
  try {
    const assignments = await prisma.doctorAssignment.findMany({
      where: { salesRepId: req.params.id },
      include: { doctor: true },
      orderBy: { assignedAt: 'desc' },
    });

    // Add last visit date to each assignment
    const enriched = await Promise.all(
      assignments.map(async (a) => {
        const lastVisit = await prisma.visitRecord.findFirst({
          where: { salesRepId: req.params.id, doctorId: a.doctorId },
          orderBy: { date: 'desc' },
          select: { date: true, outcome: true },
        });
        return { ...a, lastVisit: lastVisit?.date ?? null, lastOutcome: lastVisit?.outcome ?? null };
      })
    );

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /api/salesreps/:id/targets
router.get('/:id/targets', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const target = await prisma.repTarget.findUnique({ where: { salesRepId: req.params.id } });
    const visitsToday = await prisma.visitRecord.count({
      where: { salesRepId: req.params.id, date: { gte: todayStart } },
    });
    const visitsThisWeek = await prisma.visitRecord.count({
      where: { salesRepId: req.params.id, date: { gte: weekStart } },
    });

    // Unique clinics visited this week
    const weekVisits = await prisma.visitRecord.findMany({
      where: {
        salesRepId: req.params.id,
        date: { gte: weekStart },
        outcome: { in: ['visited_offline', 'visited_online'] },
      },
      select: { doctorId: true },
    });
    const uniqueClinicsThisWeek = new Set(weekVisits.map((v) => v.doctorId)).size;

    const allVisits = await prisma.visitRecord.findMany({
      where: { salesRepId: req.params.id, date: { gte: monthStart } },
      select: { outcome: true },
    });
    const offlineCount = allVisits.filter((v) => v.outcome === 'visited_offline').length;
    const avgScore =
      allVisits.length > 0 ? Math.round(60 + (offlineCount / allVisits.length) * 30) : 0;

    res.json({
      target: target || {
        dailyVisitTarget: 5,
        weeklyClinicTarget: 20,
        monthlyRevenueTarget: 500000,
        qualityScoreTarget: 75,
      },
      actuals: {
        visitsToday,
        visitsThisWeek,
        uniqueClinicsThisWeek,
        avgScore,
        monthlyRevenue: Math.round(uniqueClinicsThisWeek * 12500),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch targets' });
  }
});

// POST /api/salesreps/:id/visits — log a new visit
router.post('/:id/visits', async (req: Request, res: Response) => {
  try {
    const { doctorId, outcome, notes, followUp, latitude, longitude } = req.body;
    const visit = await prisma.visitRecord.create({
      data: {
        salesRepId: req.params.id,
        doctorId,
        outcome,
        notes,
        followUp,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        date: new Date(),
      },
      include: { doctor: { select: { id: true, fullName: true, specialty: true } } },
    });
    res.json(visit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log visit' });
  }
});

// GET /api/salesreps/:id/activity — last 7 days chart data
router.get('/:id/activity', async (req: Request, res: Response) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const visits = await prisma.visitRecord.findMany({
      where: { salesRepId: req.params.id, date: { gte: since } },
      select: { date: true, outcome: true },
    });

    const days: Record<string, any> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      days[key] = { date: key, visited_offline: 0, visited_online: 0, not_available: 0, rescheduled: 0 };
    }
    for (const v of visits) {
      const key = new Date(v.date).toISOString().split('T')[0];
      if (days[key]) days[key][v.outcome] = (days[key][v.outcome] || 0) + 1;
    }

    res.json(Object.values(days));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// GET /api/manager/overview
router.get('/manager/overview', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());

    const reps = await prisma.salesRep.findMany({
      include: {
        visitRecords: {
          where: { date: { gte: weekStart } },
          select: { outcome: true, date: true, followUp: true },
        },
        target: true,
        assignedDoctors: true,
      },
    });

    const totalAssignedClinics = await prisma.doctorAssignment.count();
    const visitsToday = await prisma.visitRecord.count({
      where: { date: { gte: todayStart } },
    });
    const visitsThisWeek = await prisma.visitRecord.count({
      where: { date: { gte: weekStart } },
    });
    const notAvailableToday = await prisma.visitRecord.count({
      where: { date: { gte: todayStart }, outcome: 'not_available' },
    });

    const repBreakdown = reps.map((rep) => {
      const repVisitsToday = rep.visitRecords.filter(
        (v) => new Date(v.date) >= todayStart
      ).length;
      const repVisitsThisWeek = rep.visitRecords.length;
      const offlineCount = rep.visitRecords.filter(
        (v) => v.outcome === 'visited_offline'
      ).length;
      const score =
        rep.visitRecords.length > 0
          ? Math.round(60 + (offlineCount / rep.visitRecords.length) * 30)
          : 0;
      const pendingFollowUps = rep.visitRecords.filter(
        (v) => v.followUp && v.followUp.trim() !== ''
      ).length;

      return {
        repId: rep.id,
        name: rep.name,
        territory: rep.territory,
        avatarColor: rep.avatarColor,
        visitsToday: repVisitsToday,
        visitsThisWeek: repVisitsThisWeek,
        score,
        pendingFollowUps,
        assignedDoctors: rep.assignedDoctors.length,
        coverage:
          rep.assignedDoctors.length > 0
            ? Math.round((repVisitsThisWeek / rep.assignedDoctors.length) * 100)
            : 0,
      };
    });

    const allScores = repBreakdown.map((r) => r.score).filter((s) => s > 0);
    const avgQualityScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : 0;

    res.json({
      totalReps: reps.length,
      totalAssignedClinics,
      visitsToday,
      visitsThisWeek,
      avgQualityScore,
      notAvailableToday,
      repBreakdown,
    });
  } catch (error) {
    console.error('Manager overview error:', error);
    res.status(500).json({ error: 'Failed to fetch manager overview' });
  }
});

export default router;
