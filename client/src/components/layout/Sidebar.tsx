import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, BarChart2, Settings, ShieldCheck, PhoneCall, Shield, CheckSquare,
  ClipboardList, Stethoscope, Target, TrendingUp, UserCheck,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'

export function Sidebar() {
  const location = useLocation()
  const { user } = useAuth()
  const isManager = user?.role === 'manager'

  const { data: followUpData } = useQuery({
    queryKey: ['follow-ups-count'],
    queryFn: () => api.get('/api/follow-ups?status=pending').then((r) => r.data),
    retry: false,
    refetchInterval: 30000,
    enabled: !isManager,
  })
  const pendingCount: number = followUpData?.actions?.length ?? 0

  return (
    <aside
      className="w-[72px] shrink-0 flex flex-col items-center py-4 gap-1"
      style={{
        background: '#161B22',
        borderRight: '1px solid #30363D',
        minHeight: '100%',
      }}
    >
      <nav className="flex flex-col items-center gap-1 flex-1 w-full px-3">
        {isManager ? (
          <>
            {/* Manager navigation */}
            <NavLink to="/manager/dashboard" className="w-full flex items-center justify-center">
              {() => (
                <SidebarNavIcon
                  icon={LayoutDashboard}
                  label="Manager Dashboard"
                  active={location.pathname === '/manager/dashboard'}
                />
              )}
            </NavLink>

            <NavLink to="/manager/reps" className="w-full flex items-center justify-center">
              {() => (
                <SidebarNavIcon
                  icon={Users}
                  label="My Team"
                  active={location.pathname.startsWith('/manager/reps')}
                />
              )}
            </NavLink>

            <NavLink to="/manager/assign" className="w-full flex items-center justify-center">
              {() => (
                <SidebarNavIcon
                  icon={UserCheck}
                  label="Assign Doctors"
                  active={location.pathname.startsWith('/manager/assign')}
                />
              )}
            </NavLink>

            <div className="w-8 my-2" style={{ height: 1, background: '#30363D' }} />

            <NavLink to="/manager/analytics" className="w-full flex items-center justify-center">
              {() => (
                <SidebarNavIcon
                  icon={TrendingUp}
                  label="Visit Analytics"
                  active={location.pathname.startsWith('/manager/analytics')}
                />
              )}
            </NavLink>
          </>
        ) : (
          <>
            {/* Sales Rep navigation */}
            <NavLink to="/dashboard" className="w-full flex items-center justify-center">
              {() => (
                <SidebarNavIcon
                  icon={LayoutDashboard}
                  label="Dashboard"
                  active={location.pathname === '/dashboard'}
                />
              )}
            </NavLink>

            <NavLink to="/doctors" className="w-full flex items-center justify-center">
              {() => (
                <SidebarNavIcon
                  icon={Stethoscope}
                  label="Doctor Profiles"
                  active={location.pathname.startsWith('/doctors')}
                />
              )}
            </NavLink>

            <NavLink to="/my-doctors" className="w-full flex items-center justify-center">
              {() => (
                <SidebarNavIcon
                  icon={UserCheck}
                  label="My Doctors"
                  active={location.pathname === '/my-doctors'}
                />
              )}
            </NavLink>

            <NavLink to="/visit-log" className="w-full flex items-center justify-center">
              {() => (
                <SidebarNavIcon
                  icon={ClipboardList}
                  label="Visit Log"
                  active={location.pathname === '/visit-log'}
                />
              )}
            </NavLink>

            <NavLink to="/targets" className="w-full flex items-center justify-center">
              {() => (
                <SidebarNavIcon
                  icon={Target}
                  label="My Targets"
                  active={location.pathname === '/targets'}
                />
              )}
            </NavLink>

            <NavLink to="/follow-ups" className="w-full flex items-center justify-center">
              {() => (
                <SidebarNavIcon
                  icon={CheckSquare}
                  label="Follow-Ups"
                  active={location.pathname === '/follow-ups'}
                  badge={pendingCount > 0 ? pendingCount : undefined}
                />
              )}
            </NavLink>

            <div className="w-8 my-2" style={{ height: 1, background: '#30363D' }} />

            <NavLink to="/analytics" className="w-full flex items-center justify-center">
              {() => (
                <SidebarNavIcon
                  icon={BarChart2}
                  label="Analytics"
                  active={location.pathname.startsWith('/analytics')}
                />
              )}
            </NavLink>

            <NavLink to="/livecall" className="w-full flex items-center justify-center">
              {() => (
                <SidebarNavIcon
                  icon={PhoneCall}
                  label="Live Call Assist"
                  active={location.pathname.startsWith('/livecall')}
                />
              )}
            </NavLink>

            <NavLink to="/admin" className="w-full flex items-center justify-center">
              {() => (
                <SidebarNavIcon
                  icon={Shield}
                  label="Admin Dashboard"
                  active={location.pathname.startsWith('/admin')}
                />
              )}
            </NavLink>
          </>
        )}

        <SidebarNavIcon icon={Settings} label="Settings" active={false} disabled />
      </nav>

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
  badge,
}: {
  icon: React.ElementType
  label: string
  active: boolean
  disabled?: boolean
  badge?: number
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
      {badge !== undefined && (
        <span
          className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-[9px] font-bold leading-none"
          style={{
            background: '#F0A500',
            color: '#0D1117',
            minWidth: 14,
            height: 14,
            padding: '0 3px',
          }}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      <span className="sidebar-tooltip">{label}</span>
    </div>
  )
}
