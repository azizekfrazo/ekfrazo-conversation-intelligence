import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Activity, TrendingUp, BarChart2, ChevronRight,
  Target, Star, Zap, Clock,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell, PieChart, Pie, Legend,
} from 'recharts'
import { api } from '../../lib/api'
import type { ManagerOverview, RepBreakdown } from '../../types'

export default function ManagerDashboardPage() {
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery<ManagerOverview>({
    queryKey: ['manager-overview'],
    queryFn: () => api.get('/api/manager/overview').then((r) => r.data),
    refetchInterval: 60000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: '#8B949E' }}>
        <div className="text-sm">Loading team overview…</div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: '#F87171' }}>
        <div className="text-sm">Failed to load team data. Please refresh.</div>
      </div>
    )
  }

  const overview = data
  const reps = overview.repBreakdown ?? []

  const kpis = [
    { label: 'Total Reps', value: overview.totalReps, icon: Users, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
    { label: 'Visits Today', value: overview.visitsToday, icon: Activity, color: '#3FB950', bg: 'rgba(63,185,80,0.1)' },
    { label: 'Visits This Week', value: overview.visitsThisWeek, icon: BarChart2, color: '#F0A500', bg: 'rgba(240,165,0,0.1)' },
    { label: 'Avg Quality Score', value: `${overview.avgQualityScore}`, icon: Star, color: '#38BDF8', bg: 'rgba(56,189,248,0.1)' },
    { label: 'Assigned Clinics', value: overview.totalAssignedClinics, icon: Target, color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
  ]

  // Chart data — visits per rep (bar chart)
  const visitBarData = reps.map(r => ({
    name: r.name.split(' ')[0],
    Today: r.visitsToday,
    'This Week': r.visitsThisWeek,
  }))

  // Status distribution (pie)
  const excellent = reps.filter(r => r.status === 'Excellent').length
  const onTrack = reps.filter(r => r.status === 'On Track').length
  const behind = reps.filter(r => r.status === 'Behind').length
  const pieData = [
    { name: 'Excellent', value: excellent, color: '#3FB950' },
    { name: 'On Track', value: onTrack, color: '#F0A500' },
    { name: 'Behind', value: behind, color: '#F87171' },
  ].filter(d => d.value > 0)

  // Skill matrix — radar per team avg
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
  const skillMatrix = [
    { skill: 'Visit Rate', value: avg(reps.map(r => Math.min(100, Math.round((r.visitsThisWeek / 20) * 100)))) },
    { skill: 'Quality Score', value: avg(reps.map(r => r.score)) },
    { skill: 'Coverage', value: avg(reps.map(r => r.coverage)) },
    { skill: 'Follow-ups', value: avg(reps.map(r => Math.min(100, r.pendingFollowUps * 10))) },
    { skill: 'Consistency', value: avg(reps.map(r => r.visitsToday >= 3 ? 80 : 40)) },
  ]

  // Coverage per rep
  const coverageData = reps.map(r => ({
    name: r.name.split(' ')[0],
    Coverage: r.coverage,
    Assigned: r.assignedDoctors,
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 style={{ color: '#F0F6FC', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Manager Dashboard
        </h1>
        <p style={{ color: '#8B949E', fontSize: '0.875rem', marginTop: 4 }}>
          Bengaluru Region · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl p-4 space-y-2" style={{ background: '#161B22', border: '1px solid #30363D' }}>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
              <Icon style={{ width: 16, height: 16, color }} />
            </div>
            <div style={{ color: '#F0F6FC', fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
            <div style={{ color: '#6E7681', fontSize: '0.6875rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Visit activity bar chart */}
        <div className="col-span-2 rounded-xl p-5" style={{ background: '#161B22', border: '1px solid #30363D' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 style={{ width: 15, height: 15, color: '#8B5CF6' }} />
            <h2 style={{ color: '#F0F6FC', fontSize: '0.9375rem', fontWeight: 600 }}>Visit Activity by Rep</h2>
            <span className="ml-auto text-xs" style={{ color: '#6E7681' }}>Today vs This Week</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={visitBarData} barSize={10} barGap={3}>
              <XAxis dataKey="name" tick={{ fill: '#6E7681', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6E7681', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ background: '#1C2128', border: '1px solid #30363D', borderRadius: 8, fontSize: 12, color: '#C9D1D9' }}
                cursor={{ fill: '#30363D40' }}
              />
              <Bar dataKey="Today" fill="#3FB950" radius={[3, 3, 0, 0]} />
              <Bar dataKey="This Week" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#6E7681' }}>
              <span className="w-3 h-2 rounded-sm inline-block" style={{ background: '#3FB950' }} /> Today
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#6E7681' }}>
              <span className="w-3 h-2 rounded-sm inline-block" style={{ background: '#8B5CF6' }} /> This Week
            </span>
          </div>
        </div>

        {/* Status pie */}
        <div className="rounded-xl p-5" style={{ background: '#161B22', border: '1px solid #30363D' }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap style={{ width: 15, height: 15, color: '#F0A500' }} />
            <h2 style={{ color: '#F0F6FC', fontSize: '0.9375rem', fontWeight: 600 }}>Performance Split</h2>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={36} paddingAngle={3}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1C2128', border: '1px solid #30363D', borderRadius: 8, fontSize: 12, color: '#C9D1D9' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-xs" style={{ color: '#6E7681' }}>No data</div>
          )}
          <div className="space-y-1 mt-1">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs" style={{ color: '#8B949E' }}>
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="text-xs font-semibold" style={{ color: d.color }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Skill matrix + Coverage row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Team Skill Radar */}
        <div className="rounded-xl p-5" style={{ background: '#161B22', border: '1px solid #30363D' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp style={{ width: 15, height: 15, color: '#38BDF8' }} />
            <h2 style={{ color: '#F0F6FC', fontSize: '0.9375rem', fontWeight: 600 }}>Team Skill Matrix</h2>
            <span className="ml-auto text-xs" style={{ color: '#6E7681' }}>Team averages</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={skillMatrix}>
              <PolarGrid stroke="#30363D" />
              <PolarAngleAxis dataKey="skill" tick={{ fill: '#8B949E', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6E7681', fontSize: 9 }} />
              <Radar name="Team Avg" dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip
                contentStyle={{ background: '#1C2128', border: '1px solid #30363D', borderRadius: 8, fontSize: 12, color: '#C9D1D9' }}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-5 gap-1 mt-2">
            {skillMatrix.map(s => (
              <div key={s.skill} className="text-center">
                <div style={{ color: '#F0F6FC', fontSize: '0.8125rem', fontWeight: 700 }}>{s.value}%</div>
                <div style={{ color: '#6E7681', fontSize: '0.625rem' }}>{s.skill.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Coverage bar */}
        <div className="rounded-xl p-5" style={{ background: '#161B22', border: '1px solid #30363D' }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock style={{ width: 15, height: 15, color: '#34D399' }} />
            <h2 style={{ color: '#F0F6FC', fontSize: '0.9375rem', fontWeight: 600 }}>Clinic Coverage %</h2>
            <span className="ml-auto text-xs" style={{ color: '#6E7681' }}>Assigned vs visited</span>
          </div>
          <div className="space-y-3 mt-2">
            {reps.map(r => {
              const pct = r.coverage
              const color = pct >= 80 ? '#3FB950' : pct >= 50 ? '#F0A500' : '#F87171'
              return (
                <div key={r.repId}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ color: '#C9D1D9', fontSize: '0.8125rem' }}>{r.name.split(' ')[0]}</span>
                    <span style={{ color, fontSize: '0.75rem', fontWeight: 700 }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#21262D' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
            {reps.length === 0 && (
              <div className="flex items-center justify-center h-32 text-xs" style={{ color: '#6E7681' }}>No coverage data</div>
            )}
          </div>
        </div>
      </div>

      {/* Rep performance table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#161B22', border: '1px solid #30363D' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #21262D' }}>
          <h2 style={{ color: '#F0F6FC', fontSize: '0.9375rem', fontWeight: 600 }}>Team Performance</h2>
          <span style={{ color: '#8B949E', fontSize: '0.75rem' }}>This week</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #21262D' }}>
                {['Rep', 'Territory', 'Today', 'This Week', 'Score', 'Coverage', 'Follow-ups', 'Status', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left"
                    style={{ color: '#6E7681', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reps.map((rep) => (
                <RepRow key={rep.repId} rep={rep} onClick={() => navigate(`/manager/reps/${rep.repId}`)} />
              ))}
              {reps.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-sm" style={{ color: '#6E7681' }}>
                    No reps data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function RepRow({ rep, onClick }: { rep: RepBreakdown; onClick: () => void }) {
  const statusColor: Record<string, string> = {
    Excellent: '#3FB950',
    'On Track': '#F0A500',
    Behind: '#F87171',
  }
  const scoreColor = rep.score >= 80 ? '#3FB950' : rep.score >= 65 ? '#F0A500' : '#F87171'

  return (
    <tr className="cursor-pointer" style={{ borderBottom: '1px solid #21262D' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#1C2128')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      onClick={onClick}
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            style={{ background: rep.avatarColor + '30', color: rep.avatarColor, border: `1px solid ${rep.avatarColor}40` }}>
            {rep.name.split(' ').map((n: string) => n[0]).join('')}
          </div>
          <span style={{ color: '#C9D1D9', fontSize: '0.875rem', fontWeight: 500 }}>{rep.name}</span>
        </div>
      </td>
      <td className="px-5 py-3"><span style={{ color: '#8B949E', fontSize: '0.8125rem' }}>{rep.territory ?? '—'}</span></td>
      <td className="px-5 py-3"><span style={{ color: '#F0F6FC', fontSize: '0.875rem', fontWeight: 600 }}>{rep.visitsToday}</span></td>
      <td className="px-5 py-3"><span style={{ color: '#F0F6FC', fontSize: '0.875rem', fontWeight: 600 }}>{rep.visitsThisWeek}</span></td>
      <td className="px-5 py-3"><span style={{ color: scoreColor, fontSize: '0.875rem', fontWeight: 700 }}>{rep.score}/100</span></td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full" style={{ background: '#21262D' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(rep.coverage, 100)}%`, background: '#F0A500' }} />
          </div>
          <span style={{ color: '#8B949E', fontSize: '0.75rem' }}>{rep.coverage}%</span>
        </div>
      </td>
      <td className="px-5 py-3">
        <span style={{ color: rep.pendingFollowUps > 0 ? '#F0A500' : '#6E7681', fontSize: '0.8125rem', fontWeight: rep.pendingFollowUps > 0 ? 600 : 400 }}>
          {rep.pendingFollowUps}
        </span>
      </td>
      <td className="px-5 py-3">
        <span className="px-2 py-0.5 rounded text-xs font-medium"
          style={{
            background: `${statusColor[rep.status] ?? '#8B949E'}20`,
            color: statusColor[rep.status] ?? '#8B949E',
            border: `1px solid ${statusColor[rep.status] ?? '#8B949E'}40`,
          }}>
          {rep.status}
        </span>
      </td>
      <td className="px-5 py-3"><ChevronRight style={{ width: 16, height: 16, color: '#484F58' }} /></td>
    </tr>
  )
}
