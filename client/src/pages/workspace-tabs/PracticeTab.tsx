import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, Send, RefreshCw, ChevronRight, ArrowLeft, BarChart2, Check } from 'lucide-react'
import { DoctorProfile } from '../../types'
import { Button } from '../../components/ui/button'
import { myMetrics } from '../../data/productivityData'

// ─── DEMO_MODE: all AI is local, no fetch calls ───────────────────────────────
const DEMO_MODE = true

// ─── Types ────────────────────────────────────────────────────────────────────
interface DemoDoctor {
  id: string
  name: string
  specialty: string
  hospital: string
  persona: string
  personaClass: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  concern: string
  photo: string
  turns: string[]
}
interface Turn { role: 'rep' | 'doctor'; text: string }
interface CueCard { say: string; evidence: string; next: string; mood: 'Warm' | 'Neutral' | 'Skeptical' | 'Resistant' }
interface Scores { opening: number; productKnowledge: number; objectionHandling: number; closing: number; compliance: number }
interface FinalReport { total: number; grade: string; dims: Scores; coaching: string; strengths: string[]; improvements: string[] }

const MAX_SCORES: Scores = { opening: 15, productKnowledge: 25, objectionHandling: 25, closing: 20, compliance: 15 }

// ─── Demo doctors ─────────────────────────────────────────────────────────────
const DEMO_DOCTORS: DemoDoctor[] = [
  {
    id: 'dr-priya-mehta',
    name: 'Dr. Priya Mehta',
    specialty: 'Diabetologist',
    hospital: 'Manipal Hospital',
    persona: 'Evidence-Driven',
    personaClass: 'bg-[#0D2137] text-[#58A6FF] border-[#1F4C73]',
    difficulty: 'Medium',
    concern: 'Needs Indian patient data; compares against Galvus',
    photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&h=120&auto=format&fit=crop&q=70',
    turns: [
      "Good morning. You have 5 minutes — what's the key message?",
      "What makes this better than Galvus which I already prescribe?",
      "Do you have Indian patient data? Not just western trials.",
      "That HbA1c data is interesting. What's the dosing flexibility?",
      "Alright, leave me a sample. I'll trial 3 patients next week.",
    ],
  },
  {
    id: 'dr-rajesh-kumar',
    name: 'Dr. Rajesh Kumar',
    specialty: 'General Physician',
    hospital: 'Fortis Hospital, Mulund',
    persona: 'Price-Sensitive',
    personaClass: 'bg-[#1F0D0D] text-[#F85149] border-[#5C1C1A]',
    difficulty: 'Easy',
    concern: 'Generic prescriber — needs cost and PSP details',
    photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=120&h=120&auto=format&fit=crop&q=70',
    turns: [
      "I mostly prescribe generics. Why should my patients pay more?",
      "What patient support scheme does your company offer?",
      "Can the patient get this for under ₹500 a month?",
      "That's more affordable than I thought. Any free starter pack?",
      "Fine, give me samples for 5 patients. I'll check adherence.",
    ],
  },
  {
    id: 'dr-ananya-singh',
    name: 'Dr. Ananya Singh',
    specialty: 'Endocrinologist',
    hospital: 'Lilavati Hospital, Bandra',
    persona: 'Skeptical',
    personaClass: 'bg-[#261900] text-[#D29922] border-[#4D3200]',
    difficulty: 'Hard',
    concern: 'Long-term Januvia user; demands CV outcome and safety data',
    photo: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=120&h=120&auto=format&fit=crop&q=70',
    turns: [
      "I'm not switching from Januvia without very strong evidence.",
      "Show me the pancreatitis risk data from the drug label.",
      "What about long-term cardiovascular outcomes?",
      "The CV data is more robust than I expected. Send me the full paper.",
      "Email STRIDE-India to me. I'll consider a few patients.",
    ],
  },
]

