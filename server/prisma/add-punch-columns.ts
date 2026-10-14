/**
 * Adds punch-in/out columns to VisitRecord without touching other tables.
 * Safer than `prisma db push --accept-data-loss` on a DB with mixed DateTime types.
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const columns = [
  'ALTER TABLE "VisitRecord" ADD COLUMN "punchInTime" TEXT',
  'ALTER TABLE "VisitRecord" ADD COLUMN "punchInLat" REAL',
  'ALTER TABLE "VisitRecord" ADD COLUMN "punchInLng" REAL',
  'ALTER TABLE "VisitRecord" ADD COLUMN "punchOutTime" TEXT',
  'ALTER TABLE "VisitRecord" ADD COLUMN "punchOutLat" REAL',
  'ALTER TABLE "VisitRecord" ADD COLUMN "punchOutLng" REAL',
  'ALTER TABLE "VisitRecord" ADD COLUMN "visitOutcome" TEXT',
  'ALTER TABLE "VisitRecord" ADD COLUMN "visitStatus" TEXT',
]

async function main() {
  for (const sql of columns) {
    const col = sql.match(/"(\w+)" \w+$/)?.[1]
    try {
      await prisma.$executeRawUnsafe(sql)
      console.log(`✓ Added column: ${col}`)
    } catch (e: any) {
      if (e.message?.includes('duplicate column name')) {
        console.log(`  - ${col}: already exists`)
      } else {
        throw e
      }
    }
  }

  const cols = await prisma.$queryRaw<Array<{ name: string }>>`PRAGMA table_info("VisitRecord")`
  const names = cols.map(c => c.name)
  console.log('\nVisitRecord columns:', names.join(', '))
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
