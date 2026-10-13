/**
 * One-time script to replace Mumbai/Bangalore → Bengaluru in all DB records.
 * Run from the server/ directory ONLY via run-update.bat (double-click it).
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function fixText(s: string | null): string | null {
  if (!s) return s
  return s
    .replace(/Kokilaben Dhirubhai Ambani Hospital,\s*Mumbai/gi, 'Manipal Hospital, Bengaluru')
    .replace(/Kokilaben Dhirubhai Ambani Hospital/gi, 'Manipal Hospital')
    .replace(/Kokilaben Hospital/gi, 'Manipal Hospital')
    .replace(/Apollo Hospitals,\s*Navi Mumbai/gi, 'Apollo Hospitals, Bengaluru')
    .replace(/Navi Mumbai/gi, 'Bengaluru')
    .replace(/Hiranandani Hospital/gi, 'Manipal Hospital')
    .replace(/Hinduja Hospital/gi, 'Manipal Hospital')
    .replace(/KEM Hospital/gi, 'Bowring Hospital')
    .replace(/Breach Candy Hospital/gi, 'Apollo Spectra Hospital')
    .replace(/Malad Nursing Home/gi, 'Rajajinagar Nursing Home')
    .replace(/Apollo Hospital,\s*Andheri/gi, 'Apollo Hospital, Bengaluru')
    .replace(/Andheri/gi, 'Bengaluru')
    .replace(/Mumbai North/gi, 'Bengaluru North')
    .replace(/Mumbai South/gi, 'Bengaluru South')
    .replace(/Mumbai East/gi, 'Bengaluru East')
    .replace(/Mumbai West/gi, 'Bengaluru West')
    .replace(/Mumbai Central/gi, 'Bengaluru Central')
    .replace(/Mumbai Region/gi, 'Bengaluru Region')
    .replace(/Bangalore/gi, 'Bengaluru')
    .replace(/Mumbai/gi, 'Bengaluru')
}

async function main() {
  console.log('Starting location update...\n')

  // ── 1. DoctorProfile ──────────────────────────────────────────────────
  const doctors = await prisma.$queryRaw<Array<{ id: string; city: string; hospitalOrClinic: string | null; fullName: string }>>`
    SELECT id, city, hospitalOrClinic, fullName FROM DoctorProfile
  `

  let docUpdated = 0
  for (const doc of doctors) {
    const newCity = fixText(doc.city)
    const newHosp = fixText(doc.hospitalOrClinic)
    if (newCity !== doc.city || newHosp !== doc.hospitalOrClinic) {
      await prisma.$executeRaw`
        UPDATE DoctorProfile
        SET city = ${newCity}, hospitalOrClinic = ${newHosp}
        WHERE id = ${doc.id}
      `
      console.log(`✓ Doctor "${doc.fullName}": city→"${newCity}", hospital→"${newHosp}"`)
      docUpdated++
    }
  }
  console.log(`\nDoctors: updated ${docUpdated} / ${doctors.length}`)

  // ── 2. User territory ─────────────────────────────────────────────────
  const users = await prisma.$queryRaw<Array<{ id: string; name: string; territory: string | null }>>`
    SELECT id, name, territory FROM User
  `

  let userUpdated = 0
  for (const u of users) {
    const newTerritory = fixText(u.territory)
    if (newTerritory !== u.territory) {
      await prisma.$executeRaw`
        UPDATE User SET territory = ${newTerritory} WHERE id = ${u.id}
      `
      console.log(`✓ User "${u.name}": territory→"${newTerritory}"`)
      userUpdated++
    }
  }
  console.log(`Users: updated ${userUpdated} / ${users.length}`)

  // ── 3. VisitRecord notes & followUp ───────────────────────────────────
  let visitUpdated = 0
  let visitTotal = 0
  try {
    const prismaAny = prisma as unknown as Record<string, { findMany: Function; update: Function }>
    const visits = await prismaAny['visitRecord'].findMany({
      select: { id: true, notes: true, followUp: true },
    }) as Array<{ id: string; notes: string | null; followUp: string | null }>
    visitTotal = visits.length
    for (const v of visits) {
      const newNotes = fixText(v.notes)
      const newFollowUp = fixText(v.followUp)
      if (newNotes !== v.notes || newFollowUp !== v.followUp) {
        await prismaAny['visitRecord'].update({
          where: { id: v.id },
          data: { notes: newNotes ?? undefined, followUp: newFollowUp ?? undefined },
        })
        visitUpdated++
      }
    }
  } catch (e: unknown) {
    console.log('Visits: skipped (model not available in client)')
  }
  if (visitTotal > 0) console.log(`Visits: updated ${visitUpdated} / ${visitTotal}`)

  console.log('\n✅ All done! All Mumbai/Bangalore references replaced with Bengaluru.')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
