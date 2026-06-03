import { Calendar, CheckCircle, Target, Sparkles, Bell, BookOpen } from 'lucide-react'
import { SectionIntro } from './LandingShared'

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

export default function LandingFeatures() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
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
    </>
  )
}
