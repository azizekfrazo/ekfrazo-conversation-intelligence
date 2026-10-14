import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckSquare, Clock, Check, RotateCcw, ArrowRight } from 'lucide-react'
import { FollowUpAction } from '../types'
import { api } from '../lib/api'
import { formatDate } from '../lib/utils'
import { useAuth } from '../hooks/useAuth'

const DEMO_FOLLOW_UPS: FollowUpAction[] = [
  {
    id: 'demo-fu-1',
    doctorId: 'cmqupy79o0006qx863lso91uo',
    analysisId: null,
    task: 'Email the NeuroShield Phase III summary paper to Dr. Krishnamurti',
    status: 'pending',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: null,
    doctor: { id: 'cmqupy79o0006qx863lso91uo', fullName: 'Dr. Ananya Krishnamurti', specialty: 'Neurology' },
  },
  {
    id: 'demo-fu-2',
    doctorId: 'cmqupy79o0006qx863lso91uo',
    analysisId: null,
    task: 'Schedule follow-up call to discuss migraine patient case cluster',
    status: 'done',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    doctor: { id: 'cmqupy79o0006qx863lso91uo', fullName: 'Dr. Ananya Krishnamurti', specialty: 'Neurology' },
  },
  {
    id: 'demo-fu-3',
    doctorId: 'cmqupy79w0008qx869uaqeyps',
    analysisId: null,
    task: 'Share GlucoBalance cost-benefit comparison versus competitor sulfonylureas',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: null,
    doctor: { id: 'cmqupy79w0008qx869uaqeyps', fullName: 'Dr. Rajesh Mehta', specialty: 'Diabetology' },
  },
  {
    id: 'demo-fu-4',
    doctorId: 'cmqupy79w0008qx869uaqeyps',
    analysisId: null,
    task: 'Connect Dr. Mehta with patient access coordinator for formulary check',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: null,
    doctor: { id: 'cmqupy79w0008qx869uaqeyps', fullName: 'Dr. Rajesh Mehta', specialty: 'Diabetology' },
  },
  {
    id: 'demo-fu-5',
    doctorId: 'cmqupy7a4000aqx86v918dvtj',
    analysisId: null,
    task: 'Send CardioGuard head-to-head trial data versus Atorvastatin 40mg',
    status: 'done',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    doctor: { id: 'cmqupy7a4000aqx86v918dvtj', fullName: 'Dr. Priya Sharma', specialty: 'Cardiology' },
  },
  {
    id: 'demo-fu-6',
    doctorId: 'cmqupy7a4000aqx86v918dvtj',
    analysisId: null,
    task: 'Arrange peer-to-peer webinar invitation for Dr. Sharma from the CardioGuard KOL panel',
    status: 'pending',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: null,
    doctor: { id: 'cmqupy7a4000aqx86v918dvtj', fullName: 'Dr. Priya Sharma', specialty: 'Cardiology' },
  },
]

type Filter = 'all' | 'pending' | 'done'

