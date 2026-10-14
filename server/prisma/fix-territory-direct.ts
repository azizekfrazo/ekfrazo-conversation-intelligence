import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function fixTable(table: 'SalesRep' | 'User') {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; name: string; territory: string | null }>>(
    `SELECT id, name, territory FROM "${table}"`
  )

  const fixTerritory = (t: string | null): string | null => {
    if (!t) return t
    if (t.includes('Bengaluru')) return t
    if (/Mumbai North/i.test(t)) return 'Bengaluru North'
    if (/Mumbai South/i.test(t)) return 'Bengaluru South'
    if (/Mumbai East/i.test(t)) return 'Bengaluru East'
    if (/Mumbai West/i.test(t)) return 'Bengaluru West'
    if (/Mumbai Central/i.test(t)) return 'Bengaluru Central'
    if (/Mumbai/i.test(t)) return 'Bengaluru'
    if (/^Pune$/i.test(t.trim())) return 'Bengaluru East'
    if (/Pune/i.test(t)) return 'Bengaluru East'
    if (/Delhi/i.test(t)) return 'Bengaluru West'
    if (/Chennai/i.test(t)) return 'Bengaluru South'
    if (/Hyderabad/i.test(t)) return 'Bengaluru Central'
    if (/Bangalore/i.test(t)) return t.replace(/Bangalore/gi, 'Bengaluru')
    return t
  }

  let updated = 0
  for (const row of rows) {
    const newTerritory = fixTerritory(row.territory)
    if (newTerritory !== row.territory) {
      await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET territory = ? WHERE id = ?`,
        newTerritory,
        row.id
      )
      console.log(`  ✓ ${row.name}: "${row.territory}" → "${newTerritory}"`)
      updated++
    } else {
      console.log(`  - ${row.name}: "${row.territory}" (ok)`)
    }
  }
  console.log(`  ${updated} updated / ${rows.length} total\n`)
}

async function main() {
  console.log('=== Fixing SalesRep territories ===')
  await fixTable('SalesRep')

  console.log('=== Fixing User territories ===')
  await fixTable('User')

  console.log('=== Final SalesRep ===')
  const reps = await prisma.$queryRaw<Array<{ name: string; territory: string | null }>>`SELECT name, territory FROM "SalesRep"`
  reps.forEach(r => console.log(`  ${r.name}: "${r.territory ?? '—'}"`)  )

  console.log('\n=== Final User ===')
  const users = await prisma.$queryRaw<Array<{ name: string; territory: string | null }>>`SELECT name, territory FROM "User"`
  users.forEach(u => console.log(`  ${u.name}: "${u.territory ?? '—'}"`)  )

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
