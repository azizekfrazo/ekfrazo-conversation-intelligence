import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Mic, MicOff, Square, ArrowLeft, Stethoscope, User,
  CheckCircle, XCircle, AlertTriangle, ChevronRight, BarChart2,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { DoctorProfile, Difficulty, ObjectionType, PracticeReport } from '../types'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Textarea } from '../components/ui/textarea'
import {
  personaColors, personaLabels, formatTime, difficultyColors,
  objectionLabels, doctorPhotoUrl,
} from '../lib/utils'
import { DEMO_DOCTORS } from '../data/demoDoctors'

// ── Web Speech API local types (no global Window augmentation to avoid conflicts) ──
interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}
interface SpeechRecognitionResultEvent {
  results: {
    readonly length: number
    [i: number]: { readonly isFinal: boolean; [j: number]: { readonly transcript: string } }
  }
}
function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'idle' | 'starting' | 'live' | 'ending' | 'ended'

interface TranscriptLine {
  id: string
  role: 'rep' | 'doctor'
  content: string
}

type ReportData = PracticeReport & { overallScore: number }

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const r = 44
  const circumference = 2 * Math.PI * r
  const [dashOffset, setDashOffset] = useState(circumference)

  useEffect(() => {
    const t = requestAnimationFrame(() => setDashOffset(circumference * (1 - score / 100)))
    return () => cancelAnimationFrame(t)
  }, [score, circumference])

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
      <defs>
        <linearGradient id="sgRing" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F0A500" />
          <stop offset="100%" stopColor="#58A6FF" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1C2333" strokeWidth="5" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke="url(#sgRing)" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
    </svg>
  )
}

