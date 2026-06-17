import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { studentManager } from '../lib/manageStudent'
import { useToast } from '../components/Toast'

export default function AuthEmailHandler() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    if (window.location.hash.includes('error=access_denied') && window.location.hash.includes('error_code=otp_expired')) {
      showToast('Your password reset link has expired or is invalid. Please request a new one.', 'error')
      window.history.replaceState(null, '', window.location.pathname)
    }

    let active = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return

      if (event === 'PASSWORD_RECOVERY') {
        navigate('/update-password')
      } else if (event === 'SIGNED_IN' && session?.user) {
        const isBrandNew = new Date(Date.now()) - new Date(session.user.created_at) < 5 * 60 * 1000;
        const lastSignIn = session.user.last_sign_in_at;
        const signInKey = `last_sign_in_${session.user.id}`;
        const storedSignIn = localStorage.getItem(signInKey);
        
        if (isBrandNew) {
          const welcomeKey = `welcome_sent_${session.user.id}`
          if (!localStorage.getItem(welcomeKey)) {
            localStorage.setItem(welcomeKey, 'true')
            studentManager.sendWelcomeEmail(session.user.id).catch(console.error)
            
            if (lastSignIn) {
              localStorage.setItem(signInKey, lastSignIn)
            }
            return
          }
        }
        
        if (lastSignIn && storedSignIn !== lastSignIn) {
          localStorage.setItem(signInKey, lastSignIn)
          studentManager.sendLoginEmail(session.user.id).catch(console.error)
        }
      } else if (event === 'SIGNED_OUT') {
        // Nothing to do here since last_sign_in_at handles uniqueness
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return null
}
