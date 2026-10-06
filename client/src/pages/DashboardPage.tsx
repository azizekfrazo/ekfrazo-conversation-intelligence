import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, FileText, Mic, TrendingUp, ArrowRight, Plus, Clock,
  ArrowUpRight, CheckSquare, Check,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { personaLabels, doctorPhotoUrl } from '../lib/utils'
import { DoctorProfile, FollowUpAction } from '../types'
import { myMetrics } from '../data/productivityData'
import { DEMO_DOCTORS } from '../data/demoDoctors'
import { api } from '../lib/api'

const DEMO_STATS = {
  practiceSessions: 47,
  callAnalyses: 23,
  avgScore: 76,
}

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

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const doctors = DEMO_DOCTORS

  const { data: followUpData } = useQuery({
    queryKey: ['follow-ups-count'],
    queryFn: () => api.get('/api/follow-ups?status=pending').then((r) => r.data),
    retry: false,
  })
  const followUpActions: FollowUpAction[] =
    followUpData?.actions ?? DEMO_FOLLOW_UPS
  const pendingCount = followUpActions.filter((a) => a.status === 'pending').length

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'pending' | 'done' }) =>
      api.patch(`/api/follow-ups/${id}`, { status }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups-count'] })
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] })
    },
  })

  const stats = [
    { label: 'Doctor Profiles',   value: doctors.length,              icon: Users,       color: '#58A6FF', bg: '#0D2137', onClick: () => navigate('/doctors') },
    { label: 'Practice Sessions', value: DEMO_STATS.practiceSessions,  icon: Mic,         color: '#BC8CFF', bg: '#1F1635', onClick: undefined },
    { label: 'Call Analyses',     value: DEMO_STATS.callAnalyses,      icon: FileText,    color: '#3FB950', bg: '#12201A', onClick: undefined },
    { label: 'Avg. Score',        value: `${DEMO_STATS.avgScore}%`,    icon: TrendingUp,  color: '#F0A500', bg: '#261900', onClick: undefined },
    {
      label: 'Pending Follow-Ups',
      value: pendingCount,
      icon: CheckSquare,
      color: pendingCount > 5 ? '#D29922' : '#3FB950',
      bg: pendingCount > 5 ? '#261900' : '#12201A',
      onClick: () => navigate('/follow-ups'),
    },
  ]

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-xs mt-1" style={{ color: '#8B949E' }}>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <Button onClick={() => navigate('/doctors')} size="sm">
          <Plus className="h-4 w-4" /> New Doctor
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg, onClick }) => (
          <div
            key={label}
            className="rounded-[10px] border p-5 flex flex-col gap-3 transition-all duration-200"
            style={{
              background: '#161B22',
              borderColor: '#30363D',
              boxShadow: '0 1px 3px rgba(0,0,0,.4)',
              cursor: onClick ? 'pointer' : 'default',
            }}
            onClick={onClick}
            onMouseEnter={(e) => {
              if (onClick) {
                ;(e.currentTarget as HTMLElement).style.borderColor = color
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
              }
            }}
            onMouseLeave={(e) => {
              if (onClick) {
                ;(e.currentTarget as HTMLElement).style.borderColor = '#30363D'
                ;(e.currentTarget as HTMLElement).style.transform = 'none'
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center"
                style={{ background: bg }}
              >
                <Icon style={{ width: 18, height: 18, color }} />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5" style={{ color: onClick ? color : '#484F58' }} />
            </div>
            <div>
              <div style={{ color: '#F0F6FC', fontSize: '1.875rem', fontWeight: 700, lineHeight: 1 }}>
                {value}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wider" style={{ color: '#8B949E' }}>
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance strip */}
      <div
        className="rounded-[10px] border px-5 py-4 flex items-center gap-5 flex-wrap"
        style={{ background: '#161B22', borderColor: '#30363D' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🔥</span>
          <div>
            <div className="text-xl font-bold leading-none" style={{ color: '#F0A500' }}>
              {myMetrics.streak}d
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#8B949E' }}>streak</div>
          </div>
        </div>

        <div className="w-px h-8 shrink-0" style={{ background: '#30363D' }} />

        <div className="flex-1 min-w-[140px]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span style={{ color: '#8B949E' }}>Sessions this week</span>
            <span style={{ color: '#F0F6FC', fontWeight: 600 }}>
              {myMetrics.weeklyDone} / {myMetrics.weeklyGoal}
            </span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: '#1C2333' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round((myMetrics.weeklyDone / myMetrics.weeklyGoal) * 100)}%`,
                background: '#3FB950',
              }}
            />
          </div>
        </div>

        <div className="w-px h-8 shrink-0" style={{ background: '#30363D' }} />

        <div className="text-center">
          <div className="text-xl font-bold leading-none" style={{ color: '#58A6FF' }}>
            {myMetrics.avgScore}
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#8B949E' }}>avg score</div>
        </div>

        <div className="w-px h-8 shrink-0" style={{ background: '#30363D' }} />

        <div className="text-center">
          <div className="text-xl font-bold leading-none" style={{ color: '#BC8CFF' }}>
            #{myMetrics.rank}
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#8B949E' }}>team rank</div>
        </div>

        <button
          onClick={() => navigate('/analytics')}
          className="ml-auto flex items-center gap-1 text-xs font-medium shrink-0"
          style={{ color: '#F0A500' }}
        >
          Full Analytics <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Doctor grid */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 style={{ color: '#F0F6FC', fontSize: '0.875rem', fontWeight: 600 }}>
              Doctor Profiles
            </h2>
            <button
              onClick={() => navigate('/doctors')}
              className="flex items-center gap-1 text-xs transition-colors duration-150"
              style={{ color: '#F0A500' }}
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {doctors.slice(0, 6).map((doctor) => (
              <DoctorMiniCard
                key={doctor.id}
                doctor={doctor}
                onClick={() => navigate(`/doctors/${doctor.id}`)}
              />
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div
            className="rounded-[10px] border p-5"
            style={{ background: '#161B22', borderColor: '#30363D' }}
          >
            <h2 className="text-sm font-semibold mb-3" style={{ color: '#F0F6FC' }}>
              Quick Actions
            </h2>
            <div className="space-y-2">
              <QuickAction
                icon={Plus}
                label="Create Doctor Profile"
                color="#58A6FF"
                onClick={() => navigate('/doctors')}
              />
              {doctors[0] && (
                <>
                  <QuickAction
                    icon={FileText}
                    label="Generate Battlecard"
                    color="#F0A500"
                    onClick={() => navigate(`/doctors/${doctors[0].id}?tab=battlecards`)}
                  />
                  <QuickAction
                    icon={Mic}
                    label="Start Voice Practice"
                    color="#BC8CFF"
                    onClick={() => navigate(`/doctors/${doctors[0].id}/simulator`)}
                  />
                </>
              )}
            </div>
          </div>

          {/* Recent follow-ups */}
          <div
            className="rounded-[10px] border p-5"
            style={{ background: '#161B22', borderColor: '#30363D' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>
                Pending Follow-Ups
              </h2>
              <button
                onClick={() => navigate('/follow-ups')}
                className="flex items-center gap-1 text-xs transition-colors duration-150"
                style={{ color: '#F0A500' }}
              >
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            {followUpActions.filter((a) => a.status === 'pending').length === 0 ? (
              <div className="py-4 text-center">
                <CheckSquare className="h-5 w-5 mx-auto mb-1" style={{ color: '#3FB950' }} />
                <p className="text-xs" style={{ color: '#8B949E' }}>All caught up!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {followUpActions
                  .filter((a) => a.status === 'pending')
                  .slice(0, 3)
                  .map((action) => (
                    <div key={action.id} className="flex items-start gap-2.5">
                      <div
                        className="mt-0.5 h-3.5 w-3.5 rounded-full border-2 shrink-0"
                        style={{ borderColor: '#F0A500' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#C9D1D9' }}>
                          {action.task}
                        </p>
                        {action.doctor && (
                          <p className="text-xs mt-0.5" style={{ color: '#484F58' }}>
                            {action.doctor.fullName}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          toggleMutation.mutate({ id: action.id, status: 'done' })
                        }
                        className="shrink-0 rounded-md border px-2 py-1 text-xs font-medium transition-colors"
                        style={{ background: '#12201A', borderColor: '#1A4D2E', color: '#3FB950' }}
                        title="Mark Done"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Recent sessions — demo snapshot */}
          <div className="rounded-[10px] border p-5" style={{ background: '#161B22', borderColor: '#30363D' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>Recent Sessions</h2>
              <button
                onClick={() => navigate(`/doctors/${doctors[0]?.id}?tab=practice`)}
                className="flex items-center gap-1 text-xs transition-colors duration-150"
                style={{ color: '#F0A500' }}
              >
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { id: 's1', doctor: doctors[0], difficulty: 'Hard',   objectionFocus: 'Efficacy',  createdAt: '2 hrs ago',  score: 82 },
                { id: 's2', doctor: doctors[1], difficulty: 'Medium', objectionFocus: 'Competitor', createdAt: 'Yesterday',  score: 74 },
                { id: 's3', doctor: doctors[2], difficulty: 'Easy',   objectionFocus: 'Cost',       createdAt: '2 days ago', score: 91 },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => s.doctor && navigate(`/doctors/${s.doctor.id}?tab=practice`)}
                  className="w-full flex items-start gap-2 text-xs text-left rounded-lg p-2 -mx-2 transition-colors duration-150"
                  style={{ color: 'inherit' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#21262D' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: '#484F58' }} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium" style={{ color: '#F0F6FC' }}>
                      {s.doctor?.fullName ?? 'Unknown'}
                    </span>
                    <span className="mx-1" style={{ color: '#484F58' }}>·</span>
                    <span style={{ color: '#8B949E' }}>{s.difficulty} · {s.objectionFocus}</span>
                    <div style={{ color: '#484F58' }}>{s.createdAt}</div>
                  </div>
                  <Badge variant="success">{s.score}</Badge>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DoctorMiniCard({ doctor, onClick }: { doctor: DoctorProfile; onClick: () => void }) {
  const photoUrl = doctorPhotoUrl(doctor.id, 80, 80)
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-[10px] border p-3 text-left transition-all duration-200 group"
      style={{ background: '#161B22', borderColor: '#30363D' }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = '#F0A500'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,.5)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = '#30363D'
        ;(e.currentTarget as HTMLElement).style.transform = 'none'
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
      }}
    >
      <div className="h-10 w-10 rounded-lg shrink-0 overflow-hidden" style={{ border: '1px solid #30363D' }}>
        <img
          src={photoUrl}
          alt={doctor.fullName}
          className="h-full w-full object-cover"
          onError={(e) => {
            const el = e.currentTarget
            el.style.cssText = 'display:none'
            const parent = el.parentElement!
            parent.style.background = 'linear-gradient(135deg,#1A1F35,#2D3452)'
            parent.style.display = 'flex'
            parent.style.alignItems = 'center'
            parent.style.justifyContent = 'center'
            parent.innerHTML = `<span style="color:#F0F6FC;font-weight:700;font-size:0.875rem">${doctor.fullName.split(' ').slice(-1)[0][0]}</span>`
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: '#F0F6FC' }}>
          {doctor.fullName}
        </div>
        <div className="text-xs truncate" style={{ color: '#8B949E' }}>
          {doctor.specialty}
        </div>
      </div>
      <span
        className="shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
        style={{ borderColor: '#30363D', background: '#1C2333', color: '#8B949E' }}
      >
        {personaLabels[doctor.personaType]}
      </span>
    </button>
  )
}

function QuickAction({
  icon: Icon, label, color, onClick,
}: { icon: React.ElementType; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150"
      style={{ color: '#C9D1D9' }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = '#21262D'
        ;(e.currentTarget as HTMLElement).style.color = '#F0F6FC'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLElement).style.color = '#C9D1D9'
      }}
    >
      <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <Icon style={{ width: 14, height: 14, color }} />
      </div>
      {label}
    </button>
  )
}
