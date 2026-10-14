import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Clean existing data ───────────────────────────────────────────────────
  await prisma.message.deleteMany()
  await prisma.conversationThread.deleteMany()
  await prisma.note.deleteMany()
  await prisma.practiceReport.deleteMany()
  await prisma.practiceTurn.deleteMany()
  await prisma.postCallAnalysis.deleteMany()
  await prisma.meetingTranscript.deleteMany()
  await prisma.practiceSession.deleteMany()
  await prisma.battlecard.deleteMany()
  await prisma.doctorProfile.deleteMany()
  await prisma.product.deleteMany()
  await prisma.user.deleteMany()
  // Manager portal tables
  try { await prisma.visitRecord.deleteMany() } catch {}
  try { await prisma.doctorAssignment.deleteMany() } catch {}
  try { await prisma.repTarget.deleteMany() } catch {}
  try { await prisma.salesRep.deleteMany() } catch {}

  // ─── Demo User ────────────────────────────────────────────────────────────
  const rep = await prisma.user.create({
    data: {
      name: 'Arjun Kapoor',
      email: 'arjun.kapoor@ekfrazo.com',
      role: 'REP',
      territory: 'Bengaluru South',
    },
  })
  console.log('✅ Demo rep created')

  // ─── SalesReps (Manager Portal) ────────────────────────────────────────────
  const salesRepData = [
    { name: 'Arjun Kapoor',  email: 'arjun@ekfrazo.demo',  territory: 'Bengaluru North',   avatarColor: '#8B5CF6' },
    { name: 'Priya Sharma',  email: 'priya@ekfrazo.demo',  territory: 'Bengaluru South',   avatarColor: '#EC4899' },
    { name: 'Ravi Mehta',    email: 'ravi@ekfrazo.demo',   territory: 'Bengaluru East',    avatarColor: '#F0A500' },
    { name: 'Sunita Rao',    email: 'sunita@ekfrazo.demo', territory: 'Bengaluru West',    avatarColor: '#3FB950' },
    { name: 'Suresh Kumar',  email: 'suresh@ekfrazo.demo', territory: 'Bengaluru Central', avatarColor: '#38BDF8' },
  ]
  const salesReps = await Promise.all(
    salesRepData.map(d => prisma.salesRep.upsert({
      where: { email: d.email },
      update: { territory: d.territory },
      create: d,
    }))
  )
  // Create default targets for each rep
  for (const sr of salesReps) {
    await prisma.repTarget.upsert({
      where: { salesRepId: sr.id },
      update: {},
      create: { salesRepId: sr.id, dailyVisitTarget: 5, weeklyClinicTarget: 20, monthlyRevenueTarget: 500000, qualityScoreTarget: 75 },
    })
  }
  console.log(`✅ ${salesReps.length} sales reps created`)

  // ─── Products ─────────────────────────────────────────────────────────────
  const cardovix = await prisma.product.create({
    data: {
      productName: 'Cardovix 10mg',
      therapyArea: 'Cardiology',
      indication: 'Management of paroxysmal atrial fibrillation and maintenance of normal sinus rhythm',
      keyBenefits: JSON.stringify([
        'Rapid ventricular rate control within 2 hours of dosing',
        'Once-daily dosing improves patient adherence',
        'Favorable long-term safety profile vs older antiarrhythmics',
        'No dose adjustment required for mild-moderate hepatic impairment',
        '7-year follow-up data from AFFIRM-3 trial',
      ]),
      sideEffects: JSON.stringify([
        'Bradycardia (5.2%)',
        'Fatigue and dizziness (7.1%)',
        'Mild hypotension (3.8%)',
        'QT interval prolongation (monitor ECG at initiation)',
        'Rare hepatotoxicity (< 0.5%)',
      ]),
      differentiators: JSON.stringify([
        'Lower thyroid and pulmonary toxicity vs amiodarone (2.1% vs 8.4% in AFFIRM-3)',
        'Cleaner drug interaction profile vs Amiodarex',
        'Once-daily vs BID regimen',
        'No routine thyroid or pulmonary monitoring required',
      ]),
      competitorNames: JSON.stringify(['Amiodarex', 'Rhythmicor', 'Vernalex']),
      approvedClaims: JSON.stringify([
        'Significantly reduces AFib recurrence rate compared to placebo at 12 months (54% vs 31%, p<0.001)',
        'Demonstrated superior rate control vs Rhythmicor at 24 weeks',
        'Non-inferior to Amiodarex with significantly improved tolerability at 7-year follow-up',
      ]),
      disclaimers: 'For suggested discussion purposes only. Final promotional messaging must be reviewed and approved by medical, legal, and regulatory teams. Not for use with unapproved indications.',
    },
  })

  const glytara = await prisma.product.create({
    data: {
      productName: 'Glytara 1mg',
      therapyArea: 'Endocrinology',
      indication: 'Type 2 diabetes management with established cardiovascular benefit in high-risk patients',
      keyBenefits: JSON.stringify([
        'HbA1c reduction of 1.8% from baseline at 52 weeks',
        'Average weight loss of 5.2 kg over 52 weeks',
        '26% reduction in major adverse cardiovascular events (MACE)',
        'Weekly injection improves adherence over daily injectables',
        'Auto-injector pen for ease of patient self-administration',
      ]),
      sideEffects: JSON.stringify([
        'Nausea (30% incidence, mostly transient, resolves in 4-8 weeks)',
        'Injection site reactions (8%)',
        'Mild GI disturbance — diarrhea, constipation (12%)',
        'Rare pancreatitis (< 0.2% — monitor in high-risk patients)',
        'Not recommended in personal/family history of medullary thyroid carcinoma',
      ]),
      differentiators: JSON.stringify([
        'Once-weekly dosing (Ozalide is daily)',
        'Proven MACE reduction: SUSTAIN-CARDIO trial',
        'Structured dose escalation reduces GI AE burden',
        'Patient access program with income-based assistance',
        '89% adherence at 52 weeks vs 67% for daily comparator',
      ]),
      competitorNames: JSON.stringify(['Ozalide', 'Semafort', 'Victovir']),
      approvedClaims: JSON.stringify([
        'Reduces major adverse cardiovascular events by 26% versus placebo in T2D patients with high CV risk',
        'Non-inferior to Semafort in HbA1c reduction at 52 weeks',
        'Significantly higher adherence rate vs daily GLP-1 comparators at 52 weeks',
      ]),
      disclaimers: 'For suggested discussion purposes only. Final promotional messaging must be reviewed and approved by medical, legal, and regulatory teams.',
    },
  })

  const nexovir = await prisma.product.create({
    data: {
      productName: 'Nexovir 25mg',
      therapyArea: 'Oncology',
      indication: 'First-line treatment of EGFR mutation-positive (exon 19 deletion or exon 21 L858R substitution) non-small cell lung cancer',
      keyBenefits: JSON.stringify([
        'Median PFS of 18.9 months vs 11.2 months for erlotinib in Phase III NEXCEL trial',
        'Designed for CNS penetration — intracranial ORR 65% vs 26%',
        'Activity against T790M resistance mutations (ORR 38% in 2L T790M+)',
        'Continuous oral dosing with manageable AE profile',
        'Consistent benefit across exon 19 and L858R subgroups',
      ]),
      sideEffects: JSON.stringify([
        'Dermatologic toxicity: rash/acneiform (61%, Grade 3+: 9%)',
        'Diarrhea (55%, Grade 3+: 4%)',
        'Paronychia (25%)',
        'Rare interstitial lung disease (1.5% — discontinue immediately)',
        'Hepatotoxicity (monitor LFTs at baseline and periodically)',
      ]),
      differentiators: JSON.stringify([
        'Superior PFS vs both erlotinib and first-generation EGFRi',
        'Best-in-class CNS penetration for brain-met patients',
        'Activity vs acquired T790M resistance (no need to switch to osimertinib immediately)',
        'Grade 3+ dermatologic AEs lower than Gefitex (9% vs 14%)',
      ]),
      competitorNames: JSON.stringify(['Gefitex', 'Erlotinix', 'Osimerix']),
      approvedClaims: JSON.stringify([
        'Demonstrated median PFS of 18.9 months in Phase III NEXCEL trial (exon 19 del and L858R populations)',
        'Intracranial objective response rate of 65% in CNS-met subgroup analysis',
        'Published in NEJM — peer-reviewed evidence base',
      ]),
      disclaimers: 'For suggested discussion purposes only. All efficacy and safety data from clinical trial settings. Real-world outcomes may vary. Refer to full prescribing information.',
    },
  })

  const alzara = await prisma.product.create({
    data: {
      productName: 'Alzara 5mg',
      therapyArea: 'Neurology',
      indication: 'Symptomatic treatment of mild-to-moderate Alzheimer\'s disease',
      keyBenefits: JSON.stringify([
        'Slows functional decline by 35% vs placebo at 12 months (ADAGIO trial)',
        'Once-daily formulation — reduced caregiver burden',
        'Well-tolerated in elderly: low anticholinergic burden',
        'Stable plasma levels reduce breakthrough symptom risk',
        'Caregiver-reported improvement in daily activities at 6 months',
      ]),
      sideEffects: JSON.stringify([
        'Dizziness (8.2%)',
        'Headache (6.4%)',
        'Constipation (5.1%)',
        'Nausea (4.8%)',
        'Syncope (rare — caution in patients with cardiac conduction issues)',
      ]),
      differentiators: JSON.stringify([
        'Once-daily vs twice-daily Memorex',
        'Lower anticholinergic burden than Cognex',
        'Proven caregiver-reported functional outcomes',
        'Can be used in patients with mild renal impairment without dose adjustment',
      ]),
      competitorNames: JSON.stringify(['Memorex', 'Cognex', 'Doneplex']),
      approvedClaims: JSON.stringify([
        'Statistically significant reduction in rate of functional decline vs placebo at 12 months',
        'Superior caregiver-rated IADL scores vs Memorex at 6 months',
        'Well-tolerated in patients 65+ — rate of serious AEs comparable to placebo',
      ]),
      disclaimers: 'For suggested discussion purposes only. Cognitive decline endpoints are from clinical trial settings. Individual patient response may vary.',
    },
  })
  console.log('✅ 4 products created')

  // ─── Doctor Profiles ──────────────────────────────────────────────────────
  const drAnanya = await prisma.doctorProfile.create({
    data: {
      fullName: 'Dr. Ananya Krishnamurti',
      specialty: 'Cardiology',
      city: 'Bengaluru',
      hospitalOrClinic: 'Apollo Hospitals, Bengaluru',
      personaType: 'EvidenceDriven',
      seniorityLevel: 'Senior',
      therapyArea: 'Cardiology',
      targetProduct: cardovix.id,
      likelyConcerns: JSON.stringify(['Long-term safety data', 'Drug interactions', 'Elderly patients', 'Comparison with amiodarone']),
      competitorPreference: 'Amiodarex',
      lastInteractionDate: new Date('2025-11-15'),
      notes: 'Very data-oriented. Always asks for peer-reviewed evidence. Interested in reducing polypharmacy burden in elderly AFib patients.',
      userId: rep.id,
    },
  })

  const drRajesh = await prisma.doctorProfile.create({
    data: {
      fullName: 'Dr. Rajesh Mehta',
      specialty: 'Diabetology',
      city: 'Pune',
      hospitalOrClinic: 'Jehangir Hospital',
      personaType: 'PriceSensitive',
      seniorityLevel: 'MidLevel',
      therapyArea: 'Endocrinology',
      targetProduct: glytara.id,
      likelyConcerns: JSON.stringify(['Affordability', 'Patient adherence', 'Insurance coverage', 'Injectable burden']),
      competitorPreference: 'Ozalide',
      lastInteractionDate: new Date('2025-12-01'),
      notes: 'Runs a high-volume practice. Many patients from semi-urban backgrounds with affordability constraints. Responds well to patient access programs and adherence data.',
      userId: rep.id,
    },
  })

  const drPriya = await prisma.doctorProfile.create({
    data: {
      fullName: 'Dr. Priya Sharma',
      specialty: 'Oncology',
      city: 'Hyderabad',
      hospitalOrClinic: 'AIIMS Hyderabad',
      personaType: 'Skeptical',
      seniorityLevel: 'Senior',
      therapyArea: 'Oncology',
      targetProduct: nexovir.id,
      likelyConcerns: JSON.stringify(['Trial data quality', 'Resistance patterns', 'CNS efficacy', 'Switching cost']),
      competitorPreference: 'Gefitex',
      lastInteractionDate: new Date('2025-10-20'),
      notes: 'Academic center oncologist. Long-standing Gefitex prescriber. Will only consider data from peer-reviewed Phase III trials. Published researcher herself.',
      userId: rep.id,
    },
  })

  const drVikram = await prisma.doctorProfile.create({
    data: {
      fullName: 'Dr. Vikram Nair',
      specialty: 'Neurology',
      city: 'Bengaluru',
      hospitalOrClinic: 'NIMHANS',
      personaType: 'BrandLoyal',
      seniorityLevel: 'Senior',
      therapyArea: 'Neurology',
      targetProduct: alzara.id,
      likelyConcerns: JSON.stringify(['Switching risk', 'Long-term data', 'Caregiver burden', 'Dosing convenience']),
      competitorPreference: 'Memorex',
      lastInteractionDate: null,
      notes: 'Prescribing Memorex for 10+ years. Values stability and familiarity. Responds to caregiver-ease arguments. May consider Alzara if adherence data is strong.',
      userId: rep.id,
    },
  })

  const drMeera = await prisma.doctorProfile.create({
    data: {
      fullName: 'Dr. Meera Patel',
      specialty: 'General Physician',
      city: 'Chennai',
      hospitalOrClinic: 'Patel Medical Centre',
      personaType: 'FriendlyButReserved',
      seniorityLevel: 'MidLevel',
      therapyArea: 'Endocrinology',
      targetProduct: glytara.id,
      likelyConcerns: JSON.stringify(['Side effects', 'Patient fit', 'Simplicity of regimen', 'Support from company']),
      competitorPreference: null,
      lastInteractionDate: new Date('2025-12-10'),
      notes: 'Friendly but takes time to build trust. Asks practical questions about patient management. Appreciates rep follow-through.',
      userId: rep.id,
    },
  })
  console.log('✅ 5 doctor profiles created')

  // ─── Battlecard ───────────────────────────────────────────────────────────
  const battlecardContent = {
    oneLiner: 'Cardovix 10mg delivers once-daily AFib control with a proven long-term safety advantage over amiodarone-class drugs — ideal for patients on complex medication regimens.',
    likelyQuestions: [
      {
        question: 'How does Cardovix compare to Amiodarex in terms of long-term safety?',
        suggestedResponse: 'Great question. AFFIRM-3 showed thyroid adverse events at 2.1% for Cardovix versus 8.4% for amiodarone comparator over 7 years. Pulmonary toxicity was also significantly lower. For patients on long-term therapy, this cumulative safety profile is clinically meaningful.',
      },
      {
        question: 'What\'s the evidence base? Is 7 years enough?',
        suggestedResponse: 'AFFIRM-3 is a 7-year Phase IV follow-up study published in JACC last year. The original Phase III data goes back 12 years. We acknowledge amiodarone has 20+ years of real-world data, but the newer safety signals from long-term amiodarone use are precisely why AFFIRM-3 was designed.',
      },
      {
        question: 'Can I use this in elderly patients with renal issues?',
        suggestedResponse: 'No dose adjustment is required until CrCl drops below 30 mL/min. For most elderly patients, the standard 10mg once-daily dose is appropriate. The drug does not accumulate in mild-moderate renal impairment.',
      },
      {
        question: 'What about cost and patient insurance coverage?',
        suggestedResponse: 'We have a patient assistance program for patients with coverage gaps. I can connect your team with our access coordinator this week. Most major insurer formularies include Cardovix at Tier 2.',
      },
      {
        question: 'Does it require routine monitoring like amiodarone?',
        suggestedResponse: 'Unlike amiodarone, Cardovix does not require routine thyroid or pulmonary function monitoring. We recommend baseline and 6-month ECG, and annual LFTs. This significantly reduces monitoring burden for both the patient and your team.',
      },
    ],
    talkingPoints: [
      'Once-daily dosing — patient adherence advantage',
      'AFFIRM-3: 7-year data, thyroid AE 2.1% vs 8.4% for amiodarone comparator',
      'No routine thyroid or pulmonary monitoring',
      'Clean drug interaction profile — fewer polypharmacy concerns in elderly AFib patients',
      'No dose adjustment needed for mild-moderate renal impairment',
      'Patient access program available for coverage gaps',
    ],
    objectionsToAnticipate: [
      {
        objection: 'Amiodarex has 20 years of real-world data. I trust what I know.',
        response: 'Absolutely valid. But 7-year AFFIRM-3 data was specifically designed to address the emerging safety concerns with long-term amiodarone. The thyroid and pulmonary events that emerge at 5-10 years are exactly what AFFIRM-3 captures. For patients starting a long-term regimen today, the newer data is more relevant to their risk horizon.',
      },
      {
        objection: 'The drug interaction risk with amiodarone is manageable in my hands.',
        response: 'For an experienced clinician like yourself, absolutely. But at a population level, reducing interaction burden means fewer calls to the clinic, fewer patient hospitalizations, and less cognitive load for patients managing multiple conditions.',
      },
      {
        objection: 'My patients can\'t afford yet another expensive new drug.',
        response: 'I hear you. The patient access program covers co-pay support and free-product bridges for patients with coverage gaps. I can have our access coordinator call your office this week to walk through the enrollment process.',
      },
    ],
    whatNotToSay: [
      'Never say Cardovix is "better than" Amiodarex outright — say "comparable efficacy with improved tolerability"',
      'Avoid mentioning the pending liver-related post-market label update',
      'Do not claim Cardovix eliminates AFib — say "reduces recurrence and maintains sinus rhythm"',
      'Avoid speculative statements about outcomes in unapproved indications',
    ],
    confidenceChecklist: [
      '✓ Know AFFIRM-3 trial numbers by heart (PFS, AE rates)',
      '✓ Can explain the monitoring difference clearly (ECG + LFTs only)',
      '✓ Understand the patient assistance program enrollment process',
      '✓ Know the renal dosing guidance',
      '✓ Prepared for the "just another expensive drug" objection',
      '✓ Have a printed or PDF leave-behind with AFFIRM-3 highlights',
    ],
  }

  await prisma.battlecard.create({
    data: {
      content: JSON.stringify(battlecardContent),
      repNotes: 'Dr. Krishnamurti specifically asked about elderly patient dosing last time. Lead with AFFIRM-3 thyroid data.',
      doctorId: drAnanya.id,
      productId: cardovix.id,
      userId: rep.id,
    },
  })
  console.log('✅ Battlecard created')

  // ─── Demo Transcripts ─────────────────────────────────────────────────────
  const transcript1 = await prisma.meetingTranscript.create({
    data: {
      title: 'Dr. Krishnamurti - Cardovix Discussion (Nov 15)',
      isDemo: true,
      doctorId: drAnanya.id,
      content: `REP: Good morning, Dr. Krishnamurti. Thank you for taking the time today.
DR: Yes, I have about 15 minutes. What's this about?
REP: I wanted to discuss Cardovix 10mg for your paroxysmal AFib patients.
DR: I'm familiar with several agents in this space. What differentiates Cardovix from Amiodarex?
REP: Cardovix offers a cleaner drug interaction profile and once-daily dosing compared to Amiodarex's BID regimen. More importantly, the 7-year AFFIRM-3 data shows significantly lower thyroid and pulmonary toxicity.
DR: But what about long-term safety data? Amiodarex has 20 years of real-world evidence.
REP: Cardovix has 7-year follow-up data from the AFFIRM-3 trial showing non-inferior efficacy with lower incidence of thyroid and pulmonary toxicity — 2.1% vs 8.4% thyroid adverse events.
DR: That difference is meaningful. What about cost? My patients often have insurance limitations.
REP: We have a patient support program for coverage gaps. I can have our access coordinator contact your office this week.
DR: What about elderly patients with renal impairment?
REP: No dose adjustment needed until CrCl drops below 30 mL/min.
DR: And monitoring requirements?
REP: Unlike amiodarone, no routine thyroid or pulmonary monitoring. Baseline and 6-month ECG, plus annual LFTs.
DR: That is a practical advantage. Send me the full AFFIRM-3 data package and I'll review it.
REP: Absolutely, I'll email it today. Would next Thursday work for a brief follow-up?
DR: Yes, Thursday morning is fine.`,
    },
  })

  const transcript2 = await prisma.meetingTranscript.create({
    data: {
      title: 'Dr. Mehta - Glytara Access Discussion (Dec 1)',
      isDemo: true,
      doctorId: drRajesh.id,
      content: `REP: Good afternoon, Dr. Mehta. I wanted to discuss Glytara for your T2D patients with high cardiovascular risk.
DR: Glytara... yes, I've heard of it. But GLP-1s are expensive. My patients can barely afford their current medications.
REP: I completely understand, and affordability is something we take seriously. Glytara has a tiered patient access program — for patients below certain income thresholds, the out-of-pocket cost can be quite manageable.
DR: How does the enrollment work? I don't want more paperwork burden.
REP: We handle most of the process. Our access coordinator calls the clinic, collects the basic eligibility info, and manages the paperwork. Your team fills in one page.
DR: What about adherence? Injectable medications are always a challenge with my patient population.
REP: Glytara is weekly — not daily. In the SUSTAIN-4 trial, adherence at 52 weeks was 89%, compared to 67% for a daily injectable comparator. Patients consistently cite the weekly schedule as the key factor.
DR: That's higher than I'd expect. What about GI side effects? Nausea has been a problem with other GLP-1s I've tried.
REP: Glytara uses a structured dose escalation — starting at 0.5mg and titrating over 4 weeks. The discontinuation rate due to GI AEs in Phase 3 was just 3.8%.
DR: And the cardiovascular data?
REP: SUSTAIN-CARDIO showed a 26% reduction in MACE — non-fatal MI, non-fatal stroke, and CV death — in T2D patients with established CVD.
DR: That is clinically meaningful. Can you leave some samples?
REP: Absolutely. I'll also arrange for the access coordinator to call your office this week to walk through the program.
DR: Fine. Let's try a few patients and see.`,
    },
  })

  const transcript3 = await prisma.meetingTranscript.create({
    data: {
      title: 'Dr. Sharma - Nexovir NSCLC Discussion (Oct 20)',
      isDemo: true,
      doctorId: drPriya.id,
      content: `REP: Good morning, Dr. Sharma. I appreciate you seeing me today about Nexovir for EGFR-mutant NSCLC.
DR: I want to be direct — I've been using Gefitex for years with good results. I need compelling evidence to consider switching.
REP: I respect that completely. Let me focus on the NEXCEL Phase III data. Median PFS was 18.9 months with Nexovir versus 11.2 months for erlotinib.
DR: What was the trial design? Any issues with the control arm?
REP: Erlotinib was the comparator — standard of care at the time. Patient population included both exon 19 deletions and L858R mutations, PS 0-2, no prior EGFR therapy. Subgroup analysis showed consistent benefit across all major mutation types.
DR: What about brain metastases? That's often a critical factor in my patients.
REP: Nexovir was specifically designed for CNS penetration. In the brain-met subgroup, intracranial ORR was 65% versus 26% for erlotinib. That's the strongest CNS penetration data for an EGFR inhibitor currently approved.
DR: And T790M resistance? My concern is what happens after first-line progression.
REP: Interestingly, Nexovir shows activity against T790M mutations. In second-line T790M-positive patients, ORR was 38%, which means some patients can continue on the same agent. That said, sequencing with third-generation agents remains an option.
DR: What about toxicity? Rash and diarrhea are the main quality-of-life issues my patients complain about.
REP: Grade 3+ dermatologic events were 9% versus 14% for Gefitex in a cross-trial comparison. Diarrhea Grade 3+ was 4% — comparable to the class.
DR: The CNS data is genuinely interesting. Send me the NEXCEL full publication — peer-reviewed journal only.
REP: Published in NEJM last June. I'll email the reprint today.
DR: I'll consider it for appropriate new first-line patients. Keep the threshold high.`,
    },
  })
  console.log('✅ 3 demo transcripts created')

  // ─── Practice Session ─────────────────────────────────────────────────────
  const session1 = await prisma.practiceSession.create({
    data: {
      difficulty: 'Medium',
      objectionFocus: 'Safety',
      status: 'completed',
      durationSeconds: 420,
      doctorId: drAnanya.id,
      userId: rep.id,
    },
  })

  const turns1 = [
    { role: 'doctor', content: 'So you\'re here about this Cardovix medication. I\'m already prescribing Amiodarex for my AFib patients. Why should I consider changing?' },
    { role: 'rep', content: 'Dr. Krishnamurti, thank you for seeing me. I understand Amiodarex has been reliable for you. Cardovix offers a comparable efficacy profile with a significantly better long-term safety record — particularly on thyroid and pulmonary toxicity.' },
    { role: 'doctor', content: 'I\'m aware of the AFFIRM-3 study you\'re referring to. But 7 years isn\'t 20 years. My patients have been on Amiodarex for decades without issues. Why would I change something that\'s working?' },
    { role: 'rep', content: 'That\'s a very fair point. The 7-year data does show consistent benefit. And for patients who are already stable on Amiodarex with no adverse effects, there may be no reason to switch. But for new patients starting long-term AFib therapy today, avoiding the cumulative toxicity risk at years 5 to 10 is worth considering.' },
    { role: 'doctor', content: 'Fair distinction. What about elderly patients? Many of my AFib patients are 70 or older with multiple comorbidities and renal impairment.' },
    { role: 'rep', content: 'No dose adjustment is needed until CrCl falls below 30 mL/min. For patients with mild to moderate renal impairment, the standard 10mg once-daily dose is appropriate and safe.' },
    { role: 'doctor', content: 'And monitoring requirements? I already have patients on amiodarone who need regular TFTs and PFTs. That\'s a burden.' },
    { role: 'rep', content: 'With Cardovix, you don\'t need routine thyroid or pulmonary function monitoring. The protocol is baseline ECG and 6-month ECG, plus annual LFTs. That\'s a significantly reduced monitoring burden for both your clinic and the patient.' },
    { role: 'doctor', content: 'The monitoring reduction is genuinely meaningful in a busy practice. I\'ll look at the AFFIRM-3 data. What are the drug interaction considerations?' },
    { role: 'rep', content: 'Cardovix has a cleaner CYP450 profile than amiodarone. The main interactions to watch are with strong CYP3A4 inhibitors. The full interaction table is in the prescribing information — I can email a summary today.' },
  ]

  for (const turn of turns1) {
    await prisma.practiceTurn.create({
      data: { ...turn, sessionId: session1.id },
    })
  }

  await prisma.practiceReport.create({
    data: {
      sessionId: session1.id,
      summary: 'The rep demonstrated solid product knowledge and handled the core safety objection with appropriate nuance. The distinction between new and existing patients was well-made. The response on elderly dosing was accurate and concise. The rep could have been more proactive in anchoring the efficacy message before addressing safety objections.',
      strengths: JSON.stringify([
        'Accurately cited AFFIRM-3 thyroid AE comparison (2.1% vs 8.4%)',
        'Made the critical new-vs-existing patient distinction well',
        'Accurate renal dosing guidance (CrCl < 30 threshold)',
        'Monitoring reduction point was clearly communicated',
        'Acknowledged doctor\'s valid concern about long-term amiodarone data without being defensive',
      ]),
      weakMoments: JSON.stringify([
        'Did not proactively mention the once-daily dosing advantage early enough — led with safety before establishing efficacy',
        'Drug interaction answer was vague ("cleaner profile") — should cite specific CYP450 pathway',
        'Did not offer to schedule a follow-up appointment at the end',
      ]),
      missedOpportunities: JSON.stringify([
        'Could have mentioned the patient access program when the doctor raised the monitoring burden (cost-to-clinic angle)',
        'Did not reference the absence of pulmonary monitoring — only mentioned thyroid',
        'Could have used the "patients starting therapy today" framing earlier',
      ]),
      objectionHandlingScore: 74,
      clarityScore: 81,
      confidenceScore: 76,
      complianceScore: 88,
      improvements: JSON.stringify([
        'Lead with efficacy proof point (AFFIRM-3 primary endpoint) before pivoting to safety differentiation',
        'Memorize the specific CYP3A4 inhibitor list — vague answers on interactions concern evidence-driven cardiologists',
        'Always close with a concrete next step (follow-up meeting, literature email, access coordinator call)',
      ]),
      nextPractice: JSON.stringify([
        'Practice the "Hard" difficulty version with the cost objection leading instead of safety',
        'Run a Competitor Comparison scenario — practice handling the "20 years of amiodarone data" objection cold',
        'Work on closing techniques — ending each session with a clear commitment',
      ]),
    },
  })

  const session2 = await prisma.practiceSession.create({
    data: {
      difficulty: 'Hard',
      objectionFocus: 'Cost',
      status: 'completed',
      durationSeconds: 318,
      doctorId: drRajesh.id,
      userId: rep.id,
    },
  })

  const turns2 = [
    { role: 'doctor', content: 'I get representatives from Glytara every few weeks. Same pitch every time. What\'s actually new?' },
    { role: 'rep', content: 'I understand, Dr. Mehta. I want to focus specifically on what I know matters to your practice — affordability and patient adherence. We\'ve just launched an updated patient access program that significantly reduces the out-of-pocket cost for patients earning below 6 lakh per year.' },
    { role: 'doctor', content: 'These access programs always sound good in the meeting and then fall apart when patients actually try to use them. The paperwork is too much.' },
    { role: 'rep', content: 'That\'s a legitimate concern and a common experience with older programs. Our new protocol assigns a dedicated access coordinator to your clinic. They handle all enrollment. Your team fills out one page.' },
    { role: 'doctor', content: 'What\'s the actual cost to my patient after the program? Numbers, not promises.' },
    { role: 'rep', content: 'For eligible patients — income below 6 lakh annually, no private insurance — the monthly cost comes down to approximately ₹800 per month. I\'ll confirm the exact number in writing today.' },
    { role: 'doctor', content: 'That is better than I expected. What about adherence? My experience with injectables is that patients stop after the first nausea episode.' },
    { role: 'rep', content: 'Glytara uses a structured escalation — 0.5mg for 4 weeks, then 1mg. Nausea incidence drops dramatically with this titration. In SUSTAIN-4, adherence at 52 weeks was 89%.' },
  ]

  for (const turn of turns2) {
    await prisma.practiceTurn.create({
      data: { ...turn, sessionId: session2.id },
    })
  }

  await prisma.practiceReport.create({
    data: {
      sessionId: session2.id,
      summary: 'Strong performance on a Hard difficulty cost-objection scenario. The rep correctly pivoted to access program specifics early and handled skepticism about program reliability with concrete details. Gave specific cost figures which is exactly what this doctor type needs. Adherence data was well-timed.',
      strengths: JSON.stringify([
        'Opened with what the doctor cares about — affordability, adherence — not generic pitch',
        'Acknowledged the legitimate concern about access program reliability',
        'Provided specific ₹800/month figure rather than vague "affordable" language',
        'Correct use of SUSTAIN-4 adherence data (89% at 52 weeks)',
        'Committed to sending numbers in writing — builds credibility',
      ]),
      weakMoments: JSON.stringify([
        'Session ended without addressing the full arc — did not bring up CV risk reduction at all',
        'Did not offer next steps or follow-up at session close',
      ]),
      missedOpportunities: JSON.stringify([
        'The MACE reduction (26%) is highly relevant for a diabetologist — missed the chance to make it a value argument beyond cost',
        'Could have offered to introduce the access coordinator directly on the call',
      ]),
      objectionHandlingScore: 82,
      clarityScore: 85,
      confidenceScore: 80,
      complianceScore: 90,
      improvements: JSON.stringify([
        'Always include the CV outcome data (MACE 26%) when talking to diabetologists — it reframes "expensive drug" as "outcome investment"',
        'End with a direct next step: "Can I have our access coordinator call your staff tomorrow to set this up?"',
      ]),
      nextPractice: JSON.stringify([
        'Practice a Medium difficulty Patient Adherence scenario with Dr. Mehta',
        'Run an Insurance/Formulary objection scenario',
        'Combine cost + efficacy scenario — harder to handle both simultaneously',
      ]),
    },
  })
  console.log('✅ 2 practice sessions + reports created')

  // ─── Post-Call Analysis ───────────────────────────────────────────────────
  await prisma.postCallAnalysis.create({
    data: {
      doctorId: drAnanya.id,
      userId: rep.id,
      transcriptId: transcript1.id,
      summary: 'Productive 15-minute interaction with Dr. Krishnamurti focused on Cardovix safety differentiation vs amiodarone. The rep successfully addressed the long-term data gap concern, provided accurate renal dosing information, and highlighted the monitoring burden reduction. The meeting ended with a clear next step: rep to send AFFIRM-3 data package and schedule a follow-up for the following Thursday.',
      doctorConcerns: JSON.stringify([
        'Lack of 20-year real-world data vs amiodarone',
        'Cost and insurance coverage for patients',
        'Dosing in elderly patients with renal impairment',
        'Monitoring requirements in a busy practice',
      ]),
      wentWell: JSON.stringify([
        'Led with the safety differentiation angle which was clearly the doctor\'s primary concern',
        'Accurately cited AFFIRM-3 thyroid AE comparison without hesitation',
        'Addressed the monitoring burden reduction clearly and concisely',
        'Secured a concrete follow-up appointment (Thursday morning)',
        'Offered the patient access program for insurance gaps',
      ]),
      couldImprove: JSON.stringify([
        'Did not proactively introduce the once-daily dosing advantage early in the conversation',
        'Could have offered to send the AFFIRM-3 PDF immediately by email rather than waiting to be asked',
        'The efficacy baseline (AFib recurrence rates) was not mentioned — left a gap in the full value story',
      ]),
      missedMoments: JSON.stringify([
        'When the doctor mentioned "my patients with complex regimens" — ideal moment to pivot to the drug interaction profile',
        'When cost was raised — could have offered to arrange a benefits check rather than just describing the program abstractly',
      ]),
      doctorIntent: 'Cautiously interested. The doctor is data-driven and not likely to prescribe without reviewing the AFFIRM-3 publication. The follow-up Thursday appointment is a real opportunity — this is not a brush-off. Bring the full data package and be prepared for deeper clinical questions.',
      nextBestActions: JSON.stringify([
        'Email AFFIRM-3 publication PDF and monitoring comparison infographic today',
        'Confirm Thursday morning follow-up in writing',
        'Arrange for patient access coordinator to send clinic-specific insurance formulary status by Wednesday',
        'Prepare a one-page elderly patient dosing summary for the Thursday meeting',
        'Ask the medical affairs team if there is a key opinion leader peer-to-peer call available — this doctor would respond to peer discussion',
      ]),
      followUpEmail: `Subject: Cardovix AFFIRM-3 Data + Thursday Confirmation — Arjun Kapoor, Ekfrazo

Dear Dr. Krishnamurti,

Thank you for your time this morning. As discussed, I am attaching the AFFIRM-3 7-year follow-up publication (JACC, 2024) and a one-page monitoring comparison summary for Cardovix vs amiodarone.

Key reference points from our conversation:
• Thyroid adverse events: 2.1% (Cardovix) vs 8.4% (amiodarone comparator) at 7 years
• Monitoring protocol: Baseline + 6-month ECG, annual LFTs only (no TFTs or PFTs required)
• Renal dosing: No adjustment needed until CrCl < 30 mL/min

I have also asked our patient access coordinator to send you a summary of insurance formulary coverage for your patient population by Wednesday.

I look forward to seeing you Thursday morning. Please let me know if you have any questions before then.

Best regards,
Arjun Kapoor
Territory Representative — Cardiology & Metabolic
Ekfrazo Technologies
+91 98XXX XXXXX`,
      crmNotes: `DOCTOR: Dr. Ananya Krishnamurti | Cardiologist | Apollo Hospitals Bengaluru
DATE: 15 Nov 2025 | PRODUCT: Cardovix 10mg | REP: Arjun Kapoor

CALL OUTCOME: Follow-up scheduled (Thu morning)
ENGAGEMENT LEVEL: High — genuine clinical interest
KEY DISCUSSION POINTS: AFFIRM-3 safety data, monitoring burden, renal dosing, patient access
DOCTOR CONCERN: Long-term data volume vs amiodarone
NEXT STEP: Email AFFIRM-3 data + schedule Thu follow-up
POTENTIAL: HIGH — evidence-driven prescriber open to data review
FLAG: Senior cardiologist, would benefit from peer KOL discussion`,
      coachingSummary: `MANAGER COACHING NOTE — Arjun Kapoor / Dr. Krishnamurti Call

STRENGTHS OBSERVED:
Arjun handled a challenging evidence-driven cardiologist well. He led with data, was accurate on key clinical parameters, and secured a follow-up appointment.

DEVELOPMENT AREA:
The rep needs to work on opening with efficacy before safety — the instinct to defend safety upfront creates a reactive dynamic. In the next call, coach Arjun to anchor the efficacy story first ("AFFIRM-3 showed comparable efficacy") before the differentiation ("with this safety advantage").

COMPLIANCE: No off-label claims observed. All cited data was within approved messaging.

RECOMMENDED NEXT COACHING: Role-play the follow-up Thursday meeting with harder pushback on the data volume gap.`,
    },
  })
  console.log('✅ Post-call analysis created')

  // ─── Notes ────────────────────────────────────────────────────────────────
  await prisma.note.create({
    data: {
      content: 'Follow up with access coordinator to confirm formulary status before Thursday meeting.',
      doctorId: drAnanya.id,
      userId: rep.id,
    },
  })
  await prisma.note.create({
    data: {
      content: 'Dr. Mehta specifically asked about the ₹800/month cost — need to confirm this exact number with the access team.',
      doctorId: drRajesh.id,
      userId: rep.id,
    },
  })
  console.log('✅ Notes created')

  // ─── Conversation Thread ──────────────────────────────────────────────────
  const thread = await prisma.conversationThread.create({
    data: {
      title: 'Battlecard + Call Prep History',
      doctorId: drAnanya.id,
    },
  })

  await prisma.message.createMany({
    data: [
      {
        role: 'system',
        content: 'Battlecard generated for Dr. Ananya Krishnamurti × Cardovix 10mg',
        metadata: JSON.stringify({ type: 'battlecard_generated' }),
        threadId: thread.id,
      },
      {
        role: 'system',
        content: 'Practice session completed — Medium difficulty, Safety focus. Score: 78/100',
        metadata: JSON.stringify({ type: 'practice_completed', score: 78 }),
        threadId: thread.id,
      },
      {
        role: 'system',
        content: 'Post-call analysis completed for Nov 15 meeting. Next action: Send AFFIRM-3 data.',
        metadata: JSON.stringify({ type: 'postcall_completed' }),
        threadId: thread.id,
      },
    ],
  })
  console.log('✅ Conversation thread created')

  console.log('\n🎉 Seed complete! Demo data ready.')
  console.log('   Login: arjun.kapoor@ekfrazo.com')
  console.log('   5 doctors, 4 products, 1 battlecard, 2 sessions, 1 analysis\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
