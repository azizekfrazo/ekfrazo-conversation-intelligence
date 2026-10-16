import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts'
import {
  MapPin, Clock, CheckCircle2, LogIn, LogOut, Plus, Sparkles,
  ChevronDown, Stethoscope, ClipboardList, CheckSquare, Check,
  AlertCircle, ArrowRight, Navigation, Target, Activity, X,
  TrendingUp, Flame, BarChart2, Trophy,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { Badge } from '../components/ui/badge'
import {
  myMetrics, leaderboard, teamGoals, achievements,
  heatmapData, scoreTrend, skillRadarData,
} from '../data/productivityData'

// ─── Types ────────────────────────────────────────────────────────────────────
interface PunchState {
  isPunchedIn: boolean
  punchInTime: string | null
  latitude: number | null
  longitude: number | null
  address: string | null
}

interface DoctorAssignment {
  id: string
  doctorId: string
  lastVisit: string | null
  lastOutcome: string | null
  doctor: { id: string; fullName: string; specialty: string; hospitalOrClinic: string }
}

interface VisitRecord {
  id: string
  date: string
  outcome: string
  notes: string | null
  followUp: string | null
  doctor: { id: string; fullName: string; specialty: string }
}

interface FollowUpAction {
  id: string
  task: string
  status: string
  doctor?: { fullName: string } | null
}

interface TargetData {
  target: { dailyVisitTarget: number; weeklyClinicTarget: number; qualityScoreTarget: number }
  actuals: { visitsToday: number; visitsThisWeek: number; uniqueClinicsThisWeek: number; avgScore: number }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PUNCH_KEY = 'ekfrazo_punch_state'
// Demo location for presentations from Kodigehalli, Sahakar Nagar, Bengaluru
const DEMO_LOCATION = {
  address: 'Kodigehalli, Sahakar Nagar, Bengaluru',
  latitude: 13.0537,
  longitude: 77.5911,
}

const OUTCOMES = [
  { value: 'visited_offline', label: 'Visited (In-person)' },
  { value: 'visited_online', label: 'Visited (Online)' },
  { value: 'not_available', label: 'Not Available' },
  { value: 'rescheduled', label: 'Rescheduled' },
]

const OUTCOME_STYLE: Record<string, { color: string; bg: string }> = {
  visited_offline: { color: '#3FB950', bg: '#3FB95015' },
  visited_online:  { color: '#38BDF8', bg: '#38BDF815' },
  not_available:   { color: '#F87171', bg: '#F8717115' },
  rescheduled:     { color: '#F0A500', bg: '#F0A50015' },
}

const OUTCOME_LABEL: Record<string, string> = {
  visited_offline: 'Visited',
  visited_online:  'Online Visit',
  not_available:   'Not Available',
  rescheduled:     'Rescheduled',
}

const AI_SUGGESTIONS: Record<string, string[]> = {
  efficacy: [
    'Share the latest Phase III trial data highlighting superior efficacy vs. standard of care.',
    'Follow up with peer-reviewed journal articles supporting the clinical outcomes discussed.',
    'Schedule a KOL webinar focused on real-world efficacy data — invite this physician.',
  ],
  cost: [
    'Prepare a cost-benefit analysis comparing total treatment cost including adherence rates.',
    'Highlight patient assistance programmes that reduce out-of-pocket burden.',
    'Arrange a reimbursement support call with our market access team.',
  ],
  competitor: [
    'Share the head-to-head comparative study with the competitor product mentioned.',
    'Provide clinical differentiation chart for the rep\'s next visit.',
    'Request a peer discussion with a champion who switched from the competitor.',
  ],
  default: [
    'Send a personalised follow-up email within 24 hours summarising today\'s discussion.',
    'Add this doctor to the next regional CME programme invitation list.',
    'Schedule the next visit in 2–3 weeks with updated product information.',
    'Share supporting literature materials based on the therapeutic area discussed.',
  ],
}

function getAiSuggestion(notes: string): string {
  const lc = notes.toLowerCase()
  if (lc.includes('efficacy') || lc.includes('clinical') || lc.includes('trial') || lc.includes('evidence'))
    return AI_SUGGESTIONS.efficacy[Math.floor(Math.random() * AI_SUGGESTIONS.efficacy.length)]
  if (lc.includes('cost') || lc.includes('price') || lc.includes('expensive') || lc.includes('reimburse'))
    return AI_SUGGESTIONS.cost[Math.floor(Math.random() * AI_SUGGESTIONS.cost.length)]
  if (lc.includes('competitor') || lc.includes('competition') || lc.includes('vs') || lc.includes('alternative'))
    return AI_SUGGESTIONS.competitor[Math.floor(Math.random() * AI_SUGGESTIONS.competitor.length)]
  return AI_SUGGESTIONS.default[Math.floor(Math.random() * AI_SUGGESTIONS.default.length)]
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ─── Analytics sub-components ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1C2333', border: '1px solid #30363D', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: '#8B949E', marginBottom: 6 }}>{label}</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, fontWeight: 600, lineHeight: 1.6 }}>
          {p.name}: <span style={{ color: '#F0F6FC' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function heatColor(count: number): string {
  if (count === 0) return '#1C2333'
  if (count === 1) return '#1B4D2E'
  if (count === 2) return '#276C3F'
  if (count === 3) return '#3FB950'
  return '#56D364'
}

function groupIntoWeeks() {
  const weeks: typeof heatmapData[number][][] = []
  for (let i = 0; i < heatmapData.length; i += 7) weeks.push(heatmapData.slice(i, i + 7))
  return weeks
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function SkillBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span style={{ color: '#8B949E' }}>{label}</span>
        <span style={{ color: '#F0F6FC', fontWeight: 600 }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#1C2333' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: value >= 80 ? '#3FB950' : value >= 65 ? '#F0A500' : '#F85149' }}
        />
      </div>
    </div>
  )
}

function LeaderboardRow({ rep, isMe }: { rep: typeof leaderboard[number]; isMe: boolean }) {
  const rankColor = rep.rank === 1 ? '#F0A500' : rep.rank === 2 ? '#8B949E' : rep.rank === 3 ? '#C87D00' : '#484F58'
  return (
    <div
      className="flex items-center gap-4 py-3"
      style={{
        borderBottom: '1px solid #1C2333',
        background: isMe ? 'rgba(240,165,0,0.04)' : 'transparent',
        borderLeft: isMe ? '2px solid #F0A500' : '2px solid transparent',
        paddingLeft: isMe ? 10 : 12,
      }}
    >
      <div className="w-5 text-sm font-bold" style={{ color: rankColor }}>
        {rep.rank === 1 ? '🥇' : rep.rank === 2 ? '🥈' : rep.rank === 3 ? '🥉' : `#${rep.rank}`}
      </div>
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: isMe ? 'rgba(240,165,0,0.15)' : '#1C2333', color: isMe ? '#F0A500' : '#8B949E' }}
      >
        {rep.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: isMe ? '#F0A500' : '#F0F6FC' }}>
          {rep.name} {isMe && <span style={{ color: '#484F58', fontSize: 10 }}>(you)</span>}
        </div>
        <div className="text-xs" style={{ color: '#484F58' }}>
          {rep.totalSessions} sessions · 🔥 {rep.streak}d
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="text-sm font-bold" style={{ color: '#F0F6FC' }}>{rep.avgScore}</div>
        <div className="w-24 h-1 rounded-full" style={{ background: '#1C2333' }}>
          <div className="h-full rounded-full" style={{ width: `${rep.avgScore}%`, background: isMe ? '#F0A500' : '#30363D' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // ── Punch state ──
  const [punchState, setPunchState] = useState<PunchState>(() => {
    try {
      const s = localStorage.getItem(PUNCH_KEY)
      return s ? JSON.parse(s) : { isPunchedIn: false, punchInTime: null, latitude: null, longitude: null, address: null }
    } catch { return { isPunchedIn: false, punchInTime: null, latitude: null, longitude: null, address: null } }
  })
  const [locationError, setLocationError] = useState<string | null>(null)

  // ── Visit form state ──
  const [showVisitForm, setShowVisitForm] = useState(false)
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [outcome, setOutcome] = useState('visited_offline')
  const [notePhase, setNotePhase] = useState<'before' | 'after'>('before')
  const [notesBefore, setNotesBefore] = useState('')
  const [notesAfter, setNotesAfter] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const [visitSuccess, setVisitSuccess] = useState(false)
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Queries ──
  const repId = user?.repId ?? user?.id ?? ''

  const { data: assignments = [] } = useQuery<DoctorAssignment[]>({
    queryKey: ['my-assignments', repId],
    queryFn: () => api.get(`/api/salesreps/${repId}/assignments`).then(r => r.data),
    enabled: !!repId,
    staleTime: 60_000,
  })

  const { data: todayVisits = [] } = useQuery<VisitRecord[]>({
    queryKey: ['today-visits', repId],
    queryFn: () => api.get(`/api/salesreps/${repId}/visits?days=1`).then(r => r.data),
    enabled: !!repId,
    refetchInterval: 30_000,
  })

  const [dismissedFollowUps, setDismissedFollowUps] = useState<Set<string>>(new Set())

  const { data: recentVisits = [] } = useQuery<VisitRecord[]>({
    queryKey: ['recent-visits-followups', repId],
    queryFn: () => api.get(`/api/salesreps/${repId}/visits?days=30`).then(r => r.data),
    enabled: !!repId,
    staleTime: 60_000,
  })
  const pendingFollowUps = recentVisits.filter(
    v => v.followUp && v.followUp.trim() && !dismissedFollowUps.has(v.id),
  )

  const { data: targetData, isLoading: targetsLoading } = useQuery<TargetData>({
    queryKey: ['my-targets', repId],
    queryFn: () => api.get(`/api/salesreps/${repId}/targets`).then(r => r.data),
    enabled: !!repId,
    staleTime: 60_000,
  })

  const dismissFollowUp = (id: string) => {
    setDismissedFollowUps(prev => new Set([...prev, id]))
  }

  const logVisitMutation = useMutation({
    mutationFn: (payload: object) =>
      api.post(`/api/salesreps/${repId}/visits`, payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-visits', repId] })
      queryClient.invalidateQueries({ queryKey: ['my-targets', repId] })
      setShowVisitForm(false)
      setSelectedDoctorId('')
      setNotesBefore('')
      setNotesAfter('')
      setFollowUp('')
      setAiSuggestion(null)
      setOutcome('visited_offline')
      setNotePhase('before')
      setVisitSuccess(true)
      setTimeout(() => setVisitSuccess(false), 3000)
    },
  })

  // ── Auto AI suggestion: debounced on note change ──
  useEffect(() => {
    const combined = (notesBefore + ' ' + notesAfter).trim()
    if (combined.length < 8) {
      setAiSuggestion(null)
      return
    }
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current)
    aiDebounceRef.current = setTimeout(() => {
      setAiSuggestion(getAiSuggestion(combined))
    }, 900)
    return () => { if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current) }
  }, [notesBefore, notesAfter])

  // ── Punch handlers (demo location — always Kodigehalli, Sahakar Nagar, Bengaluru) ──
  const handlePunchIn = useCallback(() => {
    setLocationError(null)
    const newState: PunchState = {
      isPunchedIn: true,
      punchInTime: new Date().toISOString(),
      latitude: DEMO_LOCATION.latitude,
      longitude: DEMO_LOCATION.longitude,
      address: DEMO_LOCATION.address,
    }
    setPunchState(newState)
    try { localStorage.setItem(PUNCH_KEY, JSON.stringify(newState)) } catch {}
  }, [])

  const handlePunchOut = useCallback(() => {
    const newState: PunchState = { isPunchedIn: false, punchInTime: null, latitude: null, longitude: null, address: null }
    setPunchState(newState)
    try { localStorage.setItem(PUNCH_KEY, JSON.stringify(newState)) } catch {}
    setLocationError(null)
  }, [])

  // ── Visit form submit ──
  const handleLogVisit = () => {
    if (!selectedDoctorId) return
    logVisitMutation.mutate({
      doctorId: selectedDoctorId,
      outcome,
      notes: notesBefore || notesAfter || null,
      followUp: followUp || null,
      latitude: punchState.latitude,
      longitude: punchState.longitude,
    })
  }

  // ── Greeting ──
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const actuals = targetData?.actuals
  const target = targetData?.target
  const dailyPct = actuals && target ? Math.min(100, Math.round((actuals.visitsToday / (target.dailyVisitTarget || 1)) * 100)) : 0

  const heatmapWeeks = groupIntoWeeks()

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5">

      {/* ── Header + Punch In/Out ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]}</h1>
          <p className="text-xs mt-1" style={{ color: '#8B949E' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Punch In/Out Card */}
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-4 shrink-0"
          style={{ background: '#161B22', border: `1px solid ${punchState.isPunchedIn ? '#3FB95040' : '#30363D'}` }}
        >
          {punchState.isPunchedIn ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#3FB950' }} />
                <span className="text-sm font-medium" style={{ color: '#3FB950' }}>Punched In</span>
              </div>
              {punchState.punchInTime && (
                <div className="flex items-center gap-1 text-xs" style={{ color: '#8B949E' }}>
                  <Clock style={{ width: 12, height: 12 }} />
                  since {formatTime(punchState.punchInTime)}
                </div>
              )}
              {punchState.address && (
                <div className="flex items-center gap-1 text-xs" style={{ color: '#58A6FF' }}>
                  <Navigation style={{ width: 11, height: 11 }} />
                  {punchState.address}
                </div>
              )}
              <button
                onClick={handlePunchOut}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                style={{ background: '#F8717115', color: '#F87171', border: '1px solid #F8717130' }}
              >
                <LogOut style={{ width: 13, height: 13 }} />
                Punch Out
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: '#484F58' }} />
                <span className="text-sm" style={{ color: '#8B949E' }}>Not punched in</span>
              </div>
              <button
                onClick={handlePunchIn}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                style={{ background: '#3FB95020', color: '#3FB950', border: '1px solid #3FB95040' }}
              >
                <LogIn style={{ width: 13, height: 13 }} /> Punch In
              </button>
            </>
          )}
        </div>
      </div>

      {locationError && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: '#F0A50010', color: '#F0A500', border: '1px solid #F0A50030' }}>
          <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
          {locationError}
        </div>
      )}

      {visitSuccess && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: '#3FB95015', color: '#3FB950', border: '1px solid #3FB95030' }}>
          <CheckCircle2 style={{ width: 14, height: 14 }} />
          Visit logged successfully!
        </div>
      )}

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Visits Today',
            value: targetsLoading ? '—' : (actuals?.visitsToday ?? 0),
            sub: targetsLoading ? '' : `Target: ${target?.dailyVisitTarget ?? 5}`,
            color: '#58A6FF',
            pct: dailyPct,
            onClick: undefined,
          },
          {
            label: 'Visits This Week',
            value: targetsLoading ? '—' : (actuals?.visitsThisWeek ?? 0),
            sub: targetsLoading ? '' : `Target: ${target?.weeklyClinicTarget ?? 20}`,
            color: '#BC8CFF',
            pct: actuals && target ? Math.min(100, Math.round((actuals.visitsThisWeek / (target.weeklyClinicTarget || 1)) * 100)) : 0,
            onClick: undefined,
          },
          {
            label: 'Assigned Doctors',
            value: assignments.length,
            sub: 'Total assigned',
            color: '#F0A500',
            pct: null,
            onClick: () => navigate('/doctors'),
          },
          {
            label: 'Pending Follow-Ups',
            value: pendingFollowUps.length,
            sub: 'Action required',
            color: pendingFollowUps.length > 3 ? '#F87171' : '#3FB950',
            pct: null,
            onClick: () => navigate('/follow-ups'),
          },
        ].map(({ label, value, sub, color, pct, onClick }) => (
          <div
            key={label}
            className="rounded-xl p-4 transition-all duration-150"
            style={{
              background: '#161B22',
              border: '1px solid #30363D',
              cursor: onClick ? 'pointer' : 'default',
            }}
            onClick={onClick}
            onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' } }}
            onMouseLeave={e => { if (onClick) { (e.currentTarget as HTMLElement).style.borderColor = '#30363D'; (e.currentTarget as HTMLElement).style.transform = 'none' } }}
          >
            <div style={{ color: '#F0F6FC', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>{value}</div>
            <div className="text-xs mt-1" style={{ color }}>{label}</div>
            <div className="text-xs mt-0.5" style={{ color: '#484F58' }}>{sub}</div>
            {pct !== null && (
              <div className="mt-2 h-1 rounded-full" style={{ background: '#30363D' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid lg:grid-cols-5 gap-5">

        {/* Left: Log Visit + AI Suggestions */}
        <div className="lg:col-span-2 space-y-4">

          {/* Log a Visit */}
          <div className="rounded-xl" style={{ background: '#161B22', border: '1px solid #30363D' }}>
            <button
              onClick={() => setShowVisitForm(!showVisitForm)}
              className="w-full flex items-center justify-between px-5 py-4 transition-colors duration-150 rounded-xl"
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1C2128'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#3FB95018' }}>
                  <Plus style={{ width: 15, height: 15, color: '#3FB950' }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>Log a Visit</span>
              </div>
              <ChevronDown
                style={{ width: 16, height: 16, color: '#8B949E', transform: showVisitForm ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              />
            </button>

            {showVisitForm && (
              <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: '#21262D' }}>
                <div className="pt-4 space-y-3">
                  {/* Doctor select */}
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B949E' }}>
                      Doctor / Clinic
                    </label>
                    <select
                      value={selectedDoctorId}
                      onChange={e => setSelectedDoctorId(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ background: '#0D1117', border: '1px solid #30363D', color: '#F0F6FC' }}
                    >
                      <option value="">— Select doctor —</option>
                      {assignments.map(a => (
                        <option key={a.doctorId} value={a.doctorId}>
                          {a.doctor.fullName} · {a.doctor.specialty}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Outcome */}
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B949E' }}>Outcome</label>
                    <div className="grid grid-cols-2 gap-2">
                      {OUTCOMES.map(o => (
                        <button
                          key={o.value}
                          onClick={() => setOutcome(o.value)}
                          className="px-3 py-2 rounded-lg text-xs font-medium transition-all text-left"
                          style={outcome === o.value
                            ? { background: OUTCOME_STYLE[o.value].bg, color: OUTCOME_STYLE[o.value].color, border: `1px solid ${OUTCOME_STYLE[o.value].color}40` }
                            : { background: '#0D1117', color: '#8B949E', border: '1px solid #30363D' }
                          }
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes — Before / After toggle */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium" style={{ color: '#8B949E' }}>Meeting Notes</label>
                      <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #30363D' }}>
                        {(['before', 'after'] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => setNotePhase(p)}
                            className="px-3 py-1 text-xs font-medium transition-all"
                            style={notePhase === p
                              ? { background: '#F0A50020', color: '#F0A500' }
                              : { background: '#0D1117', color: '#484F58' }
                            }
                          >
                            {p === 'before' ? 'Before' : 'After'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={3}
                      placeholder={notePhase === 'before'
                        ? 'Preparation notes — talking points, expected objections…'
                        : 'Post-meeting notes — what was discussed, feedback received…'
                      }
                      value={notePhase === 'before' ? notesBefore : notesAfter}
                      onChange={e => notePhase === 'before' ? setNotesBefore(e.target.value) : setNotesAfter(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                      style={{ background: '#0D1117', border: '1px solid #30363D', color: '#F0F6FC' }}
                    />
                  </div>

                  {/* AI Suggestion — auto shows when notes typed */}
                  {aiSuggestion && (
                    <div className="rounded-lg px-4 py-3 relative" style={{ background: '#BC8CFF0D', border: '1px solid #BC8CFF25' }}>
                      <div className="flex items-start gap-2">
                        <Sparkles style={{ width: 13, height: 13, color: '#BC8CFF', marginTop: 1, flexShrink: 0 }} />
                        <div className="flex-1">
                          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#BC8CFF80' }}>
                            AI Suggestion
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: '#C9D1D9' }}>{aiSuggestion}</p>
                        </div>
                        <button onClick={() => setAiSuggestion(null)} style={{ color: '#484F58' }}>
                          <X style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                      <button
                        onClick={() => setFollowUp(aiSuggestion)}
                        className="mt-2 text-xs font-medium"
                        style={{ color: '#BC8CFF' }}
                      >
                        Use as follow-up →
                      </button>
                    </div>
                  )}

                  {/* Follow-up note */}
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B949E' }}>Follow-up Action</label>
                    <input
                      type="text"
                      placeholder="Any follow-up required?"
                      value={followUp}
                      onChange={e => setFollowUp(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ background: '#0D1117', border: '1px solid #30363D', color: '#F0F6FC' }}
                    />
                  </div>

                  {punchState.latitude && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#58A6FF' }}>
                      <MapPin style={{ width: 12, height: 12 }} />
                      GPS: {punchState.address ?? 'Location attached'}
                    </div>
                  )}

                  <button
                    onClick={handleLogVisit}
                    disabled={!selectedDoctorId || logVisitMutation.isPending}
                    className="w-full rounded-lg py-2.5 text-sm font-semibold transition-all"
                    style={{
                      background: !selectedDoctorId ? '#1C2333' : '#3FB950',
                      color: !selectedDoctorId ? '#484F58' : '#0D1117',
                      opacity: logVisitMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    {logVisitMutation.isPending ? 'Logging…' : 'Log Visit'}
                  </button>

                  {logVisitMutation.isError && (
                    <p className="text-xs" style={{ color: '#F87171' }}>Failed to log visit. Try again.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Pending Follow-Ups */}
          <div className="rounded-xl" style={{ background: '#161B22', border: '1px solid #30363D' }}>
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer transition-colors duration-150 rounded-t-xl"
              onClick={() => navigate('/follow-ups')}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1C2128'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <div className="flex items-center gap-2">
                <CheckSquare style={{ width: 15, height: 15, color: '#F0A500' }} />
                <span className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>Follow-Ups</span>
              </div>
              <div className="flex items-center gap-2">
                {pendingFollowUps.length > 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: '#F0A50018', color: '#F0A500' }}
                  >
                    {pendingFollowUps.length} pending
                  </span>
                )}
                <ArrowRight style={{ width: 12, height: 12, color: '#484F58' }} />
              </div>
            </div>
            <div className="px-5 pb-4 space-y-2">
              {pendingFollowUps.length === 0 ? (
                <div className="py-4 text-center">
                  <CheckCircle2 className="h-5 w-5 mx-auto mb-1" style={{ color: '#3FB950' }} />
                  <p className="text-xs" style={{ color: '#8B949E' }}>All caught up!</p>
                </div>
              ) : (
                pendingFollowUps.slice(0, 4).map(action => (
                  <div
                    key={action.id}
                    className="flex items-start gap-2.5 rounded-lg p-2 transition-colors duration-150 cursor-pointer"
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1C2128'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <div className="mt-0.5 h-3 w-3 rounded-full border-2 shrink-0" style={{ borderColor: '#F0A500' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#C9D1D9' }}>{action.followUp}</p>
                      {action.doctor && (
                        <p className="text-xs mt-0.5" style={{ color: '#484F58' }}>{action.doctor.fullName}</p>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); dismissFollowUp(action.id) }}
                      className="shrink-0 rounded border px-2 py-1 text-xs transition-all hover:bg-green-900"
                      style={{ background: '#12201A', borderColor: '#1A4D2E', color: '#3FB950' }}
                      title="Mark done"
                    >
                      <Check style={{ width: 10, height: 10 }} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Performance Strip (inline mini-analytics) */}
          <div
            className="rounded-xl px-5 py-4"
            style={{ background: '#161B22', border: '1px solid #30363D' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>My Performance</h3>
              <button
                onClick={() => navigate('/analytics')}
                className="flex items-center gap-1 text-xs transition-colors duration-150"
                style={{ color: '#F0A500' }}
              >
                Full view <ArrowRight style={{ width: 11, height: 11 }} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Streak', value: `${myMetrics.streak}d`, icon: '🔥', color: '#F0A500' },
                { label: 'Team Rank', value: `#${myMetrics.rank}`, icon: '🏆', color: '#BC8CFF' },
              ].map(item => (
                <div key={item.label} className="text-center rounded-lg p-2" style={{ background: '#0D1117' }}>
                  <div className="text-lg">{item.icon}</div>
                  <div className="text-sm font-bold" style={{ color: item.color }}>{item.value}</div>
                  <div className="text-[10px]" style={{ color: '#484F58' }}>{item.label}</div>
                </div>
              ))}
            </div>
            {/* Skill bars (compact) */}
            <div className="space-y-2">
              {Object.entries(myMetrics.skills).slice(0, 3).map(([key, val]) => (
                <SkillBar key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={val} />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Today's Visits + Assigned Doctors */}
        <div className="lg:col-span-3 space-y-4">

          {/* Today's visit timeline */}
          <div className="rounded-xl" style={{ background: '#161B22', border: '1px solid #30363D' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#21262D' }}>
              <div className="flex items-center gap-2">
                <ClipboardList style={{ width: 15, height: 15, color: '#58A6FF' }} />
                <span className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>Today's Visits</span>
              </div>
              <span className="text-xs" style={{ color: '#8B949E' }}>{todayVisits.length} logged</span>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[340px] overflow-y-auto">
              {todayVisits.length === 0 ? (
                <div className="py-8 text-center">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2" style={{ color: '#30363D' }} />
                  <p className="text-sm" style={{ color: '#484F58' }}>No visits logged yet today</p>
                  <button
                    onClick={() => setShowVisitForm(true)}
                    className="mt-2 text-xs font-medium transition-colors duration-150 hover:underline"
                    style={{ color: '#3FB950' }}
                  >
                    Log your first visit →
                  </button>
                </div>
              ) : (
                todayVisits.map(visit => {
                  const vstyle = OUTCOME_STYLE[visit.outcome] ?? OUTCOME_STYLE.rescheduled
                  const visitAiSuggestion = visit.notes ? getAiSuggestion(visit.notes) : null
                  return (
                    <div
                      key={visit.id}
                      className="flex items-start gap-3 rounded-xl p-4 cursor-pointer transition-all duration-150"
                      style={{ background: '#0D1117', border: '1px solid #21262D' }}
                      onClick={() => navigate(`/doctors/${visit.doctor.id}`)}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = vstyle.color + '40'; (e.currentTarget as HTMLElement).style.background = '#111827' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#21262D'; (e.currentTarget as HTMLElement).style.background = '#0D1117' }}
                    >
                      <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ background: vstyle.bg }}>
                        <Stethoscope style={{ width: 14, height: 14, color: vstyle.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: '#F0F6FC' }}>
                            {visit.doctor.fullName}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: vstyle.bg, color: vstyle.color }}
                          >
                            {OUTCOME_LABEL[visit.outcome] ?? visit.outcome}
                          </span>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
                          {visit.doctor.specialty} · {formatDate(visit.date)}
                        </div>
                        {visit.notes && (
                          <p className="text-xs mt-1.5 line-clamp-2" style={{ color: '#6E7681' }}>{visit.notes}</p>
                        )}
                        {visit.followUp && (
                          <div className="flex items-start gap-1 mt-1.5">
                            <ArrowRight style={{ width: 11, height: 11, color: '#F0A500', marginTop: 1, flexShrink: 0 }} />
                            <p className="text-xs" style={{ color: '#F0A500' }}>{visit.followUp}</p>
                          </div>
                        )}
                        {/* Proactive AI suggestion per visit */}
                        {visit.notes && visitAiSuggestion && (
                          <div className="mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-2" style={{ background: '#BC8CFF08', border: '1px solid #BC8CFF20' }}>
                            <Sparkles style={{ width: 11, height: 11, color: '#BC8CFF', marginTop: 1, flexShrink: 0 }} />
                            <p className="text-[11px] leading-relaxed" style={{ color: '#9D6EF0' }}>{visitAiSuggestion}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Assigned Doctors */}
          <div className="rounded-xl" style={{ background: '#161B22', border: '1px solid #30363D' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#21262D' }}>
              <div className="flex items-center gap-2">
                <Stethoscope style={{ width: 15, height: 15, color: '#F0A500' }} />
                <span className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>My Doctors</span>
              </div>
              <button
                onClick={() => navigate('/doctors')}
                className="flex items-center gap-1 text-xs transition-colors duration-150 hover:underline"
                style={{ color: '#F0A500' }}
              >
                View all <ArrowRight style={{ width: 12, height: 12 }} />
              </button>
            </div>
            <div className="divide-y" style={{ borderColor: '#21262D' }}>
              {assignments.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-sm" style={{ color: '#484F58' }}>No doctors assigned yet</p>
                </div>
              ) : (
                assignments.slice(0, 5).map(a => {
                  const lastStyle = a.lastOutcome ? OUTCOME_STYLE[a.lastOutcome] : null
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-all duration-150"
                      style={{ borderColor: '#21262D' }}
                      onClick={() => navigate(`/doctors/${a.doctorId}`)}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1C2128'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: '#F0A50018', color: '#F0A500' }}
                      >
                        {a.doctor.fullName.split(' ').slice(-1)[0][0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: '#F0F6FC' }}>{a.doctor.fullName}</div>
                        <div className="text-xs" style={{ color: '#8B949E' }}>{a.doctor.specialty}</div>
                      </div>
                      <div className="text-right shrink-0">
                        {a.lastOutcome && lastStyle ? (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: lastStyle.bg, color: lastStyle.color }}
                          >
                            {OUTCOME_LABEL[a.lastOutcome] ?? a.lastOutcome}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: '#484F58' }}>No visits yet</span>
                        )}
                        {a.lastVisit && (
                          <div className="text-xs mt-0.5" style={{ color: '#484F58' }}>
                            {new Date(a.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── Analytics Section ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      <div className="flex items-center justify-between pt-2">
        <h2 className="text-base font-semibold" style={{ color: '#F0F6FC' }}>📊 Performance Analytics</h2>
        <button
          onClick={() => navigate('/analytics')}
          className="flex items-center gap-1 text-xs font-medium transition-colors duration-150"
          style={{ color: '#F0A500' }}
        >
          Full Analytics <ArrowRight style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Flame, label: 'Practice Streak', value: `${myMetrics.streak}d`, sub: 'Personal best: 21d', color: '#F0A500', bg: '#261900' },
          { icon: TrendingUp, label: 'Avg Session Score', value: myMetrics.avgScore, sub: '↑4 pts from last month', color: '#58A6FF', bg: '#0D2137' },
          { icon: Target, label: 'Weekly Sessions', value: `${myMetrics.weeklyDone}/${myMetrics.weeklyGoal}`, sub: '75% of weekly goal', color: '#3FB950', bg: '#12201A' },
          { icon: Trophy, label: 'Team Rank', value: `#${myMetrics.rank}`, sub: `of ${leaderboard.length} reps`, color: '#BC8CFF', bg: '#1F1635' },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className="rounded-[10px] border p-5 flex flex-col gap-2" style={{ background: '#161B22', borderColor: '#30363D' }}>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: bg }}>
              <Icon style={{ width: 18, height: 18, color }} />
            </div>
            <div style={{ color: '#F0F6FC', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>{value}</div>
            <div>
              <div className="text-xs font-medium" style={{ color: '#C9D1D9' }}>{label}</div>
              {sub && <div className="text-xs mt-0.5" style={{ color: '#484F58' }}>{sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row: Score Trend + Skill Radar */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Score Trend */}
        <div className="lg:col-span-2 rounded-[10px] border p-5" style={{ background: '#161B22', borderColor: '#30363D' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>Score Trend</h3>
            <div className="flex items-center gap-4 text-xs" style={{ color: '#8B949E' }}>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded" style={{ background: '#F0A500' }} /> Me
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded" style={{ background: '#00B4D8' }} /> Team Avg
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded border-b border-dashed" style={{ borderColor: '#BC8CFF' }} /> Top Rep
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={scoreTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="dashGradMe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F0A500" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F0A500" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dashGradTeam" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00B4D8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#00B4D8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis dataKey="week" tick={{ fill: '#8B949E', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[40, 100]} tick={{ fill: '#8B949E', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="top" name="Top Rep" stroke="#BC8CFF" strokeWidth={1.5} strokeDasharray="4 4" fill="none" dot={false} />
              <Area type="monotone" dataKey="team" name="Team Avg" stroke="#00B4D8" strokeWidth={1.5} fill="url(#dashGradTeam)" dot={false} />
              <Area type="monotone" dataKey="me" name="Me" stroke="#F0A500" strokeWidth={2} fill="url(#dashGradMe)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Skill Radar */}
        <div className="rounded-[10px] border p-5" style={{ background: '#161B22', borderColor: '#30363D' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>Skill Profile</h3>
            <div className="flex flex-col gap-1 text-[10px]" style={{ color: '#8B949E' }}>
              <span className="flex items-center gap-1">
                <span className="inline-block h-1 w-3 rounded" style={{ background: '#F0A500' }} /> Me
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-1 w-3 rounded" style={{ background: '#00B4D8' }} /> Team
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={skillRadarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="#30363D" />
              <PolarAngleAxis dataKey="skill" tick={{ fill: '#8B949E', fontSize: 10 }} />
              <Radar name="Team" dataKey="team" stroke="#00B4D8" fill="#00B4D8" fillOpacity={0.08} strokeWidth={1.5} />
              <Radar name="Me" dataKey="me" stroke="#F0A500" fill="#F0A500" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-2">
            {Object.entries(myMetrics.skills).slice(0, 4).map(([key, val]) => (
              <SkillBar key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={val} />
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard + Goals */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Leaderboard */}
        <div className="lg:col-span-2 rounded-[10px] border p-5" style={{ background: '#161B22', borderColor: '#30363D' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>Team Leaderboard</h3>
            <span className="text-xs" style={{ color: '#484F58' }}>Ranked by avg score</span>
          </div>
          <div>
            {leaderboard.map(rep => (
              <LeaderboardRow key={rep.id} rep={rep} isMe={rep.id === myMetrics.id} />
            ))}
          </div>
        </div>

        {/* Goals */}
        <div className="rounded-[10px] border p-5 space-y-4" style={{ background: '#161B22', borderColor: '#30363D' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>My Goals</h3>
          {teamGoals.map(g => {
            const pct = Math.min(Math.round((g.current / g.target) * 100), 100)
            return (
              <div key={g.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span style={{ color: '#C9D1D9' }}>{g.label}</span>
                  <span style={{ color: '#F0F6FC', fontWeight: 600 }}>
                    {g.current} <span style={{ color: '#484F58' }}>/ {g.target} {g.unit}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ background: '#1C2333' }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: g.color }} />
                </div>
                <div className="text-right text-[10px] mt-0.5" style={{ color: '#484F58' }}>{pct}%</div>
              </div>
            )
          })}
          <button
            onClick={() => navigate('/targets')}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg py-2 mt-2 transition-all duration-150"
            style={{ color: '#F0A500', background: 'rgba(240,165,0,0.08)', border: '1px solid rgba(240,165,0,0.2)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(240,165,0,0.14)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(240,165,0,0.08)'}
          >
            View Targets <ArrowRight style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="rounded-[10px] border p-5" style={{ background: '#161B22', borderColor: '#30363D' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>Activity Heatmap</h3>
          <span className="text-xs" style={{ color: '#484F58' }}>Last 15 weeks · practice sessions per day</span>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col gap-[3px] mr-1 mt-[1px]">
            {DAY_LABELS.map((d, i) => (
              <div key={i} className="h-[14px] flex items-center text-[10px]" style={{ color: '#484F58' }}>
                {i % 2 === 0 ? d : ''}
              </div>
            ))}
          </div>
          <div className="flex gap-[3px] flex-1 overflow-x-auto scrollbar-thin pb-1">
            {heatmapWeeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px] shrink-0">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className="rounded-[2px] transition-opacity duration-150 hover:opacity-80"
                    style={{ width: 14, height: 14, background: heatColor(day.count), flexShrink: 0, cursor: 'default' }}
                    title={`${day.date}: ${day.count} session${day.count !== 1 ? 's' : ''}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10px]" style={{ color: '#484F58' }}>Less</span>
          {[0, 1, 2, 3, 4].map(n => (
            <div key={n} className="rounded-[2px]" style={{ width: 12, height: 12, background: heatColor(n) }} />
          ))}
          <span className="text-[10px]" style={{ color: '#484F58' }}>More</span>
        </div>
      </div>

      {/* Achievements */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#F0F6FC' }}>Achievements</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {achievements.map(a => (
            <div
              key={a.id}
              className="rounded-[10px] border p-4 flex flex-col items-center text-center gap-2 transition-all duration-200 cursor-default"
              style={{
                background: a.unlocked ? '#161B22' : '#0D1117',
                borderColor: a.unlocked ? '#30363D' : '#1C2333',
                opacity: a.unlocked ? 1 : 0.5,
              }}
              onMouseEnter={e => { if (a.unlocked) (e.currentTarget as HTMLElement).style.borderColor = '#30363D88' }}
              onMouseLeave={e => { if (a.unlocked) (e.currentTarget as HTMLElement).style.borderColor = '#30363D' }}
            >
              <span className="text-2xl" style={{ filter: a.unlocked ? 'none' : 'grayscale(1)' }}>{a.icon}</span>
              <div>
                <div className="text-xs font-semibold" style={{ color: a.unlocked ? '#F0F6FC' : '#484F58' }}>{a.label}</div>
                <div className="text-[10px] mt-0.5" style={{ color: '#484F58' }}>
                  {a.unlocked ? (a.unlockedDate ?? 'Unlocked') : a.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
