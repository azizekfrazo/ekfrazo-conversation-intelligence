import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Mic, MicOff, PhoneOff, Wifi, WifiOff, Clock, User,
  Stethoscope, ArrowLeft, AlertCircle, MessageSquare,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { DoctorProfile, Difficulty, ObjectionType, PracticeTurn } from '../types'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Textarea } from '../components/ui/textarea'
import { personaColors, personaLabels, formatTime, difficultyColors, objectionLabels, doctorPhotoUrl } from '../lib/utils'

// DEMO_MODE: skip OpenAI Realtime — go straight to text-chat practice
const DEMO_MODE = true

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

interface TranscriptLine {
  role: 'rep' | 'doctor'
  content: string
  id: string
}

// Waveform bar heights driven by sinusoidal animation
const NUM_BARS = 18
function useWaveform(active: boolean) {
  const [heights, setHeights] = useState<number[]>(Array(NUM_BARS).fill(4))
  const frameRef = useRef<number | null>(null)
  const tickRef = useRef(0)

  useEffect(() => {
    if (!active) {
      setHeights(Array(NUM_BARS).fill(4))
      return
    }
    const interval = setInterval(() => {
      tickRef.current += 1
      const t = tickRef.current
      setHeights(
        Array.from({ length: NUM_BARS }, (_, i) => {
          const wave = Math.sin(t * 0.15 + i * 0.6) * 0.5 + 0.5
          const wave2 = Math.sin(t * 0.09 + i * 0.4 + 2) * 0.3 + 0.5
          return Math.max(4, Math.round((wave * 0.6 + wave2 * 0.4) * 22))
        }),
      )
    }, 80)
    return () => clearInterval(interval)
  }, [active])

  return heights
}

// SVG score ring — animates on mount
function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const r = 44
  const circumference = 2 * Math.PI * r // ≈ 276.5
  const offset = circumference * (1 - score / 100)
  const [dashOffset, setDashOffset] = useState(circumference)

  useEffect(() => {
    const t = requestAnimationFrame(() => setDashOffset(offset))
    return () => cancelAnimationFrame(t)
  }, [offset])

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
      <defs>
        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F0A500" />
          <stop offset="100%" stopColor="#00B4D8" />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1C2333" strokeWidth="5" />
      {/* Fill */}
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="url(#scoreGrad)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
    </svg>
  )
}

