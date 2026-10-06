import { useState, useRef, useCallback } from 'react'
import { PhoneOff, Phone, Pause, Play, ChevronDown, ChevronUp, Check } from 'lucide-react'

const DEMO_MODE = true

// ─── Types ────────────────────────────────────────────────────────────────────
interface DemoLine {
  speaker: 'DOCTOR' | 'MR'
  text: string
  tier1: string
  delay_ms: number
}
interface LogEntry {
  ts: string          // HH:MM:SS
  speaker: 'DOCTOR' | 'MR'
  text: string
  tier1: string
  mood: string
  moodColor: string
}
interface CueCard {
  tier1: string; say: string; evidence: string; next: string
  mood: string; moodColor: string; moodDots: number
}

// ─── Demo transcript ──────────────────────────────────────────────────────────
const DEMO_TRANSCRIPT: DemoLine[] = [
  { speaker: 'DOCTOR', text: "What makes Glycomet GP better than Galvus?",              tier1: 'competitor',    delay_ms: 3000 },
  { speaker: 'MR',     text: "We show superior HbA1c reduction at 26 weeks, Doctor.",   tier1: 'efficacy',      delay_ms: 5000 },
  { speaker: 'DOCTOR', text: "Do you have Indian patient data? Not western trials.",     tier1: 'efficacy',      delay_ms: 5500 },
  { speaker: 'MR',     text: "Yes — STRIDE-India RCT, n=1,240 South Asian patients.",   tier1: 'efficacy',      delay_ms: 5000 },
  { speaker: 'DOCTOR', text: "My patients can't afford branded medicines.",              tier1: 'price',         delay_ms: 6000 },
  { speaker: 'MR',     text: "Our PSP brings cost to ₹299/month for eligible patients.",tier1: 'price',         delay_ms: 5000 },
  { speaker: 'DOCTOR', text: "What's the dosing schedule?",                              tier1: 'dosing',        delay_ms: 5000 },
  { speaker: 'MR',     text: "Once daily 5 mg with the morning meal — no titration.",   tier1: 'dosing',        delay_ms: 5500 },
  { speaker: 'DOCTOR', text: "Are you on the CGHS formulary?",                          tier1: 'formulary',     delay_ms: 6000 },
  { speaker: 'MR',     text: "Yes — CGHS empanelled since January 2024, 12 panels.",    tier1: 'formulary',     delay_ms: 5000 },
  { speaker: 'DOCTOR', text: "I'm concerned about the side effect profile.",            tier1: 'side_effects',  delay_ms: 5500 },
  { speaker: 'DOCTOR', text: "Tell me more — this seems quite interesting.",            tier1: 'positive',      delay_ms: 4500 },
]

// ─── Demo doctors ─────────────────────────────────────────────────────────────
const DEMO_DOCTORS = [
  {
    id: 'priya',
    name: 'Dr. Priya Mehta',
    specialty: 'Diabetologist',
    persona: 'Evidence-Driven',
    difficulty: 'Medium' as const,
    personaClass: 'bg-[#0D2137] text-[#58A6FF] border-[#1F4C73]',
    photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&h=80&auto=format&fit=crop&q=70',
  },
  {
    id: 'rajesh',
    name: 'Dr. Rajesh Kumar',
    specialty: 'General Physician',
    persona: 'Price-Sensitive',
    difficulty: 'Hard' as const,
    personaClass: 'bg-[#1F0D0D] text-[#F85149] border-[#5C1C1A]',
    photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&auto=format&fit=crop&q=70',
  },
  {
    id: 'ananya',
    name: 'Dr. Ananya Singh',
    specialty: 'Endocrinologist',
    persona: 'Skeptical',
    difficulty: 'Hard' as const,
    personaClass: 'bg-[#261900] text-[#D29922] border-[#4D3200]',
    photo: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=80&h=80&auto=format&fit=crop&q=70',
  },
]

