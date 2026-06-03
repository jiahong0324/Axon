import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Mail,
  Menu,
  MessageCircle,
  Moon,
  Send,
  Sparkles,
  Sun,
  Target,
  X
} from 'lucide-react'
import { useTheme } from '../components/ThemeProvider'
import { supabase } from '../lib/supabase'

const features = [
  {
    icon: Calendar,
    title: 'Smart Timetable',
    desc: 'Build a clear weekly schedule for lectures, tutorials, practicals, study sessions, and campus commitments.',
    tone: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
  },
  {
    icon: CheckCircle,
    title: 'Assignment Tracker',
    desc: 'Organize coursework by subject, deadline, priority, and status so important work never disappears.',
    tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
  },
  {
    icon: Target,
    title: 'Exam Planner',
    desc: 'Keep exam dates, venues, notes, preparation plans, and countdowns in one easy-to-review place.',
    tone: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
  },
  {
    icon: Sparkles,
    title: 'AI Study Helper',
    desc: 'Get explanations, summaries, study prompts, and revision support when you need a faster way forward.',
    tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    desc: 'Set reminders for deadlines, class starts, exam preparation, daily study routines, and personal tasks.',
    tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
  },
  {
    icon: BookOpen,
    title: 'Student Blog',
    desc: 'Read practical articles about planning, revision, productivity, campus habits, and academic confidence.',
    tone: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300'
  }
]

const blogPosts = [
  {
    category: 'Study Planning',
    title: 'How to Plan a Productive Study Week',
    desc: 'A simple weekly planning method for balancing class time, assignments, revision, and rest.',
    readTime: '5 min read'
  },
  {
    category: 'Deadlines',
    title: '5 Ways to Avoid Missing Assignment Deadlines',
    desc: 'Turn big coursework into smaller checkpoints and keep your progress visible before the due date.',
    readTime: '4 min read'
  },
  {
    category: 'Exam Prep',
    title: 'How to Prepare for Exams Without Last-Minute Stress',
    desc: 'Use countdowns, topic lists, and focused revision blocks to make exam season more manageable.',
    readTime: '6 min read'
  }
]

const faqs = [
  {
    question: 'What is Axon?',
    answer: 'Axon is a student productivity platform that brings your timetable, assignments, exams, reminders, study articles, and AI learning support into one organized workspace.'
  },
  {
    question: 'Is Axon only for students?',
    answer: 'Yes. This version of Axon is focused on helping students manage academic life more clearly and consistently.'
  },
  {
    question: 'Can I track assignments and exams?',
    answer: 'Yes. You can manage assignment deadlines, priorities, progress, exam dates, venues, notes, and preparation reminders.'
  },
  {
    question: 'Does Axon support reminders?',
    answer: 'Yes. Axon supports reminders for classes, exams, assignments, and personal study routines, depending on your preferences.'
  },
  {
    question: 'Can I switch between light and dark mode?',
    answer: 'Yes. Axon opens in light mode by default, and you can switch to dark mode anytime. Your choice is saved for future visits.'
  },
  {
    question: 'What is the blog for?',
    answer: 'The blog is designed for study tips, productivity guides, exam strategies, and practical academic advice for students.'
  }
]

