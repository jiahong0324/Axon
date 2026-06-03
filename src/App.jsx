import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { ThemeProvider } from './components/ThemeProvider'
import { ToastProvider } from './components/Toast'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import TimetablePage from './pages/TimetablePage'
import AssignmentPage from './pages/AssignmentPage'
import ExamPage from './pages/ExamPage'
import AIHelperPage from './pages/AIHelperPage'
import RemindersPage from './pages/RemindersPage'
import SettingsPage from './pages/SettingsPage'
import ManagerDashboard from './pages/manager/ManagerDashboard'
import ManagerStudentsPage from './pages/manager/ManagerStudentsPage'
import ManagerStudentDetail from './pages/manager/ManagerStudentDetail'
import ManagerAnnouncementsPage from './pages/manager/ManagerAnnouncementsPage'
import ManagerReportsPage from './pages/manager/ManagerReportsPage'
import ManagerActivityPage from './pages/manager/ManagerActivityPage'
import ManagerSettingsPage from './pages/manager/ManagerSettingsPage'
import ManagerFeedbackPage from './pages/manager/ManagerFeedbackPage'
import TermsPage from './pages/TermsPage'

import LandingLayout from './pages/landing/LandingLayout'
import LandingHome from './pages/landing/LandingHome'
import LandingFeatures from './pages/landing/LandingFeatures'
import LandingBlog from './pages/landing/LandingBlog'
import LandingFAQ from './pages/landing/LandingFAQ'
import LandingContact from './pages/landing/LandingContact'
import OnboardingPage from './pages/OnboardingPage'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/" element={<LandingLayout />}>
              <Route index element={<LandingHome />} />
              <Route path="features" element={<LandingFeatures />} />
              <Route path="blog" element={<LandingBlog />} />
              <Route path="faq" element={<LandingFAQ />} />
              <Route path="contact" element={<LandingContact />} />
            </Route>
            <Route path="/home" element={<ProtectedRoute requireRole="student"><HomePage /></ProtectedRoute>} />
            <Route path="/timetable" element={<ProtectedRoute requireRole="student"><TimetablePage /></ProtectedRoute>} />
            <Route path="/assignments" element={<ProtectedRoute requireRole="student"><AssignmentPage /></ProtectedRoute>} />
            <Route path="/exams" element={<ProtectedRoute requireRole="student"><ExamPage /></ProtectedRoute>} />
            <Route path="/ai-helper" element={<ProtectedRoute requireRole="student"><AIHelperPage /></ProtectedRoute>} />
            <Route path="/reminders" element={<ProtectedRoute requireRole="student"><RemindersPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requireRole="student"><SettingsPage /></ProtectedRoute>} />
            <Route path="/manager" element={<ProtectedRoute requireRole="manager"><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/manager/students" element={<ProtectedRoute requireRole="manager"><ManagerStudentsPage /></ProtectedRoute>} />
            <Route path="/manager/students/:studentId" element={<ProtectedRoute requireRole="manager"><ManagerStudentDetail /></ProtectedRoute>} />
            <Route path="/manager/announcements" element={<ProtectedRoute requireRole="manager"><ManagerAnnouncementsPage /></ProtectedRoute>} />
            <Route path="/manager/reports" element={<ProtectedRoute requireRole="manager"><ManagerReportsPage /></ProtectedRoute>} />
            <Route path="/manager/activity" element={<ProtectedRoute requireRole="manager"><ManagerActivityPage /></ProtectedRoute>} />
            <Route path="/manager/feedback" element={<ProtectedRoute requireRole="manager"><ManagerFeedbackPage /></ProtectedRoute>} />
            <Route path="/manager/ai-helper" element={<ProtectedRoute requireRole="manager"><AIHelperPage role="manager" /></ProtectedRoute>} />
            <Route path="/manager/settings" element={<ProtectedRoute requireRole="manager"><ManagerSettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/home" />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  )
}
