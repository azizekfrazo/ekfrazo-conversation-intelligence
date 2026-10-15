import { useQuery } from '@tanstack/react-query'
import { Target, TrendingUp, Building2, IndianRupee } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

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

export default function TargetsPage() {
  const { user } = useAuth()
  const repId = user?.repId ?? user?.id

  const { data, isLoading } = useQuery<TargetResponse>({
    queryKey: ['rep-targets', repId],
    queryFn: () => api.get(`/api/salesreps/${repId}/targets`).then((r) => r.data),
    enabled: !!repId,
    refetchInterval: 60000,
  })

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: '#8B949E' }}>
        <div className="text-sm">Loading targets…</div>
      </div>
    )
  }

  const { target, actuals } = data

  const metrics = [
    {
      label: 'Daily Visits',
      sublabel: 'Today',
      current: actuals.visitsToday,
      target: target.dailyVisitTarget,
      suffix: ' visits',
      icon: Target,
      color: '#8B5CF6',
      bg: 'rgba(139,92,246,0.1)',
    },
    {
      label: 'Weekly Clinics',
      sublabel: 'This Week',
      current: actuals.uniqueClinicsThisWeek,
      target: target.weeklyClinicTarget,
      suffix: ' clinics',
      icon: Building2,
      color: '#38BDF8',
      bg: 'rgba(56,189,248,0.1)',
    },
    {
      label: 'Productivity Score',
      sublabel: 'This Month',
      current: actuals.avgScore,
      target: target.qualityScoreTarget,
      suffix: '/100',
      icon: TrendingUp,
      color: '#F0A500',
      bg: 'rgba(240,165,0,0.1)',
    },
    {
      label: 'Revenue Pipeline',
      sublabel: 'This Month',
      current: actuals.monthlyRevenue,
      target: target.monthlyRevenueTarget,
      suffix: '',
      icon: IndianRupee,
      color: '#3FB950',
      bg: 'rgba(63,185,80,0.1)',
      isCurrency: true,
    },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 style={{ color: '#F0F6FC', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          My Targets
        </h1>
        <p style={{ color: '#8B949E', fontSize: '0.875rem', marginTop: 4 }}>
          {user?.territory} · {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map(({ label, sublabel, current, target: tgt, suffix, icon: Icon, color, bg, isCurrency }) => {
          const pct = Math.min(Math.round((current / tgt) * 100), 100)
          const barColor = pct >= 100 ? '#3FB950' : pct >= 60 ? '#F0A500' : '#F87171'
          const remaining = Math.max(tgt - current, 0)

          const fmt = (n: number) =>
            isCurrency
              ? n >= 100000
                ? `₹${(n / 100000).toFixed(1)}L`
                : `₹${n.toLocaleString('en-IN')}`
              : `${n}${suffix}`

          return (
            <div
              key={label}
              className="rounded-xl p-5 space-y-4"
              style={{ background: '#161B22', border: '1px solid #30363D' }}
            >
              {/* Icon + label */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                  <Icon style={{ width: 18, height: 18, color }} />
                </div>
                <div>
                  <div style={{ color: '#F0F6FC', fontSize: '0.9375rem', fontWeight: 600 }}>{label}</div>
                  <div style={{ color: '#6E7681', fontSize: '0.75rem' }}>{sublabel}</div>
                </div>
                <div className="ml-auto text-right">
                  <div style={{ color, fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{fmt(Math.min(current, tgt))}</div>
                  <div style={{ color: '#484F58', fontSize: '0.75rem' }}>of {fmt(tgt)}</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="h-2.5 rounded-full" style={{ background: '#21262D' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: barColor }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: barColor, fontSize: '0.8125rem', fontWeight: 700 }}>{pct}% achieved</span>
                  {remaining > 0 && (
                    <span style={{ color: '#6E7681', fontSize: '0.75rem' }}>
                      {fmt(remaining)} to go
                    </span>
                  )}
                  {remaining === 0 && (
                    <span style={{ color: '#3FB950', fontSize: '0.75rem', fontWeight: 600 }}>✓ Target met!</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary card */}
      <div className="rounded-xl p-5" style={{ background: '#161B22', border: '1px solid #30363D' }}>
        <h2 style={{ color: '#F0F6FC', fontSize: '0.875rem', fontWeight: 600, marginBottom: 16 }}>
          Performance Summary
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Targets Met',
              value: metrics.filter(({ current, target: t }) => current >= t).length,
              total: metrics.length,
              color: '#3FB950',
            },
            {
              label: 'Avg Achievement',
              value: `${Math.round(metrics.reduce((acc, { current, target: t }) => acc + Math.min((current / t) * 100, 100), 0) / metrics.length)}%`,
              total: null,
              color: '#F0A500',
            },
            {
              label: 'Productivity Score',
              value: `${actuals.avgScore}/100`,
              total: null,
              color: actuals.avgScore >= target.qualityScoreTarget ? '#3FB950' : '#F0A500',
            },
          ].map(({ label, value, total, color }) => (
            <div key={label} className="text-center">
              <div style={{ color, fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>
                {total !== null ? `${value}/${total}` : value}
              </div>
              <div style={{ color: '#6E7681', fontSize: '0.75rem', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