// ── Qual section ──────────────────────────────────────────────────────────────
function QualSection({ icon, title, items, dotColor }: {
  icon: ReactNode; title: string; items: string[]; dotColor: string
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#161B22', border: '1px solid #30363D' }}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8B949E' }}>
          {title}
        </div>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#C9D1D9' }}>
            <div className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0" style={{ background: dotColor }} />
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SimulatorPage() {
  const { id: doctorId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const difficulty = (searchParams.get('difficulty') ?? 'Medium') as Difficulty
  const objectionFocus = (searchParams.get('objectionFocus') ?? 'Efficacy') as ObjectionType

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [micMuted, setMicMuted] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [aiThinking, setAiThinking] = useState(false)
  const [report, setReport] = useState<ReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [textMode, setTextMode] = useState(false)
  const [textInput, setTextInput] = useState('')

  // ── Refs (stable in async handlers) ────────────────────────────────────────
  const phaseRef = useRef<Phase>('idle')
  const sessionIdRef = useRef<string | null>(null)
  const micMutedRef = useRef(false)
  const elapsedRef = useRef(0)
  const processingRef = useRef(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const timerRef = useRef<number | null>(null)
  const conversationHistoryRef = useRef<Array<{ role: 'rep' | 'doctor'; content: string }>>([])
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)

  // Sync state → refs
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])
  useEffect(() => { micMutedRef.current = micMuted }, [micMuted])
  useEffect(() => { elapsedRef.current = elapsed }, [elapsed])

  // Auto-scroll
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript, interimText])

  // ── Doctor fetch ───────────────────────────────────────────────────────────
  const { data: doctorData } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () =>
      api.get<{ doctor: DoctorProfile }>(`/api/doctors/${doctorId}`).then((r) => r.data),
    enabled: !!doctorId,
    retry: false,
  })
  const doctor = doctorData?.doctor ?? DEMO_DOCTORS.find((d) => d.id === doctorId)
  const photoUrl = doctorPhotoUrl(doctorId ?? '', 80, 80)

  // ── Handle rep speech → AI reply ───────────────────────────────────────────
  const handleRepSpeech = useCallback(async (text: string) => {
    if (processingRef.current) return
    processingRef.current = true

    recognitionRef.current?.stop()
    setInterimText('')

    setTranscript((prev) => [
      ...prev,
      { id: Math.random().toString(), role: 'rep', content: text },
    ])

    const historySnapshot = [...conversationHistoryRef.current]
    setAiThinking(true)

    try {
      const { data } = await api.post<{ doctorReply: string; success: boolean }>(
        `/api/practice/session/${sessionIdRef.current}/chat-reply`,
        { repMessage: text, history: historySnapshot },
      )
      const aiText = data.doctorReply
      setTranscript((prev) => [
        ...prev,
        { id: Math.random().toString(), role: 'doctor', content: aiText },
      ])
      conversationHistoryRef.current = [
        ...historySnapshot,
        { role: 'rep', content: text },
        { role: 'doctor', content: aiText },
      ]
    } catch {
      setTranscript((prev) => [
        ...prev,
        { id: Math.random().toString(), role: 'doctor', content: 'Could you rephrase that?' },
      ])
    } finally {
      setAiThinking(false)
      processingRef.current = false
      if (phaseRef.current === 'live' && !micMutedRef.current && !textMode) {
        setTimeout(() => {
          try { recognitionRef.current?.start() } catch {}
        }, 300)
      }
    }
  }, [textMode])

  // ── Init recognition ───────────────────────────────────────────────────────
  const initRecognition = useCallback((): SpeechRecognitionInstance | null => {
    const SR = getSpeechRecognition()
    if (!SR) return null

    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.lang = 'en-IN'

    r.onresult = (event) => {
      const results = event.results
      const last = results[results.length - 1]
      const text = last[0].transcript.trim()
      if (last.isFinal) {
        setInterimText('')
        if (text.split(' ').length >= 2 && !processingRef.current) {
          handleRepSpeech(text)
        }
      } else {
        setInterimText(text)
      }
    }

    r.onend = () => {
      setInterimText('')
      if (phaseRef.current === 'live' && !micMutedRef.current && !processingRef.current) {
        setTimeout(() => {
          if (phaseRef.current === 'live' && !micMutedRef.current) {
            try { recognitionRef.current?.start() } catch {}
          }
        }, 300)
      }
    }

    r.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setMicError('Microphone access denied.')
        setTextMode(true)
      }
    }

    return r
  }, [handleRepSpeech])

  // ── Start session ──────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    if (phaseRef.current !== 'idle') return
    setPhase('starting')

    try {
      // 1. Create DB session
      const { data: sData } = await api.post<{ session: { id: string }; success: boolean }>(
        '/api/practice/session',
        { doctorId, userId: user?.id, difficulty, objectionFocus },
      )
      const sid = sData.session.id
      setSessionId(sid)
      sessionIdRef.current = sid

      // 2. Get AI opening objection
      const { data: oData } = await api.post<{ doctorReply: string; success: boolean }>(
        `/api/practice/session/${sid}/chat-reply`,
        { repMessage: '[SESSION_INIT]', history: [] },
      )
      const opener = oData.doctorReply
      setTranscript([{ id: Math.random().toString(), role: 'doctor', content: opener }])
      // Include synthetic init pair so subsequent turn indices map correctly
      conversationHistoryRef.current = [
        { role: 'rep', content: '[SESSION_INIT]' },
        { role: 'doctor', content: opener },
      ]

      // 3. Init voice recognition
      const SR = getSpeechRecognition()
      if (!SR) {
        setTextMode(true)
      } else {
        const r = initRecognition()
        recognitionRef.current = r
        if (r) {
          try { r.start() } catch { setTextMode(true) }
        }
      }

      // 4. Start timer
      const t0 = Date.now()
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - t0) / 1000))
      }, 1000)

      setPhase('live')
    } catch (err) {
      console.error('Session start failed:', err)
      setPhase('idle')
    }
  }, [doctorId, user, difficulty, objectionFocus, initRecognition])

  // ── End session ────────────────────────────────────────────────────────────
  const endSession = useCallback(async () => {
    if (phaseRef.current !== 'live') return
    setPhase('ending')

    recognitionRef.current?.abort()
    recognitionRef.current = null
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

    const sid = sessionIdRef.current
    const dur = elapsedRef.current

    if (sid) {
      try { await api.post(`/api/practice/session/${sid}/complete`, { durationSeconds: dur }) } catch {}

      setReportLoading(true)
      try {
        const { data } = await api.post<{ report: ReportData; success: boolean }>(
          `/api/practice/session/${sid}/report`,
        )
        const rpt = data.report
        setReport({
          ...rpt,
          overallScore: rpt.overallScore ?? Math.round(
            (rpt.objectionHandlingScore + rpt.clarityScore + rpt.confidenceScore + rpt.complianceScore) / 4,
          ),
        })
      } catch {
        // Local heuristic fallback
        const reps = conversationHistoryRef.current.filter(
          (t) => t.role === 'rep' && t.content !== '[SESSION_INIT]',
        ).length
        const base = difficulty === 'Hard' ? 60 : difficulty === 'Medium' ? 67 : 74
        const bonus = Math.min(20, reps * 4)
        const oh = Math.min(94, base + bonus)
        const cl = Math.min(94, base + 5 + bonus)
        const co = Math.min(94, base - 2 + bonus)
        const cm = Math.min(95, 78 + Math.floor(bonus / 2))
        const overall = Math.round((oh + cl + co + cm) / 4)
        setReport({
          id: 'local',
          sessionId: sid,
          createdAt: new Date().toISOString(),
          overallScore: overall,
          objectionHandlingScore: oh,
          clarityScore: cl,
          confidenceScore: co,
          complianceScore: cm,
          summary: `${reps} exchange${reps !== 1 ? 's' : ''} with ${doctor?.fullName ?? 'the doctor'}. ${reps >= 4 ? 'Good engagement — objections were challenged effectively.' : 'Short session — aim for 4+ exchanges to build fluency.'}`,
          strengths: ['Maintained professional tone throughout', 'Responded directly to doctor objections'],
          weakMoments: ['Could cite more specific clinical trial data by name', 'Closing lacked a confirmed next step'],
          missedOpportunities: ['Patient Support Programme not introduced', 'Head-to-head comparative data not referenced'],
          improvements: ['Prepare 2-3 named trial data points', 'Ask about patient demographics earlier', 'Close each exchange with a clear summary'],
          nextPractice: ['Try Hard difficulty with the same doctor', 'Focus on cost + competitor combined objection', 'Practice full call arc from greeting to close'],
        })
      } finally {
        setReportLoading(false)
      }
    }

    setPhase('ended')
  }, [difficulty, doctor])

  // ── Toggle mic ─────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const muted = !micMutedRef.current
    setMicMuted(muted)
    micMutedRef.current = muted
    if (muted) recognitionRef.current?.stop()
    else { try { recognitionRef.current?.start() } catch {} }
  }, [])

  // ── Reset for "Practice Again" ─────────────────────────────────────────────
  const practiceAgain = useCallback(() => {
    recognitionRef.current?.abort()
    if (timerRef.current) clearInterval(timerRef.current)
    recognitionRef.current = null
    timerRef.current = null
    conversationHistoryRef.current = []
    processingRef.current = false
    phaseRef.current = 'idle'
    setPhase('idle')
    setSessionId(null)
    setTranscript([])
    setElapsed(0)
    setMicMuted(false)
    setInterimText('')
    setAiThinking(false)
    setReport(null)
    setReportLoading(false)
    setTextInput('')
    setMicError(null)
  }, [])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.code === 'Space') {
        e.preventDefault()
        if (phaseRef.current === 'idle') startSession()
        else if (phaseRef.current === 'live') endSession()
      }
      if (e.code === 'KeyC' && phaseRef.current === 'live') toggleMic()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [startSession, endSession, toggleMic])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (!doctor) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0D1117' }}>
        <div className="text-sm" style={{ color: '#8B949E' }}>Loading…</div>
      </div>
    )
  }

  const isLive = phase === 'live'
  const isIdle = phase === 'idle'
  const isEnded = phase === 'ended'
  const isTransitioning = phase === 'starting' || phase === 'ending'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0D1117' }}>

      {/* ── Topbar ────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ background: '#161B22', borderBottom: '1px solid #30363D' }}
      >
        <button
          onClick={() => {
            if (isLive && !window.confirm('End session and go back?')) return
            recognitionRef.current?.abort()
            if (timerRef.current) clearInterval(timerRef.current)
            navigate(`/doctors/${doctorId}?tab=practice`)
          }}
          className="flex items-center gap-1.5 text-sm transition-colors duration-150"
          style={{ color: '#8B949E' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#F0F6FC' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8B949E' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg"
            style={{
              background: isLive ? '#12201A' : isEnded ? '#1F1635' : '#1C2333',
              color: isLive ? '#3FB950' : isEnded ? '#BC8CFF' : '#484F58',
              border: `1px solid ${isLive ? '#1F5231' : isEnded ? '#3D2C78' : '#30363D'}`,
            }}
          >
            {isLive && (
              <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#3FB950' }} />
            )}
            {isLive ? 'LIVE' : isEnded ? 'SESSION COMPLETE' : isTransitioning ? 'STARTING…' : 'READY'}
          </div>

          {(isLive || isEnded) && (
            <div
              className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: '#261900', color: '#F0A500', border: '1px solid #4D3200' }}
            >
              {formatTime(elapsed)}
            </div>
          )}

          {isLive && !textMode && (
            <div
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
              style={{
                background: micMuted ? '#1F0D0D' : '#0D2137',
                color: micMuted ? '#F85149' : '#58A6FF',
                border: `1px solid ${micMuted ? '#5C1C1A' : '#1F4068'}`,
              }}
            >
              {micMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              {micMuted ? 'MUTED' : 'MIC ON'}
            </div>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: transcript or report ────────────────────────────────── */}
        <div className="flex-1 flex flex-col p-6 min-h-0 gap-4">

          {/* ── Transcript (idle / starting / live) ─── */}
          {!isEnded && (
            <>
              <div className="flex items-center justify-between">
                <h1 className="text-base font-semibold" style={{ color: '#F0F6FC' }}>
                  {isLive ? 'Live Practice Session' : 'Objection Simulator'}
                </h1>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${difficultyColors[difficulty]}`}>
                    {difficulty}
                  </span>
                  <Badge variant="default">{objectionLabels[objectionFocus]}</Badge>
                </div>
              </div>

              {/* Transcript panel */}
              <div
                className="flex-1 overflow-y-auto rounded-xl p-4 space-y-3 min-h-[220px]"
                style={{ background: '#161B22', border: '1px solid #30363D' }}
              >
                {transcript.length === 0 && !isTransitioning ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                    <div
                      className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3"
                      style={{ background: '#1C2333', border: '1px solid #30363D' }}
                    >
                      <Mic className="h-6 w-6" style={{ color: '#F0A500' }} />
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: '#C9D1D9' }}>
                      AI doctor speaks first
                    </p>
                    <p className="text-xs max-w-xs" style={{ color: '#8B949E' }}>
                      Press{' '}
                      <kbd
                        className="mx-1 px-1.5 py-0.5 rounded font-mono text-xs"
                        style={{ background: '#21262D', border: '1px solid #30363D', color: '#F0F6FC' }}
                      >
                        Space
                      </kbd>
                      to start — the AI will open with a realistic objection
                    </p>
                  </div>
                ) : isTransitioning && transcript.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
                    <div
                      className="h-6 w-6 rounded-full border-2 animate-spin"
                      style={{ borderColor: '#F0A500', borderTopColor: 'transparent' }}
                    />
                    <p className="text-sm" style={{ color: '#8B949E' }}>Connecting AI doctor…</p>
                  </div>
                ) : (
                  <>
                    {transcript.map((line) => (
                      <div key={line.id} className={`flex ${line.role === 'rep' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-start gap-2 max-w-[85%] ${line.role === 'rep' ? 'flex-row-reverse' : ''}`}>
                          <div
                            className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                            style={{
                              background: line.role === 'rep' ? '#F0A500' : '#1C2333',
                              border: line.role === 'rep' ? 'none' : '1px solid #30363D',
                            }}
                          >
                            {line.role === 'rep'
                              ? <User className="h-3 w-3" style={{ color: '#0D1117' }} />
                              : <Stethoscope className="h-3 w-3" style={{ color: '#8B949E' }} />}
                          </div>
                          <div>
                            <div className="text-[10px] mb-0.5" style={{ color: '#484F58' }}>
                              {line.role === 'doctor' ? doctor.fullName : 'You'}
                            </div>
                            <div
                              className="text-sm rounded-xl px-3 py-2 leading-relaxed"
                              style={{
                                background: line.role === 'rep' ? '#261900' : '#1C2333',
                                color: line.role === 'rep' ? '#F0A500' : '#C9D1D9',
                                border: `1px solid ${line.role === 'rep' ? '#4D3200' : '#30363D'}`,
                              }}
                            >
                              {line.content}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* AI thinking indicator */}
                    {aiThinking && (
                      <div className="flex justify-start">
                        <div className="flex items-center gap-2 max-w-[85%]">
                          <div
                            className="h-6 w-6 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: '#1C2333', border: '1px solid #30363D' }}
                          >
                            <Stethoscope className="h-3 w-3" style={{ color: '#8B949E' }} />
                          </div>
                          <div
                            className="text-sm rounded-xl px-3 py-2"
                            style={{ background: '#1C2333', border: '1px solid #30363D', color: '#484F58' }}
                          >
                            <span className="inline-flex gap-1">
                              {[0, 150, 300].map((d) => (
                                <span
                                  key={d}
                                  className="animate-bounce"
                                  style={{ animationDelay: `${d}ms` }}
                                >·</span>
                              ))}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Interim text */}
                    {interimText && (
                      <div className="flex justify-end">
                        <div
                          className="text-sm rounded-xl px-3 py-2 max-w-[85%]"
                          style={{
                            background: '#1A1206',
                            border: '1px dashed #4D3200',
                            color: '#8B6A1A',
                            fontStyle: 'italic',
                          }}
                        >
                          {interimText}…
                        </div>
                      </div>
                    )}
                    <div ref={transcriptEndRef} />
                  </>
                )}
              </div>

              {/* Text fallback input */}
              {(textMode || micError) && isLive && (
                <div className="flex gap-2">
                  <Textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (!aiThinking && textInput.trim()) {
                          const m = textInput.trim()
                          setTextInput('')
                          handleRepSpeech(m)
                        }
                      }
                    }}
                    placeholder="Type your response (Enter to send)…"
                    rows={2}
                    className="flex-1"
                    disabled={aiThinking}
                  />
                  <Button
                    onClick={() => {
                      if (!aiThinking && textInput.trim()) {
                        const m = textInput.trim()
                        setTextInput('')
                        handleRepSpeech(m)
                      }
                    }}
                    disabled={!textInput.trim() || aiThinking}
                    className="self-end"
                  >
                    Send
                  </Button>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                {isIdle && (
                  <Button size="lg" onClick={startSession} className="px-8 gap-2">
                    <Mic className="h-5 w-5" />
                    Start Session
                    <kbd
                      className="ml-1 text-xs opacity-60 font-mono px-1 py-0.5 rounded"
                      style={{ background: 'rgba(0,0,0,.3)' }}
                    >
                      Space
                    </kbd>
                  </Button>
                )}
                {isTransitioning && (
                  <Button size="lg" disabled className="px-8 gap-2">
                    <div
                      className="h-4 w-4 rounded-full border-2 animate-spin"
                      style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}
                    />
                    {phase === 'ending' ? 'Ending…' : 'Starting…'}
                  </Button>
                )}
                {isLive && (
                  <>
                    {!textMode && (
                      <button
                        onClick={toggleMic}
                        title={micMuted ? 'Unmute [C]' : 'Mute [C]'}
                        className="h-11 w-11 rounded-lg flex items-center justify-center transition-all duration-150"
                        style={{
                          background: micMuted ? '#1F0D0D' : '#1C2333',
                          border: `1px solid ${micMuted ? '#5C1C1A' : '#30363D'}`,
                          color: micMuted ? '#F85149' : '#8B949E',
                        }}
                      >
                        {micMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                      </button>
                    )}
                    <Button variant="destructive" size="lg" onClick={endSession} className="px-8 gap-2">
                      <Square className="h-4 w-4" />
                      End Session
                      <kbd
                        className="ml-1 text-xs opacity-60 font-mono px-1 py-0.5 rounded"
                        style={{ background: 'rgba(0,0,0,.3)' }}
                      >
                        Space
                      </kbd>
                    </Button>
                  </>
                )}
              </div>
            </>
          )}

          {/* ── Report (ended) ────────────────────────────────────────────── */}
          {isEnded && (
            <div className="flex-1 overflow-y-auto space-y-5">
              <div className="flex items-center justify-between">
                <h1 className="text-base font-semibold" style={{ color: '#F0F6FC' }}>
                  Practice Report
                </h1>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={practiceAgain}>
                    Practice Again
                  </Button>
                  <Button size="sm" onClick={() => navigate('/dashboard')}>
                    <BarChart2 className="h-4 w-4 mr-1" />
                    Dashboard
                  </Button>
                </div>
              </div>

              {reportLoading ? (
                <div className="flex flex-col items-center py-16 gap-3">
                  <div
                    className="h-8 w-8 rounded-full border-2 animate-spin"
                    style={{ borderColor: '#F0A500', borderTopColor: 'transparent' }}
                  />
                  <p className="text-sm" style={{ color: '#8B949E' }}>Generating coaching report…</p>
                </div>
              ) : report ? (
                <>
                  {/* Overall score + sub-scores */}
                  <div
                    className="rounded-xl p-5 flex flex-col sm:flex-row items-center gap-6"
                    style={{ background: '#161B22', border: '1px solid #30363D' }}
                  >
                    <div className="flex flex-col items-center shrink-0">
                      <div className="relative flex items-center justify-center">
                        <ScoreRing score={report.overallScore} size={110} />
                        <div className="absolute flex flex-col items-center">
                          <span style={{ color: '#F0F6FC', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>
                            {report.overallScore}
                          </span>
                          <span style={{ color: '#8B949E', fontSize: '0.65rem' }}>/100</span>
                        </div>
                      </div>
                      <div className="text-xs mt-2 font-medium" style={{ color: '#8B949E' }}>
                        Overall Score
                      </div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                      {[
                        { label: 'Objection Handling', score: report.objectionHandlingScore, color: '#F0A500' },
                        { label: 'Clarity', score: report.clarityScore, color: '#58A6FF' },
                        { label: 'Confidence', score: report.confidenceScore, color: '#BC8CFF' },
                        { label: 'Compliance', score: report.complianceScore, color: '#3FB950' },
                      ].map(({ label, score, color }) => (
                        <div
                          key={label}
                          className="rounded-lg p-3"
                          style={{ background: '#1C2333', border: '1px solid #30363D' }}
                        >
                          <div className="text-xs mb-2" style={{ color: '#8B949E' }}>{label}</div>
                          <div className="flex items-end gap-1">
                            <span style={{ color, fontSize: '1.25rem', fontWeight: 700, lineHeight: 1 }}>
                              {score}
                            </span>
                            <span className="text-xs mb-0.5" style={{ color: '#484F58' }}>/100</span>
                          </div>
                          <div className="mt-2 h-1 rounded-full" style={{ background: '#161B22' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${score}%`, background: color, transition: 'width 0.7s ease-out' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl p-4" style={{ background: '#161B22', border: '1px solid #30363D' }}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8B949E' }}>
                      Summary
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#C9D1D9' }}>{report.summary}</p>
                  </div>

                  {/* Qualitative cards */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <QualSection
                      icon={<CheckCircle className="h-4 w-4" style={{ color: '#3FB950' }} />}
                      title="Strengths"
                      items={report.strengths}
                      dotColor="#3FB950"
                    />
                    <QualSection
                      icon={<XCircle className="h-4 w-4" style={{ color: '#F85149' }} />}
                      title="Needs Work"
                      items={report.weakMoments}
                      dotColor="#F85149"
                    />
                    <QualSection
                      icon={<AlertTriangle className="h-4 w-4" style={{ color: '#D29922' }} />}
                      title="Missed Opportunities"
                      items={report.missedOpportunities}
                      dotColor="#D29922"
                    />
                    <QualSection
                      icon={<ChevronRight className="h-4 w-4" style={{ color: '#58A6FF' }} />}
                      title="Recommendations"
                      items={report.improvements}
                      dotColor="#58A6FF"
                    />
                  </div>

                  {/* Next practice */}
                  <div className="rounded-xl p-4" style={{ background: '#161B22', border: '1px solid #30363D' }}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#8B949E' }}>
                      Next Practice Suggestions
                    </div>
                    <div className="space-y-2">
                      {report.nextPractice.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm" style={{ color: '#C9D1D9' }}>
                          <span className="shrink-0 font-bold text-xs mt-0.5" style={{ color: '#F0A500' }}>
                            {i + 1}.
                          </span>
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* ── Right: doctor card + session info ─────────────────────────── */}
        <div
          className="w-72 shrink-0 p-5 overflow-y-auto flex flex-col gap-5"
          style={{ background: '#161B22', borderLeft: '1px solid #30363D' }}
        >
          {/* Doctor card */}
          <div>
            <div className="section-label mb-3">Doctor Profile</div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="h-12 w-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center font-bold text-sm"
                style={{
                  border: '1px solid #30363D',
                  background: 'linear-gradient(135deg,#1A1F35,#2D3452)',
                  color: '#F0F6FC',
                }}
              >
                <img
                  src={photoUrl}
                  alt={doctor.fullName}
                  className="h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: '#F0F6FC' }}>
                  {doctor.fullName}
                </div>
                <div className="text-xs" style={{ color: '#8B949E' }}>{doctor.specialty}</div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs mb-1" style={{ color: '#484F58' }}>Persona</div>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${personaColors[doctor.personaType]}`}>
                  {personaLabels[doctor.personaType]}
                </span>
              </div>
              {doctor.targetProduct && (
                <div>
                  <div className="text-xs mb-1" style={{ color: '#484F58' }}>Target product</div>
                  <div className="text-sm font-medium" style={{ color: '#C9D1D9' }}>
                    {doctor.targetProduct}
                  </div>
                </div>
              )}
              {doctor.competitorPreference && (
                <div>
                  <div className="text-xs mb-1" style={{ color: '#484F58' }}>Current preference</div>
                  <div className="text-sm font-medium" style={{ color: '#C9D1D9' }}>
                    {doctor.competitorPreference}
                  </div>
                </div>
              )}
              {doctor.likelyConcerns?.length > 0 && (
                <div>
                  <div className="text-xs mb-1.5" style={{ color: '#484F58' }}>Likely concerns</div>
                  <div className="flex flex-wrap gap-1.5">
                    {doctor.likelyConcerns.map((c) => (
                      <span
                        key={c}
                        className="text-xs rounded-lg px-2 py-0.5"
                        style={{ background: '#1C2333', border: '1px solid #30363D', color: '#8B949E' }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Session setup */}
          <div style={{ borderTop: '1px solid #30363D', paddingTop: 16 }}>
            <div className="section-label mb-3">Session Setup</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: '#8B949E' }}>Difficulty</span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${difficultyColors[difficulty]}`}>
                  {difficulty}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: '#8B949E' }}>Objection focus</span>
                <span className="font-medium" style={{ color: '#C9D1D9' }}>
                  {objectionLabels[objectionFocus]}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: '#8B949E' }}>Turns</span>
                <span className="font-medium" style={{ color: '#C9D1D9' }}>{transcript.length}</span>
              </div>
            </div>
          </div>

          {/* Keyboard hints */}
          {!isEnded && (
            <div style={{ borderTop: '1px solid #30363D', paddingTop: 16 }}>
              <div className="section-label mb-3">Keyboard</div>
              <div className="space-y-1.5 text-xs" style={{ color: '#8B949E' }}>
                <div className="flex items-center justify-between">
                  <span>{isIdle ? 'Start session' : 'End session'}</span>
                  <kbd
                    className="px-1.5 py-0.5 rounded font-mono"
                    style={{ background: '#21262D', border: '1px solid #30363D', color: '#F0F6FC', fontSize: '0.65rem' }}
                  >
                    Space
                  </kbd>
                </div>
                {!textMode && (
                  <div className="flex items-center justify-between">
                    <span>Mute / unmute mic</span>
                    <kbd
                      className="px-1.5 py-0.5 rounded font-mono"
                      style={{ background: '#21262D', border: '1px solid #30363D', color: '#F0F6FC', fontSize: '0.65rem' }}
                    >
                      C
                    </kbd>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live indicator */}
          {isLive && (
            <div
              className="rounded-[10px] p-3"
              style={{ background: '#12201A', border: '1px solid #1F5231' }}
            >
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: '#3FB950' }}>
                <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#3FB950' }} />
                Active — {formatTime(elapsed)}
              </div>
              <p className="text-xs mt-1" style={{ color: '#3FB950', opacity: 0.7 }}>
                {textMode
                  ? 'Type your responses below'
                  : micMuted
                  ? 'Mic muted — press C to unmute'
                  : 'Mic ON — speak naturally'}
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="text-xs mt-auto" style={{ color: '#484F58', lineHeight: 1.5 }}>
            For practice and coaching purposes only. Final field messaging should follow approved medical, legal, and regulatory guidance.
          </div>
        </div>
      </div>

      {/* ── Keyboard hint strip ───────────────────────────────────────────── */}
      {!isEnded && (
        <div
          className="shrink-0 px-6 py-2 flex items-center justify-center gap-8 text-xs"
          style={{ background: '#161B22', borderTop: '1px solid #30363D', color: '#484F58' }}
        >
          <span>
            <kbd
              className="mr-1.5 px-1.5 py-0.5 rounded font-mono"
              style={{ background: '#21262D', border: '1px solid #30363D', color: '#8B949E', fontSize: '0.65rem' }}
            >
              Space
            </kbd>
            {isIdle ? 'Start session' : 'End session'}
          </span>
          {!textMode && isLive && (
            <span>
              <kbd
                className="mr-1.5 px-1.5 py-0.5 rounded font-mono"
                style={{ background: '#21262D', border: '1px solid #30363D', color: '#8B949E', fontSize: '0.65rem' }}
              >
                C
              </kbd>
              Mute / unmute
            </span>
          )}
        </div>
      )}
    </div>
  )
}
