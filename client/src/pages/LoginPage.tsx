import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Check, Users, BarChart2 } from 'lucide-react'
import { storeUser } from '../lib/auth'
import { api } from '../lib/api'

const STATS = [
  { label: 'Calls This Week',      value: '47',    delta: '↑12% vs last week' },
  { label: 'Avg Call Score',       value: '73/100', delta: '↑5 pts' },
  { label: 'Objections Handled',   value: '91%',   delta: 'success rate' },
  { label: 'Coaching Hours Saved', value: '18 hrs', delta: 'this month' },
]

const LEADERBOARD = [
  { medal: '🥇', name: 'Arjun Kapoor',  score: 88 },
  { medal: '🥈', name: 'Priya Singh',   score: 82 },
  { medal: '🥉', name: 'Vikram Nair',   score: 79 },
]

export default function LoginPage() {
  const navigate = useNavigate()

  const handleRepLogin = async () => {
    try {
      // Try to get Arjun's repId from API
      const res = await api.get('/api/salesreps')
      const arjun = res.data.find((r: any) => r.email === 'arjun.kapoor@ekfrazo.com') || res.data[0]
      storeUser({
        id: arjun?.id || 'demo-rep-1',
        name: 'Arjun Kapoor',
        email: 'arjun.kapoor@ekfrazo.com',
        role: 'rep',
        territory: 'Bengaluru North',
        repId: arjun?.id || null,
      } as any)
    } catch {
      storeUser({
        id: 'demo-rep-1',
        name: 'Arjun Kapoor',
        email: 'arjun.kapoor@ekfrazo.com',
        role: 'rep',
        territory: 'Bengaluru North',
      } as any)
    }
    navigate('/dashboard')
  }

  const handleManagerLogin = () => {
    storeUser({
      id: 'demo-manager-1',
      name: 'Rahul Kapoor',
      email: 'rahul@ekfrazo.demo',
      role: 'manager',
      territory: null,
    } as any)
    navigate('/manager/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0D1117' }}>
      {/* Left panel */}
      <div className="flex flex-col items-center justify-center w-full lg:w-[55%] px-8 py-12"
        style={{ background: '#0D1117' }}>
        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(240,165,0,0.12)', border: '1px solid rgba(240,165,0,0.3)' }}>
              <span style={{ color: '#F0A500', fontWeight: 800, fontSize: '1.25rem' }}>E</span>
            </div>
            <div>
              <div style={{ color: '#F0A500', fontWeight: 700, fontSize: '0.9375rem' }}>Ekfrazo Technologies</div>
              <div style={{ color: '#8B949E', fontSize: '0.6875rem' }}>Conversation Intelligence for Pharma</div>
            </div>
          </div>

          <h1 style={{ color: '#F0F6FC', fontSize: '1.75rem', fontWeight: 600, marginBottom: 6, letterSpacing: '-0.03em' }}>
            Welcome back
          </h1>
          <p style={{ color: '#8B949E', fontSize: '0.875rem', marginBottom: 32 }}>
            Choose your demo role to get started
          </p>

          {/* Role selector cards */}
          <div className="space-y-4">
            {/* Sales Representative button */}
            <button
              onClick={handleRepLogin}
              className="w-full rounded-xl p-5 text-left transition-all duration-150 group"
              style={{ background: '#1C2333', border: '1px solid #30363D' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#4B2A91'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(75,42,145,0.08)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#30363D'
                ;(e.currentTarget as HTMLElement).style.background = '#1C2333'
              }}
            >
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(75,42,145,0.2)', border: '1px solid rgba(75,42,145,0.4)' }}>
                  <Users className="h-5 w-5" style={{ color: '#8B5CF6' }} />
                </div>
                <div>
                  <div style={{ color: '#F0F6FC', fontWeight: 600, fontSize: '0.9375rem' }}>
                    Enter as Demo Sales Representative
                  </div>
                  <div style={{ color: '#8B949E', fontSize: '0.8125rem', marginTop: 2 }}>
                    Arjun Kapoor · Bengaluru North Territory
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Visit Log', 'My Doctors', 'Targets', 'Battlecards', 'Simulator'].map((f) => (
                  <span key={f} className="px-2 py-0.5 rounded text-xs"
                    style={{ background: 'rgba(75,42,145,0.15)', color: '#A78BFA', border: '1px solid rgba(75,42,145,0.25)' }}>
                    {f}
                  </span>
                ))}
              </div>
            </button>

            {/* Manager button */}
            <button
              onClick={handleManagerLogin}
              className="w-full rounded-xl p-5 text-left transition-all duration-150"
              style={{ background: '#1C2333', border: '1px solid #30363D' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#F0A500'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(240,165,0,0.06)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#30363D'
                ;(e.currentTarget as HTMLElement).style.background = '#1C2333'
              }}
            >
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(240,165,0,0.12)', border: '1px solid rgba(240,165,0,0.3)' }}>
                  <BarChart2 className="h-5 w-5" style={{ color: '#F0A500' }} />
                </div>
                <div>
                  <div style={{ color: '#F0F6FC', fontWeight: 600, fontSize: '0.9375rem' }}>
                    Enter as Demo Manager
                  </div>
                  <div style={{ color: '#8B949E', fontSize: '0.8125rem', marginTop: 2 }}>
                    Rahul Kapoor · Regional Manager · 5 Reps
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Team Overview', 'Rep Analytics', 'Assign Doctors', 'Visit Reports'].map((f) => (
                  <span key={f} className="px-2 py-0.5 rounded text-xs"
                    style={{ background: 'rgba(240,165,0,0.1)', color: '#F0A500', border: '1px solid rgba(240,165,0,0.2)' }}>
                    {f}
                  </span>
                ))}
              </div>
            </button>
          </div>

          <div className="mt-8 pt-6 text-center text-xs"
            style={{ borderTop: '1px solid #30363D', color: '#484F58' }}>
            Demo workspace · All data is simulated
          </div>

          <div className="mt-4 flex items-start gap-1.5 text-xs" style={{ color: '#484F58' }}>
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>For coaching and preparation only. Not for live field overlays.</span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="hidden lg:flex flex-col justify-center items-start px-14 w-[45%]"
        style={{ background: 'linear-gradient(135deg, #0D1117 0%, #1A1200 50%, #0D1117 100%)', borderLeft: '1px solid #30363D' }}>
        <div className="w-full max-w-sm space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: 'rgba(240,165,0,0.12)', color: '#F0A500', border: '1px solid rgba(240,165,0,0.25)' }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#F0A500' }} />
            Live team snapshot — Bengaluru Region
          </div>
          <div className="grid grid-cols-2 gap-3">
            {STATS.map(({ label, value, delta }) => (
              <div key={label} className="rounded-xl p-4 space-y-1"
                style={{ background: '#1C2128', border: '1px solid #30363D' }}>
                <div style={{ color: '#F0A500', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>{value}</div>
                <div style={{ color: '#3FB950', fontSize: '0.6875rem', fontWeight: 500 }}>{delta}</div>
                <div style={{ color: '#6E7681', fontSize: '0.6875rem' }}>{label}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: '#1C2128', border: '1px solid #30363D' }}>
            {LEADERBOARD.map(({ medal, name, score }) => (
              <div key={name} className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid #21262D' }}>
                <div className="flex items-center gap-2.5">
                  <span style={{ fontSize: '1rem' }}>{medal}</span>
                  <span style={{ color: '#C9D1D9', fontSize: '0.875rem', fontWeight: 500 }}>{name}</span>
                </div>
                <span style={{ color: '#F0A500', fontSize: '0.875rem', fontWeight: 700 }}>{score}/100</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 pt-4" style={{ borderTop: '1px solid #30363D' }}>
            {['HIPAA-safe', 'OpenAI-powered', 'Demo-ready'].map((tag) => (
              <div key={tag} className="flex items-center gap-1.5 text-xs" style={{ color: '#484F58' }}>
                <Check className="h-3 w-3" style={{ color: '#3FB950' }} />
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
