import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, MapPin, Clock, CheckCircle2, XCircle, Calendar, Navigation, Filter } from 'lucide-react'
import { api } from '../../lib/api'
import type { SalesRep, VisitRecord, DoctorAssignment } from '../../types'

interface TargetResponse {
  target: {
    dailyVisitTarget: number
    weeklyClinicTarget: number
    monthlyRevenueTarget: number
    qualityScoreTarget: number
  }
  actuals: {
    visitsToday: number
    visitsThisWeek: number
    uniqueClinicsThisWeek: number
    avgScore: number
    monthlyRevenue: number
  }
}

const OUTCOME_LABEL: Record<string, string> = {
  visited_offline: 'Visited',
  visited_online: 'Online Visit',
  not_available: 'Not Available',
  rescheduled: 'Rescheduled',
}

const OUTCOME_COLOR: Record<string, string> = {
  visited_offline: '#3FB950',
  visited_online: '#38BDF8',
  not_available: '#F87171',
  rescheduled: '#F0A500',
}

const FILTER_OPTIONS = ['all', 'today', 'week', 'month'] as const
const FILTER_LABELS: Record<string, string> = { all: '14 Days', today: 'Today', week: 'This Week', month: 'This Month' }

// Returns YYYY-MM-DD in IST regardless of browser timezone
function toISTDate(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function filterByDate(dateStr: string | null | undefined, filter: string): boolean {
  if (!dateStr) return filter === 'all'
  const d = new Date(dateStr)
  const now = new Date()
  if (filter === 'today') return toISTDate(d) === toISTDate(now)
  if (filter === 'week') return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  if (filter === 'month') {
    const [dy, dm] = toISTDate(d).split('-').map(Number)
    const [ny, nm] = toISTDate(now).split('-').map(Number)
    return dy === ny && dm === nm
  }
  return true
}

export default function ManagerRepDetailPage() {
  const { repId } = useParams<{ repId: string }>()
  const navigate = useNavigate()
  const [visitFilter, setVisitFilter] = useState<string>('all')
  const [clinicFilter, setClinicFilter] = useState<string>('all')

  const { data: rep } = useQuery<SalesRep>({
    queryKey: ['rep', repId],
    queryFn: () => api.get(`/api/salesreps/${repId}`).then((r) => r.data),
    enabled: !!repId,
  })

  const { data: visits } = useQuery<VisitRecord[]>({
    queryKey: ['rep-visits', repId],
    queryFn: () => api.get(`/api/salesreps/${repId}/visits?days=14`).then((r) => r.data),
    enabled: !!repId,
  })

  const { data: targetData } = useQuery<TargetResponse>({
    queryKey: ['rep-targets', repId],
    queryFn: () => api.get(`/api/salesreps/${repId}/targets`).then((r) => r.data),
    enabled: !!repId,
  })

  const { data: assignments } = useQuery<DoctorAssignment[]>({
    queryKey: ['rep-assignments', repId],
    queryFn: () => api.get(`/api/salesreps/${repId}/assignments`).then((r) => r.data),
    enabled: !!repId,
  })

  if (!rep) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: '#8B949E' }}>
        <div className="text-sm">Loading rep details…</div>
      </div>
    )
  }

  const filteredVisits = (visits ?? []).filter((v) => filterByDate(v.date, visitFilter))
  const grouped: Record<string, VisitRecord[]> = {}
  filteredVisits.forEach((v) => {
    const day = new Date(v.date).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata',
    })
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(v)
  })

  const filteredAssignments = (assignments ?? []).filter((a) => filterByDate(a.lastVisit ?? null, clinicFilter))

  const actuals = targetData?.actuals
  const target = targetData?.target

  const pendingFollowUps = (visits ?? []).filter(v => v.followUp && v.followUp.trim()).length

  const computedStatus: 'Excellent' | 'On Track' | 'Behind' = (() => {
    if (!actuals || !target) return 'On Track'
    const weeklyPct = target.weeklyClinicTarget > 0 ? actuals.visitsThisWeek / target.weeklyClinicTarget : 0
    if (weeklyPct >= 0.9) return 'Excellent'
    if (actuals.visitsToday < 3) return 'Behind'
    return 'On Track'
  })()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Back + header */}
      <div>
        <button
          onClick={() => navigate('/manager/reps')}
          className="flex items-center gap-1.5 mb-4 text-sm transition-colors"
          style={{ color: '#8B949E' }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#F0F6FC')}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#8B949E')}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Back to My Team
        </button>

        <div className="flex items-center gap-4">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
            style={{ background: rep.avatarColor ?? '#4B2A91', color: '#fff' }}
          >
            {rep.name?.split(' ').map((n: string) => n[0]).join('') ?? '?'}
          </div>
          <div>
            <h1 style={{ color: '#F0F6FC', fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              {rep.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(139,92,246,0.1)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.25)' }}>
                Sales Representative
              </span>
              {rep.territory && (
                <span className="flex items-center gap-1 text-sm" style={{ color: '#8B949E' }}>
                  <MapPin style={{ width: 13, height: 13 }} />
                  {rep.territory}
                </span>
              )}
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  background: computedStatus === 'Excellent' ? 'rgba(63,185,80,0.1)' : computedStatus === 'Behind' ? 'rgba(248,113,113,0.1)' : 'rgba(240,165,0,0.1)',
                  color: computedStatus === 'Excellent' ? '#3FB950' : computedStatus === 'Behind' ? '#F87171' : '#F0A500',
                  border: `1px solid ${computedStatus === 'Excellent' ? '#3FB95040' : computedStatus === 'Behind' ? '#F8717140' : '#F0A50040'}`,
                }}
              >
                {computedStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left col: targets */}
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-4" style={{ background: '#161B22', border: '1px solid #30363D' }}>
            <h3 style={{ color: '#F0F6FC', fontSize: '0.875rem', fontWeight: 600 }}>This Week's Targets</h3>
            {target && actuals && (
              <div className="space-y-3">
                <ProgressBar label="Daily Visits" current={actuals.visitsToday} target={target.dailyVisitTarget} />
                <ProgressBar label="Weekly Clinics" current={actuals.visitsThisWeek} target={target.weeklyClinicTarget} />
              </div>
            )}
          </div>

          <div className="rounded-xl p-4 space-y-3" style={{ background: '#161B22', border: '1px solid #30363D' }}>
            <h3 style={{ color: '#F0F6FC', fontSize: '0.875rem', fontWeight: 600 }}>Quick Stats</h3>
            {[
              { label: 'Assigned Clinics', value: assignments?.length ?? 0 },
              { label: 'Pending Follow-ups', value: pendingFollowUps },
              { label: 'Productivity Score', value: actuals ? `${actuals.avgScore}/100` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span style={{ color: '#8B949E', fontSize: '0.8125rem' }}>{label}</span>
                <span style={{ color: '#F0F6FC', fontSize: '0.9375rem', fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center col: visit timeline */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#161B22', border: '1px solid #30363D' }}>
          <div className="px-4 py-3 space-y-2.5" style={{ borderBottom: '1px solid #21262D' }}>
            <h3 style={{ color: '#F0F6FC', fontSize: '0.875rem', fontWeight: 600 }}>Visit Timeline</h3>
            <FilterBar value={visitFilter} onChange={setVisitFilter} />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
            {Object.keys(grouped).length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm" style={{ color: '#6E7681' }}>
                {(visits ?? []).length > 0 ? 'No visits in this period' : 'No visits recorded'}
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {Object.entries(grouped).map(([day, dayVisits]) => (
                  <div key={day}>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar style={{ width: 13, height: 13, color: '#8B949E' }} />
                      <span style={{ color: '#8B949E', fontSize: '0.75rem', fontWeight: 600 }}>{day}</span>
                    </div>
                    <div className="space-y-2 pl-4">
                      {dayVisits.map((v) => (
                        <div
                          key={v.id}
                          className="rounded-lg p-3"
                          style={{ background: '#1C2128', border: '1px solid #30363D' }}
                        >
                          <div className="flex items-center justify-between">
                            <span style={{ color: '#C9D1D9', fontSize: '0.8125rem', fontWeight: 500 }}>
                              {v.doctor?.fullName ?? 'Unknown Doctor'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {v.punchInTime && (
                                <span
                                  title={`Punched in at ${new Date(v.punchInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}${v.punchInLat ? ` · GPS: ${v.punchInLat.toFixed(4)}, ${v.punchInLng?.toFixed(4)}` : ''}`}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs cursor-default"
                                  style={{ background: 'rgba(63,185,80,0.1)', color: '#3FB950', border: '1px solid rgba(63,185,80,0.25)' }}
                                >
                                  <Navigation style={{ width: 9, height: 9 }} />
                                  {new Date(v.punchInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                                </span>
                              )}
                              <span
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{
                                  background: `${OUTCOME_COLOR[v.outcome] ?? '#8B949E'}20`,
                                  color: OUTCOME_COLOR[v.outcome] ?? '#8B949E',
                                }}
                              >
                                {OUTCOME_LABEL[v.outcome] ?? v.outcome}
                              </span>
                            </div>
                          </div>
                          {v.preNotes && (
                            <p className="mt-1.5 text-xs px-2 py-1 rounded" style={{ color: '#8B949E', background: 'rgba(240,165,0,0.06)', borderLeft: '2px solid rgba(240,165,0,0.25)' }}>
                              <span style={{ color: '#F0A500', fontWeight: 600 }}>Pre: </span>{v.preNotes}
                            </p>
                          )}
                          {v.notes && (
                            <p className="mt-1.5 text-xs" style={{ color: '#6E7681' }}>{v.notes}</p>
                          )}
                          {v.postNotes && (
                            <p className="mt-1.5 text-xs px-2 py-1 rounded" style={{ color: '#8B949E', background: 'rgba(56,189,248,0.06)', borderLeft: '2px solid rgba(56,189,248,0.25)' }}>
                              <span style={{ color: '#38BDF8', fontWeight: 600 }}>Post: </span>{v.postNotes}
                            </p>
                          )}
                          {v.followUp && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <Clock style={{ width: 11, height: 11, color: '#F0A500' }} />
                              <span className="text-xs" style={{ color: '#F0A500' }}>{v.followUp}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right col: assigned doctors */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#161B22', border: '1px solid #30363D' }}>
          <div className="px-4 py-3 space-y-2.5" style={{ borderBottom: '1px solid #21262D' }}>
            <h3 style={{ color: '#F0F6FC', fontSize: '0.875rem', fontWeight: 600 }}>
              Assigned Clinics ({assignments?.length ?? 0})
            </h3>
            <FilterBar value={clinicFilter} onChange={setClinicFilter} />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
            {!assignments?.length ? (
              <div className="flex items-center justify-center h-32 text-sm" style={{ color: '#6E7681' }}>
                No doctors assigned
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm" style={{ color: '#6E7681' }}>
                No visits in this period
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: '#21262D' }}>
                {filteredAssignments.map((a) => (
                  <div key={a.id} className="px-4 py-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div style={{ color: '#C9D1D9', fontSize: '0.8125rem', fontWeight: 500 }}>
                          {a.doctor?.fullName ?? '—'}
                        </div>
                        <div style={{ color: '#6E7681', fontSize: '0.75rem' }}>
                          {a.doctor?.specialty} · {a.doctor?.hospitalOrClinic ?? a.area ?? '—'}
                        </div>
                      </div>
                      {a.lastOutcome ? (
                        a.lastOutcome === 'visited_offline' || a.lastOutcome === 'visited_online' ? (
                          <CheckCircle2 style={{ width: 14, height: 14, color: '#3FB950', flexShrink: 0, marginTop: 2 }} />
                        ) : (
                          <XCircle style={{ width: 14, height: 14, color: '#F87171', flexShrink: 0, marginTop: 2 }} />
                        )
                      ) : null}
                    </div>
                    {a.lastVisit && (
                      <div style={{ color: '#484F58', fontSize: '0.6875rem' }}>
                        Last visit: {new Date(a.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Filter style={{ width: 11, height: 11, color: '#484F58', flexShrink: 0 }} />
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className="px-2 py-0.5 rounded text-xs transition-colors"
          style={{
            background: value === opt ? 'rgba(240,165,0,0.15)' : 'transparent',
            color: value === opt ? '#F0A500' : '#6E7681',
            border: value === opt ? '1px solid rgba(240,165,0,0.3)' : '1px solid transparent',
            fontWeight: value === opt ? 600 : 400,
          }}
        >
          {FILTER_LABELS[opt]}
        </button>
      ))}
    </div>
  )
}

function ProgressBar({ label, current, target, suffix = '' }: { label: string; current: number; target: number; suffix?: string }) {
  const pct = Math.min(Math.round((current / target) * 100), 100)
  const color = pct >= 100 ? '#3FB950' : pct >= 60 ? '#F0A500' : '#F87171'
  const displayCurrent = Math.min(current, target)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span style={{ color: '#8B949E', fontSize: '0.75rem' }}>{label}</span>
        <span style={{ color, fontSize: '0.75rem', fontWeight: 600 }}>
          {displayCurrent}{suffix} / {target}{suffix}
          {pct >= 100 && <span style={{ marginLeft: 4 }}>✓</span>}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#21262D' }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
