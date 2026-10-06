import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Phone, PhoneOff, Copy, Check, AlertTriangle, ChevronRight } from 'lucide-react'
import { DEMO_DOCTORS } from '../data/demoDoctors'
import {
  TIER1, scenarioKeyFromTier1Id, SCENARIO_GUIDANCE,
  type Mood, type Tier1Card, type ScenarioGuidance,
} from '../data/tier1'

// ── SpeechRecognition browser type declarations ───────────────────────────────
interface SpeechAlternative { transcript: string; confidence: number }
interface SpeechResult { readonly length: number; isFinal: boolean; [i: number]: SpeechAlternative }
interface SpeechResultList { readonly length: number; [i: number]: SpeechResult }
interface SREvent extends Event { resultIndex: number; results: SpeechResultList }
interface SRErrorEvent extends Event { error: string }
interface SRInstance extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string
  start(): void; stop(): void; abort(): void
  onstart:      ((e: Event) => void) | null
  onend:        ((e: Event) => void) | null
  onaudiostart: ((e: Event) => void) | null
  onresult:     ((e: SREvent) => void) | null
  onerror:      ((e: SRErrorEvent) => void) | null
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SRInstance
    webkitSpeechRecognition?: new () => SRInstance
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_HISTORY  = 8
const ABORT_LIMIT  = 6
const MIN_WORDS    = 4

// ── Doctor profiles for Tier 2 context injection ──────────────────────────────
interface DoctorProfile { key: string; label: string; context: string }
const PROFILES: Record<string, DoctorProfile> = {
  gp_formulary: {
    key: 'gp_formulary',
    label: 'General Practitioner — Formulary Focus',
    context: 'GP with 200+ patients/month. Prescribes heavily from Tier 1 formulary. Price-sensitive, skeptical of new brands. Primary goal: evidence for cost-effective switch or addition.',
  },
  specialist_early_adopter: {
    key: 'specialist_early_adopter',
    label: 'Specialist — Evidence-Driven',
    context: 'Specialist at a private or academic hospital. Open to new molecules if clinical data supports. Influences junior doctors. Primary goal: peer-reviewed outcomes data and head-to-head comparisons.',
  },
  hospital_formulary_committee: {
    key: 'hospital_formulary_committee',
    label: 'Hospital Committee / Procurement',
    context: 'Pharmacist or physician on hospital procurement committee. Decides formulary additions quarterly. Primary goal: bulk pricing, safety profile, post-market surveillance, and compliance documentation.',
  },
}

function getProfileForSpecialty(specialty: string): DoctorProfile {
  const s = specialty.toLowerCase()
  if (s.includes('general') || s.includes('gp')) return PROFILES.gp_formulary
  if (s.includes('hospital') || s.includes('pharma') || s.includes('committee'))
    return PROFILES.hospital_formulary_committee
  return PROFILES.specialist_early_adopter // cardiologist, neurologist, oncologist, diabetologist, etc.
}

// ── Internal interfaces ────────────────────────────────────────────────────────
interface HistoryEntry { text: string; timestamp: number; speaker: 'customer' | 'advisor' }
interface Bubble { id: string; text: string; speaker: 'customer' | 'advisor' | 'system'; ts: number }
interface CueCardData { say: string; mood: Mood; next: string; alert: string | null }

