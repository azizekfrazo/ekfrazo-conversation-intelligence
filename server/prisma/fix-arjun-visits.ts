/**
 * Deletes the 10 most recent VisitRecords for Arjun Kapoor's SalesRep,
 * reducing his total weekly (30-day) count from 28 to 18.
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const reps = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT id, name FROM "SalesRep" WHERE name = 'Arjun Kapoor' LIMIT 1
  `
  if (!reps.length) throw new Error('Arjun Kapoor SalesRep not found')
  const repId = reps[0].id
  console.log(`Arjun SalesRep id: ${repId}`)

  const before = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*) as cnt FROM "VisitRecord" WHERE salesRepId = ${repId}
  `
  console.log(`Current visit count: ${Number(before[0].cnt)}`)

  // Get the 10 most recent visits
  const toDelete = await prisma.$queryRaw<Array<{ id: string; date: string }>>`
    SELECT id, date FROM "VisitRecord"
    WHERE salesRepId = ${repId}
    ORDER BY date DESC
    LIMIT 10
  `
  console.log(`\nDeleting ${toDelete.length} most recent visits:`)
  for (const v of toDelete) {
    console.log(`  - ${v.date}`)
    await prisma.$executeRaw`DELETE FROM "VisitRecord" WHERE id = ${v.id}`
  }

  const after = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*) as cnt FROM "VisitRecord" WHERE salesRepId = ${repId}
  `
  console.log(`\n✓ Remaining visits: ${Number(after[0].cnt)}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
