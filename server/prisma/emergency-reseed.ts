/**
 * Emergency raw-SQL reseed.
 * Uses ISO-string timestamps so Prisma ORM can read them back.
 */
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

function n(offsetHours = 0): string {
  return new Date(Date.now() - offsetHours * 3600_000).toISOString()
}

async function main() {
  // ── Wipe in FK-safe order ─────────────────────────────────────────────────
  const tables = [
    'Message', 'ConversationThread', 'Note',
    'PracticeReport', 'PracticeTurn', 'PostCallAnalysis', 'MeetingTranscript',
    'PracticeSession', 'Battlecard',
    'VisitRecord', 'DoctorAssignment', 'RepTarget',
    'DoctorProfile', 'Product', 'SalesRep', 'User',
  ]
  for (const t of tables) {
    try { await p.$executeRawUnsafe(`DELETE FROM "${t}"`) } catch {}
  }
  console.log('✓ All tables cleared')

  // ── User ──────────────────────────────────────────────────────────────────
  const userId = 'demo-user-1'
  await p.$executeRawUnsafe(
    `INSERT INTO "User" (id,name,email,role,territory,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)`,
    userId, 'Arjun Kapoor', 'arjun.kapoor@ekfrazo.com', 'REP', 'Bengaluru South', n(), n()
  )
  console.log('✓ User created')

  // ── Products ──────────────────────────────────────────────────────────────
  const cardovixId = 'prod-cardovix'
  const glytaraId  = 'prod-glytara'
  const nexovirId  = 'prod-nexovir'
  const alzaraId   = 'prod-alzara'

  const products: [string, string, string, string, string, string, string, string, string, string][] = [
    [cardovixId, 'Cardovix 10mg', 'Cardiology',
     'Management of paroxysmal atrial fibrillation',
     JSON.stringify(['Rapid ventricular rate control','Once-daily dosing','Favorable long-term safety','No dose adjustment for mild-moderate hepatic impairment','7-year AFFIRM-3 data']),
     JSON.stringify(['Bradycardia (5.2%)','Fatigue and dizziness (7.1%)','Mild hypotension (3.8%)','QT interval prolongation']),
     JSON.stringify(['Lower thyroid toxicity vs amiodarone','Cleaner drug interaction profile','Once-daily vs BID']),
     JSON.stringify(['Amiodarex','Rhythmicor','Vernalex']),
     JSON.stringify(['Significantly reduces AFib recurrence vs placebo','Superior rate control vs Rhythmicor','Non-inferior to Amiodarex with improved tolerability']),
     'For suggested discussion purposes only. Not for use with unapproved indications.'],
    [glytaraId, 'Glytara 1mg', 'Endocrinology',
     'Type 2 diabetes management with established cardiovascular benefit',
     JSON.stringify(['HbA1c reduction 1.8% at 52 weeks','Average weight loss 5.2 kg','26% reduction in MACE','Weekly injection improves adherence','Auto-injector pen']),
     JSON.stringify(['Nausea (30%, mostly transient)','Injection site reactions (8%)','Mild GI disturbance (12%)','Rare pancreatitis (<0.2%)']),
     JSON.stringify(['Once-weekly dosing','Proven MACE reduction: SUSTAIN-CARDIO trial','89% adherence at 52 weeks vs 67% for daily comparator']),
     JSON.stringify(['Ozalide','Semafort','Victovir']),
     JSON.stringify(['Reduces MACE by 26% vs placebo in T2D patients','Non-inferior to Semafort in HbA1c reduction','Significantly higher adherence vs daily GLP-1']),
     'For suggested discussion purposes only.'],
    [nexovirId, 'Nexovir 25mg', 'Oncology',
     'First-line EGFR mutation-positive NSCLC',
     JSON.stringify(['Median PFS 18.9 vs 11.2 months','Intracranial ORR 65% vs 26%','Activity vs T790M resistance mutations','Consistent benefit across exon 19 and L858R subgroups']),
     JSON.stringify(['Rash/acneiform (61%)','Diarrhea (55%)','Paronychia (25%)','Rare ILD (1.5%)']),
     JSON.stringify(['Superior PFS vs erlotinib','Best-in-class CNS penetration','Activity vs T790M resistance','Grade 3+ AEs lower than Gefitex (9% vs 14%)']),
     JSON.stringify(['Gefitex','Erlotinix','Osimerix']),
     JSON.stringify(['Median PFS 18.9 months in NEXCEL trial','Intracranial ORR 65% in CNS-met subgroup','Published in NEJM']),
     'For suggested discussion purposes only. Refer to full prescribing information.'],
    [alzaraId, 'Alzara 5mg', 'Neurology',
     "Symptomatic treatment of mild-to-moderate Alzheimer's disease",
     JSON.stringify(['Slows functional decline 35% vs placebo at 12 months (ADAGIO)','Once-daily formulation','Low anticholinergic burden','Caregiver-reported improvement at 6 months']),
     JSON.stringify(['Dizziness (8.2%)','Headache (6.4%)','Constipation (5.1%)','Nausea (4.8%)']),
     JSON.stringify(['Once-daily vs twice-daily Memorex','Lower anticholinergic burden than Cognex','Proven caregiver-reported functional outcomes']),
     JSON.stringify(['Memorex','Cognex','Doneplex']),
     JSON.stringify(['Statistically significant reduction in functional decline vs placebo','Superior caregiver IADL vs Memorex at 6 months','Well-tolerated in patients 65+']),
     'For suggested discussion purposes only.'],
  ]
  for (const [id, name, area, ind, kb, se, diff, comp, ac, disc] of products) {
    await p.$executeRawUnsafe(
      `INSERT INTO "Product" (id,productName,therapyArea,indication,keyBenefits,sideEffects,differentiators,competitorNames,approvedClaims,disclaimers,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, name, area, ind, kb, se, diff, comp, ac, disc, n(), n()
    )
  }
  console.log('✓ 4 products created')

  // ── Doctor Profiles ───────────────────────────────────────────────────────
  const drAnanyaId = 'dr-ananya'
  const drRajeshId = 'dr-rajesh'
  const drPriyaId  = 'dr-priya'
  const drVikramId = 'dr-vikram'
  const drMeeraId  = 'dr-meera'

  type DoctorRow = [string, string, string, string, string, string, string, string, string, string, string, string | null, string | null, string]
  const doctors: DoctorRow[] = [
    [drAnanyaId, userId, 'Dr. Ananya Krishnamurti', 'Cardiology', 'Bengaluru', 'Manipal Hospital, Bengaluru', 'EvidenceDriven', 'Senior', 'Cardiology', cardovixId,
     JSON.stringify(['Long-term safety data','Drug interactions','Elderly patients','Comparison with amiodarone']), 'Amiodarex',
     '2025-11-15T00:00:00.000Z', 'Very data-oriented. Always asks for peer-reviewed evidence.'],
    [drRajeshId, userId, 'Dr. Rajesh Mehta', 'Diabetology', 'Bengaluru', 'Manipal Hospital, Bengaluru', 'PriceSensitive', 'MidLevel', 'Endocrinology', glytaraId,
     JSON.stringify(['Affordability','Patient adherence','Insurance coverage','Injectable burden']), 'Ozalide',
     '2025-12-01T00:00:00.000Z', 'Runs a high-volume practice. Many patients with affordability constraints.'],
    [drPriyaId, userId, 'Dr. Priya Sharma', 'Oncology', 'Bengaluru', 'Basavatarakam Indo American Cancer Hospital, Bengaluru', 'Skeptical', 'Senior', 'Oncology', nexovirId,
     JSON.stringify(['Trial data quality','Resistance patterns','CNS efficacy','Switching cost']), 'Gefitex',
     '2025-10-20T00:00:00.000Z', 'Academic center oncologist. Long-standing Gefitex prescriber.'],
    [drVikramId, userId, 'Dr. Vikram Nair', 'Neurology', 'Bengaluru', 'Manipal Hospitals, Bengaluru', 'BrandLoyal', 'Senior', 'Neurology', alzaraId,
     JSON.stringify(['Switching risk','Long-term data','Caregiver burden','Dosing convenience']), 'Memorex',
     null, 'Prescribing Memorex for 10+ years. Values stability.'],
    [drMeeraId, userId, 'Dr. Meera Patel', 'General Physician', 'Bengaluru', 'Apollo Clinic, Bengaluru', 'FriendlyButReserved', 'MidLevel', 'Endocrinology', glytaraId,
     JSON.stringify(['Side effects','Patient fit','Simplicity of regimen','Support from company']), null,
     '2025-12-10T00:00:00.000Z', 'Friendly but takes time to build trust.'],
  ]
  for (const [id, uid, name, spec, city, hosp, persona, seniority, area, tprod, concerns, comp, lastInt, notes] of doctors) {
    await p.$executeRawUnsafe(
      `INSERT INTO "DoctorProfile" (id,userId,fullName,specialty,city,hospitalOrClinic,personaType,seniorityLevel,therapyArea,targetProduct,likelyConcerns,competitorPreference,lastInteractionDate,notes,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, uid, name, spec, city, hosp, persona, seniority, area, tprod, concerns, comp, lastInt, notes, n(), n()
    )
  }
  console.log('✓ 5 doctor profiles created')

  // ── Battlecard ────────────────────────────────────────────────────────────
  const bcContent = JSON.stringify({
    oneLiner: 'Cardovix 10mg delivers once-daily AFib control with a proven long-term safety advantage over amiodarone-class drugs.',
    likelyQuestions: [
      { question: 'How does Cardovix compare to Amiodarex long-term?', suggestedResponse: 'AFFIRM-3 showed thyroid AEs at 2.1% vs 8.4% over 7 years.' },
      { question: "What's the evidence base?", suggestedResponse: 'AFFIRM-3 is a 7-year Phase IV follow-up published in JACC.' },
      { question: 'Can I use this in elderly patients with renal issues?', suggestedResponse: 'No dose adjustment required until CrCl < 30 mL/min.' },
      { question: 'What about cost and insurance?', suggestedResponse: 'Patient assistance program available. Most major insurers at Tier 2.' },
    ],
    talkingPoints: ['Once-daily dosing','AFFIRM-3: 7-year safety data','No routine thyroid or pulmonary monitoring','Clean drug interaction profile'],
    objectionsToAnticipate: [
      { objection: 'Amiodarex has 20 years of real-world data.', response: 'AFFIRM-3 specifically captures long-term safety signals at 5-10 years.' },
    ],
    whatNotToSay: ['Never say "better than" Amiodarex outright','Do not claim Cardovix eliminates AFib'],
    confidenceChecklist: ['✓ Know AFFIRM-3 trial numbers','✓ Can explain monitoring difference','✓ Know patient assistance program process'],
  })
  await p.$executeRawUnsafe(
    `INSERT INTO "Battlecard" (id,doctorId,productId,userId,content,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)`,
    'bc-demo-1', drAnanyaId, cardovixId, userId, bcContent, n(), n()
  )
  console.log('✓ Battlecard created')

  // ── Practice Sessions (no transcript column) ──────────────────────────────
  await p.$executeRawUnsafe(
    `INSERT INTO "PracticeSession" (id,doctorId,userId,difficulty,objectionFocus,status,durationSeconds,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)`,
    'ps-demo-1', drAnanyaId, userId, 'Medium', 'Safety', 'completed', 1320, n(48), n(48)
  )
  await p.$executeRawUnsafe(
    `INSERT INTO "PracticeSession" (id,doctorId,userId,difficulty,objectionFocus,status,durationSeconds,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)`,
    'ps-demo-2', drRajeshId, userId, 'Hard', 'Cost', 'completed', 900, n(72), n(72)
  )

  // ── Practice Reports (separate columns, no updatedAt) ─────────────────────
  const rep1 = {
    summary: 'Rep demonstrated good product knowledge and led with data effectively.',
    strengths: JSON.stringify(['Clear AFFIRM-3 data recall','Professional engagement','Appropriate pacing']),
    weakMoments: JSON.stringify(['Hesitated on pricing rebuttal','Did not proactively mention patient access program']),
    missedOpportunities: JSON.stringify(['Should have asked about current patient monitoring burden']),
    improvements: JSON.stringify(['Lead with efficacy before safety','Mention access program proactively']),
    nextPractice: JSON.stringify(['Practice cost objection handling','Role-play the follow-up meeting','Work on KOL-reference storytelling']),
  }
  await p.$executeRawUnsafe(
    `INSERT INTO "PracticeReport" (id,sessionId,summary,strengths,weakMoments,missedOpportunities,objectionHandlingScore,clarityScore,confidenceScore,complianceScore,improvements,nextPractice,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    'pr-demo-1', 'ps-demo-1', rep1.summary, rep1.strengths, rep1.weakMoments, rep1.missedOpportunities, 72, 81, 78, 92, rep1.improvements, rep1.nextPractice, n(47)
  )
  await p.$executeRawUnsafe(
    `INSERT INTO "PracticeReport" (id,sessionId,summary,strengths,weakMoments,missedOpportunities,objectionHandlingScore,clarityScore,confidenceScore,complianceScore,improvements,nextPractice,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    'pr-demo-2', 'ps-demo-2',
    'Handled cost objections adequately but missed adherence angle.',
    JSON.stringify(['Good rapport','Knew the patient access program details']),
    JSON.stringify(['Did not pivot to adherence data when cost was raised']),
    JSON.stringify(['Could have used 89% adherence stat to reframe value']),
    68, 75, 72, 90,
    JSON.stringify(['Practice adherence-to-value bridge','Prepare specific ₹ cost comparisons']),
    JSON.stringify(['Practice harder cost scenarios','Review Glytara patient access materials']),
    n(71)
  )
  console.log('✓ Practice sessions + reports created')

  // ── Meeting Transcript (needed for PostCallAnalysis FK) ───────────────────
  const transcriptContent = `Rep: Good morning, Dr. Krishnamurti. Thank you for your time today.
Doctor: Good morning. I have about 20 minutes.
Rep: I wanted to share the latest data on Cardovix, specifically the AFFIRM-3 7-year follow-up.
Doctor: I've been using Amiodarex for 15 years. What makes Cardovix different?
Rep: AFFIRM-3 showed thyroid adverse events at just 2.1% for Cardovix versus 8.4% for the amiodarone comparator over 7 years.
Doctor: That's interesting. What about the evidence volume? Amiodarone has decades of real-world data.
Rep: You're right to flag that. For long-term AFib management, the accumulated toxicity at 5-10 years is exactly what AFFIRM-3 was designed to capture.
Doctor: Send me the data. I'd like to review it before our next meeting.
Rep: Absolutely. I'll email it today. Can we meet Thursday morning?
Doctor: Thursday at 9am works.`

  await p.$executeRawUnsafe(
    `INSERT INTO "MeetingTranscript" (id,doctorId,title,content,isDemo,createdAt) VALUES (?,?,?,?,?,?)`,
    'mt-demo-1', drAnanyaId, 'Dr. Krishnamurti – Cardovix Meeting (Nov 15)', transcriptContent, 1, n(24)
  )

  // ── Post-Call Analysis (individual columns, no updatedAt) ─────────────────
  await p.$executeRawUnsafe(
    `INSERT INTO "PostCallAnalysis" (id,doctorId,userId,transcriptId,summary,doctorConcerns,wentWell,couldImprove,missedMoments,doctorIntent,nextBestActions,followUpEmail,crmNotes,coachingSummary,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    'pca-demo-1', drAnanyaId, userId, 'mt-demo-1',
    'Productive 20-minute meeting with Dr. Krishnamurti. She showed genuine interest in the AFFIRM-3 safety profile and requested the data for review.',
    JSON.stringify(['Volume of long-term data vs amiodarone','Monitoring burden in elderly patients']),
    JSON.stringify(['Clear and accurate data presentation','Secured a follow-up appointment for Thursday']),
    JSON.stringify(['Open with efficacy story before jumping to safety differentiation']),
    JSON.stringify(['Did not ask about current monitoring burden for existing AFib patients']),
    'Considering a trial run with select low-risk AFib patients. Needs the data in hand first.',
    JSON.stringify(['Email AFFIRM-3 data sheet today','Confirm Thursday 9am follow-up','Prepare leave-behind comparing monitoring protocols']),
    `Dear Dr. Krishnamurti,\n\nThank you for your time this morning.\n\nAs discussed, I am attaching the AFFIRM-3 7-year safety summary. Key highlights:\n• Thyroid AEs: 2.1% (Cardovix) vs 8.4% (amiodarone comparator)\n• No routine thyroid or pulmonary monitoring required\n• No dose adjustment for mild-moderate renal impairment\n\nI look forward to seeing you Thursday at 9am.\n\nBest regards,\nArjun Kapoor\nEkfrazo Technologies`,
    'DOCTOR: Dr. Ananya Krishnamurti | Cardiologist | Manipal Hospital | CALL OUTCOME: Follow-up Thu 9am | POTENTIAL: HIGH | KEY CONCERN: Long-term data volume',
    'Arjun handled an evidence-driven cardiologist well. Led with data, accurate on clinical parameters, secured follow-up. Needs to open with efficacy before safety next call.',
    n(24)
  )
  console.log('✓ Meeting transcript + post-call analysis created')

  // ── Notes ─────────────────────────────────────────────────────────────────
  await p.$executeRawUnsafe(
    `INSERT INTO "Note" (id,doctorId,userId,content,createdAt,updatedAt) VALUES (?,?,?,?,?,?)`,
    'note-1', drAnanyaId, userId, 'Follow up with access coordinator to confirm formulary status before Thursday meeting.', n(2), n(2)
  )
  await p.$executeRawUnsafe(
    `INSERT INTO "Note" (id,doctorId,userId,content,createdAt,updatedAt) VALUES (?,?,?,?,?,?)`,
    'note-2', drRajeshId, userId, 'Dr. Mehta specifically asked about the ₹800/month cost — need to confirm with the access team.', n(3), n(3)
  )
  console.log('✓ Notes created')

  // ── SalesReps + Targets ───────────────────────────────────────────────────
  // SalesRep has: id, name, email, territory, avatarColor, createdAt (no updatedAt)
  // RepTarget has: id, salesRepId, dailyVisitTarget, weeklyClinicTarget, monthlyRevenueTarget, qualityScoreTarget (no timestamps)
  const reps: [string, string, string, string, string][] = [
    ['demo-rep-arjun', 'Arjun Kapoor',  'arjun@ekfrazo.demo',  'Bengaluru North',   '#8B5CF6'],
    ['demo-rep-priya', 'Priya Sharma',  'priya@ekfrazo.demo',  'Bengaluru South',   '#EC4899'],
    ['demo-rep-ravi',  'Ravi Mehta',    'ravi@ekfrazo.demo',   'Bengaluru East',    '#F0A500'],
    ['demo-rep-sunita','Sunita Rao',    'sunita@ekfrazo.demo', 'Bengaluru West',    '#3FB950'],
    ['demo-rep-suresh','Suresh Kumar',  'suresh@ekfrazo.demo', 'Bengaluru Central', '#38BDF8'],
  ]
  for (const [id, name, email, territory, color] of reps) {
    await p.$executeRawUnsafe(
      `INSERT INTO "SalesRep" (id,name,email,territory,avatarColor,createdAt) VALUES (?,?,?,?,?,?)`,
      id, name, email, territory, color, n()
    )
    await p.$executeRawUnsafe(
      `INSERT INTO "RepTarget" (id,salesRepId,dailyVisitTarget,weeklyClinicTarget,monthlyRevenueTarget,qualityScoreTarget) VALUES (?,?,?,?,?,?)`,
      `target-${id}`, id, 5, 20, 500000, 75
    )
  }
  console.log('✓ 5 SalesReps + targets created')

  // ── Doctor Assignments ────────────────────────────────────────────────────
  const assignments: [string, string, string][] = [
    ['demo-rep-arjun', drAnanyaId, 'Bengaluru North'],
    ['demo-rep-arjun', drRajeshId, 'Bengaluru North'],
    ['demo-rep-arjun', drVikramId, 'Bengaluru North'],
    ['demo-rep-priya', drPriyaId,  'Bengaluru South'],
    ['demo-rep-priya', drMeeraId,  'Bengaluru South'],
    ['demo-rep-priya', drAnanyaId, 'Bengaluru South'],
    ['demo-rep-ravi',  drRajeshId, 'Bengaluru East'],
    ['demo-rep-ravi',  drMeeraId,  'Bengaluru East'],
    ['demo-rep-sunita',drVikramId, 'Bengaluru West'],
    ['demo-rep-sunita',drPriyaId,  'Bengaluru West'],
    ['demo-rep-suresh',drAnanyaId, 'Bengaluru Central'],
    ['demo-rep-suresh',drRajeshId, 'Bengaluru Central'],
  ]
  for (const [repId, docId, area] of assignments) {
    await p.$executeRawUnsafe(
      `INSERT INTO "DoctorAssignment" (id,salesRepId,doctorId,area,assignedAt) VALUES (?,?,?,?,?)`,
      `asgn-${repId.slice(-4)}-${docId.slice(-4)}`, repId, docId, area, n()
    )
  }
  console.log('✓ Doctor assignments created')

  // ── Visit Records ─────────────────────────────────────────────────────────
  // weekStart() = 30-day rolling window (720 h). todayStart() = 24 h.
  // Arjun: 18 visits (3 today) → 18 ≥ 0.9×20=18 → Excellent
  // Priya: 14 visits, 3 today → On Track
  // Ravi:  10 visits, 3 today → On Track
  // Sunita: 8 visits, 2 today → Behind
  // Suresh: 5 visits, 1 today → Behind
  type VisitRow = [string, string, number, string, string?]
  const visits: VisitRow[] = [
    // Arjun — 18 total ───────────────────────────────────────────────────────
    ['demo-rep-arjun', drAnanyaId,  2,   'visited_offline', 'Discussed AFFIRM-3 safety data'],
    ['demo-rep-arjun', drRajeshId,  5,   'visited_offline'],
    ['demo-rep-arjun', drVikramId,  9,   'not_available'],
    ['demo-rep-arjun', drAnanyaId,  26,  'visited_offline', 'Follow-up on trial data request'],
    ['demo-rep-arjun', drRajeshId,  30,  'visited_offline'],
    ['demo-rep-arjun', drVikramId,  50,  'visited_offline'],
    ['demo-rep-arjun', drAnanyaId,  54,  'not_available'],
    ['demo-rep-arjun', drRajeshId,  75,  'visited_offline'],
    ['demo-rep-arjun', drVikramId,  80,  'rescheduled'],
    ['demo-rep-arjun', drAnanyaId,  120, 'visited_offline', 'KOL engagement discussion'],
    ['demo-rep-arjun', drRajeshId,  148, 'visited_offline'],
    ['demo-rep-arjun', drVikramId,  165, 'visited_offline'],
    ['demo-rep-arjun', drAnanyaId,  200, 'visited_offline'],
    ['demo-rep-arjun', drRajeshId,  262, 'not_available'],
    ['demo-rep-arjun', drVikramId,  310, 'visited_offline'],
    ['demo-rep-arjun', drAnanyaId,  400, 'visited_offline'],
    ['demo-rep-arjun', drRajeshId,  500, 'visited_offline'],
    ['demo-rep-arjun', drVikramId,  650, 'rescheduled'],
    // Priya — 14 total, 3 today (3h, 7h, 18h) ────────────────────────────────
    ['demo-rep-priya', drPriyaId,   3,   'visited_offline', 'Nexovir CNS data review'],
    ['demo-rep-priya', drMeeraId,   7,   'visited_offline'],
    ['demo-rep-priya', drAnanyaId,  18,  'visited_offline'],
    ['demo-rep-priya', drPriyaId,   48,  'not_available'],
    ['demo-rep-priya', drMeeraId,   72,  'visited_offline'],
    ['demo-rep-priya', drAnanyaId,  100, 'visited_offline'],
    ['demo-rep-priya', drPriyaId,   145, 'visited_offline'],
    ['demo-rep-priya', drMeeraId,   200, 'rescheduled'],
    ['demo-rep-priya', drAnanyaId,  260, 'visited_offline'],
    ['demo-rep-priya', drPriyaId,   350, 'visited_offline'],
    ['demo-rep-priya', drMeeraId,   430, 'visited_offline'],
    ['demo-rep-priya', drAnanyaId,  510, 'not_available'],
    ['demo-rep-priya', drPriyaId,   590, 'visited_offline'],
    ['demo-rep-priya', drMeeraId,   670, 'visited_offline'],
    // Ravi — 10 total, 3 today (4h, 11h, 20h) ────────────────────────────────
    ['demo-rep-ravi',  drRajeshId,  4,   'visited_offline'],
    ['demo-rep-ravi',  drMeeraId,   11,  'visited_offline', 'Glytara adherence plan'],
    ['demo-rep-ravi',  drRajeshId,  20,  'visited_offline'],
    ['demo-rep-ravi',  drMeeraId,   60,  'not_available'],
    ['demo-rep-ravi',  drRajeshId,  110, 'visited_offline'],
    ['demo-rep-ravi',  drMeeraId,   200, 'visited_offline'],
    ['demo-rep-ravi',  drRajeshId,  320, 'rescheduled'],
    ['demo-rep-ravi',  drMeeraId,   440, 'visited_offline'],
    ['demo-rep-ravi',  drRajeshId,  560, 'visited_offline'],
    ['demo-rep-ravi',  drMeeraId,   680, 'not_available'],
    // Sunita — 8 total, 2 today (5h, 10h) ────────────────────────────────────
    ['demo-rep-sunita',drVikramId,  5,   'visited_offline'],
    ['demo-rep-sunita',drPriyaId,   10,  'visited_offline', 'Nexovir resistance patterns'],
    ['demo-rep-sunita',drVikramId,  50,  'not_available'],
    ['demo-rep-sunita',drPriyaId,   140, 'visited_offline'],
    ['demo-rep-sunita',drVikramId,  280, 'visited_offline'],
    ['demo-rep-sunita',drPriyaId,   380, 'rescheduled'],
    ['demo-rep-sunita',drVikramId,  520, 'visited_offline'],
    ['demo-rep-sunita',drPriyaId,   670, 'visited_offline'],
    // Suresh — 5 total, 1 today (12h) ────────────────────────────────────────
    ['demo-rep-suresh',drAnanyaId,  12,  'visited_offline'],
    ['demo-rep-suresh',drRajeshId,  120, 'visited_offline', 'Cardovix pricing discussion'],
    ['demo-rep-suresh',drAnanyaId,  280, 'not_available'],
    ['demo-rep-suresh',drRajeshId,  480, 'visited_offline'],
    ['demo-rep-suresh',drAnanyaId,  660, 'visited_offline'],
  ]

  for (const [repId, docId, hrsAgo, outcome, notes] of visits) {
    const date = n(hrsAgo)
    const vid = `vr-${repId.slice(-4)}-${docId.slice(-3)}-${hrsAgo}`
    await p.$executeRawUnsafe(
      `INSERT INTO "VisitRecord" (id,salesRepId,doctorId,date,outcome,notes,createdAt) VALUES (?,?,?,?,?,?,?)`,
      vid, repId, docId, date, outcome, notes ?? null, date
    )
  }
  console.log('✓ 55 visit records seeded (Arjun:18, Priya:14, Ravi:10, Sunita:8, Suresh:5)')

  // ── Verify Arjun's count ──────────────────────────────────────────────────
  const weekStart = n(720)
  const arjunCount = await p.$queryRawUnsafe<Array<{ cnt: bigint }>>(
    `SELECT COUNT(*) as cnt FROM "VisitRecord" WHERE salesRepId='demo-rep-arjun' AND date >= ?`,
    weekStart
  )
  console.log(`\n✅ Arjun weekly visit count: ${Number(arjunCount[0].cnt)} (expected: 18)`)
  console.log('\n🎉 Emergency reseed complete!')
  console.log('   Login: arjun.kapoor@ekfrazo.com')

  await p.$disconnect()
}

main().catch(e => { console.error('❌ Reseed failed:', e.message); process.exit(1) })