// ── Mood → display colour ─────────────────────────────────────────────────────
const MOOD_STYLE: Record<Mood, { bg: string; color: string }> = {
  Warm:      { bg: 'rgba(63,185,80,0.12)',  color: '#3FB950' },
  Sceptical: { bg: 'rgba(240,165,0,0.12)',  color: '#F0A500' },
  Neutral:   { bg: 'rgba(139,148,158,0.12)', color: '#8B949E' },
  Urgent:    { bg: 'rgba(248,81,73,0.12)',   color: '#F85149' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function parseCardFields(text: string): CueCardData {
  const say  = text.match(/SAY_EN:\s*([\s\S]+?)(?=\nMOOD:|$)/)?.[1]?.trim()    ?? ''
  const rawMood = text.match(/MOOD:\s*(\w+)/)?.[1]?.trim() ?? 'Neutral'
  const mood = (['Warm', 'Sceptical', 'Neutral', 'Urgent'] as Mood[]).includes(rawMood as Mood)
    ? (rawMood as Mood)
    : 'Neutral'
  const next  = text.match(/NEXT_EN:\s*([\s\S]+?)(?=\nALERT:|$)/)?.[1]?.trim() ?? ''
  const rawAlert = text.match(/ALERT:\s*([\s\S]+?)$/)?.[1]?.trim() ?? ''
  return { say, mood, next, alert: rawAlert || null }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LiveCallPage() {
  // ── State (drives re-renders)
  const [isRecording,      setIsRecording]      = useState(false)
  const [customerSpeaking, setCustomerSpeaking] = useState(false)
  const [selectedDoctorId, setSelectedDoctorId] = useState(DEMO_DOCTORS[0]?.id ?? '')
  const [customerName,     setCustomerName]     = useState('')
  const [callSeconds,      setCallSeconds]      = useState(0)
  const [interimText,      setInterimText]      = useState('')
  const [bubbles,          setBubbles]          = useState<Bubble[]>([])
  const [cueCard,          setCueCard]          = useState<CueCardData | null>(null)
  const [cueCardStreaming, setCueCardStreaming]  = useState(false)
  const [scenarioKey,      setScenarioKey]      = useState<string | null>(null)
  const [statusMsg,        setStatusMsg]        = useState<string | null>(null)
  const [copied,           setCopied]           = useState(false)

  // ── Refs (for use inside event handler closures)
  const isRecordingRef      = useRef(false)
  const customerSpeakingRef = useRef(false)
  // invariant: set at FIRST interim result, cleared after isFinal and in onend
  const utteranceIsCustomerRef = useRef<boolean | null>(null)
  const recognitionRef         = useRef<SRInstance | null>(null)
  const streamControllerRef    = useRef<AbortController | null>(null)
  const transcriptHistoryRef   = useRef<HistoryEntry[]>([])
  const consecutiveAbortsRef   = useRef(0)
  const callTimerRef           = useRef<ReturnType<typeof setInterval> | null>(null)
  const greetingTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processTimerRef        = useRef<ReturnType<typeof setTimeout> | null>(null)
  // shadow state values for async / closure access
  const selectedDoctorIdRef = useRef(DEMO_DOCTORS[0]?.id ?? '')
  const customerNameRef     = useRef('')
  const transcriptEndRef    = useRef<HTMLDivElement>(null)

  // Keep shadow refs in sync
  useEffect(() => { selectedDoctorIdRef.current = selectedDoctorId }, [selectedDoctorId])
  useEffect(() => { customerNameRef.current = customerName }, [customerName])

  // ── Derived
  const selectedDoctor  = DEMO_DOCTORS.find(d => d.id === selectedDoctorId) ?? null
  const currentProfile  = getProfileForSpecialty(selectedDoctor?.specialty ?? '')
  const scenarioGuidance: ScenarioGuidance | null = scenarioKey ? (SCENARIO_GUIDANCE[scenarioKey] ?? null) : null
  const phase = !isRecording ? 'IDLE' : customerSpeaking ? 'CUSTOMER' : 'ADVISOR'

  // ── Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [bubbles, interimText])

  // ── Keyboard bindings (Space → record toggle, C → speaker toggle)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === ' ') {
        e.preventDefault()
        if (isRecordingRef.current) stopRecording()
        else startRecording()
      }
      if ((e.key === 'c' || e.key === 'C') && isRecordingRef.current) {
        toggleCustomerSpeaking()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) // no reactive deps — uses only refs

  // ── Cleanup on unmount
  useEffect(() => () => stopRecording(), [])

  // ── Call phase machine ─────────────────────────────────────────────────────

  function startRecording() {
    if (isRecordingRef.current) return
    isRecordingRef.current = true
    customerSpeakingRef.current = false
    utteranceIsCustomerRef.current = null
    consecutiveAbortsRef.current = 0
    setIsRecording(true)
    setCustomerSpeaking(false)
    setCallSeconds(0)
    setInterimText('')
    setStatusMsg(null)

    if (callTimerRef.current) clearInterval(callTimerRef.current)
    callTimerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000)

    // 500ms greeting card — if an utterance arrives before this fires, it overwrites
    if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current)
    greetingTimerRef.current = setTimeout(renderGreetingCard, 500)

    initRecognition()
  }

  function stopRecording() {
    if (!isRecordingRef.current) return
    isRecordingRef.current = false
    customerSpeakingRef.current = false
    utteranceIsCustomerRef.current = null
    setIsRecording(false)
    setCustomerSpeaking(false)
    setInterimText('')

    if (callTimerRef.current)    { clearInterval(callTimerRef.current); callTimerRef.current = null }
    if (greetingTimerRef.current) { clearTimeout(greetingTimerRef.current); greetingTimerRef.current = null }
    if (processTimerRef.current)  { clearTimeout(processTimerRef.current); processTimerRef.current = null }

    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null }
    if (streamControllerRef.current) { streamControllerRef.current.abort(); streamControllerRef.current = null }
  }

  function toggleCustomerSpeaking() {
    const next = !customerSpeakingRef.current
    customerSpeakingRef.current = next
    setCustomerSpeaking(next)
  }

  // ── Speech recognition lifecycle ──────────────────────────────────────────

  function initRecognition() {
    const SpeechRec = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRec) {
      setStatusMsg('Speech recognition is not supported in this browser. Use Chrome or Edge.')
      stopRecording()
      return
    }

    const r = new SpeechRec()
    r.continuous      = true
    r.interimResults  = true
    r.lang            = 'en-IN'

    let utteranceStarted = false

    r.onaudiostart = () => {
      consecutiveAbortsRef.current = 0
    }

    r.onresult = (event: SREvent) => {
      // ── Invariant #1: capture speaker at FIRST interim, not at isFinal ──
      if (!utteranceStarted) {
        utteranceStarted = true
        utteranceIsCustomerRef.current = customerSpeakingRef.current
      }

      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          const text          = result[0].transcript.trim()
          const wasCustomer   = utteranceIsCustomerRef.current ?? false
          utteranceStarted    = false
          utteranceIsCustomerRef.current = null

          // Push to history (capped at MAX_HISTORY)
          const entry: HistoryEntry = { text, timestamp: Date.now(), speaker: wasCustomer ? 'customer' : 'advisor' }
          transcriptHistoryRef.current = [...transcriptHistoryRef.current, entry].slice(-MAX_HISTORY)

          addBubble(text, wasCustomer ? 'customer' : 'advisor')

          // 150ms debounce — only process customer utterances
          if (wasCustomer) {
            if (processTimerRef.current) clearTimeout(processTimerRef.current)
            const capturedText = text
            processTimerRef.current = setTimeout(() => processCueCard(capturedText), 150)
          }

          setInterimText('')
        } else {
          interim += result[0].transcript
        }
      }
      if (interim) setInterimText(interim)
    }

    r.onend = () => {
      utteranceStarted = false
      utteranceIsCustomerRef.current = null // clear stale state
      if (isRecordingRef.current) {
        // Auto-restart after 300ms — keeps recognition alive across pauses
        setTimeout(() => {
          if (isRecordingRef.current && recognitionRef.current === r) {
            try { r.start() } catch { /* already started */ }
          }
        }, 300)
      }
    }

    r.onerror = (event: SRErrorEvent) => {
      const err = event.error
      if (err === 'not-allowed') {
        setStatusMsg('Microphone access denied. Allow mic permission and try again.')
        stopRecording()
      } else if (err === 'no-speech') {
        // normal silence — reset abort counter
        consecutiveAbortsRef.current = 0
      } else if (err === 'aborted') {
        consecutiveAbortsRef.current++
        if (consecutiveAbortsRef.current >= ABORT_LIMIT) {
          setStatusMsg('Mic conflict — another app (Teams, Zoom) may be using the microphone. Close it and restart.')
          stopRecording()
        }
      } else {
        addBubble(`Recognition error: ${err}`, 'system')
      }
    }

    recognitionRef.current = r
    try { r.start() } catch {
      setStatusMsg('Failed to start microphone. Check browser permissions.')
      stopRecording()
    }
  }

  // ── Two-tier detection ────────────────────────────────────────────────────

  function processCueCard(statement: string) {
    const wordCount = statement.trim().split(/\s+/).filter(Boolean).length
    if (wordCount < MIN_WORDS) return // 4-word minimum gate

    // Tier 1 — instant keyword matching (first-match-wins, word-boundary-padded)
    const t1 = checkTier1(statement)
    if (t1) {
      setCueCard(t1.card as CueCardData)
      setCueCardStreaming(false)
      setScenarioKey(scenarioKeyFromTier1Id(t1.id))
      return
    }

    // Tier 2 — LLM fallback
    setScenarioKey(null)
    void callTier2(statement)
  }

  function checkTier1(text: string) {
    const padded = ' ' + text.toLowerCase() + ' ' // word-boundary padding (invariant #2)
    for (const entry of TIER1) {
      for (const pattern of entry.patterns) {
        if (padded.includes(pattern)) return entry
      }
    }
    return null
  }

  // ── Greeting card (shown 500ms after call start) ─────────────────────────

  function renderGreetingCard() {
    const doctor = DEMO_DOCTORS.find(d => d.id === selectedDoctorIdRef.current)
    setCueCard({
      say: `Good morning. I'd like to share some clinical updates that I believe could benefit your ${doctor?.specialty?.toLowerCase() ?? 'patients'} patients.`,
      mood: 'Warm',
      next: `Call started — ${doctor?.fullName ?? 'Doctor not selected'} · ${doctor?.specialty ?? ''}. Listen for questions on efficacy, pricing, or competitors.`,
      alert: null,
    })
    setCueCardStreaming(false)
    setScenarioKey(null)
  }

  // ── Tier 2 — SSE streaming ────────────────────────────────────────────────

  async function callTier2(statement: string) {
    // Abort any in-flight stream (invariant #5)
    if (streamControllerRef.current) {
      streamControllerRef.current.abort()
      await new Promise(r => setTimeout(r, 30)) // 30ms flush gap
    }
    const controller = new AbortController()
    streamControllerRef.current = controller

    setCueCardStreaming(true)
    setCueCard({ say: '', mood: 'Neutral', next: '', alert: null })

    const doctor      = DEMO_DOCTORS.find(d => d.id === selectedDoctorIdRef.current)
    const profile     = doctor ? getProfileForSpecialty(doctor.specialty) : null
    const recentHist  = transcriptHistoryRef.current.filter(t => t.speaker === 'customer').slice(-6)
    const contextStr  = recentHist.map(t => `Doctor: ${t.text}`).join('\n')

    let fullText   = ''
    let tokenCount = 0

    try {
      const res = await fetch('/api/livecall/cuecard', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  controller.signal,
        body: JSON.stringify({
          statement,
          context:        contextStr,
          transcript:     recentHist.map(t => t.text),
          customerName:   customerNameRef.current || doctor?.fullName || '',
          profileContext: profile?.context ?? null,
          instruction:    `The doctor just said: "${statement}". Provide specific coaching guidance for THIS exact statement.`,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()

      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') break outer
          try {
            const parsed = JSON.parse(payload) as { text: string }
            fullText += parsed.text
            tokenCount++
            if (tokenCount % 2 === 0) setCueCard(parseCardFields(fullText)) // re-render every 2 tokens
          } catch { /* ignore malformed lines */ }
        }
      }
      setCueCard(parseCardFields(fullText))
    } catch (err) {
      if ((err as Error).name === 'AbortError') return // silently ignored — new utterance arrived
      setCueCard({
        say:  'Unable to load coaching guidance — check server connection.',
        mood: 'Neutral',
        next: 'Tier 1 keyword matching is still active. Continue the call.',
        alert: null,
      })
    } finally {
      setCueCardStreaming(false)
    }
  }

  // ── Bubble helpers ────────────────────────────────────────────────────────

  function addBubble(text: string, speaker: Bubble['speaker']) {
    setBubbles(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, text, speaker, ts: Date.now() }])
  }

  async function copyCard() {
    if (!cueCard?.say) return
    await navigator.clipboard.writeText(cueCard.say)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const moodStyle = cueCard ? MOOD_STYLE[cueCard.mood] : MOOD_STYLE.Neutral

  return (
    <div className="flex flex-col h-full" style={{ background: '#0D1117', minHeight: '100vh' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 px-6 py-3 flex-wrap"
        style={{ background: '#161B22', borderBottom: '1px solid #30363D' }}
      >
        {/* Doctor selector */}
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 shrink-0" style={{ color: '#8B949E' }} />
          <select
            value={selectedDoctorId}
            onChange={e => setSelectedDoctorId(e.target.value)}
            className="h-8 rounded-lg px-2 text-sm"
            style={{ background: '#1C2333', border: '1px solid #30363D', color: '#C9D1D9' }}
          >
            {DEMO_DOCTORS.map(d => (
              <option key={d.id} value={d.id}>
                {d.fullName} — {d.specialty}
              </option>
            ))}
          </select>
        </div>

        {/* Doctor name override */}
        <input
          type="text"
          placeholder="Override doctor name…"
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          className="h-8 rounded-lg px-3 text-sm"
          style={{ background: '#1C2333', border: '1px solid #30363D', color: '#C9D1D9', width: 220 }}
        />

        {/* Profile badge */}
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(88,166,255,0.1)', color: '#58A6FF', border: '1px solid rgba(88,166,255,0.2)' }}>
          {currentProfile.label}
        </span>

        {/* Call timer */}
        <div className="ml-auto font-mono text-lg font-bold" style={{ color: isRecording ? '#3FB950' : '#484F58' }}>
          {fmtTime(callSeconds)}
        </div>
      </div>

      {/* ── Status strip ────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-6 py-2"
        style={{
          background: phase === 'CUSTOMER' ? 'rgba(63,185,80,0.06)'
            : phase === 'ADVISOR' ? 'rgba(88,166,255,0.06)'
            : '#0D1117',
          borderBottom: '1px solid #21262D',
        }}
      >
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{
            background: phase === 'CUSTOMER' ? '#3FB950'
              : phase === 'ADVISOR' ? '#58A6FF'
              : '#484F58',
            boxShadow: isRecording ? '0 0 6px currentColor' : 'none',
            animation: isRecording ? 'pulse 2s infinite' : 'none',
          }}
        />
        <span className="text-sm font-medium" style={{ color: '#C9D1D9' }}>
          {phase === 'IDLE'     && 'IDLE — Press Space to start recording'}
          {phase === 'ADVISOR'  && 'RECORDING — ADVISOR speaking (press C to switch to Doctor)'}
          {phase === 'CUSTOMER' && 'RECORDING — DOCTOR speaking (press C to switch to Advisor)'}
        </span>
        {statusMsg && (
          <span className="ml-auto flex items-center gap-1 text-xs" style={{ color: '#F85149' }}>
            <AlertTriangle className="h-3.5 w-3.5" /> {statusMsg}
          </span>
        )}
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Controls + Transcript ─────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Controls */}
          <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid #21262D' }}>
            {/* Start/Stop */}
            <button
              onClick={() => isRecording ? stopRecording() : startRecording()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150"
              style={{
                background: isRecording ? 'rgba(248,81,73,0.12)' : 'rgba(63,185,80,0.12)',
                border: `1px solid ${isRecording ? '#F85149' : '#3FB950'}`,
                color: isRecording ? '#F85149' : '#3FB950',
              }}
            >
              {isRecording ? <><PhoneOff className="h-4 w-4" /> End Call</> : <><Mic className="h-4 w-4" /> Start Call</>}
            </button>
            <span className="text-xs" style={{ color: '#484F58' }}>Space</span>

            <div className="w-px h-5" style={{ background: '#30363D' }} />

            {/* Speaker toggle */}
            <button
              onClick={toggleCustomerSpeaking}
              disabled={!isRecording}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 disabled:opacity-40"
              style={{
                background: customerSpeaking ? 'rgba(63,185,80,0.12)' : 'rgba(88,166,255,0.08)',
                border: `1px solid ${customerSpeaking ? '#3FB950' : '#30363D'}`,
                color: customerSpeaking ? '#3FB950' : '#8B949E',
              }}
            >
              {customerSpeaking ? <><MicOff className="h-4 w-4" /> Doctor speaking</> : <><Mic className="h-4 w-4" /> Advisor speaking</>}
            </button>
            <span className="text-xs" style={{ color: '#484F58' }}>C</span>

            <span className="ml-auto text-xs" style={{ color: '#484F58' }}>
              {bubbles.length} utterances · {transcriptHistoryRef.current.filter(t => t.speaker === 'customer').length} doctor turns
            </span>
          </div>

          {/* Transcript */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {bubbles.length === 0 && !isRecording && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <Phone className="h-10 w-10" style={{ color: '#30363D' }} />
                <p className="text-sm" style={{ color: '#484F58' }}>
                  Press <kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: '#21262D', color: '#8B949E', border: '1px solid #30363D' }}>Space</kbd> to start recording
                </p>
                <p className="text-xs" style={{ color: '#30363D' }}>
                  Then press <kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: '#21262D', color: '#8B949E', border: '1px solid #30363D' }}>C</kbd> when the doctor speaks
                </p>
              </div>
            )}

            {bubbles.map(b => (
              <div
                key={b.id}
                className={`flex ${b.speaker === 'advisor' ? 'justify-end' : b.speaker === 'system' ? 'justify-center' : 'justify-start'}`}
              >
                {b.speaker === 'system' ? (
                  <span className="text-xs px-3 py-1 rounded-full" style={{ background: '#1C2333', color: '#484F58' }}>
                    {b.text}
                  </span>
                ) : (
                  <div
                    className="max-w-[70%] rounded-2xl px-4 py-2.5"
                    style={{
                      background: b.speaker === 'customer' ? '#161B22' : '#1A2236',
                      border: `1px solid ${b.speaker === 'customer' ? '#30363D' : 'rgba(88,166,255,0.2)'}`,
                    }}
                  >
                    <div className="text-xs mb-1 font-medium" style={{ color: b.speaker === 'customer' ? '#3FB950' : '#58A6FF' }}>
                      {b.speaker === 'customer' ? '🩺 Doctor' : '👤 Advisor'}
                    </div>
                    <p className="text-sm leading-snug" style={{ color: '#E6EDF3' }}>{b.text}</p>
                  </div>
                )}
              </div>
            ))}

            {/* Interim text */}
            {interimText && (
              <div className="flex justify-start">
                <div
                  className="max-w-[70%] rounded-2xl px-4 py-2.5"
                  style={{ background: '#0D1117', border: '1px dashed #30363D' }}
                >
                  <div className="text-xs mb-1" style={{ color: '#484F58' }}>
                    {customerSpeaking ? '🩺 Doctor' : '👤 Advisor'} (interim)
                  </div>
                  <p className="text-sm" style={{ color: '#484F58', fontStyle: 'italic' }}>{interimText}</p>
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* ── Right: Cue Card ───────────────────────────────────────────── */}
        <div
          className="w-80 shrink-0 flex flex-col overflow-y-auto"
          style={{ borderLeft: '1px solid #21262D', background: '#0D1117' }}
        >
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #21262D' }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#484F58' }}>
              Live Coaching
            </h2>
          </div>

          {!cueCard ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 text-center">
              <ChevronRight className="h-6 w-6" style={{ color: '#30363D' }} />
              <p className="text-xs" style={{ color: '#484F58' }}>
                Coaching guidance appears here when the doctor speaks
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">

              {/* SAY_EN */}
              <div
                className="rounded-xl p-4"
                style={{ background: '#161B22', border: '1px solid #30363D' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8B949E' }}>
                    Say this
                  </span>
                  <button
                    onClick={copyCard}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition-all"
                    style={{ color: copied ? '#3FB950' : '#8B949E', background: copied ? 'rgba(63,185,80,0.1)' : 'transparent' }}
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#F0F6FC' }}>
                  {cueCard.say}
                  {cueCardStreaming && <span className="inline-block w-0.5 h-3.5 ml-0.5 animate-pulse" style={{ background: '#F0A500', verticalAlign: 'middle' }} />}
                </p>
              </div>

              {/* MOOD */}
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#484F58' }}>Doctor mood:</span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: moodStyle.bg, color: moodStyle.color }}
                >
                  {cueCard.mood}
                </span>
              </div>

              {/* NEXT_EN */}
              {cueCard.next && (
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(88,166,255,0.06)', border: '1px solid rgba(88,166,255,0.15)' }}
                >
                  <div className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#58A6FF' }}>
                    Next action
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: '#C9D1D9' }}>
                    {cueCard.next}
                    {cueCardStreaming && !cueCard.say && (
                      <span className="inline-block w-0.5 h-3 ml-0.5 animate-pulse" style={{ background: '#58A6FF', verticalAlign: 'middle' }} />
                    )}
                  </p>
                </div>
              )}

              {/* ALERT */}
              {cueCard.alert && (
                <div
                  className="rounded-xl p-3 flex gap-2"
                  style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.2)' }}
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: '#F85149' }} />
                  <p className="text-xs leading-relaxed" style={{ color: '#F85149' }}>{cueCard.alert}</p>
                </div>
              )}

              {/* Scenario guidance strip */}
              {scenarioGuidance && (
                <div
                  className="rounded-xl p-3 space-y-2"
                  style={{ background: '#1C2333', border: '1px solid #30363D' }}
                >
                  <div className="text-xs font-semibold" style={{ color: '#F0A500' }}>
                    {scenarioGuidance.intent}
                  </div>
                  <ul className="space-y-1.5">
                    {scenarioGuidance.dataPoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: '#8B949E' }}>
                        <span style={{ color: '#F0A500', lineHeight: '1.4rem' }}>·</span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-1" style={{ borderTop: '1px solid #21262D' }}>
                    <p className="text-xs italic" style={{ color: '#6E7681' }}>
                      {scenarioGuidance.howToHandle}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-auto px-4 py-3" style={{ borderTop: '1px solid #21262D' }}>
            <p className="text-xs leading-relaxed" style={{ color: '#30363D' }}>
              For coaching and preparation only. Final field messaging must follow approved medical, legal, and regulatory guidance.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
