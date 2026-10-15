import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
p.$executeRawUnsafe(
  `UPDATE "VisitRecord" SET notes=? WHERE id='visit-1792053475753-ep8fvc'`,
  'Introduced GlucoShield Phase III renal data. Dr. Desai showed strong interest in comparative efficacy vs current formulary. Requested detailed dosing chart for her diabetology clinic.'
).then(n => { console.log(`✓ Updated ${n} row(s)`); p.$disconnect() })
