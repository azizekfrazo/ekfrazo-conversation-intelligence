import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Building2, MapPin, Pencil, FileText, Mic, Phone,
  Clock, MessageSquare, StickyNote, Navigation, CheckCircle2, XCircle, Loader2,
} from 'lucide-react'
import { api } from '../lib/api'
import { DoctorProfile } from '../types'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { personaColors, personaLabels, formatDate, doctorPhotoUrl } from '../lib/utils'
import { DoctorFormModal } from '../components/doctors/DoctorFormModal'
import { OverviewTab } from './workspace-tabs/OverviewTab'
import { BattlecardsTab } from './workspace-tabs/BattlecardsTab'
import { PracticeTab } from './workspace-tabs/PracticeTab'
import { PostCallTab } from './workspace-tabs/PostCallTab'
import { NotesTab } from './workspace-tabs/NotesTab'
import { TimelinePanel } from '../components/timeline/TimelinePanel'
import { DEMO_DOCTORS } from '../data/demoDoctors'
import { getStoredUser } from '../lib/auth'

const tabs = [
  { id: 'overview',    label: 'Overview',    icon: Clock },
  { id: 'battlecards', label: 'Battlecards', icon: FileText },
  { id: 'practice',   label: 'Practice',    icon: Mic },
  { id: 'postcall',   label: 'Post-Call',   icon: Phone },
  { id: 'notes',      label: 'Notes',       icon: StickyNote },
  { id: 'history',    label: 'History',     icon: MessageSquare },
]

interface ActiveVisit { visitId: string; punchInTime: number }

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

async function captureGPS(): Promise<{ lat: number | null; lng: number | null }> {
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 })
    )
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  } catch {
    return { lat: null, lng: null }
  }
}

