import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Check } from 'lucide-react'
import { storeUser } from '../lib/auth'

// ─── Right-panel static data ──────────────────────────────────────────────────
const STATS = [
  { label: 'Calls This Week',       value: '47',   delta: '↑12% vs last week'   },
  { label: 'Avg Call Score',        value: '73/100', delta: '↑5 pts'              },
  { label: 'Objections Handled',    value: '91%',  delta: 'success rate'         },
  { label: 'Coaching Hours Saved',  value: '18 hrs', delta: 'this month'          },
]

const LEADERBOARD = [
  { medal: '🥇', name: 'Aryan Sharma',    score: 88 },
  { medal: '🥈', name: 'Divya Pillai',    score: 82 },
  { medal: '🥉', name: 'Sneha Kulkarni',  score: 79 },
]

export default function LoginPage() {
  const navigate = useNavigate()

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    storeUser({ id: 'demo-user-1', name: 'Arjun Kapoor', email: 'arjun.kapoor@demo.ekfrazo.in', role: 'rep', territory: 'West India' })
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0D1117' }}>
      {/* ── Left panel: login form ──────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center w-full lg:w-[55%] px-8 py-12"
        style={{ background: '#0D1117' }}>
        <div className="w-full max-w-[360px]">
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

          {/* Heading */}
          <h1 style={{ color: '#F0F6FC', fontSize: '1.75rem', fontWeight: 600, marginBottom: 6, letterSpacing: '-0.03em' }}>
            Welcome back
          </h1>
          <p style={{ color: '#8B949E', fontSize: '0.875rem', marginBottom: 28 }}>
            Enter the demo workspace to get started
          </p>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label style={{ display: 'block', color: '#8B949E', fontSize: '0.75rem', fontWeight: 500, marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email"
                defaultValue="arjun.kapoor@demo.ekfrazo.in"
                readOnly
                className="w-full h-10 px-3 rounded-lg text-sm"
                style={{ background: '#1C2333', border: '1px solid #30363D', color: '#C9D1D9', outline: 'none' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#F0A500'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(240,165,0,0.12)' }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = '#30363D'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#8B949E', fontSize: '0.75rem', fontWeight: 500, marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                defaultValue="demo1234"
                readOnly
                className="w-full h-10 px-3 rounded-lg text-sm"
                style={{ background: '#1C2333', border: '1px solid #30363D', color: '#C9D1D9', outline: 'none' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#F0A500'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(240,165,0,0.12)' }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = '#30363D'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-lg font-bold text-sm transition-all duration-150"
              style={{ background: '#F0A500', color: '#0D1117' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#C87D00'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(240,165,0,0.18)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F0A500'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
              Sign in
            </button>
          </form>

          <div className="mt-8 pt-6 text-center text-xs"
            style={{ borderTop: '1px solid #30363D', color: '#484F58' }}>
            Demo user: Arjun Kapoor · West India Territory
          </div>

          <div className="mt-4 flex items-start gap-1.5 text-xs" style={{ color: '#484F58' }}>
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>For coaching and preparation only. Not for live field overlays.</span>
          </div>
        </div>
      </div>

      {/* ── Right panel: productivity snapshot ─────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-center items-start px-14 w-[45%]"
        style={{ background: 'linear-gradient(135deg, #0D1117 0%, #1A1200 50%, #0D1117 100%)', borderLeft: '1px solid #30363D' }}>
        <div className="w-full max-w-sm space-y-6">
          {/* Pill label */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: 'rgba(240,165,0,0.12)', color: '#F0A500', border: '1px solid rgba(240,165,0,0.25)' }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#F0A500' }} />
            Live team snapshot — West India Territory
          </div>

          {/* 2×2 stat grid */}
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

          {/* Mini leaderboard */}
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

          {/* Trust badges */}
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
