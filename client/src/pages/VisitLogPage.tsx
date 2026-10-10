import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Calendar, Clock, CheckCircle2, XCircle, RefreshCw, Wifi } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import type { VisitRecord, DoctorAssignment } from '../types'

const OUTCOMES = [
  { value: 'visited_offline', label: 'Visited (In-Person)', icon: CheckCircle2, color: '#3FB950' },
  { value: 'visited_online', label: 'Visited (Online)', icon: Wifi, color: '#38BDF8' },
  { value: 'not_available', label: 'Not Available', icon: XCircle, color: '#F87171' },
  { value: 'rescheduled', label: 'Rescheduled', icon: RefreshCw, color: '#F0A500' },
]

const OUTCOME_COLOR: Record<string, string> = {
  visited_offline: '#3FB950',
  visited_online: '#38BDF8',
  not_available: '#F87171',
  rescheduled: '#F0A500',
}

const OUTCOME_LABEL: Record<string, string> = {
  visited_offline: 'In-Person',
  visited_online: 'Online',
  not_available: 'Not Available',
  rescheduled: 'Rescheduled',
}

export default function VisitLogPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const repId = user?.repId ?? user?.id

  const [showForm, setShowForm] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [outcome, setOutcome] = useState('visited_offline')
  const [notes, setNotes] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [notification, setNotification] = useState<string | null>(null)

  const { data: visits } = useQuery<VisitRecord[]>({
    queryKey: ['visits', repId],
    queryFn: () => api.get(`/api/salesreps/${repId}/visits?days=30`).then((r) => r.data),
    enabled: !!repId,
  })

  const { data: assignments } = useQuery<DoctorAssignment[]>({
    queryKey: ['rep-assignments', repId],
    queryFn: () => api.get(`/api/salesreps/${repId}/assignments`).then((r) => r.data),
    enabled: !!repId,
  })

  const logMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/salesreps/${repId}/visits`, {
        doctorId: selectedDoctor,
        outcome,
        notes: notes.trim() || undefined,
        followUp: followUp.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits', repId] })
      queryClient.invalidateQueries({ queryKey: ['rep-targets', repId] })
      setShowForm(false)
      setSelectedDoctor('')
      setNotes('')
      setFollowUp('')
      setOutcome('visited_offline')
      setNotification('Visit logged successfully')
      setTimeout(() => setNotification(null), 3000)
    },
  })

  // Group visits by date
  const grouped: Record<string, VisitRecord[]> = {}
  ;(visits ?? []).forEach((v) => {
    const day = new Date(v.date).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(v)
  })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {notification && (
        <div
          className="fixed top-5 right-5 px-4 py-3 rounded-xl text-sm font-medium z-50 shadow-lg"
          style={{ background: 'rgba(63,185,80,0.15)', border: '1px solid #3FB95040', color: '#3FB950' }}
        >
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ color: '#F0F6FC', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Visit Log
          </h1>
          <p style={{ color: '#8B949E', fontSize: '0.875rem', marginTop: 4 }}>
            {(visits ?? []).length} visits in the last 30 days
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: '#F0A500', color: '#0D1117' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#E09400')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#F0A500')}
        >
          <Plus style={{ width: 16, height: 16 }} />
          Log Visit
        </button>
      </div>

      {/* Log Visit form */}
      {showForm && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: '#161B22', border: '1px solid #F0A50040' }}>
          <h2 style={{ color: '#F0F6FC', fontSize: '0.9375rem', fontWeight: 600 }}>New Visit</h2>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#8B949E' }}>Doctor / Clinic</label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: '#0D1117', border: '1px solid #30363D', color: '#F0F6FC' }}
            >
              <option value="">Select a doctor…</option>
              {(assignments ?? []).map((a) => (
                <option key={a.id} value={a.doctorId}>
                  {a.doctor?.fullName} — {a.doctor?.hospitalOrClinic ?? a.area ?? '—'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#8B949E' }}>Outcome</label>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => setOutcome(value)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all"
                  style={{
                    background: outcome === value ? `${color}20` : '#1C2128',
                    border: `1px solid ${outcome === value ? `${color}60` : '#30363D'}`,
                    color: outcome === value ? color : '#8B949E',
                  }}
                >
                  <Icon style={{ width: 14, height: 14 }} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#8B949E' }}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened in this visit?"
              rows={2}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
              style={{ background: '#0D1117', border: '1px solid #30363D', color: '#F0F6FC' }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#8B949E' }}>Follow-up action (optional)</label>
            <input
              type="text"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              placeholder="e.g. Send study paper, call next week"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: '#0D1117', border: '1px solid #30363D', color: '#F0F6FC' }}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => logMutation.mutate()}
              disabled={!selectedDoctor || logMutation.isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                background: !selectedDoctor ? '#30363D' : '#F0A500',
                color: !selectedDoctor ? '#484F58' : '#0D1117',
                cursor: !selectedDoctor ? 'not-allowed' : 'pointer',
              }}
            >
              {logMutation.isPending ? 'Logging…' : 'Save Visit'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl text-sm"
              style={{ background: '#1C2128', color: '#8B949E', border: '1px solid #30363D' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Visit history */}
      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 rounded-xl"
          style={{ background: '#161B22', border: '1px solid #30363D' }}>
          <Calendar style={{ width: 32, height: 32, color: '#484F58' }} />
          <span style={{ color: '#6E7681' }}>No visits logged yet</span>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-medium"
            style={{ color: '#F0A500' }}
          >
            Log your first visit →
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, dayVisits]) => (
            <div key={day}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar style={{ width: 14, height: 14, color: '#8B949E' }} />
                <span style={{ color: '#8B949E', fontSize: '0.8125rem', fontWeight: 600 }}>{day}</span>
                <span className="ml-1 px-1.5 py-0.5 rounded text-xs"
                  style={{ background: '#21262D', color: '#6E7681' }}>{dayVisits.length}</span>
              </div>
              <div className="space-y-2">
                {dayVisits.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-xl p-4"
                    style={{ background: '#161B22', border: '1px solid #30363D' }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div style={{ color: '#C9D1D9', fontSize: '0.9375rem', fontWeight: 600 }}>
                          {v.doctor?.fullName ?? 'Unknown'}
                        </div>
                        <div style={{ color: '#6E7681', fontSize: '0.8125rem', marginTop: 2 }}>
                          {v.doctor?.specialty} · {new Date(v.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{
                          background: `${OUTCOME_COLOR[v.outcome] ?? '#8B949E'}18`,
                          color: OUTCOME_COLOR[v.outcome] ?? '#8B949E',
                          border: `1px solid ${OUTCOME_COLOR[v.outcome] ?? '#8B949E'}30`,
                        }}
                      >
                        {OUTCOME_LABEL[v.outcome] ?? v.outcome}
                      </span>
                    </div>
                    {v.notes && (
                      <p className="mt-2.5 text-sm" style={{ color: '#8B949E' }}>{v.notes}</p>
                    )}
                    {v.followUp && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <Clock style={{ width: 12, height: 12, color: '#F0A500' }} />
                        <span style={{ color: '#F0A500', fontSize: '0.8125rem' }}>{v.followUp}</span>
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
  )
}
