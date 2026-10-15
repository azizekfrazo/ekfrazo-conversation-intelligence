/**
 * Targeted patch for Arjun's demo data only.
 * Fixes: SalesRep email linkage, doctors (4 specific), targets, follow-ups.
 */
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

function n(offsetHours = 0): string {
  return new Date(Date.now() - offsetHours * 3600_000).toISOString()
}

async function main() {
  // ── 1. Fix SalesRep email to match User email ─────────────────────────────
  // User email: arjun.kapoor@ekfrazo.com
  // SalesRep email was: arjun@ekfrazo.demo  ← breaks auth lookup
  await p.$executeRawUnsafe(
    `UPDATE "SalesRep" SET email = 'arjun.kapoor@ekfrazo.com' WHERE id = 'demo-rep-arjun'`
  )
  console.log('✓ Fixed SalesRep email → arjun.kapoor@ekfrazo.com')

  // ── 2. Update/create the 4 specific doctors ───────────────────────────────
  // Dr. Rajesh Mehta → Cardiologist → Apollo Hospital, Bengaluru
  await p.$executeRawUnsafe(
    `UPDATE "DoctorProfile" SET specialty='Cardiology', hospitalOrClinic='Apollo Hospital, Bengaluru', personaType='PriceSensitive', therapyArea='Cardiology', updatedAt=? WHERE id='dr-rajesh'`,
    n()
  )
  console.log('✓ Updated Dr. Rajesh Mehta → Cardiologist, Apollo Hospital')

  // Dr. Vikram Nair → General Physician → Rajajinagar Nursing Home
  await p.$executeRawUnsafe(
    `UPDATE "DoctorProfile" SET specialty='General Physician', hospitalOrClinic='Rajajinagar Nursing Home, Bengaluru', personaType='BrandLoyal', therapyArea='General Medicine', updatedAt=? WHERE id='dr-vikram'`,
    n()
  )
  console.log('✓ Updated Dr. Vikram Nair → General Physician, Rajajinagar Nursing Home')

  // Dr. Anita Desai → Diabetologist → Manipal Hospital (new)
  // First check if she already exists
  const anitaRows = await p.$queryRawUnsafe<any[]>(
    `SELECT id FROM "DoctorProfile" WHERE fullName='Dr. Anita Desai' LIMIT 1`
  )
  const anitaId = anitaRows[0]?.id ?? 'dr-anita'
  if (!anitaRows.length) {
    await p.$executeRawUnsafe(
      `INSERT INTO "DoctorProfile" (id,userId,fullName,specialty,city,hospitalOrClinic,personaType,seniorityLevel,therapyArea,targetProduct,likelyConcerns,competitorPreference,lastInteractionDate,notes,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      anitaId, 'demo-user-1', 'Dr. Anita Desai', 'Diabetology', 'Bengaluru',
      'Manipal Hospital, Bengaluru', 'EvidenceDriven', 'MidLevel', 'Endocrinology', 'prod-glytara',
      JSON.stringify(['HbA1c targets', 'Injectable burden', 'MACE benefit evidence', 'Affordability']),
      'Ozalide', n(96), 'Strong evidence-first approach. Prefers peer-reviewed data.',
      n(10), n()
    )
    console.log('✓ Created Dr. Anita Desai → Diabetologist, Manipal Hospital')
  } else {
    await p.$executeRawUnsafe(
      `UPDATE "DoctorProfile" SET specialty='Diabetology', hospitalOrClinic='Manipal Hospital, Bengaluru', city='Bengaluru', updatedAt=? WHERE id=?`,
      n(), anitaId
    )
    console.log('✓ Updated Dr. Anita Desai')
  }

  // Dr. Neha Joshi → Endocrinologist → Manipal Hospital (new)
  const nehaRows = await p.$queryRawUnsafe<any[]>(
    `SELECT id FROM "DoctorProfile" WHERE fullName='Dr. Neha Joshi' LIMIT 1`
  )
  const nehaId = nehaRows[0]?.id ?? 'dr-neha'
  if (!nehaRows.length) {
    await p.$executeRawUnsafe(
      `INSERT INTO "DoctorProfile" (id,userId,fullName,specialty,city,hospitalOrClinic,personaType,seniorityLevel,therapyArea,targetProduct,likelyConcerns,competitorPreference,lastInteractionDate,notes,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      nehaId, 'demo-user-1', 'Dr. Neha Joshi', 'Endocrinology', 'Bengaluru',
      'Manipal Hospital, Bengaluru', 'Skeptical', 'Senior', 'Endocrinology', 'prod-glytara',
      JSON.stringify(['Long-term endocrine safety', 'Thyroid effects', 'Weight management data', 'Competitor switching']),
      'Semafort', n(72), 'Academic endocrinologist. Always probes for mechanism-level data.',
      n(8), n()
    )
    console.log('✓ Created Dr. Neha Joshi → Endocrinologist, Manipal Hospital')
  } else {
    await p.$executeRawUnsafe(
      `UPDATE "DoctorProfile" SET specialty='Endocrinology', hospitalOrClinic='Manipal Hospital, Bengaluru', city='Bengaluru', updatedAt=? WHERE id=?`,
      n(), nehaId
    )
    console.log('✓ Updated Dr. Neha Joshi')
  }

  // ── 3. Fix Arjun's DoctorAssignments (clear + reassign to 4 doctors) ─────
  await p.$executeRawUnsafe(
    `DELETE FROM "DoctorAssignment" WHERE salesRepId = 'demo-rep-arjun'`
  )
  const arjunAssignments: [string, string][] = [
    ['dr-rajesh', 'Bengaluru North'],
    ['dr-vikram',  'Bengaluru North'],
    [anitaId,     'Bengaluru North'],
    [nehaId,      'Bengaluru North'],
  ]
  for (const [docId, area] of arjunAssignments) {
    const assignId = `asgn-arjun-${docId.slice(-6)}`
    await p.$executeRawUnsafe(
      `INSERT OR REPLACE INTO "DoctorAssignment" (id,salesRepId,doctorId,area,assignedAt) VALUES (?,?,?,?,?)`,
      assignId, 'demo-rep-arjun', docId, area, n()
    )
  }
  console.log('✓ Reassigned 4 doctors to Arjun')

  // ── 4. Update Arjun's targets: daily=6, weekly=22 ────────────────────────
  await p.$executeRawUnsafe(
    `UPDATE "RepTarget" SET dailyVisitTarget=6, weeklyClinicTarget=22 WHERE salesRepId='demo-rep-arjun'`
  )
  console.log('✓ Targets updated → daily=6, weekly=22')

  // ── 5. Add followUp text to 9 of Arjun's visit records ───────────────────
  // Check if followUp column exists
  const cols = await p.$queryRawUnsafe<any[]>(`PRAGMA table_info("VisitRecord")`)
  const hasFollowUp = cols.some((c: any) => c.name === 'followUp')
  if (!hasFollowUp) {
    await p.$executeRawUnsafe(`ALTER TABLE "VisitRecord" ADD COLUMN "followUp" TEXT`)
    console.log('✓ Added followUp column to VisitRecord')
  }

  // Get 9 of Arjun's visits to attach follow-up tasks to
  const arjunVisits = await p.$queryRawUnsafe<any[]>(
    `SELECT id, doctorId FROM "VisitRecord" WHERE salesRepId='demo-rep-arjun' ORDER BY date DESC LIMIT 9`
  )

  const followUpTasks = [
    'Send AFFIRM-3 safety summary via email',
    'Confirm appointment for follow-up next Thursday',
    'Share patient support program brochure',
    'Send comparative monitoring protocol document',
    'Follow up on trial interest — schedule sample request',
    'Provide HbA1c outcome case study',
    'Send Glytara adherence data sheet',
    'Confirm formulary status with access coordinator',
    'Share KOL speaker event invite for Dec 15',
  ]

  for (let i = 0; i < arjunVisits.length; i++) {
    await p.$executeRawUnsafe(
      `UPDATE "VisitRecord" SET followUp=? WHERE id=?`,
      followUpTasks[i], arjunVisits[i].id
    )
  }
  console.log(`✓ Added followUp text to ${arjunVisits.length} visits`)

  // ── 6. Verify final counts ────────────────────────────────────────────────
  const weekStart = n(720) // 30-day window same as salesreps.ts
  const weeklyCount = await p.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as cnt FROM "VisitRecord" WHERE salesRepId='demo-rep-arjun' AND date >= ?`, weekStart
  )
  const followUpCount = await p.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as cnt FROM "VisitRecord" WHERE salesRepId='demo-rep-arjun' AND followUp IS NOT NULL AND followUp != ''`
  )
  const assignments = await p.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as cnt FROM "DoctorAssignment" WHERE salesRepId='demo-rep-arjun'`
  )
  const target = await p.$queryRawUnsafe<any[]>(
    `SELECT dailyVisitTarget, weeklyClinicTarget FROM "RepTarget" WHERE salesRepId='demo-rep-arjun'`
  )
  const repEmail = await p.$queryRawUnsafe<any[]>(
    `SELECT email FROM "SalesRep" WHERE id='demo-rep-arjun'`
  )

  console.log('\n── Verification ──────────────────────────────')
  console.log(`  SalesRep email:  ${repEmail[0]?.email}`)
  console.log(`  Weekly visits:   ${Number(weeklyCount[0].cnt)}  (expected: 18)`)
  console.log(`  Pending followups: ${Number(followUpCount[0].cnt)}  (expected: 9)`)
  console.log(`  Assigned doctors:  ${Number(assignments[0].cnt)}  (expected: 4)`)
  console.log(`  Daily target:   ${target[0]?.dailyVisitTarget}  (expected: 6)`)
  console.log(`  Weekly target:  ${target[0]?.weeklyClinicTarget}  (expected: 22)`)
  console.log('\n🎉 Arjun patch complete!')

  await p.$disconnect()
}

main().catch(e => { console.error('❌ Patch failed:', e.message ?? e); process.exit(1) })
