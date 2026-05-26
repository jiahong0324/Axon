import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LoadingSpinner from './LoadingSpinner'
import NotificationManager from './NotificationManager'
import Sidebar from './Sidebar'
import { syncPreferences } from '../lib/preferences'

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null)
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
      if (active) {
        setSession(currentSession)
        setLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (active) {
        setSession(currentSession)
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

  return (
    <div className="page-shell">
      <Sidebar user={session.user} />
      <NotificationManager />
      {children}
    </div>
  )
}
