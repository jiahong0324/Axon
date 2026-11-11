import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import NotificationManager from './NotificationManager'
import NotificationCenter from './NotificationCenter'
import Sidebar from './Sidebar'
import ManagerSidebar from './ManagerSidebar'
import { syncPreferences } from '../lib/preferences'
import SplashLoading from './SplashLoading'

// In-memory cache across route changes so navigation between pages never re-flashes SplashLoading
let cachedSession = null
let cachedProfile = null
let initialAuthChecked = false

export function clearAuthCache() {
  cachedSession = null
  cachedProfile = null
  initialAuthChecked = false
}

export function updateAuthCache(updatedFields) {
  if (cachedProfile) {
    cachedProfile = { ...cachedProfile, ...updatedFields }
  } else {
    cachedProfile = updatedFields
  }
  const uid = cachedProfile?.id || cachedSession?.user?.id
  if (uid) {
    try {
      localStorage.setItem(`axon_profile_cache_${uid}`, JSON.stringify(cachedProfile))
    } catch (_) {}
  }
}

export default function ProtectedRoute({ children, requireRole = 'student' }) {
  const [session, setSession] = useState(() => cachedSession)
  const [profile, setProfile] = useState(() => cachedProfile)
  const [loading, setLoading] = useState(() => !initialAuthChecked)
  const location = useLocation()

  useEffect(() => {
    if (!loading) {
      const deferredPaths = ['/home', '/timetable', '/exercise', '/health', '/manager']
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
          let { data, error: profileErr } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).maybeSingle()
          const profileCacheKey = `axon_profile_cache_${currentSession.user.id}`
          let dbErrorMessage = profileErr?.message || ''

          if (profileErr) {
            console.error('Failed to fetch profile in ProtectedRoute:', profileErr)
            try {
              const cachedRaw = localStorage.getItem(profileCacheKey)
              if (cachedRaw) data = JSON.parse(cachedRaw)
            } catch (_) {}
          } else if (!data) {
            const { error: upsertErr } = await supabase.from('profiles').upsert({
              id: currentSession.user.id,
              email: currentSession.user.email,
              full_name: currentSession.user.user_metadata?.full_name || '',
              role: 'student',
              is_active: true
            }, { onConflict: 'id' })

            if (upsertErr) {
              console.error('Failed to initialize profile in ProtectedRoute (check RLS policies):', upsertErr)
              dbErrorMessage = upsertErr.message || 'Profile access blocked'
              try {
                const cachedRaw = localStorage.getItem(profileCacheKey)
                if (cachedRaw) data = JSON.parse(cachedRaw)
              } catch (_) {}
            } else {
              const { data: newData } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).maybeSingle()
              data = newData
            }
          }

          if (data && data.id) {
            try {
              localStorage.setItem(profileCacheKey, JSON.stringify(data))
            } catch (_) {}
          }

          const resolvedProfile = data
            ? (dbErrorMessage ? { ...data, _profileDbError: dbErrorMessage } : data)
            : { role: 'student', email: currentSession.user.email, full_name: currentSession.user.user_metadata?.full_name || '', _profileDbError: dbErrorMessage || undefined }
          cachedSession = currentSession
          cachedProfile = resolvedProfile
          initialAuthChecked = true

          if (active) {
            setProfile(resolvedProfile)
            setSession(currentSession)
          }
        } else {
          cachedSession = null
          cachedProfile = null
          initialAuthChecked = true
          if (active) {
            setSession(null)
            setProfile(null)
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        initialAuthChecked = true
        if (active) setLoading(false)
      }
    }

    if (!initialAuthChecked || !cachedSession) {
      checkAuth()
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (active) {
        if (event === 'SIGNED_OUT') {
          clearAuthCache()
          setSession(null)
          setProfile(null)
          setLoading(false)
        } else if (currentSession) {
          cachedSession = currentSession
          setSession(currentSession)
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
  
  const isSkipped = session?.user?.id && (
    localStorage.getItem(`axon_onboarding_skipped_${session.user.id}`) === 'true' ||
    localStorage.getItem('axon_onboarding_skipped') === 'true'
  )

  if (role === 'student' && !isSkipped && !profile?._profileDbError && (!profile?.university || !profile?.student_id)) {
    return <Navigate to="/onboarding" replace />
  }

  if (requireRole && role !== requireRole) return <Navigate to={role === 'manager' ? '/manager' : '/home'} replace />

  return (
    <div className="page-shell">
      {role === 'manager' ? <ManagerSidebar user={session.user} profile={profile} /> : <Sidebar user={session.user} />}
      <NotificationManager />
      {role === 'student' && <NotificationCenter user={session.user} profile={profile} />}
      {profile?._profileDbError && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-amber-500/40 bg-amber-950/90 px-4 py-3 text-xs text-amber-100 shadow-lg backdrop-blur">
          <p className="font-semibold text-amber-300">Database Permission Warning</p>
          <p className="mt-1 opacity-90">{profile._profileDbError}</p>
        </div>
      )}
      {children}
    </div>
  )
}
