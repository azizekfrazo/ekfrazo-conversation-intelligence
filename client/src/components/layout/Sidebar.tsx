import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Mic, BarChart2, Settings, ShieldCheck, PhoneCall, Shield } from 'lucide-react'
import { cn } from '../../lib/utils'

const topItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/doctors',   icon: Users,           label: 'Doctor Profiles' },
  { to: '/doctors',   icon: Mic,             label: 'Practice', matchPrefix: '/doctors' },
]

const bottomItems = [
  { icon: BarChart2, label: 'Analytics' },
  { icon: Settings,  label: 'Settings' },
]

interface SidebarItemProps {
  to?: string
  icon: React.ElementType
  label: string
  active?: boolean
  disabled?: boolean
}

function SidebarItem({ to, icon: Icon, label, active, disabled }: SidebarItemProps) {
  const [hovered, setHovered] = useState(false)

  const content = (
    <div
      className="sidebar-nav-item relative flex items-center justify-center h-10 w-10 rounded-lg cursor-pointer transition-all duration-150"
      style={{
        background: active
          ? 'rgba(240,165,0,0.12)'
          : hovered
          ? '#21262D'
          : 'transparent',
        color: active ? '#F0A500' : hovered ? '#F0F6FC' : '#8B949E',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Active left bar */}
      {active && (
        <span
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r"
          style={{ background: '#F0A500' }}
        />
      )}
      <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
      {/* Tooltip */}
      <span className="sidebar-tooltip">{label}</span>
    </div>
  )

  if (to && !disabled) {
    return (
      <NavLink to={to} className="flex items-center justify-center">
        {({ isActive }) => {
          const computedActive = active !== undefined ? active : isActive
          return (
            <div
              className="sidebar-nav-item relative flex items-center justify-center h-10 w-10 rounded-lg transition-all duration-150"
              style={{
                background: computedActive
                  ? 'rgba(240,165,0,0.12)'
                  : hovered
                  ? '#21262D'
                  : 'transparent',
                color: computedActive ? '#F0A500' : hovered ? '#F0F6FC' : '#8B949E',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              {computedActive && (
                <span
                  className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r"
                  style={{ background: '#F0A500' }}
                />
              )}
              <Icon style={{ width: 18, height: 18 }} />
              <span className="sidebar-tooltip">{label}</span>
            </div>
          )
        }}
      </NavLink>
    )
  }

  return content
}

export function Sidebar() {
  const location = useLocation()

  // Deduplicate: show Dashboard and Doctor Profiles only
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/doctors',   icon: Users,           label: 'Doctor Profiles' },
  ]

  return (
    <aside
      className="w-[72px] shrink-0 flex flex-col items-center py-4 gap-1"
      style={{
        background: '#161B22',
        borderRight: '1px solid #30363D',
        minHeight: '100%',
      }}
    >
      {/* Top nav icons */}
      <nav className="flex flex-col items-center gap-1 flex-1 w-full px-3">
        {navItems.map(({ to, icon, label }) => {
          const isActive = to === '/dashboard'
            ? location.pathname === '/dashboard'
            : location.pathname.startsWith('/doctors')
          return (
            <NavLink
              key={to}
              to={to}
              className="w-full flex items-center justify-center"
            >
              {({ isActive: navActive }) => {
                const active = to === '/doctors'
                  ? location.pathname.startsWith('/doctors')
                  : navActive
                return (
                  <SidebarNavIcon icon={icon} label={label} active={active} />
                )
              }}
            </NavLink>
          )
        })}

        <div
          className="w-8 my-2"
          style={{ height: 1, background: '#30363D' }}
        />

        {/* Analytics — live link */}
        <NavLink to="/analytics" className="w-full flex items-center justify-center">
          {() => {
            const active = location.pathname.startsWith('/analytics')
            return <SidebarNavIcon icon={BarChart2} label="Analytics" active={active} />
          }}
        </NavLink>

        {/* Live Call Assist */}
        <NavLink to="/livecall" className="w-full flex items-center justify-center">
          {() => {
            const active = location.pathname.startsWith('/livecall')
            return <SidebarNavIcon icon={PhoneCall} label="Live Call Assist" active={active} />
          }}
        </NavLink>

        {/* Admin Dashboard */}
        <NavLink to="/admin" className="w-full flex items-center justify-center">
          {() => {
            const active = location.pathname.startsWith('/admin')
            return <SidebarNavIcon icon={Shield} label="Admin Dashboard" active={active} />
          }}
        </NavLink>

        {/* Settings — decorative */}
        <SidebarNavIcon icon={Settings} label="Settings" active={false} disabled />
      </nav>

      {/* Shield at bottom */}
      <div
        className="flex items-center justify-center h-10 w-10 rounded-lg"
        title="For coaching purposes only"
        style={{ color: '#484F58' }}
      >
        <ShieldCheck style={{ width: 16, height: 16 }} />
      </div>
    </aside>
  )
}

function SidebarNavIcon({
  icon: Icon,
  label,
  active,
  disabled,
}: {
  icon: React.ElementType
  label: string
  active: boolean
  disabled?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="sidebar-nav-item relative flex items-center justify-center h-10 w-10 rounded-lg transition-all duration-150"
      style={{
        background: active
          ? 'rgba(240,165,0,0.12)'
          : hovered && !disabled
          ? '#21262D'
          : 'transparent',
        color: active ? '#F0A500' : hovered && !disabled ? '#F0F6FC' : '#8B949E',
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {active && (
        <span
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r"
          style={{ background: '#F0A500', transition: 'width 0.15s' }}
        />
      )}
      <Icon style={{ width: 18, height: 18 }} />
      <span className="sidebar-tooltip">{label}</span>
    </div>
  )
}
