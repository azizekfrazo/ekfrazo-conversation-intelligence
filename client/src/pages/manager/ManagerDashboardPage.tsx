import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Activity, TrendingUp, AlertCircle, BarChart2, ChevronRight,
} from 'lucide-react'
import { api } from '../../lib/api'
import type { ManagerOverview, RepBreakdown } from '../../types'

export default function ManagerDashboardPage() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery<ManagerOverview>({
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

  const overview = data!

  const kpis = [
    {
      label: 'Total Reps',
      value: overview.totalReps,
      icon: Users,
      color: '#8B5CF6',
      bg: 'rgba(139,92,246,0.1)',
    },
    {
      label: 'Visits Today',
      value: overview.visitsToday,
      icon: Activity,
      color: '#3FB950',
      bg: 'rgba(63,185,80,0.1)',
    },
    {
      label: 'Visits This Week',
      value: overview.visitsThisWeek,
      icon: BarChart2,
      color: '#F0A500',
      bg: 'rgba(240,165,0,0.1)',
    },
    {
      label: 'Avg Quality Score',
      value: `${overview.avgQualityScore}/100`,
      icon: TrendingUp,
      color: '#38BDF8',
      bg: 'rgba(56,189,248,0.1)',
    },
    {
      label: 'Assigned Clinics',
      value: overview.totalAssignedClinics,
      icon: Users,
      color: '#34D399',
      bg: 'rgba(52,211,153,0.1)',
    },
    {
      label: 'Not Available Today',
      value: overview.notAvailableToday,
      icon: AlertCircle,
      color: '#F87171',
      bg: 'rgba(248,113,113,0.1)',
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 style={{ color: '#F0F6FC', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Team Overview
        </h1>
        <p style={{ color: '#8B949E', fontSize: '0.875rem', marginTop: 4 }}>
          Mumbai Region · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="rounded-xl p-4 space-y-2"
            style={{ background: '#161B22', border: '1px solid #30363D' }}
          >
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: bg }}
            >
              <Icon style={{ width: 16, height: 16, color }} />
            </div>
            <div style={{ color: '#F0F6FC', fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.1 }}>
              {value}
            </div>
            <div style={{ color: '#6E7681', fontSize: '0.6875rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Rep performance table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#161B22', border: '1px solid #30363D' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #21262D' }}>
          <h2 style={{ color: '#F0F6FC', fontSize: '0.9375rem', fontWeight: 600 }}>
            Rep Performance
          </h2>
          <span style={{ color: '#8B949E', fontSize: '0.75rem' }}>This week</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #21262D' }}>
                {['Rep', 'Territory', 'Today', 'This Week', 'Score', 'Coverage', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left"
                    style={{ color: '#6E7681', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overview.repBreakdown.map((rep) => (
                <RepRow key={rep.repId} rep={rep} onClick={() => navigate(`/manager/reps/${rep.repId}`)} />
              ))}
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
    <tr
      className="group transition-colors duration-100 cursor-pointer"
      style={{ borderBottom: '1px solid #21262D' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#1C2128')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      onClick={onClick}
    >
      {/* Rep name + avatar */}
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            style={{ background: rep.avatarColor, color: '#fff' }}
          >
            {rep.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <span style={{ color: '#C9D1D9', fontSize: '0.875rem', fontWeight: 500 }}>{rep.name}</span>
        </div>
      </td>

      {/* Territory */}
      <td className="px-5 py-3">
        <span style={{ color: '#8B949E', fontSize: '0.8125rem' }}>{rep.territory ?? '—'}</span>
      </td>

      {/* Today visits */}
      <td className="px-5 py-3">
        <span style={{ color: '#F0F6FC', fontSize: '0.875rem', fontWeight: 600 }}>{rep.visitsToday}</span>
      </td>

      {/* Week visits */}
      <td className="px-5 py-3">
        <span style={{ color: '#F0F6FC', fontSize: '0.875rem', fontWeight: 600 }}>{rep.visitsThisWeek}</span>
      </td>

      {/* Score */}
      <td className="px-5 py-3">
        <span style={{ color: scoreColor, fontSize: '0.875rem', fontWeight: 700 }}>{rep.score}/100</span>
      </td>

      {/* Coverage */}
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full" style={{ background: '#21262D' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(rep.coverage, 100)}%`, background: '#F0A500' }}
            />
          </div>
          <span style={{ color: '#8B949E', fontSize: '0.75rem' }}>{rep.coverage}%</span>
        </div>
      </td>

      {/* Status badge */}
      <td className="px-5 py-3">
        <span
          className="px-2 py-0.5 rounded text-xs font-medium"
          style={{
            background: `${statusColor[rep.status] ?? '#8B949E'}20`,
            color: statusColor[rep.status] ?? '#8B949E',
            border: `1px solid ${statusColor[rep.status] ?? '#8B949E'}40`,
          }}
        >
          {rep.status}
        </span>
      </td>

      {/* Chevron */}
      <td className="px-5 py-3">
        <ChevronRight style={{ width: 16, height: 16, color: '#484F58' }} />
      </td>
    </tr>
  )
}
