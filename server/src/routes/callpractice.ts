import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

// ─── Tier 1 keyword patterns ─────────────────────────────────────────────────
const TIER1_PATTERNS: Array<{ regex: RegExp; key: string }> = [
  { regex: /side.?effect|adverse|safe|tolerab/i,                            key: 'side_effects' },
  { regex: /galvus|trajenta|januvia|jardiance|forxiga|competitor/i,          key: 'competitor' },
  { regex: /does it work|proof|evidence|data|study|trial|efficacy/i,         key: 'efficacy' },
  { regex: /cost|price|afford|expensive|cheap|patient.?support|psp/i,        key: 'price' },
  { regex: /formulary|covered|insurance|empanelled|listed/i,                 key: 'formulary' },
  { regex: /dose|dosing|mg|once.?daily|twice|frequency|titrat/i,             key: 'dosing' },
  { regex: /not interested|busy|next patient|no time|come back/i,            key: 'closing' },
  { regex: /interesting|tell me more|sample|consider|try|prescribe/i,        key: 'positive' },
]

function tier1Match(text: string): string | null {
  for (const p of TIER1_PATTERNS) if (p.regex.test(text)) return p.key
  return null
}

// ─── Doctor personas ──────────────────────────────────────────────────────────
const DOCTOR_PERSONAS: Record<string, {
  name: string; specialty: string; persona: string; competitor: string
  turns: string[]
}> = {
  'dr-priya-mehta': {
    name: 'Dr. Priya Mehta', specialty: 'Diabetologist', persona: 'Evidence-Driven',
    competitor: 'Galvus',
    turns: [
      "Good morning. You have 5 minutes — what's the key message?",
      "What makes this better than Galvus which I already prescribe?",
      "Do you have Indian patient data? Not just western trials.",
      "That HbA1c data is interesting. What's the dosing flexibility?",
      "Alright, leave me a sample. I'll try 3 patients next week.",
    ],
  },
  'dr-rajesh-kumar': {
    name: 'Dr. Rajesh Kumar', specialty: 'General Physician', persona: 'Price-Sensitive',
    competitor: 'generic metformin',
    turns: [
      "I mostly prescribe generics. Why should my patients pay more?",
      "What patient support scheme does your company offer?",
      "Can the patient get it for under ₹500 a month?",
      "That's more affordable than I thought. Any free starter pack?",
      "Fine, give me samples for 5 patients. I'll check adherence.",
    ],
  },
  'dr-ananya-singh': {
    name: 'Dr. Ananya Singh', specialty: 'Endocrinologist', persona: 'Skeptical',
    competitor: 'Januvia',
    turns: [
      "I'm not switching from Januvia without very strong evidence.",
      "Show me the pancreatitis risk data from the drug label.",
      "What about long-term cardiovascular outcomes?",
      "The CV data is more robust than I expected. Send me the full paper.",
      "Email the STRIDE-India paper to me. I'll consider a few patients.",
    ],
  },
}

// ─── In-memory session store ──────────────────────────────────────────────────
type Scores = {
  opening: number; productKnowledge: number; objectionHandling: number
  closing: number; compliance: number
}
interface Session {
  doctorId: string; turnIndex: number; turns: string[]
  scores: Scores; history: Array<{ role: string; text: string }>
}
const sessions = new Map<string, Session>()

function scoreTurn(text: string, tier1: string | null, idx: number): Partial<Scores> {
  const lower = text.toLowerCase()
  return {
    opening:          idx === 0 ? (lower.includes('morning') || lower.includes('pleasure') ? 14 : 9) : undefined,
    productKnowledge: tier1 === 'efficacy' ? 22 : tier1 === 'dosing' ? 20 : text.length > 80 ? 16 : 12,
    objectionHandling:tier1 ? 21 : text.length > 60 ? 16 : 10,
    closing:          idx > 2 && (lower.includes('sample') || lower.includes('prescribe') || lower.includes('trial')) ? 18 : undefined,
    compliance:       /guarantee|cure|best medicine/i.test(text) ? 65 : 100,
  }
}

