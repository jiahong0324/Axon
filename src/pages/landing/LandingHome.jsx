import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

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

export default function LandingHome() {
  const { hasSession } = useOutletContext()

  return (
    <>
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

      <section className="mx-auto max-w-7xl px-5 pt-16 md:px-8">
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
    </>
  )
}
