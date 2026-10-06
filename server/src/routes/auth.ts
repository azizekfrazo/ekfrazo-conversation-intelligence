import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email } = req.body as { email?: string }

    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      res.status(401).json({ success: false, error: 'Demo user not found. Run db:seed first.' })
      return
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        territory: user.territory,
      },
    })
  }),
)

router.get(
  '/demo',
  asyncHandler(async (_req, res) => {
    const user = await prisma.user.findFirst({ where: { role: 'REP' } })

    if (!user) {
      res.status(404).json({ success: false, error: 'No demo user found. Run db:seed first.' })
      return
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        territory: user.territory,
      },
    })
  }),
)

export default router
