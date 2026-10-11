import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { AppShell } from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DoctorsPage from './pages/DoctorsPage'
import DoctorWorkspacePage from './pages/DoctorWorkspacePage'
import SimulatorPage from './pages/SimulatorPage'
import PracticeReportPage from './pages/PracticeReportPage'
import PostCallAnalysisPage from './pages/PostCallAnalysisPage'
import AnalyticsPage from './pages/AnalyticsPage'
import LiveCallPage from './pages/LiveCallPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import FollowUpsPage from './pages/FollowUpsPage'
import NotFoundPage from './pages/NotFoundPage'
// Rep enhancement pages
import VisitLogPage from './pages/VisitLogPage'
import MyDoctorsPage from './pages/MyDoctorsPage'
import TargetsPage from './pages/TargetsPage'
// Manager portal pages
import ManagerDashboardPage from './pages/manager/ManagerDashboardPage'
import ManagerRepDetailPage from './pages/manager/ManagerRepDetailPage'
import AssignDoctorsPage from './pages/manager/AssignDoctorsPage'
import VisitAnalyticsPage from './pages/manager/VisitAnalyticsPage'

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* ── Sales Rep shell ── */}
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
          <Route path="doctors" element={<DoctorsPage />} />
          <Route path="doctors/:id" element={<DoctorWorkspacePage />} />
          <Route path="doctors/:id/postcall/:analysisId" element={<PostCallAnalysisPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="livecall" element={<LiveCallPage />} />
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="follow-ups" element={<FollowUpsPage />} />
          {/* Rep enhancements */}
          <Route path="visit-log" element={<VisitLogPage />} />
          <Route path="my-doctors" element={<MyDoctorsPage />} />
          <Route path="targets" element={<TargetsPage />} />
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
          <Route path="reps" element={<ManagerDashboardPage />} />
          <Route path="reps/:repId" element={<ManagerRepDetailPage />} />
          <Route path="assign" element={<AssignDoctorsPage />} />
          <Route path="analytics" element={<VisitAnalyticsPage />} />
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
    </BrowserRouter>
  )
}
