import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { AlertTriangle, TrendingUp, TrendingDown, Users, BarChart2, CheckCircle, XCircle } from 'lucide-react'

// ─── Data ─────────────────────────────────────────────────────────────────────
interface Rep {
  id: string; name: string; zone: string; calls: number; avgScore: number
  trend: number; streak: number; atRisk: boolean; topSkill: string; weakSkill: string
}

const REPS: Rep[] = [
  { id:'r1', name:'Aryan Sharma',   zone:'Bengaluru North',   calls:47, avgScore:82, trend:+8,  streak:12, atRisk:false, topSkill:'Closing',       weakSkill:'Compliance'   },
  { id:'r2', name:'Divya Pillai',   zone:'Bengaluru South',   calls:39, avgScore:74, trend:+3,  streak:5,  atRisk:false, topSkill:'Product Know.', weakSkill:'Opening'      },
  { id:'r3', name:'Rohan Desai',    zone:'Bengaluru East',    calls:28, avgScore:58, trend:-5,  streak:0,  atRisk:true,  topSkill:'Compliance',    weakSkill:'Objection'    },
  { id:'r4', name:'Priti Joshi',    zone:'Bengaluru West',    calls:52, avgScore:88, trend:+12, streak:18, atRisk:false, topSkill:'Objection',     weakSkill:'—'            },
  { id:'r5', name:'Kiran Mehta',    zone:'Bengaluru Central', calls:33, avgScore:67, trend:-2,  streak:3,  atRisk:true,  topSkill:'Opening',       weakSkill:'Closing'      },
  { id:'r6', name:'Sneha Kulkarni', zone:'Bengaluru North',   calls:41, avgScore:79, trend:+6,  streak:9,  atRisk:false, topSkill:'Product Know.', weakSkill:'Compliance'   },
  { id:'r7', name:'Vijay Nambiar',  zone:'Bengaluru South',   calls:22, avgScore:51, trend:-8,  streak:0,  atRisk:true,  topSkill:'—',             weakSkill:'Objection'    },
  { id:'r8', name:'Aarti Singh',    zone:'Bengaluru East',    calls:44, avgScore:85, trend:+9,  streak:14, atRisk:false, topSkill:'Closing',       weakSkill:'Opening'      },
]

// Rows: reps, Cols: Opening / ProductKnow / Objection / Closing / Compliance
const SKILL_MATRIX: Record<string, number[]> = {
  r1: [80, 85, 78, 90, 75],
  r2: [62, 80, 72, 68, 78],
  r3: [55, 60, 48, 52, 70],
  r4: [78, 88, 92, 85, 80],
  r5: [72, 65, 60, 55, 68],
  r6: [70, 82, 75, 78, 72],
  r7: [48, 52, 44, 50, 60],
  r8: [65, 82, 80, 88, 78],
}
const SKILL_COLS = ['Opening', 'Product Know.', 'Objection', 'Closing', 'Compliance']

const TEAM_TREND = [
  { week: 'W1', avg: 65 }, { week: 'W2', avg: 68 }, { week: 'W3', avg: 70 },
  { week: 'W4', avg: 69 }, { week: 'W5', avg: 72 }, { week: 'W6', avg: 73 },
]

const COACHING_STATUS: Record<string, boolean> = {
  r1: true, r2: true, r3: false, r4: true, r5: false, r6: true, r7: false, r8: true,
}

