import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts'
import { TrendingUp, Flame, BarChart2, Target, Trophy, ArrowRight } from 'lucide-react'
import {
  myMetrics, leaderboard, teamGoals, achievements,
  heatmapData, scoreTrend, skillRadarData,
} from '../data/productivityData'

// ─── Recharts custom tooltip ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: '#1C2333', border: '1px solid #30363D',
        borderRadius: 8, padding: '8px 12px', fontSize: 12,
      }}
    >
      <div style={{ color: '#8B949E', marginBottom: 6 }}>{label}</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, fontWeight: 600, lineHeight: 1.6 }}>
          {p.name}: <span style={{ color: '#F0F6FC' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Heatmap helpers ──────────────────────────────────────────────────────────

function heatColor(count: number): string {
  if (count === 0) return '#1C2333'
  if (count === 1) return '#1B4D2E'
  if (count === 2) return '#276C3F'
  if (count === 3) return '#3FB950'
  return '#56D364'
}

// Group heatmap flat array into weeks of 7
function groupIntoWeeks() {
  const weeks: typeof heatmapData[number][][] = []
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7))
  }
  return weeks
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color, bg,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
  bg: string
}) {
  return (
    <div
      className="rounded-[10px] border p-5 flex flex-col gap-2"
      style={{ background: '#161B22', borderColor: '#30363D' }}
    >
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center"
        style={{ background: bg }}
      >
        <Icon style={{ width: 18, height: 18, color }} />
      </div>
      <div style={{ color: '#F0F6FC', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>
        {value}
      </div>
      <div>
        <div className="text-xs font-medium" style={{ color: '#C9D1D9' }}>{label}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: '#484F58' }}>{sub}</div>}
      </div>
    </div>
  )
}

function SkillBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span style={{ color: '#8B949E' }}>{label}</span>
        <span style={{ color: '#F0F6FC', fontWeight: 600 }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#1C2333' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: value >= 80 ? '#3FB950' : value >= 65 ? '#F0A500' : '#F85149' }}
        />
      </div>
    </div>
  )
}