export default function SimulatorPage() {
  const { id: doctorId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const difficulty = (searchParams.get('difficulty') ?? 'Medium') as Difficulty
  const objectionFocus = (searchParams.get('objectionFocus') ?? 'Efficacy') as ObjectionType

  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [micError, setMicError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [textMode, setTextMode] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const transcriptRef = useRef<HTMLDivElement | null>(null)
  const startTimeRef = useRef<number>(0)

  const isActive = status === 'connected'
  const isConnecting = status === 'connecting'
  const waveHeights = useWaveform(isActive && !textMode)

  const { data: doctorData } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () =>
      api.get<{ doctor: DoctorProfile }>(`/api/doctors/${doctorId}`).then((r) => r.data),
    enabled: !!doctorId,
  })
  const doctor = doctorData?.doctor

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [transcript])

  useEffect(() => {
    if (status === 'connected') {
      startTimeRef.current = Date.now() - elapsed * 1000
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status])

  const appendTranscript = (role: 'rep' | 'doctor', content: string) => {
    if (!content.trim()) return
    setTranscript((prev) => [...prev, { role, content, id: Math.random().toString() }])
    if (sessionId) {
      api.post(`/api/practice/session/${sessionId}/turn`, { role, content }).catch(() => {})
    }
  }

  const startSession = useCallback(async () => {
    setError(null)
    setMicError(null)
    setStatus('connecting')

    let dbSessionId: string
    try {
      const session = await api
        .post<{ session: { id: string } }>('/api/practice/session', {
          doctorId,
          userId: user!.id,
          difficulty,
          objectionFocus,
        })
        .then((r) => r.data.session)
      dbSessionId = session.id
      setSessionId(session.id)
    } catch {
      setStatus('error')
      setError('Failed to create practice session. Please try again.')
      return
    }

    if (DEMO_MODE) {
      // Skip WebRTC entirely — go straight to text-chat
      setTextMode(true)
      setStatus('connected')
      return
    }

    try {
      const { data: rtData } = await api.post<{
        sessionId: string
        clientSecret: string
      }>('/api/realtime/session', { doctorId, difficulty, objectionFocus })

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
      } catch {
        setMicError('Microphone access denied. You can still use text input below.')
        stream = new MediaStream()
      }

      const pc = new RTCPeerConnection()
      pcRef.current = pc

      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      audioRef.current = audioEl
      pc.ontrack = (e) => { audioEl.srcObject = e.streams[0] }

      stream.getTracks().forEach((t) => pc.addTrack(t, stream))

      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          if (event.type === 'conversation.item.input_audio_transcription.completed') {
            appendTranscript('rep', event.transcript ?? '')
          }
          if (event.type === 'response.audio_transcript.done') {
            appendTranscript('doctor', event.transcript ?? '')
          }
        } catch {}
      }

      dc.onopen = () => setStatus('connected')
      dc.onclose = () => { if (status !== 'idle') setStatus('disconnected') }
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          setStatus('error')
          setError('WebRTC connection failed. Check your network.')
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpResponse = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview',
        {
          method: 'POST',
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${rtData.clientSecret}`,
            'Content-Type': 'application/sdp',
          },
        },
      )

      if (!sdpResponse.ok) throw new Error('Failed to connect to OpenAI Realtime')
      const sdpAnswer = await sdpResponse.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: sdpAnswer })
    } catch {
      cleanup()
      setTextMode(true)
      setStatus('connected')
    }
  }, [doctorId, difficulty, objectionFocus, user])

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    pcRef.current?.close()
    dcRef.current?.close()
    if (audioRef.current) audioRef.current.srcObject = null
    pcRef.current = null
    dcRef.current = null
    streamRef.current = null
  }

  const endSession = useCallback(async () => {
    cleanup()
    setStatus('idle')
    if (sessionId) {
      try {
        await api.post(`/api/practice/session/${sessionId}/complete`, { durationSeconds: elapsed })
        navigate(`/doctors/${doctorId}/practice/${sessionId}/report`)
      } catch {
        navigate(`/doctors/${doctorId}?tab=practice`)
      }
    }
  }, [sessionId, elapsed, doctorId, navigate])

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = isMuted })
    setIsMuted((m) => !m)
  }

  const sendTextMessage = async () => {
    if (!textInput.trim()) return
    const msg = textInput.trim()
    setTextInput('')

    if (textMode) {
      appendTranscript('rep', msg)
      setChatLoading(true)
      try {
        const { data } = await api.post<{ doctorReply: string }>(
          `/api/practice/session/${sessionId}/chat-reply`,
          { repMessage: msg, history: transcript.map((t) => ({ role: t.role, content: t.content })) },
        )
        appendTranscript('doctor', data.doctorReply)
      } catch {
        appendTranscript('doctor', 'Sorry, I did not quite catch that. Could you repeat?')
      } finally {
        setChatLoading(false)
      }
    } else {
      if (!dcRef.current || dcRef.current.readyState !== 'open') return
      appendTranscript('rep', msg)
      dcRef.current.send(
        JSON.stringify({
          type: 'conversation.item.create',
          item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: msg }] },
        }),
      )
      dcRef.current.send(JSON.stringify({ type: 'response.create' }))
    }
  }

  useEffect(() => { return () => cleanup() }, [])

  if (!doctor) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0D1117' }}>
        <div style={{ color: '#8B949E' }}>Loading…</div>
      </div>
    )
  }

  // Mock session score for UI display (from actual report if available, else 87 demo)
  const displayScore = 87
  const photoUrl = doctorPhotoUrl(doctor.id, 120, 120)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0D1117' }}>
      {/* Topbar */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ background: '#161B22', borderBottom: '1px solid #30363D' }}
      >
        <button
          onClick={() => {
            if (isActive && !window.confirm('End session and return to doctor workspace?')) return
            cleanup()
            navigate(`/doctors/${doctorId}?tab=practice`)
          }}
          className="flex items-center gap-1.5 text-sm transition-colors duration-150"
          style={{ color: '#8B949E' }}
          onMouseEnter={(e) => { ;(e.currentTarget as HTMLElement).style.color = '#F0F6FC' }}
          onMouseLeave={(e) => { ;(e.currentTarget as HTMLElement).style.color = '#8B949E' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to workspace
        </button>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{
              color: isActive
                ? textMode ? '#F0A500' : '#3FB950'
                : isConnecting ? '#D29922' : '#484F58',
            }}
          >
            {isActive ? (
              textMode
                ? <MessageSquare className="h-3.5 w-3.5" />
                : <Wifi className="h-3.5 w-3.5" />
            ) : isConnecting ? (
              <div
                className="h-3.5 w-3.5 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#D29922', borderTopColor: 'transparent' }}
              />
            ) : <WifiOff className="h-3.5 w-3.5" />}
            {isActive
              ? textMode ? 'Text chat' : 'Voice connected'
              : isConnecting ? 'Connecting…' : 'Not connected'}
          </div>

          {isActive && (
            <div
              className="flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: '#261900', color: '#F0A500', border: '1px solid #4D3200' }}
            >
              <Clock className="h-3 w-3" />
              {formatTime(elapsed)}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: transcript ───────────────────────────────── */}
        <div className="flex-1 flex flex-col p-6 min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold" style={{ color: '#F0F6FC' }}>
              Voice Practice Session
            </h1>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${difficultyColors[difficulty]}`}
              >
                {difficulty}
              </span>
              <Badge variant="default">{objectionLabels[objectionFocus]}</Badge>
            </div>
          </div>

          {/* Error banners */}
          {error && (
            <div
              className="mb-4 flex items-start gap-2 rounded-xl p-4 text-sm"
              style={{ background: '#1F0D0D', border: '1px solid #5C1C1A', color: '#F85149' }}
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {textMode && isActive && (
            <div
              className="mb-4 flex items-start gap-2 rounded-xl p-4 text-sm"
              style={{ background: '#261900', border: '1px solid #4D3200', color: '#D29922' }}
            >
              <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Text chat mode</strong> — Voice API unavailable. Type your pitch below.
              </span>
            </div>
          )}
          {micError && (
            <div
              className="mb-4 flex items-start gap-2 rounded-xl p-4 text-sm"
              style={{ background: '#261900', border: '1px solid #4D3200', color: '#D29922' }}
            >
              <MicOff className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{micError}</span>
            </div>
          )}

          {/* Transcript panel */}
          <div
            ref={transcriptRef}
            className="flex-1 overflow-y-auto rounded-xl p-4 space-y-3 scrollbar-thin mb-4 min-h-[300px]"
            style={{ background: '#161B22', border: '1px solid #30363D' }}
          >
            {transcript.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: '#1C2333', border: '1px solid #30363D' }}
                >
                  <Mic className="h-5 w-5" style={{ color: '#F0A500' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: '#8B949E' }}>
                  Ready to practice
                </p>
                <p className="text-xs mt-1 max-w-xs" style={{ color: '#484F58' }}>
                  {isActive
                    ? 'Start speaking — the AI doctor is listening'
                    : 'Click "Start Session" to begin voice roleplay'}
                </p>
              </div>
            ) : (
              transcript.map((line) => (
                <div
                  key={line.id}
                  className={`flex ${line.role === 'rep' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex items-start gap-2 max-w-[85%] ${
                      line.role === 'rep' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: line.role === 'rep' ? '#F0A500' : '#1C2333',
                        border: line.role === 'rep' ? 'none' : '1px solid #30363D',
                      }}
                    >
                      {line.role === 'rep' ? (
                        <User className="h-3 w-3" style={{ color: '#0D1117' }} />
                      ) : (
                        <Stethoscope className="h-3 w-3" style={{ color: '#8B949E' }} />
                      )}
                    </div>
                    <div
                      className={
                        line.role === 'rep' ? 'transcript-bubble-rep' : 'transcript-bubble-doctor'
                      }
                    >
                      {line.content}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Text input */}
          {(textMode ? isActive : isActive || micError) && (
            <div className="flex gap-2">
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendTextMessage()
                  }
                }}
                placeholder={
                  textMode
                    ? 'Type your message to the doctor (Enter to send)…'
                    : 'Type your response (Enter to send)…'
                }
                rows={2}
                className="flex-1"
                disabled={chatLoading}
              />
              <Button
                onClick={sendTextMessage}
                disabled={!textInput.trim() || chatLoading}
                loading={chatLoading}
                className="self-end"
              >
                Send
              </Button>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            {status === 'idle' || status === 'error' ? (
              <Button size="lg" onClick={startSession} loading={isConnecting} className="px-8 gap-2">
                <Mic className="h-5 w-5" />
                Start Session
              </Button>
            ) : textMode ? (
              <Button variant="destructive" size="lg" onClick={endSession} className="px-8 gap-2">
                <PhoneOff className="h-5 w-5" />
                End Session
              </Button>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                  className="h-11 w-11 rounded-lg flex items-center justify-center transition-all duration-150"
                  style={{
                    background: isMuted ? '#1F0D0D' : '#1C2333',
                    border: `1px solid ${isMuted ? '#5C1C1A' : '#30363D'}`,
                    color: isMuted ? '#F85149' : '#8B949E',
                  }}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <Button variant="destructive" size="lg" onClick={endSession} className="px-8 gap-2">
                  <PhoneOff className="h-5 w-5" />
                  End Session
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Right: doctor persona + score ──────────────────── */}
        <div
          className="w-72 shrink-0 p-5 overflow-y-auto flex flex-col gap-5"
          style={{ background: '#161B22', borderLeft: '1px solid #30363D' }}
        >
          {/* Doctor card */}
          <div>
            <div className="section-label mb-3">Doctor Profile</div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="h-12 w-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center font-bold"
                style={{ border: '1px solid #30363D', background: 'linear-gradient(135deg,#1A1F35,#2D3452)', color: '#F0F6FC' }}
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
                <div className="text-xs" style={{ color: '#8B949E' }}>
                  {doctor.specialty}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs mb-1" style={{ color: '#484F58' }}>Persona</div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${personaColors[doctor.personaType]}`}
                >
                  {personaLabels[doctor.personaType]}
                </span>
              </div>
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
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${difficultyColors[difficulty]}`}
                >
                  {difficulty}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: '#8B949E' }}>Objection focus</span>
                <span className="font-medium" style={{ color: '#C9D1D9' }}>
                  {objectionLabels[objectionFocus]}
                </span>
              </div>
            </div>
          </div>

          {/* Waveform + score */}
          <div
            className="rounded-[10px] border p-4 space-y-3"
            style={{ background: '#1C2333', borderColor: '#30363D' }}
          >
            <div className="flex items-center gap-1.5">
              <Mic className="h-3.5 w-3.5" style={{ color: '#8B949E' }} />
              <span className="text-xs font-semibold" style={{ color: '#F0A500' }}>
                Voice Practice
              </span>
            </div>

            {/* Animated waveform */}
            <div className="flex items-end justify-center gap-[2px] h-8">
              {waveHeights.map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: 3,
                    height: h,
                    borderRadius: 2,
                    background: isActive && !textMode ? '#F0A500' : '#1C2333',
                    transition: 'height 0.08s ease',
                  }}
                />
              ))}
            </div>

            {/* Score ring */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-xs uppercase tracking-wider" style={{ color: '#8B949E' }}>
                Coaching Score
              </div>
              <div className="relative flex items-center justify-center">
                <ScoreRing score={displayScore} size={96} />
                <div className="absolute flex flex-col items-center">
                  <span style={{ color: '#F0F6FC', fontSize: '1.375rem', fontWeight: 700, lineHeight: 1 }}>
                    {displayScore}
                  </span>
                  <span style={{ color: '#8B949E', fontSize: '0.625rem' }}>/100</span>
                </div>
              </div>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: 'Duration', value: formatTime(elapsed) },
                { label: 'Turns', value: transcript.length.toString() },
                { label: 'Mode', value: textMode ? 'Text' : 'Voice' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex flex-col items-center rounded-lg py-1.5"
                  style={{ background: '#161B22', border: '1px solid #30363D' }}
                >
                  <span style={{ color: '#F0F6FC', fontSize: '0.75rem', fontWeight: 600 }}>{value}</span>
                  <span style={{ color: '#484F58', fontSize: '0.625rem' }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Start Practice CTA */}
            {(status === 'idle' || status === 'error') && (
              <button
                onClick={startSession}
                className="w-full h-9 rounded-lg font-bold text-sm transition-all duration-150"
                style={{ background: '#F0A500', color: '#0D1117' }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = '#C87D00'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(240,165,0,0.18)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = '#F0A500'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                }}
              >
                Start Practice
              </button>
            )}
          </div>

          {/* Active session indicator */}
          {isActive && (
            <div
              className="rounded-[10px] p-3"
              style={{
                background: textMode ? '#261900' : '#12201A',
                border: `1px solid ${textMode ? '#4D3200' : '#1F5231'}`,
              }}
            >
              <div
                className="flex items-center gap-2 text-xs font-medium"
                style={{ color: textMode ? '#D29922' : '#3FB950' }}
              >
                <div
                  className="h-2 w-2 rounded-full animate-pulse"
                  style={{ background: textMode ? '#D29922' : '#3FB950' }}
                />
                {textMode ? 'Text chat active' : 'Session active'} — {formatTime(elapsed)}
              </div>
              <p className="text-xs mt-1" style={{ color: textMode ? '#D29922' : '#3FB950', opacity: 0.8 }}>
                {textMode
                  ? `Type your pitch. Dr. ${doctor.fullName.split(' ').slice(-1)[0]} will respond.`
                  : `Speak naturally. The AI doctor is responding as Dr. ${doctor.fullName.split(' ').slice(-1)[0]}.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
