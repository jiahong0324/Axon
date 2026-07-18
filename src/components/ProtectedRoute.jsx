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

import { useLocation } from 'react-router-dom'

export default function ProtectedRoute({ children, requireRole = 'student' }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    if (!loading) {
      const deferredPaths = ['/home', '/timetable', '/exercise', '/manager']
      if (!deferredPaths.includes(location.pathname)) {
        window.hidePrerenderSplash?.()
      }
    }
  }, [loading, location.pathname])

  useEffect(() => {
    if (session?.user) {
      syncPreferences(session.user)
    }
  }, [session])

  useEffect(() => {
    let active = true

    async function checkAuth() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (currentSession?.user) {
          let { data } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).maybeSingle()
          
          if (!data) {
            // Profile doesn't exist (e.g. first time OAuth login), create it
            await supabase.from('profiles').upsert({
              id: currentSession.user.id,
              email: currentSession.user.email,
              full_name: currentSession.user.user_metadata?.full_name || '',
              role: 'student',
              is_active: true
            }, { onConflict: 'id' })
            
            // Re-fetch to get the newly created profile
            const { data: newData } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).maybeSingle()
            data = newData
          }

          if (active) setProfile(data || { role: 'student', email: currentSession.user.email, full_name: currentSession.user.user_metadata?.full_name || '' })
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