// ─── Cue library ──────────────────────────────────────────────────────────────
const CUE_LIBRARY: Record<string, Omit<CueCard, 'tier1'>> = {
  competitor:     { say: "vs. Galvus, we show superior HbA1c reduction at 26 weeks with 65% lower hypoglycaemia.",   evidence: "COMPARE-DM: −1.8% HbA1c vs −1.4% (p=0.003); hypo 1.2% vs 3.4%",       next: "Shall I walk you through the head-to-head data?",              mood: 'Skeptical',    moodColor: '#F97316', moodDots: 2 },
  efficacy:       { say: "STRIDE-India RCT (n=1,240) showed −1.9% HbA1c at 52 weeks in South Asian patients.",       evidence: "STRIDE-India NEJM 2023: −1.9% HbA1c; 68% reaching target <7%",       next: "I have the full paper here — would you like a copy?",          mood: 'Neutral',      moodColor: '#F0A500', moodDots: 3 },
  price:          { say: "We have a PSP — eligible patients pay ₹299/month after programme enrolment.",               evidence: "PSP: up to 70% subsidy; 4,200 patients enrolled in Maharashtra",      next: "Can I register your next 5 patients in the programme today?",  mood: 'Warm',         moodColor: '#3FB950', moodDots: 5 },
  dosing:         { say: "Once-daily 5 mg with the morning meal — no titration needed for most patients.",            evidence: "Label: 5 mg OD; renal dose adjustment only at eGFR <45",             next: "Would a dosing card for your prescription pad be helpful?",    mood: 'Warm',         moodColor: '#3FB950', moodDots: 4 },
  formulary:      { say: "We're CGHS empanelled and on 12 major insurance panels here.",                              evidence: "CGHS since Jan 2024; SBI, HDFC Health, Star Health all covered",      next: "Which insurer do most of your patients use? I'll confirm.",    mood: 'Neutral',      moodColor: '#F0A500', moodDots: 3 },
  side_effects:   { say: "Our safety data shows GI events under 3% — lower than the class average.",                 evidence: "ACCORD-India 2022: GI AEs 2.8% vs 4.1% comparator (p<0.05)",         next: "Can I share the full safety dossier with you?",               mood: 'Neutral',      moodColor: '#F0A500', moodDots: 3 },
  positive:       { say: "Excellent — let me leave 10 samples and our starter kit with full study references.",       evidence: "Starter kit: 10 samples + STRIDE-India reprint + PSP enrolment form", next: "Should I schedule a CME with your team next month?",           mood: 'Warm',         moodColor: '#3FB950', moodDots: 5 },
  not_interested: { say: "I understand you're busy, Doctor. Let me leave samples — one trial patient is all I ask.", evidence: "Avg meaningful response seen in just 4 weeks",                        next: "Which patient starting this week would benefit most?",         mood: 'Resistant',    moodColor: '#F85149', moodDots: 1 },
}

