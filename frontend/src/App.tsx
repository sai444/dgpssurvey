import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { LoadingSpinner } from '@/components/shared/Common'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const SignupPage = lazy(() => import('@/pages/auth/SignupPage'))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const ProjectsPage = lazy(() => import('@/pages/projects/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('@/pages/projects/ProjectDetailPage'))
const ClientsPage = lazy(() => import('@/pages/clients/ClientsPage'))
const SurveyorsPage = lazy(() => import('@/pages/surveyors/SurveyorsPage'))
const UsersPage = lazy(() => import('@/pages/users/UsersPage'))
const QuotationsPage = lazy(() => import('@/pages/quotations/QuotationsPage'))
const InvoicesPage = lazy(() => import('@/pages/invoices/InvoicesPage'))
const TicketsPage = lazy(() => import('@/pages/tickets/TicketsPage'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))
const SiteSettingsPage = lazy(() => import('@/pages/settings/SiteSettingsPage'))
const PriceMasterPage = lazy(() => import('@/pages/price-master/PriceMasterPage'))
const ProjectMapPage = lazy(() => import('@/pages/projects/ProjectMapPage'))

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <LoadingSpinner />
      </div>
    }>
      {children}
    </Suspense>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<SuspenseWrapper><LoginPage /></SuspenseWrapper>} />
      <Route path="/signup" element={<SuspenseWrapper><SignupPage /></SuspenseWrapper>} />

      {/* Protected Routes */}
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<SuspenseWrapper><DashboardPage /></SuspenseWrapper>} />
        <Route path="/projects" element={<SuspenseWrapper><ProjectsPage /></SuspenseWrapper>} />
        <Route path="/projects/:id" element={<SuspenseWrapper><ProjectDetailPage /></SuspenseWrapper>} />
        <Route path="/projects/:projectId/map" element={<SuspenseWrapper><ProjectMapPage /></SuspenseWrapper>} />
        <Route path="/clients" element={<SuspenseWrapper><ClientsPage /></SuspenseWrapper>} />
        <Route path="/surveyors" element={<SuspenseWrapper><SurveyorsPage /></SuspenseWrapper>} />
        <Route path="/users" element={<SuspenseWrapper><UsersPage /></SuspenseWrapper>} />
        <Route path="/quotations" element={<SuspenseWrapper><QuotationsPage /></SuspenseWrapper>} />
        <Route path="/invoices" element={<SuspenseWrapper><InvoicesPage /></SuspenseWrapper>} />
        <Route path="/tickets" element={<SuspenseWrapper><TicketsPage /></SuspenseWrapper>} />
        <Route path="/price-master" element={<SuspenseWrapper><PriceMasterPage /></SuspenseWrapper>} />
        <Route path="/settings/profile" element={<SuspenseWrapper><SettingsPage /></SuspenseWrapper>} />
        <Route path="/settings/site" element={<SuspenseWrapper><SiteSettingsPage /></SuspenseWrapper>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
