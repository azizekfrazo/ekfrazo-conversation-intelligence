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
import NotFoundPage from './pages/NotFoundPage'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
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
        </Route>
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
