import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, CheckCircle, Sparkles, Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function LandingPage() {
  const navigate = useNavigate()
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const isViewing = new URLSearchParams(window.location.search).get('view') === 'true'

    // Check if logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      // Only auto-redirect if they didn't explicitly request to view the page
      if (session && !isViewing) {
        navigate('/onboarding', { replace: true })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setHasSession(!!session)
      if (session && !isViewing) {
        navigate('/onboarding', { replace: true })
      }
    })
    
    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="h-screen overflow-y-auto bg-[radial-gradient(circle_at_top,#1E1040,#0F172A_55%)] text-white scrollbar-hide">
      {/* Navigation */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-3">
          <img src="/icons/logo.png" alt="Axon Logo" className="h-9 w-9 rounded-xl shadow-lg" />
          <span className="font-heading text-2xl font-bold tracking-tight text-white">Axon</span>
        </div>
        <div className="flex items-center gap-4">
          {hasSession ? (
            <Link to="/onboarding" className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all hover:brightness-110">Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="hidden text-sm font-medium text-slate-300 transition-colors hover:text-white md:block">Sign In</Link>
              <Link to="/register" className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all hover:brightness-110">Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="mx-auto max-w-5xl px-6 py-20 text-center md:py-32">
        <h1 className="font-heading text-5xl font-extrabold leading-[1.15] tracking-tight md:text-7xl">
          Your Academic Life,<br />
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Finally Organized.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 md:text-xl">
          Stop drowning in deadlines. Axon brings your timetable, assignments, exams, and notes into one beautiful, AI-powered dashboard.
        </p>
        
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {hasSession ? (
            <Link to="/onboarding" className="inline-flex min-h-[56px] items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 text-lg font-semibold shadow-lg shadow-blue-500/25 transition-all hover:scale-105 hover:brightness-110">Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/register" className="inline-flex min-h-[56px] items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 text-lg font-semibold shadow-lg shadow-blue-500/25 transition-all hover:scale-105 hover:brightness-110">Get Started for Free</Link>
              <Link to="/login" className="inline-flex min-h-[56px] items-center justify-center rounded-xl border border-white/10 bg-white/5 px-8 text-lg font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white">Sign In</Link>
            </>
          )}
        </div>

        {/* Feature Grid */}
        <div className="mt-32 grid gap-6 text-left md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard 
            icon={<Calendar className="h-6 w-6 text-blue-400" />}
            title="Smart Timetable"
            desc="Never miss a class. Your weekly schedule, beautifully laid out with automatic alerts."
          />
          <FeatureCard 
            icon={<CheckCircle className="h-6 w-6 text-purple-400" />}
            title="Task Tracking"
            desc="Keep track of assignments and exams with priority sorting and progress tracking."
          />
          <FeatureCard 
            icon={<Sparkles className="h-6 w-6 text-orange-400" />}
            title="AI Assistant"
            desc="Stuck on a problem? Your personal AI tutor is available 24/7 to help you learn."
          />
          <FeatureCard 
            icon={<Bell className="h-6 w-6 text-green-400" />}
            title="Smart Reminders"
            desc="Get notified before deadlines approach or classes start. Never be late again."
          />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="mt-10 border-t border-white/10 pb-10 pt-8 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} Axon App. All rights reserved.</p>
        <div className="mt-3 space-x-4">
          <Link to="/terms" className="transition-colors hover:text-slate-300">Terms and Conditions</Link>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-transform hover:-translate-y-1">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 shadow-inner">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
    </div>
  )
}
