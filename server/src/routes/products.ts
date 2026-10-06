import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

function parseProduct(p: {
  keyBenefits: string
  sideEffects: string
  differentiators: string
  competitorNames: string
  approvedClaims: string
  [key: string]: unknown
}) {
  return {
    ...p,
    keyBenefits: JSON.parse(p.keyBenefits),
    sideEffects: JSON.parse(p.sideEffects),
    differentiators: JSON.parse(p.differentiators),
    competitorNames: JSON.parse(p.competitorNames),
    approvedClaims: JSON.parse(p.approvedClaims),
  }
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({ orderBy: { productName: 'asc' } })
    res.json({ success: true, products: products.map(parseProduct) })
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' })
      return
    }
    res.json({ success: true, product: parseProduct(product) })
  }),
)

export default router