const AT_RISK = REPS.filter(r => r.atRisk)
const SORTED = [...REPS].sort((a, b) => b.avgScore - a.avgScore)
const TEAM_AVG = Math.round(REPS.reduce((s, r) => s + r.avgScore, 0) / REPS.length)
const WEEK_SESSIONS = REPS.reduce((s, r) => s + Math.round(r.calls / 3), 0)
const COACHING_DONE = Object.values(COACHING_STATUS).filter(Boolean).length

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cellColor(v: number): string {
  if (v >= 80) return '#3FB950'
  if (v >= 60) return '#D29922'
  return '#F85149'
}
function cellBg(v: number): string {
  if (v >= 80) return 'rgba(63,185,80,0.12)'
  if (v >= 60) return 'rgba(210,153,34,0.12)'
  return 'rgba(248,81,73,0.1)'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1C2333', border: '1px solid #30363D', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: '#8B949E' }}>{label}</div>
      <div style={{ color: '#F0A500', fontWeight: 700 }}>Avg: {payload[0].value}</div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Manager Dashboard</h1>
        <p className="text-xs mt-1" style={{ color: '#8B949E' }}>Team performance overview · 8 active reps · Last 30 days</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Team Avg Score', value: `${TEAM_AVG}/100`, icon: TrendingUp,    color: '#F0A500', bg: '#261900' },
          { label: 'Active Reps',    value: '8 / 8',           icon: Users,         color: '#3FB950', bg: '#12201A' },
          { label: 'Sessions/Week',  value: WEEK_SESSIONS,     icon: BarChart2,     color: '#58A6FF', bg: '#0D2137' },
          { label: 'At-Risk Reps',   value: AT_RISK.length,    icon: AlertTriangle, color: '#F85149', bg: '#1F0D0D' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-[10px] border p-5 flex flex-col gap-3"
            style={{ background: '#161B22', borderColor: '#30363D' }}>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: bg }}>
              <Icon style={{ width: 18, height: 18, color }} />
            </div>
            <div>
              <div style={{ color: '#F0F6FC', fontSize: '1.875rem', fontWeight: 700, lineHeight: 1 }}>{value}</div>
              <div className="mt-1 text-xs uppercase tracking-wider" style={{ color: '#8B949E' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard + Trend */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-2 rounded-[10px] border overflow-hidden"
          style={{ background: '#161B22', borderColor: '#30363D' }}>
          <div className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid #30363D' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>Team Leaderboard</h2>
            <span className="text-xs" style={{ color: '#484F58' }}>Ranked by avg score</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #1C2333' }}>
                {['#', 'Rep', 'Zone', 'Calls', 'Score', 'Trend', 'Streak', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium"
                    style={{ color: '#484F58' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SORTED.map((rep, i) => (
                <tr key={rep.id} style={{
                  background: rep.atRisk ? 'rgba(248,81,73,0.04)' : 'transparent',
                  borderBottom: '1px solid #1C2333',
                  borderLeft: rep.atRisk ? '2px solid rgba(248,81,73,0.4)' : '2px solid transparent',
                }}>
                  <td className="px-4 py-2.5 text-xs font-bold" style={{ color: '#484F58' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-xs" style={{ color: '#F0F6FC' }}>{rep.name}</div>
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: '#8B949E' }}>{rep.zone}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: '#C9D1D9' }}>{rep.calls}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-bold" style={{ color: rep.avgScore >= 80 ? '#3FB950' : rep.avgScore >= 65 ? '#F0A500' : '#F85149' }}>
                        {rep.avgScore}
                      </div>
                      <div className="w-16 h-1.5 rounded-full" style={{ background: '#1C2333' }}>
                        <div className="h-full rounded-full" style={{
                          width: `${rep.avgScore}%`,
                          background: rep.avgScore >= 80 ? '#3FB950' : rep.avgScore >= 65 ? '#F0A500' : '#F85149',
                        }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-0.5 text-xs font-medium"
                      style={{ color: rep.trend > 0 ? '#3FB950' : '#F85149' }}>
                      {rep.trend > 0
                        ? <TrendingUp style={{ width: 12, height: 12 }} />
                        : <TrendingDown style={{ width: 12, height: 12 }} />}
                      {rep.trend > 0 ? '+' : ''}{rep.trend}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: '#C9D1D9' }}>
                    {rep.streak > 0 ? `🔥 ${rep.streak}d` : <span style={{ color: '#484F58' }}>—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {rep.atRisk
                      ? <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5"
                          style={{ background: '#1F0D0D', color: '#F85149', border: '1px solid #5C1C1A' }}>
                          <AlertTriangle style={{ width: 10, height: 10 }} /> At Risk
                        </span>
                      : <span className="inline-flex text-xs font-medium rounded-full px-2 py-0.5"
                          style={{ background: '#12201A', color: '#3FB950', border: '1px solid #1F5231' }}>
                          Active
                        </span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Team Trend Chart */}
        <div className="rounded-[10px] border p-5" style={{ background: '#161B22', borderColor: '#30363D' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#F0F6FC' }}>Team Score Trend</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={TEAM_TREND} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis dataKey="week" tick={{ fill: '#8B949E', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[55, 80]} tick={{ fill: '#8B949E', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <defs>
                <linearGradient id="adminAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F0A500" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#F0A500" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Line type="monotone" dataKey="avg" stroke="#F0A500" strokeWidth={2} dot={{ r: 3, fill: '#F0A500' }} />
            </LineChart>
          </ResponsiveContainer>

          {/* Coaching compliance */}
          <div className="mt-4" style={{ borderTop: '1px solid #30363D', paddingTop: 12 }}>
            <div className="flex items-center justify-between text-xs mb-2">
              <span style={{ color: '#8B949E' }}>Weekly Practice Compliance</span>
              <span style={{ color: '#F0F6FC', fontWeight: 600 }}>{COACHING_DONE}/{REPS.length}</span>
            </div>
            <div className="h-1.5 rounded-full mb-3" style={{ background: '#1C2333' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.round(COACHING_DONE / REPS.length * 100)}%`, background: '#3FB950' }} />
            </div>
            <div className="grid grid-cols-2 gap-1">
              {REPS.map(r => (
                <div key={r.id} className="flex items-center gap-1.5 text-[10px]" style={{ color: '#8B949E' }}>
                  {COACHING_STATUS[r.id]
                    ? <CheckCircle style={{ width: 10, height: 10, color: '#3FB950', flexShrink: 0 }} />
                    : <XCircle    style={{ width: 10, height: 10, color: '#F85149', flexShrink: 0 }} />}
                  <span className="truncate">{r.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Skill Gap Matrix */}
      <div className="rounded-[10px] border overflow-hidden" style={{ background: '#161B22', borderColor: '#30363D' }}>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid #30363D' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#F0F6FC' }}>Skill Gap Matrix</h2>
          <p className="text-xs mt-0.5" style={{ color: '#484F58' }}>
            <span style={{ color: '#3FB950' }}>■</span> ≥80 &nbsp;
            <span style={{ color: '#D29922' }}>■</span> 60–79 &nbsp;
            <span style={{ color: '#F85149' }}>■</span> &lt;60
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid #1C2333' }}>
                <th className="px-4 py-2.5 text-left font-medium" style={{ color: '#484F58', minWidth: 130 }}>Rep</th>
                {SKILL_COLS.map(c => (
                  <th key={c} className="px-3 py-2.5 text-center font-medium" style={{ color: '#484F58', minWidth: 90 }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SORTED.map(rep => (
                <tr key={rep.id} style={{ borderBottom: '1px solid #1C2333' }}>
                  <td className="px-4 py-2.5 font-medium" style={{ color: '#C9D1D9' }}>{rep.name}</td>
                  {(SKILL_MATRIX[rep.id] ?? []).map((v, ci) => (
                    <td key={ci} className="px-3 py-2.5 text-center">
                      <span className="inline-block rounded px-2 py-0.5 font-semibold"
                        style={{ background: cellBg(v), color: cellColor(v), minWidth: 32 }}>
                        {v}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* At-Risk Alert Cards */}
      {AT_RISK.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#F0F6FC' }}>At-Risk Rep Alerts</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {AT_RISK.map(rep => (
              <div key={rep.id} className="rounded-[10px] border p-4 space-y-3"
                style={{ background: '#161B22', borderColor: '#5C1C1A' }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: '#F0F6FC' }}>{rep.name}</div>
                    <div className="text-xs" style={{ color: '#8B949E' }}>{rep.zone}</div>
                  </div>
                  <AlertTriangle style={{ width: 16, height: 16, color: '#F85149', flexShrink: 0, marginTop: 2 }} />
                </div>
                <p className="text-xs" style={{ color: '#F85149' }}>
                  Score dropped {Math.abs(rep.trend)} pts this month · Streak: {rep.streak === 0 ? 'Broken' : `${rep.streak}d`}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#8B949E' }}>Weakest:</span>
                  <span className="inline-flex text-xs font-medium rounded-full px-2 py-0.5"
                    style={{ background: '#1F0D0D', color: '#F85149', border: '1px solid #5C1C1A' }}>
                    {rep.weakSkill}
                  </span>
                </div>
                <button
                  onClick={() => navigate('/doctors')}
                  className="w-full py-2 rounded-lg text-xs font-bold transition-colors"
                  style={{ background: '#F0A500', color: '#0D1117' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#C87D00' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F0A500' }}>
                  Schedule Coaching →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
