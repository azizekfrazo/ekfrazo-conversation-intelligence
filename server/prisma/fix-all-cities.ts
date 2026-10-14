import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const doctors = await prisma.$queryRaw<Array<{
    id: string; fullName: string; city: string; hospitalOrClinic: string | null
  }>>`SELECT id, fullName, city, hospitalOrClinic FROM DoctorProfile`

  const hospFixes: [RegExp, string][] = [
    [/Jehangir Hospital,?\s*Pune/gi, 'Manipal Hospital, Bengaluru'],
    [/Jehangir Hospital/gi, 'Manipal Hospital'],
    [/Basavatarakam Indo American Cancer Hospital,?\s*Hyderabad/gi, 'Kidwai Memorial Institute of Oncology, Bengaluru'],
    [/Basavatarakam Indo American Cancer Hospital/gi, 'Kidwai Memorial Institute of Oncology'],
    [/Apollo Clinic,?\s*Chennai/gi, 'Apollo Clinic, Bengaluru'],
    [/Apollo Clinic,?\s*Pune/gi, 'Apollo Clinic, Bengaluru'],
    [/Sahyadri Hospital,?\s*Pune/gi, 'Manipal Hospital, Bengaluru'],
    [/Sahyadri Hospital/gi, 'Manipal Hospital'],
    [/Ruby Hall Clinic,?\s*Pune/gi, 'Manipal Hospital, Bengaluru'],
    [/Ruby Hall Clinic/gi, 'Manipal Hospital'],
    [/,\s*(Pune|Hyderabad|Chennai|Delhi|Kolkata|Ahmedabad|Mumbai|Bangalore)\b/gi, ', Bengaluru'],
  ]

  let updated = 0
  for (const doc of doctors) {
    const newCity = doc.city && doc.city !== 'Bengaluru' ? 'Bengaluru' : doc.city

    let newHosp = doc.hospitalOrClinic ?? ''
    for (const [pattern, replacement] of hospFixes) {
      newHosp = newHosp.replace(pattern, replacement)
    }
    if (!newHosp) newHosp = doc.hospitalOrClinic ?? ''

    if (newCity !== doc.city || newHosp !== (doc.hospitalOrClinic ?? '')) {
      await prisma.$executeRaw`
        UPDATE DoctorProfile
        SET city = ${newCity}, hospitalOrClinic = ${newHosp || null}
        WHERE id = ${doc.id}
      `
      console.log(`✓ ${doc.fullName}`)
      console.log(`    city: "${doc.city}" → "${newCity}"`)
      console.log(`    hosp: "${doc.hospitalOrClinic}" → "${newHosp}"`)
      updated++
    } else {
      console.log(`  - ${doc.fullName}: already correct`)
    }
  }

  console.log(`\nTotal updated: ${updated} / ${doctors.length}`)

  const final = await prisma.$queryRaw<Array<{
    fullName: string; city: string; hospitalOrClinic: string | null
  }>>`SELECT fullName, city, hospitalOrClinic FROM DoctorProfile ORDER BY fullName`

  console.log('\n=== FINAL STATE ===')
  final.forEach(d => console.log(`  ${d.fullName}: ${d.hospitalOrClinic ?? '—'}, ${d.city}`))

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