export default function FollowUpsPage() {
  const [filter, setFilter] = useState<Filter>('all')

  const { user } = useAuth()
  const repId = user?.id

  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())

  const { data: visits = [] } = useQuery<any[]>({
    queryKey: ['follow-ups-visits', repId],
    queryFn: () => api.get(`/api/salesreps/${repId}/visits?days=60`).then(r => r.data),
    enabled: !!repId,
    staleTime: 60_000,
  })

  const rawActions: FollowUpAction[] = visits
    .filter((v: any) => v.followUp && v.followUp.trim())
    .map((v: any) => ({
      id: v.id,
      doctorId: v.doctorId ?? v.doctor?.id ?? '',
      analysisId: null,
      task: v.followUp!,
      status: doneIds.has(v.id) ? 'done' : 'pending',
      createdAt: v.date ?? v.createdAt,
      completedAt: doneIds.has(v.id) ? new Date().toISOString() : null,
      doctor: v.doctor ?? null,
    }))

  const actions: FollowUpAction[] = rawActions.length ? rawActions : DEMO_FOLLOW_UPS

  const filtered =
    filter === 'all' ? actions : actions.filter((a) => a.status === filter)

  const pendingCount = actions.filter((a) => a.status === 'pending').length

  const toggleMutation = {
    isPending: false,
    variables: null as any,
    mutate: ({ id, status }: { id: string; status: 'pending' | 'done' }) => {
      setDoneIds(prev => {
        const next = new Set(prev)
        if (status === 'done') next.add(id)
        else next.delete(id)
        return next
      })
    },
  }

  const filterTabs: { key: Filter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: actions.length },
    { key: 'pending', label: 'Pending', count: actions.filter((a) => a.status === 'pending').length },
    { key: 'done', label: 'Done', count: actions.filter((a) => a.status === 'done').length },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#F0F6FC' }}>
            Follow-Up Board
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#8B949E' }}>
            {pendingCount} pending action{pendingCount !== 1 ? 's' : ''} across your doctor portfolio
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        className="flex rounded-[10px] border p-1 gap-1"
        style={{ background: '#161B22', borderColor: '#30363D' }}
      >
        {filterTabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
            style={
              filter === key
                ? { background: '#1C2333', color: '#F0F6FC' }
                : { color: '#8B949E' }
            }
          >
            {label}
            {count !== undefined && count > 0 && (
              <span
                className="ml-1.5 rounded-full px-1.5 py-0.5 text-xs"
                style={{
                  background: filter === key ? '#30363D' : '#1C2333',
                  color: '#8B949E',
                }}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Action cards */}
      {filtered.length === 0 ? (
        <div
          className="rounded-[10px] border py-16 text-center space-y-3"
          style={{ background: '#161B22', borderColor: '#30363D' }}
        >
          <CheckSquare className="h-8 w-8 mx-auto" style={{ color: '#3FB950' }} />
          <p className="text-sm font-medium" style={{ color: '#F0F6FC' }}>
            {filter === 'done' ? 'No completed actions yet' : 'All caught up!'}
          </p>
          <p className="text-xs" style={{ color: '#8B949E' }}>
            {filter === 'pending'
              ? 'No pending follow-ups — great work.'
              : 'Follow-up actions appear here after post-call analyses.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((action) => {
            const isDone = action.status === 'done'
            const isPending = toggleMutation.isPending && toggleMutation.variables?.id === action.id
            return (
              <div
                key={action.id}
                className="rounded-[10px] border p-4 flex items-start gap-4 transition-all"
                style={{
                  background: '#161B22',
                  borderColor: isDone ? '#1A4D2E' : '#30363D',
                  opacity: isDone ? 0.75 : 1,
                }}
              >
                {/* Status dot */}
                <div className="mt-0.5 shrink-0">
                  <div
                    className="h-4 w-4 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: isDone ? '#3FB950' : '#F0A500',
                      background: isDone ? '#1A4D2E' : 'transparent',
                    }}
                  >
                    {isDone && <Check className="h-2.5 w-2.5" style={{ color: '#3FB950' }} />}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: isDone ? '#6E7681' : '#C9D1D9',
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}
                  >
                    {action.task}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {action.doctor && (
                      <Link
                        to={`/doctors/${action.doctor.id}`}
                        className="flex items-center gap-1 text-xs transition-colors"
                        style={{ color: '#58A6FF' }}
                      >
                        <span>{action.doctor.fullName}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                    <span className="flex items-center gap-1 text-xs" style={{ color: '#484F58' }}>
                      <Clock className="h-3 w-3" />
                      {isDone && action.completedAt
                        ? `Done ${formatDate(action.completedAt)}`
                        : `Added ${formatDate(action.createdAt)}`}
                    </span>
                  </div>
                </div>

                {/* Toggle button */}
                <button
                  onClick={() =>
                    toggleMutation.mutate({
                      id: action.id,
                      status: isDone ? 'pending' : 'done',
                    })
                  }
                  disabled={isPending}
                  className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
                  style={
                    isDone
                      ? { background: '#1C2333', borderColor: '#30363D', color: '#8B949E' }
                      : { background: '#12201A', borderColor: '#1A4D2E', color: '#3FB950' }
                  }
                >
                  {isPending ? (
                    <span className="flex items-center gap-1">
                      <RotateCcw className="h-3 w-3 animate-spin" /> …
                    </span>
                  ) : isDone ? (
                    'Undo'
                  ) : (
                    'Mark Done'
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: '#484F58' }}>
        Follow-up actions are auto-created from post-call analysis next best actions.
      </p>
    </div>
  )
}