// ─── Tier 1 pattern matching ──────────────────────────────────────────────────
const PATTERNS: Array<{ regex: RegExp; key: string }> = [
  { regex: /side.?effect|adverse|safe|tolerab/i,                     key: 'side_effects' },
  { regex: /galvus|trajenta|januvia|jardiance|forxiga|competitor/i,   key: 'competitor' },
  { regex: /proof|evidence|data|study|trial|efficacy|rct/i,          key: 'efficacy' },
  { regex: /cost|price|afford|expensive|cheap|patient.?support|psp/i, key: 'price' },
  { regex: /formulary|covered|insurance|empanelled|listed/i,          key: 'formulary' },
  { regex: /dose|dosing|mg|once.?daily|twice|frequency|titrat/i,      key: 'dosing' },
  { regex: /not interested|busy|next patient|no time/i,               key: 'closing' },
  { regex: /interesting|tell me more|sample|consider|try|prescribe/i, key: 'positive' },
]
function matchTier1(text: string): string | null {
  for (const p of PATTERNS) if (p.regex.test(text)) return p.key
  return null
}

// ─── Cue card library ─────────────────────────────────────────────────────────
const CUE_LIBRARY: Record<string, CueCard> = {
  side_effects: { say: "Our safety data shows GI events under 3% — lower than the class average.",            evidence: "ACCORD-India 2022: GI AEs 2.8% vs 4.1% comparator (p<0.05)",         next: "Can I share the full safety dossier with you?",                mood: 'Neutral'   },
  competitor:   { say: "vs. competitors we show superior HbA1c reduction at 26 weeks with lower hypoglycaemia.", evidence: "COMPARE-DM: −1.8% HbA1c vs −1.4% (p=0.003); hypo 1.2% vs 3.4%",   next: "Shall I walk you through the head-to-head data?",              mood: 'Skeptical' },
  efficacy:     { say: "STRIDE-India RCT (n=1,240 Indian patients) showed −1.9% HbA1c at 52 weeks.",          evidence: "STRIDE-India NEJM 2023: −1.9% HbA1c; 68% reaching target <7%",     next: "I have the full paper here — would you like a copy?",          mood: 'Neutral'   },
  price:        { say: "We have a PSP — eligible patients pay ₹299/month after enrolment.",                   evidence: "PSP: up to 70% subsidy; 4,200 patients enrolled in Maharashtra",   next: "Can I register your next 5 patients in the programme today?",  mood: 'Warm'      },
  formulary:    { say: "We're CGHS empanelled and on 12 major insurance panels in this city.",                 evidence: "CGHS since Jan 2024; SBI, HDFC Health, Star Health covered",       next: "Which insurer do most patients use? I can confirm coverage.",  mood: 'Neutral'   },
  dosing:       { say: "Once-daily 5 mg with morning meal — no titration needed for most patients.",           evidence: "Label: 5 mg OD; renal dose adjustment at eGFR <45",               next: "Would a dosing card for your prescription pad be helpful?",    mood: 'Warm'      },
  closing:      { say: "I understand you're busy. Let me leave samples — one trial patient is all I ask.",     evidence: "Avg time to meaningful response: 4 weeks",                        next: "Which patient starting this week would benefit most?",         mood: 'Resistant' },
  positive:     { say: "Excellent — let me leave 10 samples and our starter kit with full study references.",  evidence: "Starter kit: 10 samples + STRIDE-India reprint + PSP form",       next: "Should I schedule a CME with your team next month?",           mood: 'Warm'      },
}
const DEFAULT_CUE: CueCard = {
  say: "Focus on the key clinical benefit most relevant to your patient population.",
  evidence: "STRIDE-India 2023: superior HbA1c reduction in South Asian patients",
  next: "What's your main concern? Let me address it directly.",
  mood: 'Neutral',
}
const MOOD_COLOR: Record<CueCard['mood'], string> = {
  Warm:      '#3FB950',
  Neutral:   '#F0A500',
  Skeptical: '#F97316',
  Resistant: '#F85149',
}
const DIFF_CLASS: Record<DemoDoctor['difficulty'], string> = {
  Easy:   'bg-[#12201A] text-[#3FB950] border-[#1F5231]',
  Medium: 'bg-[#261900] text-[#D29922] border-[#4D3200]',
  Hard:   'bg-[#1F0D0D] text-[#F85149] border-[#5C1C1A]',
}

// ─── Score helpers ────────────────────────────────────────────────────────────
const INIT_SCORES: Scores = { opening: 0, productKnowledge: 0, objectionHandling: 0, closing: 0, compliance: 100 }