function LeaderboardRow({ rep, isMe }: { rep: typeof leaderboard[number]; isMe: boolean }) {
  const rankColor = rep.rank === 1 ? '#F0A500' : rep.rank === 2 ? '#8B949E' : rep.rank === 3 ? '#C87D00' : '#484F58'
  return (
    <div
      className="flex items-center gap-4 py-3"
      style={{
        borderBottom: '1px solid #1C2333',
        background: isMe ? 'rgba(240,165,0,0.04)' : 'transparent',
        borderLeft: isMe ? '2px solid #F0A500' : '2px solid transparent',
        paddingLeft: isMe ? 10 : 12,
      }}
    >
      <div className="w-5 text-sm font-bold" style={{ color: rankColor }}>
        {rep.rank === 1 ? '🥇' : rep.rank === 2 ? '🥈' : rep.rank === 3 ? '🥉' : `#${rep.rank}`}
      </div>
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: isMe ? 'rgba(240,165,0,0.15)' : '#1C2333', color: isMe ? '#F0A500' : '#8B949E' }}
      >
        {rep.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: isMe ? '#F0A500' : '#F0F6FC' }}>
          {rep.name} {isMe && <span style={{ color: '#484F58', fontSize: 10 }}>(you)</span>}
        </div>
        <div className="text-xs" style={{ color: '#484F58' }}>
          {rep.totalSessions} sessions · 🔥 {rep.streak}d
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="text-sm font-bold" style={{ color: '#F0F6FC' }}>{rep.avgScore}</div>
        <div className="w-24 h-1 rounded-full" style={{ background: '#1C2333' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${rep.avgScore}%`, background: isMe ? '#F0A500' : '#30363D' }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const heatmapWeeks = groupIntoWeeks()

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Performance Analytics</h1>
          <p className="text-xs mt-1" style={{ color: '#8B949E' }}>
            Practice activity, skill progression, and team benchmarks
          </p>
        </div>
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
          style={{ background: '#1C2333', border: '1px solid #30363D', color: '#8B949E' }}
        >
          <BarChart2 style={{ width: 13, height: 13, color: '#F0A500' }} />
          Last 12 weeks
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Flame}  label="Practice Streak" value={`${myMetrics.streak}d`}
          sub="Personal best: 21d" color="#F0A500" bg="#261900"
        />
        <KpiCard
          icon={TrendingUp} label="Avg Session Score" value={myMetrics.avgScore}
          sub="↑4 pts from last month" color="#58A6FF" bg="#0D2137"
        />
        <KpiCard
          icon={Target} label="Weekly Sessions" value={`${myMetrics.weeklyDone}/${myMetrics.weeklyGoal}`}
          sub="75% of weekly goal" color="#3FB950" bg="#12201A"
        />
        <KpiCard
          icon={Trophy} label="Team Rank" value={`#${myMetrics.rank}`}
          sub={`of ${leaderboard.length} reps`} color="#BC8CFF" bg="#1F1635"
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Score Trend — 2/3 */}
        <div
          className="lg:col-span-2 rounded-[10px] border p-5"
          style={{ background: '#161B22', borderColor: '#30363D' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>Score Trend</h2>
            <div className="flex items-center gap-4 text-xs" style={{ color: '#8B949E' }}>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded" style={{ background: '#F0A500' }} />
                Me
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded" style={{ background: '#00B4D8' }} />
                Team Avg
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded border-b border-dashed" style={{ borderColor: '#BC8CFF' }} />
                Top Rep
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={scoreTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradMe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F0A500" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F0A500" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradTeam" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00B4D8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#00B4D8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis
                dataKey="week"
                tick={{ fill: '#8B949E', fontSize: 11 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                domain={[40, 100]}
                tick={{ fill: '#8B949E', fontSize: 11 }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone" dataKey="top" name="Top Rep"
                stroke="#BC8CFF" strokeWidth={1.5} strokeDasharray="4 4"
                fill="none" dot={false}
              />
              <Area
                type="monotone" dataKey="team" name="Team Avg"
                stroke="#00B4D8" strokeWidth={1.5}
                fill="url(#gradTeam)" dot={false}
              />
              <Area
                type="monotone" dataKey="me" name="Me"
                stroke="#F0A500" strokeWidth={2}
                fill="url(#gradMe)" dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Skills Radar — 1/3 */}
        <div
          className="rounded-[10px] border p-5"
          style={{ background: '#161B22', borderColor: '#30363D' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>Skill Profile</h2>
            <div className="flex flex-col gap-1 text-[10px]" style={{ color: '#8B949E' }}>
              <span className="flex items-center gap-1">
                <span className="inline-block h-1 w-3 rounded" style={{ background: '#F0A500' }} />
                Me
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-1 w-3 rounded" style={{ background: '#00B4D8' }} />
                Team
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={skillRadarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="#30363D" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fill: '#8B949E', fontSize: 10 }}
              />
              <Radar
                name="Team" dataKey="team"
                stroke="#00B4D8" fill="#00B4D8" fillOpacity={0.08} strokeWidth={1.5}
              />
              <Radar
                name="Me" dataKey="me"
                stroke="#F0A500" fill="#F0A500" fillOpacity={0.15} strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {Object.entries(myMetrics.skills).map(([key, val]) => (
              <SkillBar
                key={key}
                label={key.replace(/([A-Z])/g, ' $1').trim()}
                value={val}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard + Goals */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Leaderboard — 2/3 */}
        <div
          className="lg:col-span-2 rounded-[10px] border p-5"
          style={{ background: '#161B22', borderColor: '#30363D' }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>Team Leaderboard</h2>
            <span className="text-xs" style={{ color: '#484F58' }}>Ranked by avg score</span>
          </div>
          <div>
            {leaderboard.map((rep) => (
              <LeaderboardRow key={rep.id} rep={rep} isMe={rep.id === myMetrics.id} />
            ))}
          </div>
        </div>

        {/* Goals — 1/3 */}
        <div
          className="rounded-[10px] border p-5 space-y-4"
          style={{ background: '#161B22', borderColor: '#30363D' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>My Goals</h2>
          {teamGoals.map((g) => {
            const pct = Math.min(Math.round((g.current / g.target) * 100), 100)
            return (
              <div key={g.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span style={{ color: '#C9D1D9' }}>{g.label}</span>
                  <span style={{ color: '#F0F6FC', fontWeight: 600 }}>
                    {g.current} <span style={{ color: '#484F58' }}>/ {g.target} {g.unit}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ background: '#1C2333' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: g.color }}
                  />
                </div>
                <div className="text-right text-[10px] mt-0.5" style={{ color: '#484F58' }}>
                  {pct}%
                </div>
              </div>
            )
          })}
          <button
            onClick={() => navigate('/doctors')}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg py-2 mt-2 transition-colors duration-150"
            style={{ color: '#F0A500', background: 'rgba(240,165,0,0.08)', border: '1px solid rgba(240,165,0,0.2)' }}
          >
            Start Practice <ArrowRight style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div
        className="rounded-[10px] border p-5"
        style={{ background: '#161B22', borderColor: '#30363D' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>Activity Heatmap</h2>
          <span className="text-xs" style={{ color: '#484F58' }}>Last 15 weeks · practice sessions per day</span>
        </div>

        <div className="flex gap-2">
          {/* Day labels */}
          <div className="flex flex-col gap-[3px] mr-1 mt-[1px]">
            {DAY_LABELS.map((d, i) => (
              <div
                key={i}
                className="h-[14px] flex items-center text-[10px]"
                style={{ color: '#484F58' }}
              >
                {i % 2 === 0 ? d : ''}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-[3px] flex-1 overflow-x-auto scrollbar-thin pb-1">
            {heatmapWeeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px] shrink-0">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className="rounded-[2px]"
                    style={{ width: 14, height: 14, background: heatColor(day.count), flexShrink: 0 }}
                    title={`${day.date}: ${day.count} session${day.count !== 1 ? 's' : ''}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10px]" style={{ color: '#484F58' }}>Less</span>
          {[0, 1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="rounded-[2px]"
              style={{ width: 12, height: 12, background: heatColor(n) }}
            />
          ))}
          <span className="text-[10px]" style={{ color: '#484F58' }}>More</span>
        </div>
      </div>

      {/* Achievements */}
      <div>
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#F0F6FC' }}>Achievements</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {achievements.map((a) => (
            <div
              key={a.id}
              className="rounded-[10px] border p-4 flex flex-col items-center text-center gap-2 transition-all duration-200"
              style={{
                background: a.unlocked ? '#161B22' : '#0D1117',
                borderColor: a.unlocked ? '#30363D' : '#1C2333',
                opacity: a.unlocked ? 1 : 0.5,
              }}
            >
              <span className="text-2xl" style={{ filter: a.unlocked ? 'none' : 'grayscale(1)' }}>
                {a.icon}
              </span>
              <div>
                <div
                  className="text-xs font-semibold"
                  style={{ color: a.unlocked ? '#F0F6FC' : '#484F58' }}
                >
                  {a.label}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: '#484F58' }}>
                  {a.unlocked ? (a.unlockedDate ?? 'Unlocked') : a.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
