import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
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

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/timetable" element={<ProtectedRoute><TimetablePage /></ProtectedRoute>} />
            <Route path="/assignments" element={<ProtectedRoute><AssignmentPage /></ProtectedRoute>} />
            <Route path="/exams" element={<ProtectedRoute><ExamPage /></ProtectedRoute>} />
            <Route path="/ai-helper" element={<ProtectedRoute><AIHelperPage /></ProtectedRoute>} />
            <Route path="/reminders" element={<ProtectedRoute><RemindersPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  )
}
