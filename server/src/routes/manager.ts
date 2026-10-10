import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/manager/overview
router.get('/overview', async (req: Request, res: Response) => {
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
          : 65;
      const pendingFollowUps = rep.visitRecords.filter(
        (v) => v.followUp && v.followUp.trim() !== ''
      ).length;
      const weeklyTarget = rep.target?.weeklyClinicTarget ?? 20;
      let status = 'On Track';
      if (repVisitsThisWeek >= weeklyTarget) status = 'Excellent';
      else if (repVisitsToday < 2) status = 'Behind';

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
            ? Math.round((repVisitsThisWeek / (rep.assignedDoctors.length * 7)) * 100)
            : 0,
        status,
      };
    });

    const allScores = repBreakdown.map((r) => r.score);
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