function mergeScores(acc: Scores, delta: Partial<Scores>): Scores {
  return {
    opening:           delta.opening           !== undefined ? Math.max(acc.opening,           delta.opening)           : acc.opening,
    productKnowledge:  delta.productKnowledge  !== undefined ? Math.max(acc.productKnowledge,  delta.productKnowledge)  : acc.productKnowledge,
    objectionHandling: delta.objectionHandling !== undefined ? Math.max(acc.objectionHandling, delta.objectionHandling) : acc.objectionHandling,
    closing:           delta.closing           !== undefined ? Math.max(acc.closing,           delta.closing)           : acc.closing,
    compliance:        delta.compliance        !== undefined ? Math.min(acc.compliance,        delta.compliance)        : acc.compliance,
  }
}

const CUE_CARDS: Record<string, { say: string; evidence: string; next: string; mood: string }> = {
  side_effects: { say: "Our safety data shows GI events under 3% — lower than class average.", evidence: "ACCORD-India 2022: GI AEs 2.8% vs 4.1% comparator (p<0.05)", next: "Can I share the full safety dossier?", mood: 'Neutral' },
  competitor:   { say: "vs. competitors, we show superior HbA1c reduction at 26 weeks with lower hypoglycaemia.", evidence: "COMPARE-DM: −1.8% HbA1c vs −1.4% (p=0.003); hypo 1.2% vs 3.4%", next: "Shall I walk you through the head-to-head data?", mood: 'Skeptical' },
  efficacy:     { say: "The STRIDE-India RCT (n=1,240 Indian patients) showed −1.9% HbA1c at 52 weeks.", evidence: "STRIDE-India NEJM 2023: −1.9% HbA1c; 68% achieving <7%", next: "I have the full paper — would you like a copy?", mood: 'Neutral' },
  price:        { say: "We have a patient support programme — eligible patients pay ₹299/month after enrolment.", evidence: "PSP: up to 70% subsidy; 4,200 patients enrolled in Maharashtra", next: "Can I register your next 5 patients today?", mood: 'Warm' },
  formulary:    { say: "We are CGHS empanelled and on 12 major insurance panels in this city.", evidence: "CGHS since Jan 2024; SBI Health, HDFC Health, Star Health covered", next: "Which insurer do most patients use? I can confirm coverage.", mood: 'Neutral' },
  dosing:       { say: "Once-daily 5 mg with morning meal — no titration needed for most patients.", evidence: "Label: 5 mg OD; renal dose adjustment at eGFR <45", next: "Would a dosing card for your prescription pad help?", mood: 'Warm' },
  closing:      { say: "I understand you're busy. Let me leave samples — one trial patient is all I ask.", evidence: "Avg meaningful response: 4 weeks", next: "Which patient starting this week would benefit most?", mood: 'Resistant' },
  positive:     { say: "Excellent — let me leave 10 samples and our starter kit with study references.", evidence: "Starter kit: 10 samples + STRIDE-India reprint + PSP form", next: "Should I schedule a CME with your team next month?", mood: 'Warm' },
}

const DEFAULT_CUE = { say: "Focus on the key clinical benefit most relevant to your patients.", evidence: "STRIDE-India 2023: superior HbA1c in South Asian patients", next: "What's your main concern? Let me address it directly.", mood: 'Neutral' }

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post('/start', asyncHandler(async (req, res) => {
  const { doctor_id = 'dr-priya-mehta' } = req.body as { doctor_id?: string }
  const persona = DOCTOR_PERSONAS[doctor_id] ?? DOCTOR_PERSONAS['dr-priya-mehta']
  const sessionId = `cp_${Date.now()}`

  sessions.set(sessionId, {
    doctorId: doctor_id,
    turnIndex: 0,
    turns: persona.turns,
    scores: { opening: 0, productKnowledge: 0, objectionHandling: 0, closing: 0, compliance: 100 },
    history: [],
  })

  console.log(`[PRACTICE] 🎬 Session started | id=${sessionId} | doctor=${persona.name} | persona=${persona.persona}`)

  res.json({
    session_id: sessionId,
    doctor: { name: persona.name, specialty: persona.specialty, persona: persona.persona },
    first_message: persona.turns[0],
    status: 'active',
  })
}))

