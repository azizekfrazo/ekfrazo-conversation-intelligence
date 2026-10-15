/**
 * Patch 3: Fix garbage notes + add 1 visit to push Arjun to Excellent status.
 */
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

function n(offsetHours = 0): string {
  return new Date(Date.now() - offsetHours * 3600_000).toISOString()
}

async function main() {
  // ── Task 3: Fix garbage notes on Dr. Anita Desai visit ───────────────────
  const result = await p.$executeRawUnsafe(
    `UPDATE "VisitRecord" SET notes = ? WHERE salesRepId = 'demo-rep-arjun' AND notes = 'adsfng'`,
    'Introduced GlucoShield Phase III renal data. Dr. Desai showed strong interest in comparative efficacy vs current formulary. Requested detailed dosing chart for her diabetology clinic.'
  )
  console.log(`✓ Fixed garbage notes (${result} row(s) updated)`)

  // ── Task 5: Add 1 visit to push Arjun to Excellent (need ≥20 for 22*0.9=20) ─
  const weekStart = n(720)
  const before = await p.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as cnt FROM "VisitRecord" WHERE salesRepId='demo-rep-arjun' AND date >= ?`, weekStart
  )
  const currentCount = Number(before[0].cnt)
  console.log(`Current weekly visits: ${currentCount}`)

  if (currentCount < 20) {
    const needed = 20 - currentCount
    for (let i = 0; i < needed; i++) {
      await p.$executeRawUnsafe(
        `INSERT INTO "VisitRecord" (id,salesRepId,doctorId,date,outcome,notes,followUp,createdAt) VALUES (?,?,?,?,?,?,?,?)`,
        `vr-arjun-top-${i + 1}`, 'demo-rep-arjun', 'dr-rajesh', n(36 + i * 12),
        'visited_offline',
        `Follow-up on Cardovix trial interest — confirmed formulary review scheduled`,
        i === 0 ? 'Confirm formulary submission deadline with access team' : null,
        n(36 + i * 12)
      )
    }
    console.log(`✓ Added ${needed} visit(s) → weekly count now 20 → Excellent`)
  } else {
    console.log('✓ Already at 20+ visits — no extra needed')
  }

  // ── Verify ────────────────────────────────────────────────────────────────
  const after = await p.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as cnt FROM "VisitRecord" WHERE salesRepId='demo-rep-arjun' AND date >= ?`, weekStart
  )
  const todayCount = await p.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as cnt FROM "VisitRecord" WHERE salesRepId='demo-rep-arjun' AND date >= ?`, n(24)
  )
  console.log(`\n── Verification ─────────────────────`)
  console.log(`  Weekly (30d) visits: ${Number(after[0].cnt)}  (need ≥20 for Excellent)`)
  console.log(`  Today visits:        ${Number(todayCount[0].cnt)}`)
  console.log('\n🎉 Patch 3 complete!')

  await p.$disconnect()
}

main().catch(e => { console.error('❌ Patch failed:', e.message ?? e); process.exit(1) })
