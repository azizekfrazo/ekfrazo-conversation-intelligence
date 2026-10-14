import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { AppShell } from './components/layout/AppShell'
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const DoctorsPage = lazy(() => import('./pages/DoctorsPage'))
const DoctorWorkspacePage = lazy(() => import('./pages/DoctorWorkspacePage'))
const SimulatorPage = lazy(() => import('./pages/SimulatorPage'))
const PracticeReportPage = lazy(() => import('./pages/PracticeReportPage'))
const PostCallAnalysisPage = lazy(() => import('./pages/PostCallAnalysisPage'))
const TargetsPage = lazy(() => import('./pages/TargetsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
// Manager portal pages
const ManagerDashboardPage = lazy(() => import('./pages/manager/ManagerDashboardPage'))
const ManagerRepDetailPage = lazy(() => import('./pages/manager/ManagerRepDetailPage'))
const ManagerRepsPage = lazy(() => import('./pages/manager/ManagerRepsPage'))
const FollowUpsPage = lazy(() => import('./pages/FollowUpsPage'))

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function ManagerGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role?.toLowerCase() !== 'manager') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '60vh', width: '100%' }}>
      <div style={{ width: 28, height: 28, border: '2px solid #30363D', borderTopColor: '#F0A500', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}


export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* ── Sales Representative shell ── */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="targets" element={<TargetsPage />} />
          <Route path="doctors" element={<DoctorsPage />} />
          <Route path="doctors/:id" element={<DoctorWorkspacePage />} />
          <Route path="doctors/:id/postcall/:analysisId" element={<PostCallAnalysisPage />} />
          {/* Legacy routes → redirect */}
          <Route path="analytics" element={<Navigate to="/dashboard" replace />} />
          <Route path="livecall" element={<Navigate to="/dashboard" replace />} />
          <Route path="follow-ups" element={<FollowUpsPage />} />
          <Route path="visit-log" element={<Navigate to="/dashboard" replace />} />
          <Route path="my-doctors" element={<Navigate to="/dashboard" replace />} />
          <Route path="admin" element={<Navigate to="/manager/dashboard" replace />} />
        </Route>

        {/* ── Manager portal shell ── */}
        <Route
          path="/manager"
          element={
            <ManagerGuard>
              <AppShell />
            </ManagerGuard>
          }
        >
          <Route index element={<Navigate to="/manager/dashboard" replace />} />
          <Route path="dashboard" element={<ManagerDashboardPage />} />
          <Route path="reps" element={<ManagerRepsPage />} />
          <Route path="reps/:repId" element={<ManagerRepDetailPage />} />
          {/* Legacy routes → redirect */}
          <Route path="assign" element={<Navigate to="/manager/reps" replace />} />
          <Route path="analytics" element={<Navigate to="/manager/dashboard" replace />} />
        </Route>

        {/* ── Fullscreen pages (no shell) ── */}
        <Route
          path="/doctors/:id/simulator"
          element={
            <AuthGuard>
              <SimulatorPage />
            </AuthGuard>
          }
        />
        <Route
          path="/doctors/:id/practice/:sessionId/report"
          element={
            <AuthGuard>
              <PracticeReportPage />
            </AuthGuard>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