export default function DoctorWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showEdit, setShowEdit] = useState(false)
  const qc = useQueryClient()

  const activeTab = searchParams.get('tab') ?? 'overview'

  // ── Visit tracker state ──────────────────────────────────────────────────────
  const [activeVisit, setActiveVisit] = useState<ActiveVisit | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [visitLoading, setVisitLoading] = useState(false)
  const [showEndPanel, setShowEndPanel] = useState(false)
  const [preNotes, setPreNotes] = useState('')
  const [postNotes, setPostNotes] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!id) return
    const saved = localStorage.getItem(`visit_${id}`)
    if (saved) {
      try {
        const data: ActiveVisit = JSON.parse(saved)
        setActiveVisit(data)
        setElapsed(Math.floor((Date.now() - data.punchInTime) / 1000))
      } catch { localStorage.removeItem(`visit_${id}`) }
    }
  }, [id])

  useEffect(() => {
    if (activeVisit) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - activeVisit.punchInTime) / 1000))
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activeVisit])

  const handleStartVisit = async () => {
    if (!id) return
    setVisitLoading(true)
    try {
      const user = getStoredUser()
      const repId = (user as any)?.repId ?? user?.id ?? 'demo-rep'
      const { lat, lng } = await captureGPS()
      const res = await api.post('/api/visits/punch-in', { doctorId: id, repId, lat, lng, preNotes: preNotes.trim() || null })
      const data: ActiveVisit = { visitId: res.data.visitId, punchInTime: Date.now() }
      setActiveVisit(data)
      setElapsed(0)
      setShowEndPanel(false)
      setPreNotes('')
      localStorage.setItem(`visit_${id}`, JSON.stringify(data))
    } catch (err) {
      console.error('Punch-in failed', err)
    } finally {
      setVisitLoading(false)
    }
  }

  const handleEndVisit = async (outcome: 'completed' | 'not-available') => {
    if (!activeVisit || !id) return
    setVisitLoading(true)
    try {
      const { lat, lng } = await captureGPS()
      await api.post('/api/visits/punch-out', { visitId: activeVisit.visitId, lat, lng, outcome, postNotes: postNotes.trim() || null })
      setActiveVisit(null)
      setElapsed(0)
      setShowEndPanel(false)
      setPostNotes('')
      localStorage.removeItem(`visit_${id}`)
    } catch (err) {
      console.error('Punch-out failed', err)
    } finally {
      setVisitLoading(false)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['doctor', id],
    queryFn: () =>
      api.get<{ doctor: DoctorProfile }>(`/api/doctors/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  const doctor = data?.doctor ?? DEMO_DOCTORS.find((d) => d.id === id)
  const setTab = (tab: string) => setSearchParams({ tab })

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 rounded animate-pulse" style={{ background: '#161B22' }} />
        <div className="h-48 rounded-[10px] animate-pulse" style={{ background: '#161B22' }} />
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p style={{ color: '#8B949E' }}>Doctor not found.</p>
        <Button variant="outline" onClick={() => navigate('/doctors')}>
          Back to Doctors
        </Button>
      </div>
    )
  }

  const photoUrl = doctorPhotoUrl(doctor.id, 280, 320)

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div
        className="px-6 py-4"
        style={{ background: '#161B22', borderBottom: '1px solid #30363D' }}
      >
        <button
          onClick={() => navigate('/doctors')}
          className="flex items-center gap-1.5 text-xs mb-3 transition-colors duration-150"
          style={{ color: '#484F58' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.color = '#C9D1D9'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.color = '#484F58'
          }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to doctors
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Doctor photo */}
            <div
              className="h-14 w-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center font-bold text-xl"
              style={{
                border: '2px solid #30363D',
                background: 'linear-gradient(135deg,#1A1F35,#2D3452)',
                color: '#F0F6FC',
              }}
            >
              <img
                src={photoUrl}
                alt={doctor.fullName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#F0F6FC' }}>
                {doctor.fullName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-sm" style={{ color: '#8B949E' }}>
                  {doctor.specialty}
                </span>
                {doctor.hospitalOrClinic && (
                  <>
                    <span style={{ color: '#30363D' }}>·</span>
                    <span className="flex items-center gap-1 text-sm" style={{ color: '#8B949E' }}>
                      <Building2 className="h-3 w-3" />
                      {doctor.hospitalOrClinic}
                    </span>
                  </>
                )}
                <span className="flex items-center gap-1 text-sm" style={{ color: '#8B949E' }}>
                  <MapPin className="h-3 w-3" />
                  {doctor.city}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${personaColors[doctor.personaType]}`}
                >
                  {personaLabels[doctor.personaType]}
                </span>
                <Badge variant="default">{doctor.seniorityLevel}</Badge>
                {doctor.lastInteractionDate && (
                  <span className="text-xs" style={{ color: '#484F58' }}>
                    Last: {formatDate(doctor.lastInteractionDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {!activeVisit && (
              <textarea
                value={preNotes}
                onChange={e => setPreNotes(e.target.value)}
                placeholder="Pre-visit notes (optional)…"
                rows={2}
                className="w-52 text-xs px-2 py-1.5 rounded-lg resize-none outline-none"
                style={{ background: '#1C2128', border: '1px solid #30363D', color: '#C9D1D9', lineHeight: 1.5 }}
              />
            )}
            <div className="flex items-center gap-2">
            {!activeVisit ? (
              <button
                onClick={handleStartVisit}
                disabled={visitLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'rgba(63,185,80,0.15)', color: '#3FB950', border: '1px solid rgba(63,185,80,0.3)' }}
                title="Record GPS location and start this visit"
              >
                {visitLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                Start Visit
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowEndPanel(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(63,185,80,0.2)', color: '#3FB950', border: '1px solid rgba(63,185,80,0.4)' }}
                >
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#3FB950' }} />
                  {formatElapsed(elapsed)}
                  {' '}· End Visit
                </button>
                {showEndPanel && (
                  <div
                    className="absolute right-0 top-full mt-1.5 rounded-xl shadow-xl z-50 overflow-hidden"
                    style={{ background: '#1C2128', border: '1px solid #30363D', minWidth: 220 }}
                  >
                    <div className="px-3 py-2" style={{ borderBottom: '1px solid #21262D' }}>
                      <p style={{ color: '#8B949E', fontSize: '0.75rem' }}>How did the visit go?</p>
                    </div>
                    <div className="px-3 py-2" style={{ borderBottom: '1px solid #21262D' }}>
                      <textarea
                        value={postNotes}
                        onChange={e => setPostNotes(e.target.value)}
                        placeholder="Post-visit notes (optional)…"
                        rows={2}
                        className="w-full text-xs px-2 py-1.5 rounded resize-none outline-none"
                        style={{ background: '#21262D', border: '1px solid #30363D', color: '#C9D1D9', lineHeight: 1.5 }}
                      />
                    </div>
                    <button
                      onClick={() => handleEndVisit('completed')}
                      disabled={visitLoading}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-all"
                      style={{ color: '#3FB950' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(63,185,80,0.08)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Completed
                    </button>
                    <button
                      onClick={() => handleEndVisit('not-available')}
                      disabled={visitLoading}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-all"
                      style={{ color: '#F87171' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <XCircle className="h-4 w-4" /> Doctor Not Available
                    </button>
                  </div>
                )}
              </div>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate(`/doctors/${id}/simulator`)}
            >
              <Mic className="h-3.5 w-3.5" /> Practice
            </Button>
            <Button variant="outline" size="icon" onClick={() => setShowEdit(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex items-center gap-1 mt-4 -mb-4 overflow-x-auto scrollbar-thin"
          style={{ borderBottom: '1px solid #30363D' }}
        >
          {tabs.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-150"
              style={{
                borderBottomColor: activeTab === tabId ? '#F0A500' : 'transparent',
                color: activeTab === tabId ? '#F0A500' : '#8B949E',
              }}
                      onMouseEnter={(e) => {
                if (activeTab !== tabId) {
                  (e.currentTarget as HTMLElement).style.color = '#C9D1D9'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tabId) {
                  (e.currentTarget as HTMLElement).style.color = '#8B949E'
                }
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content + right timeline */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview'    && <OverviewTab doctor={doctor} onTabChange={setTab} />}
          {activeTab === 'battlecards' && <BattlecardsTab doctor={doctor} />}
          {activeTab === 'practice'   && <PracticeTab doctor={doctor} />}
          {activeTab === 'postcall'   && <PostCallTab doctor={doctor} />}
          {activeTab === 'notes'      && <NotesTab doctor={doctor} />}
          {activeTab === 'history'    && <HistoryTab doctor={doctor} />}
        </div>
        <div
          className="w-72 shrink-0 overflow-y-auto"
          style={{ borderLeft: '1px solid #30363D', background: '#161B22' }}
        >
          <TimelinePanel doctorId={doctor.id} />
        </div>
      </div>

      {showEdit && (
        <DoctorFormModal
          doctor={doctor}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false)
            qc.invalidateQueries({ queryKey: ['doctor', id] })
            qc.invalidateQueries({ queryKey: ['doctors'] })
          }}
        />
      )}
    </div>
  )
}

function HistoryTab({ doctor }: { doctor: DoctorProfile }) {
  const { data } = useQuery({
    queryKey: ['timeline', doctor.id],
    queryFn: () =>
      api
        .get<{ events: Array<{ id: string; type: string; label: string; timestamp: string }> }>(
          `/api/doctors/${doctor.id}/timeline`,
        )
        .then((r) => r.data),
  })

  const events = data?.events ?? []

  return (
    <div className="space-y-4">
      <h2 className="font-semibold" style={{ color: '#F0F6FC' }}>
        Activity History
      </h2>
      {events.length === 0 ? (
        <p className="text-sm" style={{ color: '#8B949E' }}>
          No activity yet.
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 text-sm py-2"
              style={{ borderBottom: '1px solid #1C2333' }}
            >
              <span style={{ color: '#C9D1D9' }}>{e.label}</span>
              <span className="text-xs ml-auto whitespace-nowrap" style={{ color: '#484F58' }}>
                {formatDate(e.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
