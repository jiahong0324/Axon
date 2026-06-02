import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LoadingSpinner from './LoadingSpinner'
import NotificationManager from './NotificationManager'
import Sidebar from './Sidebar'
import ManagerSidebar from './ManagerSidebar'
import { syncPreferences } from '../lib/preferences'

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

    async function checkAuth() {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (currentSession?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).maybeSingle()
        if (active) setProfile(data || { role: 'student', email: currentSession.user.email, full_name: currentSession.user.user_metadata?.full_name || '' })
      }
      if (active) {
        setSession(currentSession)
        setLoading(false)
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

  if (loading) return <div className="page-shell items-center justify-center"><LoadingSpinner size="lg" /></div>
  if (!session) return <Navigate to="/login" replace />
  const role = profile?.role || 'student'
  if (requireRole && role !== requireRole) return <Navigate to={role === 'manager' ? '/manager' : '/home'} replace />

  return (
    <div className="page-shell">
      {role === 'manager' ? <ManagerSidebar user={session.user} profile={profile} /> : <Sidebar user={session.user} />}
      <NotificationManager />
      {children}
    </div>
  )
}
