import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
p.$queryRawUnsafe<any[]>(`SELECT id, doctorId, notes, outcome FROM "VisitRecord" WHERE salesRepId='demo-rep-arjun' AND notes IS NOT NULL ORDER BY date DESC LIMIT 20`)
  .then(rows => { console.log(JSON.stringify(rows, null, 2)); p.$disconnect() })
