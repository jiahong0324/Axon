import { useState, useEffect } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { useTheme } from '../../components/ThemeProvider'
import { supabase } from '../../lib/supabase'

function ThemeToggle({ theme, setTheme }) {
  const isDark = theme === 'dark'
  return (
    <button
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Switch color theme"
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span>{isDark ? 'Dark' : 'Light'}</span>
    </button>
  )
}

function FooterGroup({ title, links, searchStr = '' }) {
  return (
    <div>
      <h3 className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{title}</h3>
      <div className="mt-4 grid gap-3">
        {links.map(([label, href]) => (
          <Link key={`${title}-${label}`} to={`${href}${searchStr}`} className="text-sm font-semibold text-slate-700 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-white">
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function LandingLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const themeCtx = useTheme()
  const [hasSession, setHasSession] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isViewing = new URLSearchParams(location.search).get('view') === 'true'
  const searchStr = isViewing ? '?view=true' : ''

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
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
  }, [navigate, isViewing])

  useEffect(() => {
    // Close menu when route changes
    setMenuOpen(false)
  }, [location.pathname])

  const navLinks = [
    ['Home', '/'],
    ['Blog', '/blog'],
    ['FAQ', '/faq'],
    ['Contact', '/contact']
  ]

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 text-slate-950 scrollbar-hide dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="Axon home">
            <img src="/icons/logo.png" alt="Axon Logo" className="h-10 w-10 rounded-xl shadow-sm" />
            <span className="font-heading text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Axon</span>
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            {navLinks.map(([label, href]) => (
              <Link key={href} to={`${href}${searchStr}`} className={`text-sm font-semibold transition-colors hover:text-blue-600 dark:hover:text-white ${location.pathname === href ? 'text-blue-600 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                {label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeToggle theme={themeCtx.theme} setTheme={themeCtx.setTheme} />
            {hasSession ? (
              <Link to="/onboarding" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
                  Sign In
                </Link>
                <Link to="/register" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 text-slate-700 dark:border-white/10 dark:text-slate-200 lg:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {menuOpen && (
          <div className="border-t border-slate-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-slate-950 lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-2">
              {navLinks.map(([label, href]) => (
                <Link key={href} to={`${href}${searchStr}`} className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
                  {label}
                </Link>
              ))}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <ThemeToggle theme={themeCtx.theme} setTheme={themeCtx.setTheme} />
                {hasSession ? (
                  <Link to="/onboarding" className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white">
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link to="/login" className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-slate-200">
                      Sign In
                    </Link>
                    <Link to="/register" className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white">
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <Outlet context={{ hasSession, searchStr }} />
      </main>

      <footer className="border-t border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950 mt-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-[1.2fr_1fr_1fr] md:px-8">
          <div>
            <div className="flex items-center gap-3">
              <img src="/icons/logo.png" alt="Axon Logo" className="h-9 w-9 rounded-xl" />
              <span className="font-heading text-xl font-bold">Axon</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-400">
              A student productivity platform for timetables, assignments, exams, reminders, study blogs, and AI learning support.
            </p>
          </div>
          <FooterGroup title="Product" links={navLinks} searchStr={searchStr} />
          <FooterGroup title="Account" links={hasSession ? [['Dashboard', '/onboarding'], ['Terms and Conditions', '/terms']] : [['Sign In', '/login'], ['Get Started', '/register'], ['Terms and Conditions', '/terms']]} searchStr="" />
        </div>
        <div className="border-t border-slate-200 px-5 py-5 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-500">
          &copy; {new Date().getFullYear()} Axon App. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
