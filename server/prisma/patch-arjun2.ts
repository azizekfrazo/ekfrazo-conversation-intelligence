/**
 * Patch 2 for Arjun:
 * - Reassign visits that were for dr-ananya to his 4 actual doctors
 * - Add 1 more visit today so daily count = 4 (crosses Excellent threshold)
 */
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

function n(offsetHours = 0): string {
  return new Date(Date.now() - offsetHours * 3600_000).toISOString()
}

async function main() {
  // ── 1. Reassign dr-ananya visits to actual 4 doctors ─────────────────────
  const actualDoctors = ['dr-rajesh', 'dr-vikram', 'dr-anita', 'dr-neha']

  const ananyaVisits = await p.$queryRawUnsafe<any[]>(
    `SELECT id FROM "VisitRecord" WHERE salesRepId='demo-rep-arjun' AND doctorId='dr-ananya' ORDER BY date ASC`
  )
  console.log(`Found ${ananyaVisits.length} visits for dr-ananya to reassign`)

  for (let i = 0; i < ananyaVisits.length; i++) {
    const newDoc = actualDoctors[i % actualDoctors.length]
    await p.$executeRawUnsafe(
      `UPDATE "VisitRecord" SET doctorId=? WHERE id=?`,
      newDoc, ananyaVisits[i].id
    )
  }
  console.log(`✓ Reassigned ${ananyaVisits.length} visits away from dr-ananya`)

  // Verify no dr-ananya visits remain for Arjun
  const remaining = await p.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as cnt FROM "VisitRecord" WHERE salesRepId='demo-rep-arjun' AND doctorId='dr-ananya'`
  )
  console.log(`  dr-ananya visits remaining: ${Number(remaining[0].cnt)} (expected: 0)`)

  // ── 2. Add 1 more visit today (15h ago fits "today" = last 24h) ───────────
  // Current today visits: 2h, 5h, 9h = 3. Need 4.
  // Check today's count first
  const todayStart = n(24)
  const todayCount = await p.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as cnt FROM "VisitRecord" WHERE salesRepId='demo-rep-arjun' AND date >= ?`, todayStart
  )
  const currentToday = Number(todayCount[0].cnt)
  console.log(`\nCurrent today visits: ${currentToday}`)

  if (currentToday < 4) {
    await p.$executeRawUnsafe(
      `INSERT INTO "VisitRecord" (id,salesRepId,doctorId,date,outcome,notes,followUp,createdAt) VALUES (?,?,?,?,?,?,?,?)`,
      `vr-arjun-extra-today`, 'demo-rep-arjun', 'dr-neha', n(1),
      'visited_offline',
      'Discussed Glytara endocrine safety profile — strong interest noted',
      'Send thyroid safety data summary from Glytara Phase III',
      n(1)
    )
    console.log('✓ Added 1 more visit today (1h ago) → daily count now 4')
  } else {
    console.log(`✓ Already at ${currentToday} today visits — no extra needed`)
  }

  // ── Verify final state ────────────────────────────────────────────────────
  const weekStart = n(720)
  const weekly = await p.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as cnt FROM "VisitRecord" WHERE salesRepId='demo-rep-arjun' AND date >= ?`, weekStart
  )
  const today2 = await p.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as cnt FROM "VisitRecord" WHERE salesRepId='demo-rep-arjun' AND date >= ?`, n(24)
  )
  const followUps = await p.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as cnt FROM "VisitRecord" WHERE salesRepId='demo-rep-arjun' AND followUp IS NOT NULL AND followUp != ''`
  )

  console.log('\n── Final verification ─────────────────────────')
  console.log(`  Weekly visits:   ${Number(weekly[0].cnt)}`)
  console.log(`  Today visits:    ${Number(today2[0].cnt)}  (expected: 4 → Excellent)`)
  console.log(`  Follow-ups:      ${Number(followUps[0].cnt)}`)
  console.log('\n🎉 Patch 2 complete!')

  await p.$disconnect()
}

main().catch(e => { console.error('❌ Patch failed:', e.message ?? e); process.exit(1) })
