import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Clock, CheckCircle2, XCircle, Plus, Stethoscope } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import type { DoctorAssignment, VisitRecord } from '../types'

const OUTCOME_COLOR: Record<string, string> = {
  visited_offline: '#3FB950',
  visited_online: '#38BDF8',
  not_available: '#F87171',
  rescheduled: '#F0A500',
}

const OUTCOME_LABEL: Record<string, string> = {
  visited_offline: 'Last visit: in-person',
  visited_online: 'Last visit: online',
  not_available: 'Last visit: not available',
  rescheduled: 'Last visit: rescheduled',
}

export default function MyDoctorsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const repId = user?.repId ?? user?.id

  const [loggingFor, setLoggingFor] = useState<string | null>(null)
  const [outcome, setOutcome] = useState('visited_offline')
  const [notes, setNotes] = useState('')

  const { data: assignments, isLoading } = useQuery<DoctorAssignment[]>({
    queryKey: ['rep-assignments', repId],
    queryFn: () => api.get(`/api/salesreps/${repId}/assignments`).then((r) => r.data),
    enabled: !!repId,
  })

  const quickLogMutation = useMutation({
    mutationFn: ({ doctorId }: { doctorId: string }) =>
      api.post(`/api/salesreps/${repId}/visits`, {
        doctorId,
        outcome,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rep-assignments', repId] })
      queryClient.invalidateQueries({ queryKey: ['visits', repId] })
      queryClient.invalidateQueries({ queryKey: ['rep-targets', repId] })
      setLoggingFor(null)
      setNotes('')
      setOutcome('visited_offline')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: '#8B949E' }}>
        <div className="text-sm">Loading your doctors…</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 style={{ color: '#F0F6FC', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          My Doctors
        </h1>
        <p style={{ color: '#8B949E', fontSize: '0.875rem', marginTop: 4 }}>
          {(assignments ?? []).length} clinics assigned to your territory
        </p>
      </div>

      {!assignments?.length ? (
        <div className="flex flex-col items-center justify-center h-56 gap-3 rounded-xl"
          style={{ background: '#161B22', border: '1px solid #30363D' }}>
          <Stethoscope style={{ width: 36, height: 36, color: '#484F58' }} />
          <span style={{ color: '#6E7681' }}>No doctors assigned yet</span>
          <span style={{ color: '#484F58', fontSize: '0.8125rem' }}>Your manager will assign clinics to your territory</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {assignments.map((a) => {
            const isLogging = loggingFor === a.doctorId
            const lastColor = a.lastOutcome ? OUTCOME_COLOR[a.lastOutcome] : '#484F58'

            return (
              <div
                key={a.id}
                className="rounded-xl overflow-hidden"
                style={{ background: '#161B22', border: '1px solid #30363D' }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div style={{ color: '#F0F6FC', fontSize: '0.9375rem', fontWeight: 600 }} className="truncate">
                        {a.doctor?.fullName ?? '—'}
                      </div>
                      <div style={{ color: '#6E7681', fontSize: '0.8125rem', marginTop: 2 }}>
                        {a.doctor?.specialty}
                      </div>
                      {a.doctor?.hospitalOrClinic && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <MapPin style={{ width: 12, height: 12, color: '#8B949E' }} />
                          <span style={{ color: '#8B949E', fontSize: '0.75rem' }}>{a.doctor.hospitalOrClinic}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {a.lastOutcome ? (
                        a.lastOutcome === 'visited_offline' || a.lastOutcome === 'visited_online' ? (
                          <CheckCircle2 style={{ width: 18, height: 18, color: lastColor }} />
                        ) : (
                          <XCircle style={{ width: 18, height: 18, color: lastColor }} />
                        )
                      ) : (
                        <div style={{ width: 18 }} />
                      )}
                    </div>
                  </div>

                  {a.lastVisit && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <Clock style={{ width: 11, height: 11, color: '#484F58' }} />
                      <span style={{ color: '#484F58', fontSize: '0.6875rem' }}>
                        {OUTCOME_LABEL[a.lastOutcome ?? ''] ?? 'Last visit'}{' '}
                        {new Date(a.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  )}
                  {!a.lastVisit && (
                    <div className="mt-2">
                      <span style={{ color: '#F87171', fontSize: '0.6875rem' }}>Not visited yet</span>
                    </div>
                  )}
                </div>

                {/* Quick log panel */}
                {isLogging ? (
                  <div className="p-4 space-y-3" style={{ borderTop: '1px solid #21262D', background: '#0D1117' }}>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { v: 'visited_offline', l: 'In-Person' },
                        { v: 'visited_online', l: 'Online' },
                        { v: 'not_available', l: 'Not Available' },
                        { v: 'rescheduled', l: 'Rescheduled' },
                      ].map(({ v, l }) => (
                        <button
                          key={v}
                          onClick={() => setOutcome(v)}
                          className="py-1.5 px-2 rounded-lg text-xs transition-all"
                          style={{
                            background: outcome === v ? `${OUTCOME_COLOR[v]}20` : '#1C2128',
                            color: outcome === v ? OUTCOME_COLOR[v] : '#8B949E',
                            border: `1px solid ${outcome === v ? `${OUTCOME_COLOR[v]}40` : '#30363D'}`,
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Quick note (optional)"
                      className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                      style={{ background: '#161B22', border: '1px solid #30363D', color: '#F0F6FC' }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => quickLogMutation.mutate({ doctorId: a.doctorId })}
                        disabled={quickLogMutation.isPending}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold"
                        style={{ background: '#F0A500', color: '#0D1117' }}
                      >
                        {quickLogMutation.isPending ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setLoggingFor(null)}
                        className="px-3 py-2 rounded-lg text-xs"
                        style={{ background: '#1C2128', color: '#8B949E', border: '1px solid #30363D' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex gap-2 px-4 py-3"
                    style={{ borderTop: '1px solid #21262D' }}
                  >
                    <button
                      onClick={() => { setLoggingFor(a.doctorId); setOutcome('visited_offline') }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'rgba(240,165,0,0.1)', color: '#F0A500', border: '1px solid rgba(240,165,0,0.2)' }}
                    >
                      <Plus style={{ width: 12, height: 12 }} />
                      Log Visit
                    </button>
                    <button
                      onClick={() => navigate(`/doctors/${a.doctorId}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{ background: '#1C2128', color: '#8B949E', border: '1px solid #30363D' }}
                    >
                      View Profile
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