function fmtTime(s: number) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}` }
function nowTs() {
  const d = new Date()
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LiveCallPage() {
  const [selectedDoctorId, setSelectedDoctorId] = useState(DEMO_DOCTORS[0].id)
  const [isLive, setIsLive]     = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [micDenied, setMicDenied] = useState(false)

  const [currentText, setCurrentText]       = useState('')
  const [currentSpeaker, setCurrentSpeaker] = useState<'DOCTOR' | 'MR' | null>(null)
  const [currentCue, setCurrentCue]         = useState<CueCard | null>(null)
  const [cueSlideIn, setCueSlideIn]         = useState(false)
  const [cueUsed, setCueUsed]               = useState(false)

  const [callLog, setCallLog]       = useState<LogEntry[]>([])
  const [logExpanded, setLogExpanded] = useState(false)
  const [elapsed, setElapsed]       = useState(0)

  const isLiveRef  = useRef(false)
  const isPausedRef = useRef(false)
  const demoRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerRef   = useRef<number | null>(null)
  const startRef   = useRef(0)

  const selectedDoctor = DEMO_DOCTORS.find(d => d.id === selectedDoctorId)!

  // ── Elapsed ticker ───────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    startRef.current = Date.now() - elapsed * 1000
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
  }, [elapsed])
  const stopTimer = () => { if (timerRef.current) clearInterval(timerRef.current) }

  // ── Demo replay ───────────────────────────────────────────────────────────────
  const scheduleLine = useCallback((idx: number) => {
    if (idx >= DEMO_TRANSCRIPT.length) return
    const line = DEMO_TRANSCRIPT[idx]
    demoRef.current = setTimeout(() => {
      if (!isLiveRef.current) return
      const cueBase = CUE_LIBRARY[line.tier1]
      const cue: CueCard = { ...cueBase, tier1: line.tier1 }

      setCurrentText(line.text)
      setCurrentSpeaker(line.speaker)

      if (line.speaker === 'DOCTOR') {
        setCueUsed(false)
        setCueSlideIn(false)
        setTimeout(() => { setCurrentCue(cue); setCueSlideIn(true) }, 120)
        setCallLog(prev => [...prev, {
          ts: nowTs(), speaker: line.speaker, text: line.text,
          tier1: line.tier1, mood: cueBase.mood, moodColor: cueBase.moodColor,
        }])
      }
      scheduleLine(idx + 1)
    }, line.delay_ms)
  }, [])

  // ── Start / pause / end ───────────────────────────────────────────────────────
  const startDemo = async () => {
    if (!DEMO_MODE) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        // live mic: WebSocket to ws://localhost:4000/ws/deepgram-relay
        // (stub — not implemented; falls through to demo)
      } catch {
        setMicDenied(true)
      }
    }
    setIsLive(true)
    isLiveRef.current = true
    isPausedRef.current = false
    setIsPaused(false)
    setCallLog([])
    setCurrentCue(null)
    setCueSlideIn(false)
    setCueUsed(false)
    setCurrentText('')
    setCurrentSpeaker(null)
    setElapsed(0)
    startRef.current = Date.now()
    startTimer()
    scheduleLine(0)
  }

  const togglePause = () => {
    const next = !isPaused
    setIsPaused(next)
    isPausedRef.current = next
    if (next) {
      stopTimer()
      if (demoRef.current) clearTimeout(demoRef.current)
    } else {
      startTimer()
    }
  }

  const endCall = () => {
    isLiveRef.current = false
    setIsLive(false)
    setIsPaused(false)
    stopTimer()
    if (demoRef.current) clearTimeout(demoRef.current)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      {/* Mic denied warning */}
      {micDenied && (
        <div className="rounded-lg px-4 py-2.5 text-sm flex items-center gap-2"
          style={{ background: '#261900', border: '1px solid #4D3200', color: '#F0A500' }}>
          ⚠ Mic access denied — running in demo mode
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: '#F85149' }} />
              <span className="text-sm font-bold" style={{ color: '#F85149' }}>LIVE</span>
            </div>
          )}
          <div>
            <h1 className="page-title text-base">{selectedDoctor.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs" style={{ color: '#8B949E' }}>{selectedDoctor.specialty}</span>
              <span className={`inline-flex items-center rounded-full border px-2 py-0 text-[10px] font-medium ${selectedDoctor.personaClass}`}>
                {selectedDoctor.persona}
              </span>
            </div>
          </div>
        </div>

        {isLive ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: '#261900', color: '#F0A500', border: '1px solid #4D3200' }}>
              {fmtTime(elapsed)}
            </span>
            <button onClick={togglePause}
              className="h-9 w-9 rounded-lg flex items-center justify-center"
              style={{ background: '#1C2333', border: '1px solid #30363D', color: '#8B949E' }}>
              {isPaused ? <Play style={{ width: 14, height: 14 }} /> : <Pause style={{ width: 14, height: 14 }} />}
            </button>
            <button onClick={endCall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: '#1F0D0D', border: '1px solid #5C1C1A', color: '#F85149' }}>
              <PhoneOff style={{ width: 14, height: 14 }} /> End Call
            </button>
          </div>
        ) : (
          /* Doctor dropdown — shown before starting */
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="text-sm rounded-lg px-3 py-2"
            style={{ background: '#1C2333', border: '1px solid #30363D', color: '#C9D1D9', outline: 'none' }}>
            {DEMO_DOCTORS.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.difficulty})</option>
            ))}
          </select>
        )}
      </div>

      {/* Start button */}
      {!isLive && (
        <button onClick={startDemo}
          className="w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2"
          style={{ background: '#F0A500', color: '#0D1117' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#C87D00' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F0A500' }}>
          <Phone style={{ width: 18, height: 18 }} />
          Start Demo Call
        </button>
      )}

      {/* Waveform + transcript line */}
      {isLive && (
        <div className="rounded-[10px] border px-4 py-3 flex items-center gap-3"
          style={{ background: '#161B22', borderColor: '#30363D' }}>
          <div className="flex items-center gap-0.5" style={{ height: 28 }}>
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="inline-block rounded-sm" style={{
                width: 4,
                background: isPaused ? '#30363D' : '#F0A500',
                animation: isPaused ? 'none' : `waveBar 1.2s ease-in-out ${i * 0.1}s infinite`,
                height: isPaused ? 6 : undefined,
              }} />
            ))}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold" style={{ color: isPaused ? '#484F58' : '#F0A500' }}>
              {isPaused ? 'Paused'
                : currentSpeaker === 'DOCTOR' ? '🎤 Doctor speaking…'
                : currentSpeaker === 'MR'     ? '🎤 MR speaking…'
                : 'Listening…'}
            </span>
            {currentText && (
              <span className="text-xs italic truncate mt-0.5" style={{ color: '#8B949E' }}>
                "{currentText}"
              </span>
            )}
          </div>
        </div>
      )}

      {/* Cue card */}
      {isLive && currentCue && (
        <div
          className="rounded-[10px] border overflow-hidden"
          style={{
            background: '#161B22', borderColor: '#30363D',
            opacity: cueUsed ? 0.35 : cueSlideIn ? 1 : 0,
            transform: cueUsed ? 'scale(0.98)' : cueSlideIn ? 'translateX(0)' : 'translateX(16px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
          }}>
          <div className="px-4 py-3" style={{ background: 'rgba(240,165,0,0.1)', borderBottom: '1px solid #30363D' }}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#F0A500' }}>
                💬 SAY THIS NOW
              </div>
              {!cueUsed && (
                <button
                  onClick={() => setCueUsed(true)}
                  className="flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 transition-all"
                  style={{ background: '#12201A', color: '#3FB950', border: '1px solid #1F5231' }}>
                  <Check style={{ width: 10, height: 10 }} /> Used
                </button>
              )}
              {cueUsed && (
                <span className="text-xs" style={{ color: '#3FB950' }}>✓ Used</span>
              )}
            </div>
            <p className="font-semibold text-sm" style={{ color: '#F0F6FC' }}>"{currentCue.say}"</p>
          </div>
          <div className="px-4 py-3" style={{ background: 'rgba(0,180,216,0.06)', borderBottom: '1px solid #30363D' }}>
            <div className="text-xs font-semibold mb-1" style={{ color: '#00B4D8' }}>📊 EVIDENCE</div>
            <p className="text-sm" style={{ color: '#C9D1D9' }}>{currentCue.evidence}</p>
          </div>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #30363D' }}>
            <div className="text-xs font-semibold mb-1" style={{ color: '#8B949E' }}>❓ BRIDGE</div>
            <p className="text-sm" style={{ color: '#C9D1D9' }}>"{currentCue.next}"</p>
          </div>
          <div className="px-4 py-2.5 flex items-center gap-2">
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-2 w-2 rounded-full"
                  style={{ background: i <= currentCue.moodDots ? currentCue.moodColor : '#1C2333' }} />
              ))}
            </div>
            <span className="text-xs font-semibold" style={{ color: currentCue.moodColor }}>
              {currentCue.mood.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Call log — collapsed by default */}
      {isLive && callLog.length > 0 && (
        <div className="rounded-[10px] border" style={{ background: '#161B22', borderColor: '#30363D' }}>
          <button
            onClick={() => setLogExpanded(e => !e)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider"
            style={{ color: '#484F58' }}>
            <span>Call Log ({callLog.length})</span>
            {logExpanded
              ? <ChevronUp style={{ width: 14, height: 14 }} />
              : <ChevronDown style={{ width: 14, height: 14 }} />}
          </button>
          {logExpanded && (
            <div className="divide-y max-h-48 overflow-y-auto scrollbar-thin" style={{ borderColor: '#1C2333' }}>
              {[...callLog].reverse().map((entry, i) => (
                <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                  <span className="font-mono text-[10px] shrink-0 mt-0.5" style={{ color: '#484F58' }}>{entry.ts}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium mb-0.5"
                      style={{ color: entry.speaker === 'DOCTOR' ? '#F0A500' : '#00B4D8' }}>
                      {entry.speaker}
                    </div>
                    <div className="text-xs italic truncate" style={{ color: '#8B949E' }}>"{entry.text}"</div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-[10px] font-mono" style={{ color: '#484F58' }}>{entry.tier1}</span>
                    <span className="text-[10px] font-semibold" style={{ color: entry.moodColor }}>{entry.mood}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* End summary */}
      {!isLive && callLog.length > 0 && (
        <div className="rounded-[10px] border p-5 space-y-3 fade-in"
          style={{ background: '#161B22', borderColor: '#30363D' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>Call Summary</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Duration',  value: fmtTime(elapsed) },
              { label: 'Cue Cards', value: String(callLog.length) },
              { label: 'Doctor',    value: selectedDoctor.persona },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg px-3 py-2 text-center"
                style={{ background: '#1C2333', border: '1px solid #30363D' }}>
                <div className="text-sm font-bold" style={{ color: '#F0F6FC' }}>{value}</div>
                <div className="text-xs" style={{ color: '#484F58' }}>{label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            {callLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 text-xs py-2"
                style={{ borderBottom: '1px solid #1C2333' }}>
                <span className="font-mono shrink-0" style={{ color: '#484F58' }}>{entry.ts}</span>
                <span className="font-medium shrink-0" style={{ color: entry.speaker === 'DOCTOR' ? '#F0A500' : '#00B4D8' }}>
                  {entry.speaker}
                </span>
                <span className="italic flex-1 truncate" style={{ color: '#8B949E' }}>"{entry.text}"</span>
                <span className="font-medium shrink-0" style={{ color: entry.moodColor }}>{entry.mood}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setCallLog([]); setElapsed(0); setCurrentCue(null); setCurrentText('') }}
            className="text-xs" style={{ color: '#F0A500' }}>
            Clear &amp; Start New →
          </button>
        </div>
      )}
    </div>
  )
}
