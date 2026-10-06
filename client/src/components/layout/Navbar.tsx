import { Bell, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <header
      className="h-[60px] shrink-0 flex items-center justify-between px-5 gap-4"
      style={{
        background: '#161B22',
        borderBottom: '1px solid #30363D',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(240,165,0,0.12)', border: '1px solid rgba(240,165,0,0.3)' }}
        >
          <span style={{ color: '#F0A500', fontWeight: 700, fontSize: '1rem' }}>E</span>
        </div>
        <div className="flex flex-col leading-none">
          <span style={{ color: '#F0A500', fontWeight: 700, fontSize: '0.8125rem' }}>
            Ekfrazo Technologies
          </span>
          <span style={{ color: '#8B949E', fontSize: '0.625rem', fontWeight: 500 }}>
            Conversation Intelligence
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-sm relative hidden sm:block">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
          style={{ color: '#484F58' }}
        />
        <input
          type="text"
          placeholder="Search doctors, sessions…"
          className="w-full h-8 pl-8 pr-3 text-xs rounded-lg transition-all duration-150"
          style={{
            background: '#1C2333',
            border: '1px solid #30363D',
            color: '#C9D1D9',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#F0A500'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(240,165,0,0.12)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#30363D'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      </div>

      {/* Right controls */}
      {user && (
        <div className="flex items-center gap-3 shrink-0">
          {/* Notification bell */}
          <button
            className="relative h-8 w-8 flex items-center justify-center rounded-lg transition-colors duration-150"
            style={{ color: '#8B949E' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = '#21262D'
              ;(e.currentTarget as HTMLElement).style.color = '#F0F6FC'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = '#8B949E'
            }}
          >
            <Bell className="h-4 w-4" />
            <span
              className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
              style={{ background: '#F0A500' }}
            />
          </button>

          {/* Avatar */}
          <button
            onClick={handleLogout}
            title={`${user.name} — click to sign out`}
            className="h-[34px] w-[34px] rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-150"
            style={{
              background: 'linear-gradient(135deg, #F0A500, #C87D00)',
              color: '#0D1117',
              border: '2px solid #30363D',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = '#F0A500'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = '#30363D'
            }}
          >
            {initials}
          </button>
        </div>
      )}
    </header>
  )
}