function computeDelta(text: string, tier1: string | null, idx: number): Partial<Scores> {
  const lower = text.toLowerCase()
  return {
    opening:           idx === 0 ? (lower.includes('morning') || lower.includes('pleasure') ? 14 : 9) : undefined,
    productKnowledge:  tier1 === 'efficacy' ? 22 : tier1 === 'dosing' ? 20 : text.length > 80 ? 16 : 12,
    objectionHandling: tier1 ? 21 : text.length > 60 ? 16 : 10,
    closing:           idx > 2 && (lower.includes('sample') || lower.includes('prescribe') || lower.includes('trial')) ? 18 : undefined,
    compliance:        /guarantee|cure|best medicine/i.test(text) ? 65 : undefined,
  }
}

function applyDelta(s: Scores, d: Partial<Scores>): Scores {
  return {
    opening:           d.opening           !== undefined ? Math.max(s.opening,           d.opening)           : s.opening,
    productKnowledge:  d.productKnowledge  !== undefined ? Math.max(s.productKnowledge,  d.productKnowledge)  : s.productKnowledge,
    objectionHandling: d.objectionHandling !== undefined ? Math.max(s.objectionHandling, d.objectionHandling) : s.objectionHandling,
    closing:           d.closing           !== undefined ? Math.max(s.closing,           d.closing)           : s.closing,
    compliance:        d.compliance        !== undefined ? Math.min(s.compliance,        d.compliance)        : s.compliance,
  }
}

function computeReport(scores: Scores, doctor: DemoDoctor): FinalReport {
  const dims: Scores = {
    opening:           Math.min(scores.opening,           MAX_SCORES.opening),
    productKnowledge:  Math.min(scores.productKnowledge,  MAX_SCORES.productKnowledge),
    objectionHandling: Math.min(scores.objectionHandling, MAX_SCORES.objectionHandling),
    closing:           Math.min(scores.closing,           MAX_SCORES.closing),
    compliance:        Math.min(scores.compliance,        MAX_SCORES.compliance),
  }
  const total = Object.values(dims).reduce((a, b) => a + b, 0)
  const grade = total >= 80 ? 'A' : total >= 65 ? 'B' : total >= 50 ? 'C' : 'D'

  const strengths = total >= 70
    ? ['Clear, focused opening statement', 'Relevant evidence recall', 'Professional tone throughout']
    : ['Professional demeanor maintained']

  const improvements: string[] = []
  if (dims.objectionHandling < 20) improvements.push('Name specific studies when handling objections')
  if (dims.closing < 14)           improvements.push('Ask for a trial prescription or next appointment')
  if (dims.productKnowledge < 18)  improvements.push('Quantify claims with exact trial statistics')
  if (!improvements.length)        improvements.push('Practice with the Hard difficulty persona next')

  const coaching =
    total >= 80 ? 'Strong performance — ready for high-value doctor visits.' :
    total >= 65 ? 'Good foundation — sharpen objection handling depth.' :
                  'Keep practising — focus on evidence recall and closing.'

  return { total, grade, dims, coaching, strengths, improvements }
}

