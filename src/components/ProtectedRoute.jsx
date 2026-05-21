import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LoadingSpinner from './LoadingSpinner'
import NotificationManager from './NotificationManager'
import Sidebar from './Sidebar'

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => sub.subscription.unsubscribe()
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
