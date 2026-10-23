import { Star, Award } from 'lucide-react'

const TESTIMONIALS = [
  {
    name: 'Marcus Chen',
    role: 'Computer Science, Year 2',
    university: 'National University of Singapore',
    avatar: 'MC',
    avatarBg: 'bg-blue-600',
    quote: 'Axon completely replaced my chaotic mess of Google Calendar, Notion, and sticky notes. The assignment priority tracker and timetable sync saved my semester during finals week.',
    highlight: 'Saved 4+ hours every week',
    rating: 5
  },
  {
    name: 'Emily Watson',
    role: 'Law (LLB), Year 1',
    university: 'University College London',
    avatar: 'EW',
    avatarBg: 'bg-emerald-600',
    quote: 'With 8 massive coursework deadlines per term, Axon’s priority deadline tracker and automated reminders saved my sanity. I haven’t missed a single submission since day one.',
    highlight: 'Zero missed deadlines',
    rating: 5
  },
  {
    name: 'David Adebayo',
    role: 'Medicine (MBBS), Year 3',
    university: 'University of Melbourne',
    avatar: 'DA',
    avatarBg: 'bg-purple-600',
    quote: 'Exam season used to be pure chaos. Having all my exam venues, countdowns, and notes grouped together keeps me focused on studying instead of stressing about logistics.',
    highlight: 'Essential for exam season',
    rating: 5
  },
  {
    name: 'Sophia Lin',
    role: 'Business & Analytics, Year 4',
    university: 'UC Berkeley',
    avatar: 'SL',
    avatarBg: 'bg-amber-600',
    quote: 'The clean dark mode and instant cloud sync across my iPad and laptop are unmatched. The guest demo let me try it in 3 seconds without a credit card or signup.',
    highlight: 'Seamless multi-device sync',
    rating: 5
  }
]

export default function LandingTestimonials() {
  return (
    <section className="border-t border-slate-200 bg-slate-100/60 dark:border-white/10 dark:bg-slate-900/40 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-theme-200 bg-theme-50 px-4 py-1.5 text-xs font-bold text-theme-700 dark:border-theme-500/20 dark:bg-theme-500/10 dark:text-theme-300 mb-3">
            <Award className="h-3.5 w-3.5" /> Student Reviews &amp; Testimonials
          </div>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Loved by students from universities worldwide.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
            See how undergraduates and postgraduates use Axon to eliminate academic clutter and elevate their grades.
          </p>

          {/* Aggregate Rating Banner */}
          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-3 shadow-sm dark:border-white/10 dark:bg-slate-950">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <span className="font-heading font-extrabold text-slate-900 dark:text-white text-sm">
              4.9 / 5.0 Rating
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              From 2,500+ active student reviews
            </span>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="rounded-full bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {t.highlight}
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-700 dark:text-slate-300 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white text-xs ${t.avatarBg}`}>
                  {t.avatar}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-950 dark:text-white truncate">
                    {t.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {t.role}
                  </p>
                  <p className="text-[11px] font-medium text-theme-600 dark:text-theme-400 truncate">
                    {t.university}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Stats Bar */}
        <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900 grid gap-6 sm:grid-cols-3 text-center">
          <div>
            <p className="font-heading text-3xl font-black text-theme-600 dark:text-theme-400">98%</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">On-Time Assignment Submissions</p>
          </div>
          <div>
            <p className="font-heading text-3xl font-black text-emerald-600 dark:text-emerald-400">3.2 hrs</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Saved Per Week On Planning</p>
          </div>
          <div>
            <p className="font-heading text-3xl font-black text-purple-600 dark:text-purple-400">50,000+</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Study Sessions &amp; Exams Organized</p>
          </div>
        </div>
      </div>
    </section>
  )
}
