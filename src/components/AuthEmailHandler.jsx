import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { studentManager } from '../lib/manageStudent'

export default function AuthEmailHandler() {
  useEffect(() => {
    let active = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return

      if (event === 'SIGNED_IN' && session?.user) {
        // Consider a new user if created within the last 24 hours to handle delayed confirmations
        const isNewUser = new Date(session.user.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        
        if (isNewUser) {
          const welcomeKey = `welcome_sent_${session.user.id}`
          if (!localStorage.getItem(welcomeKey)) {
            localStorage.setItem(welcomeKey, 'true')
            studentManager.sendWelcomeEmail(session.user.id).catch(console.error)
          } else {
            // Already received welcome email, so send login email
            if (!sessionStorage.getItem('login_email_sent')) {
              sessionStorage.setItem('login_email_sent', 'true')
              studentManager.sendLoginEmail(session.user.id).catch(console.error)
            }
          }
        } else {
          // If not new, send a login alert email instead
          if (!sessionStorage.getItem('login_email_sent')) {
            sessionStorage.setItem('login_email_sent', 'true')
            studentManager.sendLoginEmail(session.user.id).catch(console.error)
          }
        }
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('login_email_sent')
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return null
}
