/**
 * seed-demo.ts
 * Run: cd server && npx ts-node prisma/seed-demo.ts
 *
 * Additive seed — does NOT wipe existing data.
 * 1. Updates hospital names for all 5 doctors to match requested values
 * 2. Bulk-adds practice sessions so each doctor reaches 9-10 total
 * 3. Bulk-adds post-call analyses so each doctor reaches 4-5 total
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── helpers ──────────────────────────────────────────────────────────────────

function randFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  seed-demo.ts starting...\n')

  // ── 1. Find the demo user ─────────────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { email: 'arjun.kapoor@ekfrazo.com' },
  })
  if (!user) throw new Error('Demo user not found. Run the main seed first: npm run db:seed')
  console.log(`✅  Demo user: ${user.name} (${user.id})`)

  // ── 2. Fetch all doctors ──────────────────────────────────────────────────
  const doctors = await prisma.doctorProfile.findMany({
    where: { userId: user.id },
    include: { _count: { select: { practiceSessions: true, postCallAnalyses: true } } },
  })
  if (doctors.length === 0) throw new Error('No doctors found. Run the main seed first: npm run db:seed')

  const byName = (name: string) => {
    const d = doctors.find((doc) => doc.fullName === name)
    if (!d) throw new Error(`Doctor not found: ${name}`)
    return d
  }

  const drAnanya = byName('Dr. Ananya Krishnamurti')
  const drRajesh = byName('Dr. Rajesh Mehta')
  const drPriya  = byName('Dr. Priya Sharma')
  const drVikram = byName('Dr. Vikram Nair')
  const drMeera  = byName('Dr. Meera Patel')

  // ── 3. Update hospital names ──────────────────────────────────────────────
  const hospitalUpdates: Array<{ id: string; name: string; hospital: string }> = [
    { id: drAnanya.id, name: 'Dr. Ananya Krishnamurti', hospital: 'Manipal Hospital, Bengaluru' },
    { id: drPriya.id,  name: 'Dr. Priya Sharma',        hospital: 'Basavatarakam Indo American Cancer Hospital, Bengaluru' },
    { id: drVikram.id, name: 'Dr. Vikram Nair',         hospital: 'Manipal Hospitals, Bengaluru' },
    { id: drMeera.id,  name: 'Dr. Meera Patel',         hospital: 'Apollo Clinic, Bengaluru' },
    { id: drRajesh.id, name: 'Dr. Rajesh Mehta',        hospital: 'Jehangir Hospital, Bengaluru' },
  ]
  for (const { id, name, hospital } of hospitalUpdates) {
    await prisma.doctorProfile.update({ where: { id }, data: { hospitalOrClinic: hospital } })
    console.log(`   ✏️  Updated hospital → ${name}: ${hospital}`)
  }
  console.log('✅  Hospital names updated\n')

  // ── 4. Bulk-add practice sessions ─────────────────────────────────────────

  const difficulties = ['Easy', 'Medium', 'Hard'] as const
  const objFocuses = [
    'Efficacy', 'Safety', 'SideEffects', 'Cost',
    'CompetitorComparison', 'PatientAdherence',
  ] as const

  type Difficulty   = (typeof difficulties)[number]
  type ObjFocus     = (typeof objFocuses)[number]

  interface SessionSpec {
    doctorId: string
    targetTotal: number
    current: number
    scoreSeed: [number, number]  // [min, max] for heuristic scores
    difficultyWeights: [Difficulty, number][]
    objWeights: [ObjFocus, number][]
  }

  const sessionSpecs: SessionSpec[] = [
    {
      doctorId: drAnanya.id, targetTotal: 10, current: drAnanya._count.practiceSessions,
      scoreSeed: [68, 88],
      difficultyWeights: [['Medium', 2], ['Hard', 2], ['Easy', 1]],
      objWeights: [['Efficacy', 3], ['CompetitorComparison', 2], ['Safety', 2], ['Cost', 1]],
    },
    {
      doctorId: drRajesh.id, targetTotal: 10, current: drRajesh._count.practiceSessions,
      scoreSeed: [70, 90],
      difficultyWeights: [['Easy', 2], ['Medium', 2], ['Hard', 1]],
      objWeights: [['Cost', 3], ['PatientAdherence', 2], ['SideEffects', 1], ['Efficacy', 1]],
    },
    {
      doctorId: drPriya.id,  targetTotal: 9,  current: drPriya._count.practiceSessions,
      scoreSeed: [60, 85],
      difficultyWeights: [['Hard', 3], ['Medium', 2], ['Easy', 1]],
      objWeights: [['Efficacy', 3], ['Safety', 2], ['CompetitorComparison', 3], ['SideEffects', 1]],
    },
    {
      doctorId: drVikram.id, targetTotal: 10, current: drVikram._count.practiceSessions,
      scoreSeed: [65, 87],
      difficultyWeights: [['Medium', 2], ['Hard', 2], ['Easy', 1]],
      objWeights: [['CompetitorComparison', 3], ['Safety', 2], ['Efficacy', 2], ['PatientAdherence', 1]],
    },
    {
      doctorId: drMeera.id,  targetTotal: 8,  current: drMeera._count.practiceSessions,
      scoreSeed: [72, 92],
      difficultyWeights: [['Easy', 2], ['Medium', 2], ['Hard', 1]],
      objWeights: [['SideEffects', 2], ['PatientAdherence', 2], ['Cost', 2], ['Efficacy', 1]],
    },
  ]

  function pickWeighted<T>(weights: [T, number][]): T {
    const total = weights.reduce((s, [, w]) => s + w, 0)
    let r = Math.random() * total
    for (const [val, w] of weights) { r -= w; if (r <= 0) return val }
    return weights[0][0]
  }

  function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  function buildDemoReport(
    score: number,
    difficulty: Difficulty,
    objFocus: ObjFocus,
  ) {
    const objLabels: Record<ObjFocus, string> = {
      Efficacy: 'efficacy objection',
      Safety: 'safety concern',
      SideEffects: 'side-effects concern',
      Cost: 'cost/affordability objection',
      CompetitorComparison: 'competitor comparison',
      PatientAdherence: 'patient adherence objection',
    }
    const grade = score >= 85 ? 'strong' : score >= 72 ? 'solid' : 'developing'
    return {
      summary: `${grade.charAt(0).toUpperCase() + grade.slice(1)} session on a ${difficulty.toLowerCase()} ${objLabels[objFocus]} scenario. Overall score ${score}/100.`,
      strengths: JSON.stringify([
        'Maintained professional tone throughout the session',
        'Cited approved clinical data to support key claims',
        'Listened actively before responding to objections',
      ]),
      weakMoments: JSON.stringify([
        score < 75 ? 'Response to opening objection lacked specificity — needs data anchor' : 'Could have led with efficacy before pivoting to safety differentiation',
        'Closing was not tied to a concrete next step',
      ]),
      missedOpportunities: JSON.stringify([
        'Did not offer to connect the doctor with the patient access coordinator',
        'Follow-up meeting was not confirmed before ending session',
      ]),
      objectionHandlingScore: Math.min(100, score + randInt(-5, 5)),
      clarityScore:           Math.min(100, score + randInt(-4, 6)),
      confidenceScore:        Math.min(100, score + randInt(-6, 4)),
      complianceScore:        Math.min(100, 85 + randInt(0, 15)),
      improvements: JSON.stringify([
        `Practice responding to ${objLabels[objFocus]} with a data-first structure: anchor → differentiate → close.`,
        'Always end with a concrete next step — sample pack, follow-up date, or access coordinator intro.',
      ]),
      nextPractice: JSON.stringify([
        `Run a Hard difficulty ${objLabels[objFocus]} scenario to build resilience`,
        'Combine two objection types (cost + competitor) in a single session',
        'Practice the full call arc from greeting through close without stopping',
      ]),
    }
  }

  let totalSessionsAdded = 0
  for (const spec of sessionSpecs) {
    const toAdd = Math.max(0, spec.targetTotal - spec.current)
    if (toAdd === 0) {
      console.log(`   ⏭️  ${spec.doctorId.slice(0, 8)}… already at ${spec.current} sessions — skipping`)
      continue
    }
    for (let i = 0; i < toAdd; i++) {
      const difficulty  = pickWeighted(spec.difficultyWeights)
      const objFocus    = pickWeighted(spec.objWeights)
      const duration    = randInt(180, 520)
      const score       = randInt(spec.scoreSeed[0], spec.scoreSeed[1])
      const createdAt   = daysAgo(randInt(1, 90))

      const session = await prisma.practiceSession.create({
        data: {
          difficulty,
          objectionFocus: objFocus,
          status: 'completed',
          durationSeconds: duration,
          doctorId: spec.doctorId,
          userId: user.id,
          createdAt,
          updatedAt: createdAt,
        },
      })

      // Minimal turns so the session record is coherent
      await prisma.practiceTurn.createMany({
        data: [
          { role: 'doctor', content: 'Good morning. You have a few minutes — what is your key message today?', sessionId: session.id, timestamp: new Date(createdAt.getTime() + 5000) },
          { role: 'rep',    content: 'Good morning. I wanted to discuss the clinical data and patient access options.', sessionId: session.id, timestamp: new Date(createdAt.getTime() + 20000) },
          { role: 'doctor', content: 'I have concerns. Let\'s address them.', sessionId: session.id, timestamp: new Date(createdAt.getTime() + 35000) },
          { role: 'rep',    content: 'Of course. The published trial data directly addresses those points.', sessionId: session.id, timestamp: new Date(createdAt.getTime() + 55000) },
        ],
      })

      const reportData = buildDemoReport(score, difficulty, objFocus)
      await prisma.practiceReport.create({
        data: { ...reportData, sessionId: session.id },
      })

      totalSessionsAdded++
    }
    const newTotal = spec.current + toAdd
    console.log(`   ✅  Doctor ${spec.doctorId.slice(0, 8)}… : added ${toAdd} sessions → total ${newTotal}`)
  }
  console.log(`\n✅  Practice sessions: +${totalSessionsAdded} added\n`)

  // ── 5. Bulk-add post-call analyses ────────────────────────────────────────

  interface AnalysisSpec {
    doctorId: string
    targetTotal: number
    current: number
    product: string
    therapyArea: string
    competitor: string
  }

  const analysisSpecs: AnalysisSpec[] = [
    { doctorId: drAnanya.id, targetTotal: 4, current: drAnanya._count.postCallAnalyses, product: 'Cardovix 10mg', therapyArea: 'Cardiology', competitor: 'Amiodarex' },
    { doctorId: drRajesh.id, targetTotal: 4, current: drRajesh._count.postCallAnalyses, product: 'Glytara 1mg',   therapyArea: 'Endocrinology', competitor: 'Ozalide' },
    { doctorId: drPriya.id,  targetTotal: 5, current: drPriya._count.postCallAnalyses,  product: 'Nexovir 25mg', therapyArea: 'Oncology',      competitor: 'Gefitex' },
    { doctorId: drVikram.id, targetTotal: 4, current: drVikram._count.postCallAnalyses, product: 'Alzara 5mg',   therapyArea: 'Neurology',     competitor: 'Memorex' },
    { doctorId: drMeera.id,  targetTotal: 6, current: drMeera._count.postCallAnalyses,  product: 'Glytara 1mg',  therapyArea: 'Endocrinology', competitor: 'Ozalide' },
  ]

  const callOutcomes = [
    'Cautiously interested — agreed to review literature',
    'Follow-up appointment secured',
    'Requested additional clinical data before prescribing',
    'Agreed to trial 3 patients with samples',
    'Neutral — needs another visit to advance',
  ]

  let totalAnalysesAdded = 0
  for (const spec of analysisSpecs) {
    const toAdd = Math.max(0, spec.targetTotal - spec.current)
    if (toAdd === 0) {
      console.log(`   ⏭️  ${spec.doctorId.slice(0, 8)}… already at ${spec.current} analyses — skipping`)
      continue
    }
    for (let i = 0; i < toAdd; i++) {
      const daysBack = randInt(5, 120)
      const outcome  = callOutcomes[i % callOutcomes.length]
      const createdAt = daysAgo(daysBack)

      // Create a transcript first (required for analysis)
      const transcript = await prisma.meetingTranscript.create({
        data: {
          title: `${spec.product} Discussion — Call ${i + 1}`,
          isDemo: true,
          doctorId: spec.doctorId,
          createdAt,
          content: [
            `REP: Good morning. Thank you for seeing me today.`,
            `DR: You have five minutes. What's the message?`,
            `REP: I wanted to update you on the latest ${spec.product} data and address your concerns about ${spec.competitor}.`,
            `DR: I've been happy with ${spec.competitor}. What specifically makes ${spec.product} worth considering?`,
            `REP: The head-to-head data shows a meaningful clinical difference in the endpoints that matter most to your patients.`,
            `DR: What about side effects and long-term safety? That's always my priority.`,
            `REP: Understood. The Phase III safety profile compares favorably — let me share the key data points.`,
            `DR: ${outcome}.`,
          ].join('\n'),
        },
      })

      await prisma.postCallAnalysis.create({
        data: {
          doctorId: spec.doctorId,
          userId: user.id,
          transcriptId: transcript.id,
          createdAt,
          summary: `Discussion focused on ${spec.product} differentiation vs ${spec.competitor} in ${spec.therapyArea}. Outcome: ${outcome}.`,
          doctorConcerns: JSON.stringify([
            `Long-term safety data vs ${spec.competitor}`,
            'Patient affordability and access program availability',
            'Monitoring burden in a busy practice',
            'Adherence data in real-world patients',
          ]),
          wentWell: JSON.stringify([
            'Opened with the clinical benefit most relevant to this doctor\'s patient population',
            'Cited specific trial data to support differentiation claims',
            'Acknowledged legitimate concerns about established competitor without being defensive',
          ]),
          couldImprove: JSON.stringify([
            'Did not proactively offer patient access program details early enough',
            'Could have secured a firmer next step at the end of the call',
          ]),
          missedMoments: JSON.stringify([
            `When the doctor mentioned ${spec.competitor} — ideal moment to pivot to head-to-head data`,
            'Could have offered a peer publication at the point of highest engagement',
          ]),
          doctorIntent: `${outcome}. Continued follow-up recommended with stronger clinical evidence focus.`,
          nextBestActions: JSON.stringify([
            'Email the relevant trial publication today',
            'Schedule a follow-up in 2 weeks with updated patient access program details',
            'Connect the clinic with the access coordinator for formulary check',
          ]),
          followUpEmail: `Subject: ${spec.product} — Follow-Up from Today's Visit\n\nDear Doctor,\n\nThank you for your time today. As discussed, I am sharing the key clinical data for ${spec.product}.\n\nI look forward to our next conversation.\n\nBest regards,\nArjun Kapoor\nEkfrazo Technologies`,
          crmNotes: `PRODUCT: ${spec.product} | COMPETITOR: ${spec.competitor} | OUTCOME: ${outcome} | NEXT: Follow-up in 2 weeks`,
          coachingSummary: `Rep demonstrated good product knowledge. Focus area: securing concrete next steps and earlier introduction of access program benefits.`,
        },
      })

      totalAnalysesAdded++
    }
    const newTotal = spec.current + toAdd
    console.log(`   ✅  Doctor ${spec.doctorId.slice(0, 8)}… : added ${toAdd} analyses → total ${newTotal}`)
  }
  console.log(`\n✅  Post-call analyses: +${totalAnalysesAdded} added\n`)

  // ── 6. Follow-Up Actions ──────────────────────────────────────────────────
  const followUpSpecs = [
    {
      doctorId: 'cmqupy79o0006qx863lso91uo',  // Dr. Ananya Krishnamurti
      tasks: [
        { task: 'Email the NeuroShield Phase III summary paper to Dr. Krishnamurti', status: 'pending' },
        { task: 'Schedule follow-up call to discuss migraine patient case cluster', status: 'done', completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      ],
    },
    {
      doctorId: 'cmqupy79w0008qx869uaqeyps',  // Dr. Rajesh Mehta
      tasks: [
        { task: 'Share GlucoBalance cost-benefit comparison versus competitor sulfonylureas', status: 'pending' },
        { task: 'Connect Dr. Mehta with patient access coordinator for formulary check', status: 'pending' },
      ],
    },
    {
      doctorId: 'cmqupy7a4000aqx86v918dvtj',  // Dr. Priya Sharma
      tasks: [
        { task: 'Send CardioGuard head-to-head trial data versus Atorvastatin 40mg', status: 'done', completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        { task: 'Arrange peer-to-peer webinar invitation for Dr. Sharma from the CardioGuard KOL panel', status: 'pending' },
      ],
    },
  ]

  let followUpCount = 0
  for (const spec of followUpSpecs) {
    const existing = await prisma.followUpAction.count({ where: { doctorId: spec.doctorId } })
    if (existing > 0) {
      console.log(`   ⏭  Follow-ups for ${spec.doctorId.slice(0, 8)}… already seeded`)
      continue
    }
    for (const t of spec.tasks) {
      await prisma.followUpAction.create({
        data: {
          doctorId: spec.doctorId,
          task: t.task,
          status: t.status,
          completedAt: t.status === 'done' ? (t as { completedAt?: Date }).completedAt ?? new Date() : null,
        },
      })
      followUpCount++
    }
  }
  console.log(`\n✅  Follow-up actions: +${followUpCount} added\n`)

  // ── 7. Summary ────────────────────────────────────────────────────────────
  const finalCounts = await prisma.doctorProfile.findMany({
    where: { userId: user.id },
    select: {
      fullName: true,
      hospitalOrClinic: true,
      _count: { select: { practiceSessions: true, postCallAnalyses: true } },
    },
  })

  console.log('─'.repeat(72))
  console.log('FINAL STATE')
  console.log('─'.repeat(72))
  let totalSessions = 0, totalAnalyses = 0
  for (const d of finalCounts) {
    const s = d._count.practiceSessions
    const a = d._count.postCallAnalyses
    totalSessions += s; totalAnalyses += a
    console.log(`  ${d.fullName.padEnd(34)} ${String(s).padStart(2)} sessions  ${String(a).padStart(2)} analyses  ${d.hospitalOrClinic}`)
  }
  console.log('─'.repeat(72))
  console.log(`  ${'TOTAL'.padEnd(34)} ${String(totalSessions).padStart(2)} sessions  ${String(totalAnalyses).padStart(2)} analyses`)
  console.log('─'.repeat(72))
  console.log('\n🎉  seed-demo.ts complete!\n')
}

main()
  .catch((e) => { console.error('❌ seed-demo failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
