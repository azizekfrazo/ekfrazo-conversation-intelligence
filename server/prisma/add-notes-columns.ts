import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const columns = [
  'ALTER TABLE "VisitRecord" ADD COLUMN "preNotes" TEXT',
  'ALTER TABLE "VisitRecord" ADD COLUMN "postNotes" TEXT',
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
