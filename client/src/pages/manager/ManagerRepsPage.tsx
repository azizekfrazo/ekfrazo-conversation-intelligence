import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Users, TrendingUp, TrendingDown, Minus,
  MapPin, Target, Calendar, Star, ChevronRight, Activity,
  UserCheck, Plus, X,
} from 'lucide-react'
import { api } from '../../lib/api'
import { DEMO_DOCTORS } from '../../data/demoDoctors'

interface RepTarget {
  dailyVisitTarget: number
  weeklyClinicTarget: number
  qualityScoreTarget: number
}

interface SalesRep {
  id: string
  name: string
  email: string
  territory: string
  avatarColor: string
  status: 'Excellent' | 'On Track' | 'Behind'
  visitsToday: number
  visitsThisWeek: number
  notAvailableToday: number
  pendingFollowUps: number
  avgScore: number
  assignedDoctorsCount: number
  target?: RepTarget | null
}

interface DoctorProfile {
  id: string
  fullName: string
  specialty: string
  hospitalOrClinic?: string
  area?: string
}

interface Assignment {
  id: string
  salesRepId: string
  doctorId: string
  doctor?: { fullName: string; specialty: string }
  salesRep?: { name: string }
}

const STATUS_CONFIG = {
  Excellent: { color: '#3FB950', bg: '#3FB95015', border: '#3FB95030', icon: TrendingUp },
  'On Track': { color: '#F0A500', bg: '#F0A50015', border: '#F0A50030', icon: Minus },
  Behind: { color: '#F87171', bg: '#F8717115', border: '#F8717130', icon: TrendingDown },
}

