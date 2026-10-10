// @ts-nocheck
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/assignments — all assignments with rep+doctor info
router.get('/', async (req: Request, res: Response) => {
  try {
    const assignments = await prisma.doctorAssignment.findMany({
      include: {
        salesRep: { select: { id: true, name: true, territory: true, avatarColor: true } },
        doctor: { select: { id: true, fullName: true, specialty: true, hospitalOrClinic: true, area: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// POST /api/assignments — assign a doctor to a rep
router.post('/', async (req: Request, res: Response) => {
  try {
    const { salesRepId, doctorId, area } = req.body;
    if (!salesRepId || !doctorId) {
      return res.status(400).json({ error: 'salesRepId and doctorId required' });
    }
    const assignment = await prisma.doctorAssignment.create({
      data: { salesRepId, doctorId, area },
      include: {
        salesRep: { select: { id: true, name: true } },
        doctor: { select: { id: true, fullName: true } },
      },
    });
    res.json(assignment);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Doctor already assigned to this rep' });
    }
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// DELETE /api/assignments/:id — unassign
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.doctorAssignment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

export default router;
