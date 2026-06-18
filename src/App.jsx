import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { ThemeProvider } from './components/ThemeProvider'
import { ToastProvider } from './components/Toast'
import AuthEmailHandler from './components/AuthEmailHandler'
import { LanguageProvider } from './components/LanguageProvider'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const TimetablePage = lazy(() => import('./pages/TimetablePage'))
const AssignmentPage = lazy(() => import('./pages/AssignmentPage'))
const ExamPage = lazy(() => import('./pages/ExamPage'))
const AIHelperPage = lazy(() => import('./pages/AIHelperPage'))
const RemindersPage = lazy(() => import('./pages/RemindersPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const UpdatePasswordPage = lazy(() => import('./pages/UpdatePasswordPage'))

const ManagerDashboard = lazy(() => import('./pages/manager/ManagerDashboard'))
const ManagerStudentsPage = lazy(() => import('./pages/manager/ManagerStudentsPage'))
const ManagerStudentDetail = lazy(() => import('./pages/manager/ManagerStudentDetail'))
const ManagerAnnouncementsPage = lazy(() => import('./pages/manager/ManagerAnnouncementsPage'))
const ManagerReportsPage = lazy(() => import('./pages/manager/ManagerReportsPage'))
const ManagerActivityPage = lazy(() => import('./pages/manager/ManagerActivityPage'))
const ManagerSettingsPage = lazy(() => import('./pages/manager/ManagerSettingsPage'))
const ManagerFeedbackPage = lazy(() => import('./pages/manager/ManagerFeedbackPage'))
const ManagerBlogPage = lazy(() => import('./pages/manager/ManagerBlogPage'))

const LandingLayout = lazy(() => import('./pages/landing/LandingLayout'))
const LandingHome = lazy(() => import('./pages/landing/LandingHome'))
const LandingBlog = lazy(() => import('./pages/landing/LandingBlog'))
const LandingArticle = lazy(() => import('./pages/landing/LandingArticle'))
const LandingFAQ = lazy(() => import('./pages/landing/LandingFAQ'))
const LandingContact = lazy(() => import('./pages/landing/LandingContact'))

function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-[#0A0F1E]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-theme-500 border-t-transparent" />
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <AuthEmailHandler />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/update-password" element={<UpdatePasswordPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/" element={<LandingLayout />}>
                  <Route index element={<LandingHome />} />
                  <Route path="blog" element={<LandingBlog />} />
                  <Route path="blog/:slug" element={<LandingArticle />} />
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
                <Route path="/manager/blog" element={<ProtectedRoute requireRole="manager"><ManagerBlogPage /></ProtectedRoute>} />
                <Route path="/manager/ai-helper" element={<ProtectedRoute requireRole="manager"><AIHelperPage role="manager" /></ProtectedRoute>} />
                <Route path="/manager/settings" element={<ProtectedRoute requireRole="manager"><ManagerSettingsPage /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/home" />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  )
}