function avatarInitials(name: string) {
  return name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: '#30363D' }}>
      <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ManagerRepsPage() {
  const [tab, setTab] = useState<'team' | 'assign'>('team')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Excellent' | 'On Track' | 'Behind'>('all')

  const { data, isLoading } = useQuery<SalesRep[]>({
    queryKey: ['salesreps-list'],
    queryFn: () => api.get('/api/salesreps').then(r => r.data),
    refetchInterval: 30_000,
  })

  const reps: SalesRep[] = data ?? []

  const summary = reps.length > 0 ? {
    total: reps.length,
    excellent: reps.filter(r => r.status === 'Excellent').length,
    onTrack: reps.filter(r => r.status === 'On Track').length,
    behind: reps.filter(r => r.status === 'Behind').length,
  } : null

  const filtered = reps.filter(rep => {
    const matchSearch = !search || rep.name.toLowerCase().includes(search.toLowerCase()) || rep.territory.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || rep.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-6 space-y-5" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 style={{ color: '#F0F6FC', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            My Team
          </h1>
          <p style={{ color: '#8B949E', fontSize: '0.875rem', marginTop: 4 }}>
            Sales Representatives · Performance &amp; Doctor Assignments
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#161B22', border: '1px solid #30363D', width: 'fit-content' }}>
        {([['team', 'Team Overview', Users], ['assign', 'Assign Doctors', UserCheck]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === id
              ? { background: 'rgba(240,165,0,0.15)', color: '#F0A500', border: '1px solid rgba(240,165,0,0.3)' }
              : { color: '#8B949E', border: '1px solid transparent' }
            }
          >
            <Icon style={{ width: 14, height: 14 }} />
            {label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      {tab === 'team' && summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Reps', value: summary.total, color: '#8B949E', icon: Users },
            { label: 'Excellent', value: summary.excellent, color: '#3FB950', icon: TrendingUp },
            { label: 'On Track', value: summary.onTrack, color: '#F0A500', icon: Activity },
            { label: 'Behind', value: summary.behind, color: '#F87171', icon: TrendingDown },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#0D1117', border: '1px solid #30363D' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                <Icon style={{ width: 16, height: 16, color }} />
              </div>
              <div>
                <div style={{ color: '#F0F6FC', fontSize: '1.375rem', fontWeight: 700, lineHeight: 1 }}>{value}</div>
                <div style={{ color: '#8B949E', fontSize: '0.75rem', marginTop: 2 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TEAM TAB */}
      {tab === 'team' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2.5" style={{ background: '#161B22', border: '1px solid #30363D', maxWidth: 320 }}>
              <Search style={{ width: 15, height: 15, color: '#8B949E', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search reps or territory…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: '#F0F6FC' }}
              />
            </div>
            <div className="flex items-center gap-2">
              {(['all', 'Excellent', 'On Track', 'Behind'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={statusFilter === s
                    ? { background: s === 'all' ? '#4B2A9120' : `${STATUS_CONFIG[s]?.color ?? '#4B2A91'}20`, color: s === 'all' ? '#A78BFA' : STATUS_CONFIG[s]?.color ?? '#A78BFA', border: `1px solid ${s === 'all' ? '#4B2A9140' : `${STATUS_CONFIG[s]?.color ?? '#4B2A91'}40`}` }
                    : { background: '#161B22', color: '#8B949E', border: '1px solid #30363D' }
                  }
                >{s === 'all' ? 'All' : s}</button>
              ))}
            </div>
          </div>

          {/* Rep cards */}
          {isLoading ? (
            <div className="flex items-center justify-center h-40" style={{ color: '#8B949E' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 rounded-xl gap-3" style={{ background: '#161B22', border: '1px solid #30363D' }}>
              <Users style={{ width: 32, height: 32, color: '#484F58' }} />
              <span style={{ color: '#6E7681' }}>No reps match filters</span>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(rep => {
                const cfg = STATUS_CONFIG[rep.status] ?? STATUS_CONFIG['On Track']
                const StatusIcon = cfg.icon
                const weeklyPct = rep.target?.weeklyClinicTarget ? Math.min(100, Math.round((rep.visitsThisWeek / rep.target.weeklyClinicTarget) * 100)) : 0
                const dailyPct = rep.target?.dailyVisitTarget ? Math.min(100, Math.round((rep.visitsToday / rep.target.dailyVisitTarget) * 100)) : 0

                return (
                  <Link key={rep.id} to={`/manager/reps/${rep.id}`}
                    className="block rounded-xl p-5 transition-all"
                    style={{ background: '#161B22', border: '1px solid #30363D', textDecoration: 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#4B2A9160'; (e.currentTarget as HTMLElement).style.background = '#1C2128' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#30363D'; (e.currentTarget as HTMLElement).style.background = '#161B22' }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                        style={{ background: rep.avatarColor + '30', color: rep.avatarColor, border: `2px solid ${rep.avatarColor}40` }}>
                        {avatarInitials(rep.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span style={{ color: '#F0F6FC', fontWeight: 600, fontSize: '0.9375rem' }}>{rep.name}</span>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                            <StatusIcon style={{ width: 11, height: 11 }} />{rep.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="flex items-center gap-1" style={{ color: '#8B949E', fontSize: '0.8125rem' }}>
                            <MapPin style={{ width: 12, height: 12 }} />{rep.territory}
                          </span>
                          <span className="flex items-center gap-1" style={{ color: '#8B949E', fontSize: '0.8125rem' }}>
                            <Users style={{ width: 12, height: 12 }} />{rep.assignedDoctorsCount} doctors
                          </span>
                          {rep.pendingFollowUps > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: '#F0A50015', color: '#F0A500', border: '1px solid #F0A50030' }}>
                              {rep.pendingFollowUps} pending follow-ups
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span style={{ color: '#8B949E', fontSize: '0.75rem' }}><Calendar style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />Today</span>
                              <span style={{ color: '#C9D1D9', fontSize: '0.75rem', fontWeight: 600 }}>{rep.visitsToday} / {rep.target?.dailyVisitTarget ?? '—'}</span>
                            </div>
                            <ProgressBar value={rep.visitsToday} max={rep.target?.dailyVisitTarget ?? 1} color={cfg.color} />
                            <span style={{ color: '#6E7681', fontSize: '0.7rem', marginTop: 2, display: 'block' }}>{dailyPct}% of daily target</span>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span style={{ color: '#8B949E', fontSize: '0.75rem' }}><Target style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />This week</span>
                              <span style={{ color: '#C9D1D9', fontSize: '0.75rem', fontWeight: 600 }}>{rep.visitsThisWeek} / {rep.target?.weeklyClinicTarget ?? '—'}</span>
                            </div>
                            <ProgressBar value={rep.visitsThisWeek} max={rep.target?.weeklyClinicTarget ?? 1} color={cfg.color} />
                            <span style={{ color: '#6E7681', fontSize: '0.7rem', marginTop: 2, display: 'block' }}>{weeklyPct}% of weekly target</span>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span style={{ color: '#8B949E', fontSize: '0.75rem' }}><Star style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />Avg score</span>
                              <span style={{ color: '#C9D1D9', fontSize: '0.75rem', fontWeight: 600 }}>{rep.avgScore} / {rep.target?.qualityScoreTarget ?? 100}</span>
                            </div>
                            <ProgressBar value={rep.avgScore} max={rep.target?.qualityScoreTarget ?? 100} color={cfg.color} />
                            <span style={{ color: '#6E7681', fontSize: '0.7rem', marginTop: 2, display: 'block' }}>Quality score</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight style={{ width: 18, height: 18, color: '#484F58', flexShrink: 0, marginTop: 4 }} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ASSIGN TAB */}
      {tab === 'assign' && <AssignDoctorsPanel reps={reps} />}
    </div>
  )
}

// ─── Assign panel ─────────────────────────────────────────────────────────────

function AssignDoctorsPanel({ reps }: { reps: SalesRep[] }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedRep, setSelectedRep] = useState<string>('')
  const [notification, setNotification] = useState<{ msg: string; ok: boolean } | null>(null)

  const { data: allAssignments } = useQuery<Assignment[]>({
    queryKey: ['assignments'],
    queryFn: () => api.get('/api/assignments').then(r => r.data),
  })

  const { data: apiDoctors } = useQuery<DoctorProfile[]>({
    queryKey: ['doctors-all'],
    queryFn: () => api.get('/api/doctors').then(r => r.data.doctors ?? r.data),
    retry: false,
  })

  // Fall back to DEMO_DOCTORS so the panel is never empty
  const doctors: DoctorProfile[] = (apiDoctors && apiDoctors.length > 0)
    ? apiDoctors
    : (DEMO_DOCTORS as unknown as DoctorProfile[])

  const showNotif = (msg: string, ok: boolean) => {
    setNotification({ msg, ok })
    setTimeout(() => setNotification(null), 3500)
  }

  const assignMutation = useMutation({
    mutationFn: ({ salesRepId, doctorId }: { salesRepId: string; doctorId: string }) =>
      api.post('/api/assignments', { salesRepId, doctorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['salesreps-list'] })
      showNotif('Doctor assigned successfully', true)
    },
    onError: (err: any) => {
      showNotif(err?.response?.data?.error ?? 'Already assigned or error', false)
    },
  })

  const unassignMutation = useMutation({
    mutationFn: (assignmentId: string) => api.delete(`/api/assignments/${assignmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['salesreps-list'] })
      showNotif('Doctor unassigned', true)
    },
  })

  const filteredDoctors = doctors.filter(d =>
    d.fullName.toLowerCase().includes(search.toLowerCase()) ||
    d.specialty.toLowerCase().includes(search.toLowerCase()) ||
    (d.hospitalOrClinic ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const repAssignments = (allAssignments ?? []).filter(a => !selectedRep || a.salesRepId === selectedRep)

  const isAssigned = (doctorId: string) =>
    selectedRep ? (allAssignments ?? []).some(a => a.salesRepId === selectedRep && a.doctorId === doctorId) : false

  return (
    <div className="space-y-4">
      {/* Toast */}
      {notification && (
        <div className="fixed top-5 right-5 px-4 py-3 rounded-xl text-sm font-medium z-50 shadow-lg"
          style={{
            background: notification.ok ? 'rgba(63,185,80,0.15)' : 'rgba(248,113,113,0.15)',
            border: `1px solid ${notification.ok ? '#3FB95040' : '#F8717140'}`,
            color: notification.ok ? '#3FB950' : '#F87171',
          }}>
          {notification.msg}
        </div>
      )}

      {/* Rep selector */}
      <div className="flex items-center gap-3 flex-wrap p-4 rounded-xl" style={{ background: '#161B22', border: '1px solid #30363D' }}>
        <span style={{ color: '#8B949E', fontSize: '0.875rem' }}>Select a representative:</span>
        <button onClick={() => setSelectedRep('')} className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{ background: !selectedRep ? 'rgba(240,165,0,0.15)' : '#1C2128', color: !selectedRep ? '#F0A500' : '#8B949E', border: `1px solid ${!selectedRep ? '#F0A50040' : '#30363D'}` }}>
          All
        </button>
        {reps.map(rep => (
          <button key={rep.id} onClick={() => setSelectedRep(rep.id)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            style={{ background: selectedRep === rep.id ? 'rgba(240,165,0,0.15)' : '#1C2128', color: selectedRep === rep.id ? '#F0A500' : '#8B949E', border: `1px solid ${selectedRep === rep.id ? '#F0A50040' : '#30363D'}` }}>
            <span className="h-2 w-2 rounded-full" style={{ background: rep.avatarColor }} />
            {rep.name.split(' ')[0]}
            <span style={{ fontSize: '0.7rem', color: selectedRep === rep.id ? '#F0A50080' : '#6E7681' }}>
              {rep.assignedDoctorsCount}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: doctor search list */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#161B22', border: '1px solid #30363D' }}>
          <div className="p-4 space-y-3" style={{ borderBottom: '1px solid #21262D' }}>
            <h3 style={{ color: '#F0F6FC', fontSize: '0.875rem', fontWeight: 600 }}>
              All Doctors ({filteredDoctors.length}
              {filteredDoctors.length !== doctors.length && ` of ${doctors.length}`})
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#6E7681' }} />
              <input type="text" placeholder="Search by name, specialty, clinic…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg pl-9 pr-4 py-2 text-sm outline-none"
                style={{ background: '#0D1117', border: '1px solid #30363D', color: '#F0F6FC' }} />
            </div>
            {!selectedRep && (
              <p style={{ color: '#6E7681', fontSize: '0.75rem' }}>Select a rep above to assign or remove doctors</p>
            )}
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
            {filteredDoctors.map(doc => {
              const assigned = isAssigned(doc.id)
              // Find which rep this doctor is already assigned to (global)
              const existingGlobal = (allAssignments ?? []).find(a => a.doctorId === doc.id)
              const assignedToOtherRep = existingGlobal && existingGlobal.salesRepId !== selectedRep

              return (
                <div key={doc.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #21262D' }}>
                  <div className="flex-1 min-w-0">
                    <div style={{ color: '#C9D1D9', fontSize: '0.8125rem', fontWeight: 500 }}>{doc.fullName}</div>
                    <div style={{ color: '#6E7681', fontSize: '0.75rem' }}>{doc.specialty} · {doc.hospitalOrClinic ?? 'Unknown Clinic'}</div>
                    {assignedToOtherRep && (
                      <div style={{ color: '#F0A500', fontSize: '0.7rem', marginTop: 2 }}>
                        Already assigned to {reps.find(r => r.id === existingGlobal?.salesRepId)?.name ?? 'another rep'}
                      </div>
                    )}
                  </div>
                  {selectedRep && (
                    <button
                      onClick={() => {
                        if (assigned) {
                          const a = (allAssignments ?? []).find(x => x.salesRepId === selectedRep && x.doctorId === doc.id)
                          if (a) unassignMutation.mutate(a.id)
                        } else {
                          assignMutation.mutate({ salesRepId: selectedRep, doctorId: doc.id })
                        }
                      }}
                      disabled={!!assignedToOtherRep && !assigned}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ml-3 flex-shrink-0"
                      style={assigned
                        ? { background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid #F8717130' }
                        : assignedToOtherRep
                          ? { background: '#21262D', color: '#484F58', border: '1px solid #30363D', cursor: 'not-allowed', opacity: 0.5 }
                          : { background: 'rgba(240,165,0,0.1)', color: '#F0A500', border: '1px solid #F0A50030' }
                      }
                    >
                      {assigned ? <X style={{ width: 12, height: 12 }} /> : <Plus style={{ width: 12, height: 12 }} />}
                      {assigned ? 'Remove' : assignedToOtherRep ? 'Taken' : 'Assign'}
                    </button>
                  )}
                  {!selectedRep && (
                    <span style={{ color: '#484F58', fontSize: '0.75rem', flexShrink: 0, marginLeft: 8 }}>—</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: current assignments */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#161B22', border: '1px solid #30363D' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #21262D' }}>
            <h3 style={{ color: '#F0F6FC', fontSize: '0.875rem', fontWeight: 600 }}>
              {selectedRep ? `Assigned to ${reps.find(r => r.id === selectedRep)?.name?.split(' ')[0] ?? 'Rep'}` : 'All Assignments'}
              <span style={{ color: '#6E7681', fontWeight: 400, marginLeft: 6 }}>({repAssignments.length})</span>
            </h3>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
            {repAssignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <UserCheck style={{ width: 28, height: 28, color: '#484F58' }} />
                <span style={{ color: '#6E7681', fontSize: '0.875rem' }}>
                  {selectedRep ? 'No doctors assigned yet' : 'No assignments found'}
                </span>
              </div>
            ) : (
              <div>
                {repAssignments.map(a => {
                  const rep = reps.find(r => r.id === a.salesRepId)
                  return (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #21262D' }}>
                      <div>
                        <div style={{ color: '#C9D1D9', fontSize: '0.8125rem', fontWeight: 500 }}>{a.doctor?.fullName ?? '—'}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {rep && <span className="h-2 w-2 rounded-full" style={{ background: rep.avatarColor }} />}
                          <span style={{ color: '#6E7681', fontSize: '0.75rem' }}>{rep?.name ?? '—'} · {a.doctor?.specialty ?? '—'}</span>
                        </div>
                      </div>
                      <button onClick={() => unassignMutation.mutate(a.id)}
                        className="p-1.5 rounded-lg transition-all" style={{ color: '#484F58' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#F87171')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#484F58')}>
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