export default function LandingPage() {
  const navigate = useNavigate()
  const themeCtx = useTheme()
  const [hasSession, setHasSession] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [contactSent, setContactSent] = useState(false)

  useEffect(() => {
    const isViewing = new URLSearchParams(window.location.search).get('view') === 'true'

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
  }, [navigate])

  function handleContactSubmit(e) {
    e.preventDefault()
    setContactSent(true)
    e.currentTarget.reset()
  }

  const navLinks = [
    ['Features', '#features'],
    ['Blog', '#blog'],
    ['FAQ', '#faq'],
    ['Contact', '#contact']
  ]

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 text-slate-950 scrollbar-hide dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/86">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="Axon home">
            <img src="/icons/logo.png" alt="Axon Logo" className="h-10 w-10 rounded-xl shadow-sm" />
            <span className="font-heading text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Axon</span>
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} className="text-sm font-semibold text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-white">
                {label}
              </a>
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
                <a key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
                  {label}
                </a>
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
        <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_34rem),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.1),transparent_24rem)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_34rem),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.14),transparent_24rem)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="mb-5 inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300">
                Student productivity platform
              </p>
              <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight text-slate-950 md:text-6xl dark:text-white">
                Your academic life, organized in one place.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                Plan your timetable, track assignments, prepare for exams, read study blogs, and get AI-powered learning support from a clean student dashboard.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {hasSession ? (
                  <Link to="/onboarding" className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 text-base font-bold text-white shadow-xl shadow-blue-600/20 transition hover:bg-blue-700">
                    Go to Dashboard <ArrowRight className="h-5 w-5" />
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 text-base font-bold text-white shadow-xl shadow-blue-600/20 transition hover:bg-blue-700">
                      Get Started <ArrowRight className="h-5 w-5" />
                    </Link>
                    <Link to="/login" className="inline-flex min-h-[56px] items-center justify-center rounded-xl border border-slate-200 bg-white px-7 text-base font-bold text-slate-800 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                      Sign In
                    </Link>
                  </>
                )}
              </div>
              <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
                <HeroStat value="6" label="Study tools" />
                <HeroStat value="24/7" label="AI support" />
                <HeroStat value="Light" label="Default theme" />
              </div>
            </div>
            <DashboardPreview />
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
          <SectionIntro
            eyebrow="Features"
            title="Everything students need to stay ahead"
            desc="Axon keeps your academic details visible, structured, and easy to act on from the first week of class to exam season."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map(feature => <FeatureCard key={feature.title} feature={feature} />)}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/50">
          <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
            <SectionIntro
              eyebrow="How it works"
              title="Start simple, then let Axon keep you steady"
              desc="The workflow is built for real student routines: quick setup, clear tracking, and fewer forgotten tasks."
            />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              <Step number="01" title="Create your account" desc="Set up your student profile and choose the theme that feels right for your workspace." />
              <Step number="02" title="Add your academic schedule" desc="Enter classes, assignments, exams, and reminders so your dashboard reflects your actual week." />
              <Step number="03" title="Track and improve" desc="Use status updates, countdowns, AI support, and study articles to stay organized over time." />
            </div>
          </div>
        </section>

        <section id="blog" className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionIntro
              eyebrow="Blog"
              title="Learn better with Axon Blog"
              desc="A student-focused article hub for productivity habits, deadline planning, exam preparation, and healthier study routines."
            />
            <a href="#contact" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-100 dark:border-white/10 dark:text-white dark:hover:bg-white/10">
              Request a topic <MessageCircle className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {blogPosts.map(post => <BlogCard key={post.title} post={post} />)}
          </div>
        </section>

        <section id="faq" className="border-y border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/50">
          <div className="mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-20">
            <SectionIntro
              eyebrow="FAQ"
              title="Questions students usually ask"
              desc="A quick guide to what Axon does and how it supports everyday academic planning."
              centered
            />
            <div className="mt-10 space-y-3">
              {faqs.map(item => <FaqItem key={item.question} item={item} />)}
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[0.85fr_1fr] lg:items-start">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              Contact Us
            </p>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl dark:text-white">
              Need help or want to suggest a blog topic?
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">
              Send a message about account support, study features, article ideas, or anything that would make Axon more useful for students.
            </p>
            <div className="mt-8 space-y-4">
              <ContactLine icon={Mail} title="Email" desc="support@axon.app" />
              <ContactLine icon={Clock} title="Response time" desc="Usually within 1-2 business days" />
              <ContactLine icon={BookOpen} title="Blog topics" desc="Study planning, exams, assignments, AI learning, and student life" />
            </div>
          </div>

          <form onSubmit={handleContactSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/20 md:p-7">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Name</span>
                <input required className="min-h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-white" placeholder="Your name" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Email</span>
                <input required type="email" className="min-h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-white" placeholder="you@example.com" />
              </label>
            </div>
            <label className="mt-4 block space-y-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Message</span>
              <textarea required rows="6" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-white" placeholder="Tell us how we can help." />
            </label>
            <button className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">
              Send Message <Send className="h-4 w-4" />
            </button>
            {contactSent && (
              <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                Message received. This demo form is ready for backend email handling later.
              </p>
            )}
          </form>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-16 md:px-8">
          <div className="rounded-3xl bg-slate-950 px-6 py-12 text-center text-white shadow-2xl shadow-slate-300/40 dark:bg-white dark:text-slate-950 dark:shadow-black/20 md:px-10">
            <h2 className="font-heading text-3xl font-extrabold tracking-tight md:text-5xl">
              Start organizing your academic life today.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300 dark:text-slate-600">
              Build better study habits with a dashboard that keeps your classes, deadlines, exams, reminders, and learning support in one place.
            </p>
            <div className="mt-8">
              <Link to={hasSession ? '/onboarding' : '/register'} className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 text-base font-bold text-white transition hover:bg-blue-700">
                {hasSession ? 'Go to Dashboard' : 'Get Started'} <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
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
          <FooterGroup title="Product" links={[['Features', '#features'], ['Blog', '#blog'], ['FAQ', '#faq'], ['Contact Us', '#contact']]} />
          <FooterGroup title="Account" links={hasSession ? [['Dashboard', '/onboarding'], ['Terms and Conditions', '/terms']] : [['Sign In', '/login'], ['Get Started', '/register'], ['Terms and Conditions', '/terms']]} />
        </div>
        <div className="border-t border-slate-200 px-5 py-5 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-500">
          &copy; {new Date().getFullYear()} Axon App. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

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

function DashboardPreview() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/70 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/30">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Today</p>
            <h2 className="font-heading text-2xl font-extrabold text-slate-950 dark:text-white">Academic Overview</h2>
          </div>
          <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">On track</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniMetric label="Classes" value="4" tone="text-blue-600 dark:text-blue-300" />
          <MiniMetric label="Assignments" value="3" tone="text-emerald-600 dark:text-emerald-300" />
          <MiniMetric label="Exams" value="2" tone="text-violet-600 dark:text-violet-300" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.85fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Upcoming schedule</p>
            <div className="mt-4 space-y-3">
              <ScheduleRow time="09:00" title="Data Structures" meta="Lecture Hall A" />
              <ScheduleRow time="13:30" title="Web Development" meta="Practical Lab" />
              <ScheduleRow time="16:00" title="Revision Block" meta="Library" />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">AI study prompt</p>
            <p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900 dark:bg-blue-500/10 dark:text-blue-100">
              Summarize my networking notes and create a 20-minute revision plan.
            </p>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
              Exam countdown: 7 days
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroStat({ value, label }) {
  return (
    <div>
      <p className="font-heading text-2xl font-extrabold text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

function MiniMetric({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 font-heading text-3xl font-extrabold ${tone}`}>{value}</p>
    </div>
  )
}

function ScheduleRow({ time, title, meta }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">{time}</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{title}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{meta}</p>
      </div>
    </div>
  )
}

function SectionIntro({ eyebrow, title, desc, centered = false }) {
  return (
    <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <p className="mb-3 text-sm font-extrabold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">{eyebrow}</p>
      <h2 className="font-heading text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl dark:text-white">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg dark:text-slate-300">{desc}</p>
    </div>
  )
}

function FeatureCard({ feature }) {
  const Icon = feature.icon

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80 dark:border-white/10 dark:bg-slate-900 dark:hover:shadow-black/20">
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.tone}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-xl font-extrabold text-slate-950 dark:text-white">{feature.title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{feature.desc}</p>
    </article>
  )
}

function Step({ number, title, desc }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-950">
      <p className="font-heading text-4xl font-extrabold text-blue-600 dark:text-blue-300">{number}</p>
      <h3 className="mt-4 text-xl font-extrabold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{desc}</p>
    </article>
  )
}

function BlogCard({ post }) {
  return (
    <article className="flex min-h-[260px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80 dark:border-white/10 dark:bg-slate-900 dark:hover:shadow-black/20">
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">{post.category}</span>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{post.readTime}</span>
      </div>
      <h3 className="text-xl font-extrabold leading-snug text-slate-950 dark:text-white">{post.title}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{post.desc}</p>
      <a href="#contact" className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200">
        Read Article <ArrowRight className="h-4 w-4" />
      </a>
    </article>
  )
}

function FaqItem({ item }) {
  return (
    <details className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-extrabold text-slate-950 dark:text-white">
        {item.question}
        <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400">{item.answer}</p>
    </details>
  )
}

function ContactLine({ icon: Icon, title, desc }) {
  return (
    <div className="flex gap-4">
      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-bold text-slate-950 dark:text-white">{title}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>
      </div>
    </div>
  )
}

function FooterGroup({ title, links }) {
  return (
    <div>
      <h3 className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{title}</h3>
      <div className="mt-4 grid gap-3">
        {links.map(([label, href]) => (
          <a key={`${title}-${label}`} href={href} className="text-sm font-semibold text-slate-700 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-white">
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}
