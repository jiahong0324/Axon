import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LoadingSpinner from './LoadingSpinner'
import NotificationManager from './NotificationManager'
import Sidebar from './Sidebar'
import ManagerSidebar from './ManagerSidebar'
import { syncPreferences } from '../lib/preferences'

import SplashLoading from './SplashLoading'

import { studentManager } from '../lib/manageStudent'

export default function ProtectedRoute({ children, requireRole = 'student' }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      syncPreferences(session.user)
    }
  }, [session])

  useEffect(() => {
    let active = true

    const checkWelcomeEmail = (user) => {
      if (!user) return
      // If account was created in the last 5 minutes, send welcome email
      const isNewUser = new Date(user.created_at) > new Date(Date.now() - 5 * 60000)
      const welcomeKey = `welcome_sent_${user.id}`
      if (isNewUser && !localStorage.getItem(welcomeKey)) {
        localStorage.setItem(welcomeKey, 'true')
        studentManager.sendWelcomeEmail(user.id).catch(console.error)
      }
    }

    async function checkAuth() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (currentSession?.user) {
          const { data } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).maybeSingle()
          if (active) setProfile(data || { role: 'student', email: currentSession.user.email, full_name: currentSession.user.user_metadata?.full_name || '' })
          checkWelcomeEmail(currentSession.user)
        }
        if (active) {
          setSession(currentSession)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        if (active) setLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (active) {
        setSession(currentSession)
        if (!currentSession) setProfile(null)
        if (event === 'SIGNED_OUT') {
          setLoading(false)
        }
        if (event === 'SIGNED_IN' && currentSession?.user) {
          checkWelcomeEmail(currentSession.user)
          
          const isNewUser = new Date(currentSession.user.created_at) > new Date(Date.now() - 5 * 60000)
          if (!isNewUser && !sessionStorage.getItem('login_email_sent')) {
            sessionStorage.setItem('login_email_sent', 'true')
            studentManager.sendLoginEmail(currentSession.user.id).catch(console.error)
          }
        }
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) return <SplashLoading />
  if (!session) return <Navigate to="/login" replace />
  
  const role = profile?.role || 'student'
  
  if (role === 'student' && (!profile?.university || !profile?.student_id)) {
    return <Navigate to="/onboarding" replace />
  }

  if (requireRole && role !== requireRole) return <Navigate to={role === 'manager' ? '/manager' : '/home'} replace />

  return (
    <div className="page-shell">
      {role === 'manager' ? <ManagerSidebar user={session.user} profile={profile} /> : <Sidebar user={session.user} />}
      <NotificationManager />
      {children}
    </div>
  )
}
