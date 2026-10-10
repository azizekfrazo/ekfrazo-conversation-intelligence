import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { api } from '../../lib/api'
import type { SalesRep, ManagerOverview } from '../../types'

interface ActivityDay {
  date: string
  visited_offline: number
  visited_online: number
  not_available: number
  rescheduled: number
}

const COLORS = {
  visited_offline: '#3FB950',
  visited_online: '#38BDF8',
  not_available: '#F87171',
  rescheduled: '#F0A500',
}

const LABELS = {
  visited_offline: 'In-Person',
  visited_online: 'Online',
  not_available: 'Not Available',
  rescheduled: 'Rescheduled',
}

export default function VisitAnalyticsPage() {
  const { data: reps } = useQuery<SalesRep[]>({
    queryKey: ['salesreps'],
    queryFn: () => api.get('/api/salesreps').then((r) => r.data),
  })

  const { data: overview } = useQuery<ManagerOverview>({
    queryKey: ['manager-overview'],
    queryFn: () => api.get('/api/manager/overview').then((r) => r.data),
  })

  // Fetch activity for each rep and merge
  const repIds = (reps ?? []).map((r) => r.id)
  const activityQueries = useQuery<ActivityDay[][]>({
    queryKey: ['all-activity', repIds],
    queryFn: async () => {
      return Promise.all(
        repIds.map((id) =>
          api.get(`/api/salesreps/${id}/activity`).then((r) => r.data as ActivityDay[])
        )
      )
    },
    enabled: repIds.length > 0,
  })

  // Merge all rep activity into team-level daily data
  const teamActivity: ActivityDay[] = []
  if (activityQueries.data) {
    const mergeMap: Record<string, ActivityDay> = {}
    activityQueries.data.flat().forEach((day) => {
      if (!mergeMap[day.date]) {
        mergeMap[day.date] = { ...day }
      } else {
        mergeMap[day.date].visited_offline += day.visited_offline
        mergeMap[day.date].visited_online += day.visited_online
        mergeMap[day.date].not_available += day.not_available
        mergeMap[day.date].rescheduled += day.rescheduled
      }
    })
    teamActivity.push(...Object.values(mergeMap).sort((a, b) => a.date.localeCompare(b.date)))
  }

  const chartData = teamActivity.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
  }))

  const repBreakdown = overview?.repBreakdown ?? []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 style={{ color: '#F0F6FC', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Visit Analytics
        </h1>
        <p style={{ color: '#8B949E', fontSize: '0.875rem', marginTop: 4 }}>
          Team visit activity — last 7 days
        </p>
      </div>

      {/* Stacked bar chart */}
      <div className="rounded-xl p-5" style={{ background: '#161B22', border: '1px solid #30363D' }}>
        <h2 style={{ color: '#F0F6FC', fontSize: '0.9375rem', fontWeight: 600, marginBottom: 20 }}>
          Team Visits by Day
        </h2>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48" style={{ color: '#6E7681' }}>
            Loading chart data…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barSize={24}>
              <CartesianGrid vertical={false} stroke="#21262D" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6E7681', fontSize: 11 }}
                axisLine={{ stroke: '#30363D' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6E7681', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ background: '#1C2128', border: '1px solid #30363D', borderRadius: 8 }}
                labelStyle={{ color: '#C9D1D9', fontSize: 12, marginBottom: 4 }}
                itemStyle={{ fontSize: 12 }}
              />
              <Legend
                wrapperStyle={{ paddingTop: 16 }}
                formatter={(value) => (
                  <span style={{ color: '#8B949E', fontSize: 11 }}>
                    {LABELS[value as keyof typeof LABELS] ?? value}
                  </span>
                )}
              />
              {(Object.keys(COLORS) as (keyof typeof COLORS)[]).map((key) => (
                <Bar key={key} dataKey={key} stackId="visits" fill={COLORS[key]} name={key} radius={key === 'rescheduled' ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Rep comparison table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#161B22', border: '1px solid #30363D' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #21262D' }}>
          <h2 style={{ color: '#F0F6FC', fontSize: '0.9375rem', fontWeight: 600 }}>Rep Comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #21262D' }}>
                {['Rep', 'Territory', 'Visits Today', 'Visits This Week', 'Score', 'Coverage', 'Pending FU'].map((h) => (
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
              {repBreakdown.map((rep) => {
                const scoreColor = rep.score >= 80 ? '#3FB950' : rep.score >= 65 ? '#F0A500' : '#F87171'
                return (
                  <tr
                    key={rep.repId}
                    style={{ borderBottom: '1px solid #21262D' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#1C2128')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: rep.avatarColor, color: '#fff' }}
                        >
                          {rep.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <span style={{ color: '#C9D1D9', fontSize: '0.8125rem', fontWeight: 500 }}>
                          {rep.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span style={{ color: '#8B949E', fontSize: '0.8125rem' }}>{rep.territory ?? '—'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span style={{ color: '#F0F6FC', fontWeight: 600 }}>{rep.visitsToday}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span style={{ color: '#F0F6FC', fontWeight: 600 }}>{rep.visitsThisWeek}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span style={{ color: scoreColor, fontWeight: 700 }}>{rep.score}/100</span>
                    </td>
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
                    <td className="px-5 py-3">
                      <span
                        style={{
                          color: rep.pendingFollowUps > 0 ? '#F0A500' : '#6E7681',
                          fontWeight: rep.pendingFollowUps > 0 ? 700 : 400,
                        }}
                      >
                        {rep.pendingFollowUps}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