// ─── SVG score ring (reusable) ────────────────────────────────────────────────
function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const r = 44, circ = 2 * Math.PI * r
  const [offset, setOffset] = useState(circ)
  useEffect(() => { const t = requestAnimationFrame(() => setOffset(circ * (1 - score / 100))); return () => cancelAnimationFrame(t) }, [score, circ])
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
      <defs>
        <linearGradient id="ptRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F0A500" /><stop offset="100%" stopColor="#00B4D8" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1C2333" strokeWidth="5" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="url(#ptRingGrad)" strokeWidth="5"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props { doctor: DoctorProfile }

export function PracticeTab({ doctor: _doctor }: Props) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'setup' | 'session' | 'ended'>('setup')
  const [selectedDoc, setSelectedDoc] = useState<DemoDoctor | null>(null)
  const [conversation, setConversation] = useState<Turn[]>([])
  const [turnIndex, setTurnIndex] = useState(0)
  const [currentCue, setCurrentCue] = useState<CueCard | null>(null)
  const [cueVisible, setCueVisible] = useState(false)
  const [cueUsed, setCueUsed] = useState(false)
  const [inputText, setInputText] = useState('')
  const [scores, setScores] = useState<Scores>(INIT_SCORES)
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null)
  const [isSending, setIsSending] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [conversation])

  const startSession = (doc: DemoDoctor) => {
    setSelectedDoc(doc)
    setConversation([{ role: 'doctor', text: doc.turns[0] }])
    setTurnIndex(0)
    setScores(INIT_SCORES)
    setCurrentCue(null)
    setCueVisible(false)
    setCueUsed(false)
    setInputText('')
    setPhase('session')
  }

  const handleSend = () => {
    if (!inputText.trim() || !selectedDoc || isSending) return
    const text = inputText.trim()
    setInputText('')
    setIsSending(true)

    const tier1 = matchTier1(text)
    setConversation(prev => [...prev, { role: 'rep', text }])
    setScores(prev => applyDelta(prev, computeDelta(text, tier1, turnIndex)))

    const nextIdx = turnIndex + 1
    const cue = CUE_LIBRARY[tier1 ?? ''] ?? DEFAULT_CUE
    setCueUsed(false)
    setCueVisible(false)
    setTimeout(() => { setCurrentCue(cue); setCueVisible(true) }, 200)

    setTimeout(() => {
      if (nextIdx < selectedDoc.turns.length) {
        setTurnIndex(nextIdx)
        setConversation(prev => [...prev, { role: 'doctor', text: selectedDoc.turns[nextIdx] }])
        if (nextIdx === selectedDoc.turns.length - 1) {
          setTimeout(() => {
            setFinalReport(computeReport(scores, selectedDoc))
            setPhase('ended')
          }, 1500)
        }
      }
      setIsSending(false)
    }, 600)
  }

  const resetToSetup = () => {
    setPhase('setup'); setSelectedDoc(null); setFinalReport(null)
    setConversation([]); setCurrentCue(null); setCueVisible(false)
  }

  // ── Phase 1: Setup ───────────────────────────────────────────────────────────
  if (phase === 'setup') {
    const pct = Math.round((myMetrics.weeklyDone / myMetrics.weeklyGoal) * 100)
    return (
      <div className="space-y-5">
        {/* My performance mini-strip */}
        <div className="rounded-[10px] border px-4 py-3 flex items-center gap-4 flex-wrap"
          style={{ background: '#161B22', borderColor: '#30363D' }}>
          <span className="text-xl">🔥</span>
          <div>
            <div className="text-sm font-bold" style={{ color: '#F0A500' }}>{myMetrics.streak}d streak</div>
          </div>
          <div className="w-px h-6 shrink-0" style={{ background: '#30363D' }} />
          <div className="flex-1 min-w-[120px]">
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: '#8B949E' }}>This week</span>
              <span style={{ color: '#F0F6FC' }}>{myMetrics.weeklyDone}/{myMetrics.weeklyGoal}</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: '#1C2333' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#3FB950' }} />
            </div>
          </div>
          <div className="w-px h-6 shrink-0" style={{ background: '#30363D' }} />
          <div className="text-center">
            <div className="text-sm font-bold" style={{ color: '#58A6FF' }}>{myMetrics.avgScore}</div>
            <div className="text-xs" style={{ color: '#8B949E' }}>avg score</div>
          </div>
          <button onClick={() => navigate('/analytics')}
            className="ml-auto flex items-center gap-1 text-xs" style={{ color: '#F0A500' }}>
            <BarChart2 style={{ width: 12, height: 12 }} /> Analytics
          </button>
        </div>

        {/* Product selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium whitespace-nowrap" style={{ color: '#8B949E' }}>Product</label>
          <select
            className="text-sm rounded-lg px-3 py-1.5"
            style={{ background: '#1C2333', border: '1px solid #30363D', color: '#C9D1D9', outline: 'none' }}>
            <option>Glycomet GP 1 mg / 500 mg</option>
            <option>Glycomet GP 2 mg / 500 mg</option>
            <option>Glycomet SR 500 mg</option>
          </select>
        </div>

        {/* Doctor selector */}
        <div>
          <h3 className="font-semibold mb-1" style={{ color: '#F0F6FC' }}>Choose a Doctor Persona</h3>
          <p className="text-xs mb-4" style={{ color: '#8B949E' }}>
            Practice against a scripted AI doctor — realistic objections, no API key needed.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {DEMO_DOCTORS.map((doc) => (
              <div key={doc.id}
                className="rounded-[10px] border p-4 flex flex-col gap-3 cursor-pointer transition-all duration-200"
                style={{ background: '#161B22', borderColor: '#30363D' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#F0A500'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,.5)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#30363D'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0"
                    style={{ border: '1px solid #30363D' }}>
                    <img src={doc.photo} alt={doc.name} className="h-full w-full object-cover"
                      onError={(e) => {
                        const t = e.currentTarget; t.onerror = null; t.style.display = 'none'
                        const p = t.parentElement!
                        p.style.background = 'linear-gradient(135deg,#F0A500,#00B4D8)'
                        p.style.display = 'flex'; p.style.alignItems = 'center'
                        p.style.justifyContent = 'center'; p.style.color = '#fff'
                        p.style.fontWeight = '700'; p.style.fontSize = '16px'
                        p.innerHTML = doc.name.split(' ').slice(0, 2).map(w => w[0]).join('')
                      }}
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: '#F0F6FC' }}>{doc.name}</div>
                    <div className="text-xs" style={{ color: '#8B949E' }}>{doc.specialty}</div>
                    <div className="text-[10px] truncate" style={{ color: '#484F58' }}>{doc.hospital}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${doc.personaClass}`}>
                    {doc.persona}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${DIFF_CLASS[doc.difficulty]}`}>
                    {doc.difficulty}
                  </span>
                </div>
                <p className="text-xs" style={{ color: '#8B949E' }}>{doc.concern}</p>
                <Button onClick={() => startSession(doc)} className="w-full gap-2 mt-auto">
                  <Mic className="h-3.5 w-3.5" /> Start Practice
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Phase 2: Session ─────────────────────────────────────────────────────────
  if (phase === 'session' && selectedDoc) {
    const totalPossible = Object.values(MAX_SCORES).reduce((a, b) => a + b, 0) // 100
    const currentTotal = Math.min(
      Object.entries(scores).reduce((sum, [k, v]) => sum + Math.min(v, MAX_SCORES[k as keyof Scores]), 0),
      totalPossible,
    )
    const userTurns = conversation.filter(t => t.role === 'rep').length
    const maxTurns = selectedDoc.turns.length - 1

    return (
      <div className="flex flex-col gap-4 h-full">
        {/* Session header */}
        <div className="flex items-center justify-between">
          <button onClick={resetToSetup}
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: '#484F58' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#C9D1D9' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#484F58' }}>
            <ArrowLeft style={{ width: 12, height: 12 }} /> Change Doctor
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: '#484F58' }}>
              Turn {userTurns} / {maxTurns}
            </span>
            <button onClick={() => {
              const r = computeReport(scores, selectedDoc)
              setFinalReport(r); setPhase('ended')
            }}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: '#1C2333', color: '#F85149', border: '1px solid #5C1C1A' }}>
              End Session
            </button>
          </div>
        </div>

        {/* Main 2-col layout: 40% left / 60% right */}
        <div className="grid lg:grid-cols-5 gap-4 flex-1 min-h-0">
          {/* Left 40%: conversation */}
          <div className="lg:col-span-2 flex flex-col gap-3 min-h-0">
            {/* Doctor mini card */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-[10px] border"
              style={{ background: '#161B22', borderColor: '#30363D' }}>
              <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0"
                style={{ border: '1px solid #30363D' }}>
                <img src={selectedDoc.photo} alt={selectedDoc.name} className="h-full w-full object-cover"
                  onError={(e) => {
                    const t = e.currentTarget; t.onerror = null; t.style.display = 'none'
                    const p = t.parentElement!
                    p.style.background = 'linear-gradient(135deg,#F0A500,#00B4D8)'
                    p.style.display = 'flex'; p.style.alignItems = 'center'
                    p.style.justifyContent = 'center'; p.style.color = '#fff'
                    p.style.fontWeight = '700'; p.style.fontSize = '14px'
                    p.innerHTML = selectedDoc.name.split(' ').slice(0, 2).map(w => w[0]).join('')
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={{ color: '#F0F6FC' }}>{selectedDoc.name}</div>
                <div className="text-xs" style={{ color: '#8B949E' }}>{selectedDoc.specialty} · {selectedDoc.concern}</div>
              </div>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${selectedDoc.personaClass}`}>
                {selectedDoc.persona}
              </span>
            </div>

            {/* Chat bubbles */}
            <div ref={chatRef}
              className="flex-1 overflow-y-auto rounded-[10px] border p-4 space-y-3 scrollbar-thin"
              style={{ background: '#161B22', borderColor: '#30363D', minHeight: 200, maxHeight: 360 }}>
              {conversation.map((turn, i) => (
                <div key={i} className={`flex ${turn.role === 'rep' ? 'justify-end' : 'justify-start'}`}>
                  <div className={turn.role === 'doctor' ? 'transcript-bubble-doctor' : 'transcript-bubble-rep'}
                    style={{ maxWidth: '80%' }}>
                    {turn.text}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="transcript-bubble-doctor" style={{ maxWidth: '80%' }}>
                    <span style={{ color: '#484F58' }}>Thinking…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Type your response to the doctor (Enter to send)…"
                rows={2}
                disabled={isSending}
                className="flex-1 rounded-lg px-3 py-2 text-sm resize-none"
                style={{ background: '#1C2333', border: '1px solid #30363D', color: '#C9D1D9', outline: 'none' }}
              />
              <Button onClick={handleSend} disabled={!inputText.trim() || isSending} className="self-end gap-1">
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            </div>
          </div>

          {/* Right 60%: cue card + score */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            {/* Cue Card */}
            <div className="rounded-[10px] border overflow-hidden transition-all duration-300"
              style={{
                background: '#161B22', borderColor: '#30363D',
                opacity: cueUsed ? 0.35 : cueVisible && currentCue ? 1 : 0.4,
                transform: cueVisible && currentCue ? 'translateX(0)' : 'translateX(8px)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
              }}>
              {currentCue ? (
                <>
                  <div className="px-4 py-3" style={{ background: 'rgba(240,165,0,0.1)', borderBottom: '1px solid #30363D' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#F0A500' }}>
                        💬 Say This Now
                      </div>
                      {!cueUsed ? (
                        <button
                          onClick={() => setCueUsed(true)}
                          className="flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5"
                          style={{ background: '#12201A', color: '#3FB950', border: '1px solid #1F5231' }}>
                          <Check style={{ width: 10, height: 10 }} /> Used
                        </button>
                      ) : (
                        <span className="text-xs" style={{ color: '#3FB950' }}>✓ Used</span>
                      )}
                    </div>
                    <p className="text-sm font-medium" style={{ color: '#F0F6FC' }}>"{currentCue.say}"</p>
                  </div>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid #1C2333' }}>
                    <div className="text-xs font-medium mb-1" style={{ color: '#00B4D8' }}>📊 Evidence</div>
                    <p className="text-xs" style={{ color: '#C9D1D9' }}>{currentCue.evidence}</p>
                  </div>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid #1C2333' }}>
                    <div className="text-xs font-medium mb-1" style={{ color: '#8B949E' }}>❓ Bridge</div>
                    <p className="text-xs" style={{ color: '#C9D1D9' }}>"{currentCue.next}"</p>
                  </div>
                  <div className="px-4 py-2 flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="h-2 w-2 rounded-full"
                          style={{ background: i <= (currentCue.mood === 'Warm' ? 5 : currentCue.mood === 'Neutral' ? 3 : currentCue.mood === 'Skeptical' ? 2 : 1) ? MOOD_COLOR[currentCue.mood] : '#1C2333' }}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-medium" style={{ color: MOOD_COLOR[currentCue.mood] }}>
                      {currentCue.mood.toUpperCase()}
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-5 text-center">
                  <div className="text-2xl mb-2">💬</div>
                  <p className="text-xs" style={{ color: '#484F58' }}>
                    Cue card appears after each doctor turn
                  </p>
                </div>
              )}
            </div>

            {/* Score bars */}
            <div className="rounded-[10px] border p-4 space-y-3"
              style={{ background: '#161B22', borderColor: '#30363D' }}>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8B949E' }}>
                  Live Score
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: '#484F58' }}>
                    Turn {userTurns} / {maxTurns}
                  </span>
                  <div className="text-lg font-bold" style={{ color: '#F0A500' }}>{currentTotal}</div>
                </div>
              </div>
              {([
                ['Opening',           scores.opening,           MAX_SCORES.opening],
                ['Product Knowledge', scores.productKnowledge,  MAX_SCORES.productKnowledge],
                ['Objection Handling',scores.objectionHandling, MAX_SCORES.objectionHandling],
                ['Closing',           scores.closing,           MAX_SCORES.closing],
                ['Compliance',        scores.compliance,        MAX_SCORES.compliance],
              ] as [string, number, number][]).map(([label, val, max]) => {
                const pct = Math.round(Math.min(val, max) / max * 100)
                const color = pct >= 80 ? '#3FB950' : pct >= 60 ? '#F0A500' : '#F85149'
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: '#8B949E' }}>{label}</span>
                      <span style={{ color: '#F0F6FC', fontWeight: 600 }}>{Math.min(val, max)}/{max}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: '#1C2333' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Phase 3: Ended ───────────────────────────────────────────────────────────
  if (phase === 'ended' && finalReport && selectedDoc) {
    const gradeColor = finalReport.grade === 'A' ? '#3FB950' : finalReport.grade === 'B' ? '#F0A500' : finalReport.grade === 'C' ? '#F97316' : '#F85149'
    return (
      <div className="space-y-5 fade-in">
        <div className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>Practice Complete</div>

        {/* Score ring + grade */}
        <div className="rounded-[10px] border p-6 flex items-center gap-6"
          style={{ background: '#161B22', borderColor: '#30363D' }}>
          <div className="relative flex items-center justify-center shrink-0">
            <ScoreRing score={finalReport.total} size={110} />
            <div className="absolute flex flex-col items-center">
              <span style={{ color: '#F0F6FC', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>
                {finalReport.total}
              </span>
              <span style={{ color: '#8B949E', fontSize: '0.625rem' }}>/100</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-3xl font-bold" style={{ color: gradeColor }}>Grade {finalReport.grade}</div>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${selectedDoc.personaClass}`}>
                vs. {selectedDoc.name}
              </span>
            </div>
            <p className="text-sm" style={{ color: '#C9D1D9' }}>{finalReport.coaching}</p>
          </div>
        </div>

        {/* Dimension table */}
        <div className="rounded-[10px] border overflow-hidden"
          style={{ background: '#161B22', borderColor: '#30363D' }}>
          <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: '#8B949E', borderBottom: '1px solid #30363D' }}>
            Score Breakdown
          </div>
          {([
            ['Opening',            finalReport.dims.opening,           MAX_SCORES.opening],
            ['Product Knowledge',  finalReport.dims.productKnowledge,  MAX_SCORES.productKnowledge],
            ['Objection Handling', finalReport.dims.objectionHandling, MAX_SCORES.objectionHandling],
            ['Closing',            finalReport.dims.closing,           MAX_SCORES.closing],
            ['Compliance',         finalReport.dims.compliance,        MAX_SCORES.compliance],
          ] as [string, number, number][]).map(([label, val, max], i, arr) => {
            const pct = Math.round(val / max * 100)
            const color = pct >= 80 ? '#3FB950' : pct >= 60 ? '#F0A500' : '#F85149'
            return (
              <div key={label} className="flex items-center gap-4 px-4 py-3"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid #1C2333' : 'none' }}>
                <div className="w-40 text-sm" style={{ color: '#C9D1D9' }}>{label}</div>
                <div className="flex-1 h-1.5 rounded-full" style={{ background: '#1C2333' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
                <div className="text-sm font-semibold w-12 text-right" style={{ color }}>
                  {val}/{max}
                </div>
              </div>
            )
          })}
        </div>

        {/* Coaching report */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-[10px] border p-4"
            style={{ background: '#12201A', borderColor: '#1F5231' }}>
            <div className="text-xs font-semibold mb-2" style={{ color: '#3FB950' }}>✅ Strengths</div>
            <ul className="space-y-1">
              {finalReport.strengths.map((s, i) => (
                <li key={i} className="text-sm flex items-start gap-1.5" style={{ color: '#C9D1D9' }}>
                  <ChevronRight style={{ width: 12, height: 12, color: '#3FB950', flexShrink: 0, marginTop: 2 }} />{s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[10px] border p-4"
            style={{ background: '#261900', borderColor: '#4D3200' }}>
            <div className="text-xs font-semibold mb-2" style={{ color: '#F0A500' }}>⚡ Improve</div>
            <ul className="space-y-1">
              {finalReport.improvements.map((s, i) => (
                <li key={i} className="text-sm flex items-start gap-1.5" style={{ color: '#C9D1D9' }}>
                  <ChevronRight style={{ width: 12, height: 12, color: '#F0A500', flexShrink: 0, marginTop: 2 }} />{s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button onClick={() => startSession(selectedDoc)} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
          <Button variant="outline" onClick={resetToSetup}>
            Choose Doctor
          </Button>
          <Button variant="ghost" onClick={() => navigate('/analytics')} className="ml-auto">
            <BarChart2 className="h-4 w-4" /> Full Analytics
          </Button>
        </div>
      </div>
    )
  }

  return null
}
