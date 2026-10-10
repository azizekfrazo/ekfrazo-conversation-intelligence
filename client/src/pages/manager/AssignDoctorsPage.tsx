import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, X, UserCheck } from 'lucide-react'
import { api } from '../../lib/api'
import type { SalesRep, DoctorAssignment, DoctorProfile } from '../../types'

export default function AssignDoctorsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedRep, setSelectedRep] = useState<string>('')
  const [notification, setNotification] = useState<{ msg: string; ok: boolean } | null>(null)

  const { data: reps } = useQuery<SalesRep[]>({
    queryKey: ['salesreps'],
    queryFn: () => api.get('/api/salesreps').then((r) => r.data),
  })

  const { data: allAssignments } = useQuery<DoctorAssignment[]>({
    queryKey: ['assignments'],
    queryFn: () => api.get('/api/assignments').then((r) => r.data),
  })

  const { data: doctors } = useQuery<DoctorProfile[]>({
    queryKey: ['doctors'],
    queryFn: () => api.get('/api/doctors').then((r) => r.data),
  })

  const assignMutation = useMutation({
    mutationFn: ({ salesRepId, doctorId }: { salesRepId: string; doctorId: string }) =>
      api.post('/api/assignments', { salesRepId, doctorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['salesreps'] })
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
      queryClient.invalidateQueries({ queryKey: ['salesreps'] })
      showNotif('Doctor unassigned', true)
    },
  })

  const showNotif = (msg: string, ok: boolean) => {
    setNotification({ msg, ok })
    setTimeout(() => setNotification(null), 3000)
  }

  const filteredDoctors = (doctors ?? []).filter((d) =>
    d.fullName.toLowerCase().includes(search.toLowerCase()) ||
    d.specialty.toLowerCase().includes(search.toLowerCase()) ||
    (d.hospitalOrClinic ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const repAssignments = (allAssignments ?? []).filter(
    (a) => !selectedRep || a.salesRepId === selectedRep
  )

  const isAssigned = (doctorId: string) =>
    selectedRep
      ? (allAssignments ?? []).some((a) => a.salesRepId === selectedRep && a.doctorId === doctorId)
      : false

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 style={{ color: '#F0F6FC', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Assign Doctors
        </h1>
        <p style={{ color: '#8B949E', fontSize: '0.875rem', marginTop: 4 }}>
          Assign clinics to sales reps for territory coverage
        </p>
      </div>

      {/* Toast */}
      {notification && (
        <div
          className="fixed top-5 right-5 px-4 py-3 rounded-xl text-sm font-medium z-50 shadow-lg"
          style={{
            background: notification.ok ? 'rgba(63,185,80,0.15)' : 'rgba(248,113,113,0.15)',
            border: `1px solid ${notification.ok ? '#3FB95040' : '#F8717140'}`,
            color: notification.ok ? '#3FB950' : '#F87171',
          }}
        >
          {notification.msg}
        </div>
      )}

      {/* Rep selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span style={{ color: '#8B949E', fontSize: '0.875rem' }}>Show assignments for:</span>
        <button
          onClick={() => setSelectedRep('')}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: !selectedRep ? 'rgba(240,165,0,0.15)' : '#1C2128',
            color: !selectedRep ? '#F0A500' : '#8B949E',
            border: `1px solid ${!selectedRep ? '#F0A50040' : '#30363D'}`,
          }}
        >
          All Reps
        </button>
        {(reps ?? []).map((rep) => (
          <button
            key={rep.id}
            onClick={() => setSelectedRep(rep.id)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            style={{
              background: selectedRep === rep.id ? 'rgba(240,165,0,0.15)' : '#1C2128',
              color: selectedRep === rep.id ? '#F0A500' : '#8B949E',
              border: `1px solid ${selectedRep === rep.id ? '#F0A50040' : '#30363D'}`,
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: rep.avatarColor }}
            />
            {rep.name.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: doctor list */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#161B22', border: '1px solid #30363D' }}>
          <div className="p-4 space-y-3" style={{ borderBottom: '1px solid #21262D' }}>
            <h3 style={{ color: '#F0F6FC', fontSize: '0.875rem', fontWeight: 600 }}>
              All Doctors ({filteredDoctors.length})
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#6E7681' }} />
              <input
                type="text"
                placeholder="Search by name, specialty, clinic…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg pl-9 pr-4 py-2 text-sm outline-none"
                style={{
                  background: '#0D1117',
                  border: '1px solid #30363D',
                  color: '#F0F6FC',
                }}
              />
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
            {filteredDoctors.map((doc) => {
              const assigned = isAssigned(doc.id)
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: '1px solid #21262D' }}
                >
                  <div>
                    <div style={{ color: '#C9D1D9', fontSize: '0.8125rem', fontWeight: 500 }}>
                      {doc.fullName}
                    </div>
                    <div style={{ color: '#6E7681', fontSize: '0.75rem' }}>
                      {doc.specialty} · {doc.hospitalOrClinic ?? 'Unknown Clinic'}
                    </div>
                  </div>
                  {selectedRep && (
                    <button
                      onClick={() => {
                        if (assigned) {
                          const a = (allAssignments ?? []).find(
                            (x) => x.salesRepId === selectedRep && x.doctorId === doc.id
                          )
                          if (a) unassignMutation.mutate(a.id)
                        } else {
                          assignMutation.mutate({ salesRepId: selectedRep, doctorId: doc.id })
                        }
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: assigned ? 'rgba(248,113,113,0.1)' : 'rgba(240,165,0,0.1)',
                        color: assigned ? '#F87171' : '#F0A500',
                        border: `1px solid ${assigned ? '#F8717130' : '#F0A50030'}`,
                      }}
                    >
                      {assigned ? <X style={{ width: 12, height: 12 }} /> : <Plus style={{ width: 12, height: 12 }} />}
                      {assigned ? 'Remove' : 'Assign'}
                    </button>
                  )}
                  {!selectedRep && (
                    <span style={{ color: '#484F58', fontSize: '0.75rem' }}>Select a rep first</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: current assignments */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#161B22', border: '1px solid #30363D' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #21262D' }}>
            <h3 style={{ color: '#F0F6FC', fontSize: '0.875rem', fontWeight: 600 }}>
              Current Assignments ({repAssignments.length})
            </h3>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
            {repAssignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <UserCheck style={{ width: 28, height: 28, color: '#484F58' }} />
                <span style={{ color: '#6E7681', fontSize: '0.875rem' }}>No assignments yet</span>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: '#21262D' }}>
                {repAssignments.map((a) => {
                  const rep = (reps ?? []).find((r) => r.id === a.salesRepId)
                  return (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <div style={{ color: '#C9D1D9', fontSize: '0.8125rem', fontWeight: 500 }}>
                          {a.doctor?.fullName ?? '—'}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {rep && (
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: rep.avatarColor }}
                            />
                          )}
                          <span style={{ color: '#6E7681', fontSize: '0.75rem' }}>
                            {rep?.name ?? 'Unknown rep'} · {a.doctor?.specialty ?? '—'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => unassignMutation.mutate(a.id)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ color: '#484F58' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#F87171')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#484F58')}
                      >
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