router.post('/turn', asyncHandler(async (req, res) => {
  const { session_id, utterance } = req.body as { session_id: string; utterance: string }
  const s = sessions.get(session_id)
  if (!s) { res.status(404).json({ error: 'Session not found' }); return }

  const t0 = Date.now()
  const tier1 = tier1Match(utterance ?? '')
  s.scores = mergeScores(s.scores, scoreTurn(utterance ?? '', tier1, s.turnIndex))
  s.history.push({ role: 'mr', text: utterance })
  s.turnIndex++

  const doctorReply = s.turns[Math.min(s.turnIndex, s.turns.length - 1)]
  s.history.push({ role: 'doctor', text: doctorReply })

  const cueCard = CUE_CARDS[tier1 ?? ''] ?? DEFAULT_CUE

  if (tier1) {
    console.log(`[TIER1]    ⚡ Pattern match: ${tier1} (${Date.now() - t0}ms)`)
  }
  console.log(`[PRACTICE] 🗣  Turn ${s.turnIndex} | MR: "${utterance?.slice(0, 60)}"`)
  console.log(`[SCORE]    📊 opening=${s.scores.opening} prodKnow=${s.scores.productKnowledge} objHandling=${s.scores.objectionHandling} closing=${s.scores.closing} compliance=${s.scores.compliance}`)

  res.json({
    doctor_reply: doctorReply,
    cue_card: cueCard,
    turn_index: s.turnIndex,
    is_final: s.turnIndex >= s.turns.length - 1,
  })
}))

router.post('/end', asyncHandler(async (req, res) => {
  const { session_id } = req.body as { session_id: string }
  const s = sessions.get(session_id)
  if (!s) { res.status(404).json({ error: 'Session not found' }); return }

  const MAX: Scores = { opening: 15, productKnowledge: 25, objectionHandling: 25, closing: 20, compliance: 15 }
  const dims = Object.fromEntries(
    Object.entries(s.scores).map(([k, v]) => [k, Math.min(v, MAX[k as keyof Scores])])
  )
  const total = Object.values(dims).reduce((a, b) => a + b, 0)
  const grade = total >= 80 ? 'A' : total >= 65 ? 'B' : total >= 50 ? 'C' : 'D'

  sessions.delete(session_id)

  console.log(`[PRACTICE] 🏁 Session ended | id=${session_id} | total=${total} | grade=${grade}`)

  res.json({
    score_card: { dimensions: dims, total, grade },
    history: s.history,
  })
}))

// Live call stubs
router.post('/livecall/start', asyncHandler(async (req, res) => {
  const doctor = (req.body as { doctor?: string }).doctor ?? 'Dr. Priya Mehta'
  console.log(`[LIVECALL] 📞 Session started | doctor=${doctor}`)
  res.json({ session_id: `lc_${Date.now()}`, status: 'active', doctor })
}))

router.post('/livecall/end', asyncHandler(async (req, res) => {
  console.log(`[LIVECALL] 📴 Session ended`)
  res.json({ status: 'ended', duration_sec: 342 })
}))

// Deepgram relay transcript — demo stub (called when DEMO_MODE=false on client)
router.post('/livecall/transcript', asyncHandler(async (req, res) => {
  const { speaker = 'DOCTOR', text = '', tier1 = null } = req.body as { speaker?: string; text?: string; tier1?: string | null }
  const label = speaker === 'DOCTOR' ? 'DOCTOR' : 'MR'
  console.log(`[DEEPGRAM] 🎤 Transcript | speaker=${label} | "${text?.slice(0, 80)}"`)
  if (tier1) console.log(`[TIER1]    ⚡ Pattern match: ${tier1} (0ms)`)
  res.json({ received: true })
}))

export default router
