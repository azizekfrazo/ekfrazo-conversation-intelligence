import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const updates = [
    { name: 'Arjun', territory: 'Bengaluru North' },
    { name: 'Priya', territory: 'Bengaluru South' },
    { name: 'Ravi', territory: 'Bengaluru East' },
    { name: 'Meena', territory: 'Bengaluru West' },
    { name: 'Suresh', territory: 'Bengaluru Central' },
  ]

  for (const u of updates) {
    // Use raw SQL to bypass the corrupted updatedAt column
    const result = await prisma.$executeRaw`
      UPDATE User SET territory = ${u.territory}
      WHERE name LIKE ${'%' + u.name + '%'}
    `
    console.log(`✓ ${u.name} → ${u.territory} (rows: ${result})`)
  }

  const users = await prisma.$queryRaw<Array<{ name: string; territory: string | null }>>`
    SELECT name, territory FROM User
  `
  console.log('\nCurrent territories:')
  users.forEach(u => console.log(`  ${u.name}: ${u.territory ?? '—'}`))

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
