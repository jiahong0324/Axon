import { useState } from 'react'
import { Calendar, CheckCircle, Target, Sparkles, LayoutDashboard, Play, Pause, ShieldCheck, Check, Clock, BookOpen, AlertCircle, Dumbbell } from 'lucide-react'

const TABS = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, url: 'axon-app.com/home' },
  { id: 'timetable', label: 'Smart Timetable', icon: Calendar, url: 'axon-app.com/timetable' },
  { id: 'assignments', label: 'Coursework Tracker', icon: CheckCircle, url: 'axon-app.com/assignments' },
  { id: 'exams', label: 'Exam Countdown', icon: Target, url: 'axon-app.com/exams' },
  { id: 'ai', label: 'AI Study Helper', icon: Sparkles, url: 'axon-app.com/ai-helper' }
]

export default function LandingShowcase() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [videoProgress, setVideoProgress] = useState(35)

  return (
    <section className="relative mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-theme-200 bg-theme-50 px-4 py-1.5 text-xs font-bold text-theme-700 dark:border-theme-500/20 dark:bg-theme-500/10 dark:text-theme-300">
          <Sparkles className="h-3.5 w-3.5" /> Real Product Screenshots &amp; Interactive Tour
        </span>
        <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
          Designed specifically for how students actually work.
        </h2>
        <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
          Explore the exact interfaces built to keep your courses, assignments, exams, and AI study workflows organized in one single tab.
        </p>

        {/* Video Walkthrough Trigger */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setShowVideoModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-theme-600 text-white shadow-sm">
              <Play className="h-3 w-3 fill-current ml-0.5" />
            </span>
            Watch 90-sec Walkthrough Video
          </button>
        </div>
      </div>

      {/* Feature Selector Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all ${
                isActive
                  ? 'bg-theme-600 text-white shadow-lg shadow-theme-600/30 scale-105'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Browser Window Mockup Frame */}
      <div className="rounded-3xl border border-slate-200 bg-white p-2.5 sm:p-4 shadow-2xl shadow-slate-300/70 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/50 transition-all">
        {/* Browser Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 px-2 sm:px-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-400 inline-block" />
            <span className="h-3 w-3 rounded-full bg-amber-400 inline-block" />
            <span className="h-3 w-3 rounded-full bg-emerald-400 inline-block" />
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-white/5 px-4 py-1 text-xs font-mono font-medium text-slate-600 dark:text-slate-400 max-w-xs truncate">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            https://{TABS.find(t => t.id === activeTab)?.url}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="hidden sm:inline-flex items-center gap-1 rounded bg-theme-50 dark:bg-theme-500/10 text-theme-600 dark:text-theme-400 px-2 py-0.5 text-[11px] font-bold">
              Live Mockup
            </span>
          </div>
        </div>

        {/* Tab Content Preview */}
        <div className="min-h-[460px] rounded-2xl bg-slate-50 dark:bg-slate-950/80 p-4 sm:p-6 border border-slate-200/80 dark:border-white/5">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Header inside Dashboard */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
                <div>
                  <h3 className="font-heading text-2xl font-black text-slate-950 dark:text-white">Good morning, Alex 👋</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Bachelor of Science in Computer Science &bull; Year 2</p>
                </div>
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Semester On Track &bull; 94% Completion
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 border-l-4 border-l-theme-500 dark:border-white/10 bg-white dark:bg-slate-900 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Today&apos;s Classes</p>
                    <BookOpen className="h-4 w-4 text-theme-500" />
                  </div>
                  <p className="mt-2 font-heading text-2xl font-extrabold text-theme-600 dark:text-theme-400">3</p>
                </div>
                <div className="rounded-xl border border-slate-200 border-l-4 border-l-yellow-500 dark:border-white/10 bg-white dark:bg-slate-900 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Due Soon</p>
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="mt-2 font-heading text-2xl font-extrabold text-amber-600 dark:text-yellow-400">4</p>
                </div>
                <div className="rounded-xl border border-slate-200 border-l-4 border-l-purple-500 dark:border-white/10 bg-white dark:bg-slate-900 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Days to Next Exam</p>
                    <Calendar className="h-4 w-4 text-purple-500" />
                  </div>
                  <p className="mt-2 font-heading text-2xl font-extrabold text-violet-600 dark:text-purple-400">7d</p>
                </div>
                <div className="rounded-xl border border-slate-200 border-l-4 border-l-orange-500 dark:border-white/10 bg-white dark:bg-slate-900 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Current Streak</p>
                    <Dumbbell className="h-4 w-4 text-orange-500" />
                  </div>
                  <p className="mt-2 font-heading text-2xl font-extrabold text-orange-600 dark:text-orange-400">12 🔥</p>
                </div>
              </div>

              {/* Today's Schedule & Urgent Tasks */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Clock className="h-4 w-4 text-theme-500" /> Today&apos;s Lecture Schedule
                    </h4>
                    <span className="text-xs font-semibold text-slate-400">Wednesday</span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-theme-50/70 dark:bg-theme-500/10 border border-theme-200/50 dark:border-theme-500/20">
                      <div>
                        <p className="text-xs font-bold text-theme-900 dark:text-theme-200">CS203: Data Structures</p>
                        <p className="text-[11px] text-theme-700 dark:text-theme-300">Lecture Hall 2 &bull; Prof. Davis</p>
                      </div>
                      <span className="rounded-lg bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-mono font-bold text-theme-700 dark:text-theme-300 shadow-sm">
                        09:00 - 10:30
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">MATH201: Multivariable Calculus</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Seminar Room 401 &bull; Dr. Jensen</p>
                      </div>
                      <span className="rounded-lg bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                        11:30 - 13:00
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">CS210: Networks Practical Lab</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Computing Lab 3 &bull; Hands-on Wireshark</p>
                      </div>
                      <span className="rounded-lg bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                        14:30 - 16:30
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deadlines & AI Action */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500" /> Urgent Submission
                      </h4>
                      <span className="rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 px-2 py-0.5 text-[11px] font-bold">
                        Due in 28 hrs
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Operating Systems: Kernel Memory Allocation</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Submit C implementation and benchmark report to university portal.</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full w-[75%]" />
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">75% done</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10 p-4">
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" /> AI Study Prompt Recommendation
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                      &ldquo;You have an Algorithms exam in 5 days. Would you like a 20-minute practice quiz on Dynamic Programming?&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timetable' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <div>
                  <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">Weekly Class Timetable</h3>
                  <p className="text-xs text-slate-500">Color-coded by subject with location &amp; lecturer sync</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-theme-600 text-white text-xs font-bold px-3 py-1">Week View</span>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400 pb-1">
                <div>Monday</div>
                <div>Tuesday</div>
                <div className="text-theme-600 dark:text-theme-400">Wednesday (Today)</div>
                <div>Thursday</div>
                <div>Friday</div>
              </div>
              <div className="grid grid-cols-5 gap-2 text-xs">
                {/* Mon */}
                <div className="space-y-2">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/15 p-2.5 text-left">
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">09:00 - 10:30</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-1">Data Structures</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Hall A</p>
                  </div>
                  <div className="rounded-xl border border-purple-200 bg-purple-50 dark:border-purple-500/30 dark:bg-purple-500/15 p-2.5 text-left">
                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">13:00 - 14:30</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-1">Linear Algebra</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Room 204</p>
                  </div>
                </div>
                {/* Tue */}
                <div className="space-y-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/15 p-2.5 text-left">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">10:00 - 12:00</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-1">Operating Systems</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">LT-2</p>
                  </div>
                </div>
                {/* Wed */}
                <div className="space-y-2">
                  <div className="rounded-xl border-2 border-theme-500 bg-theme-50 dark:border-theme-400 dark:bg-theme-500/20 p-2.5 text-left shadow-sm">
                    <span className="text-[10px] font-bold text-theme-700 dark:text-theme-300">09:00 - 10:30</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-1">Data Structures</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Hall 2</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/15 p-2.5 text-left">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">14:30 - 16:30</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-1">Networks Lab</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Lab 3</p>
                  </div>
                </div>
                {/* Thu */}
                <div className="space-y-2">
                  <div className="rounded-xl border border-purple-200 bg-purple-50 dark:border-purple-500/30 dark:bg-purple-500/15 p-2.5 text-left">
                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">11:00 - 12:30</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-1">Discrete Math</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Auditorium</p>
                  </div>
                </div>
                {/* Fri */}
                <div className="space-y-2">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/15 p-2.5 text-left">
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">13:00 - 15:00</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-1">Software Project</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Studio 4</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <div>
                  <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">Active Assignments &amp; Coursework</h3>
                  <p className="text-xs text-slate-500">Track deadlines, priority weights, and submission status</p>
                </div>
                <span className="rounded-full bg-slate-200 dark:bg-white/10 px-3 py-1 text-xs font-bold">3 Pending</span>
              </div>
              <div className="space-y-2.5">
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-md bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 px-2 py-0.5 text-xs font-bold">
                        High Priority
                      </span>
                      <span className="text-xs font-semibold text-slate-400">CS210 Operating Systems</span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white">Custom Virtual Memory Manager in C</p>
                    <p className="text-xs text-slate-500 mt-0.5">Due Oct 18, 2026 &bull; Worth 35% of overall grade</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 px-3 py-1 text-xs font-bold">
                      In Progress
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-md bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 px-2 py-0.5 text-xs font-bold">
                        Medium Priority
                      </span>
                      <span className="text-xs font-semibold text-slate-400">MATH201 Multivariable</span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white">Stokes Theorem &amp; Vector Fields Problem Set</p>
                    <p className="text-xs text-slate-500 mt-0.5">Due Oct 24, 2026 &bull; Worth 20% of overall grade</p>
                  </div>
                  <span className="rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 px-3 py-1 text-xs font-bold">
                    Not Started
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 px-2 py-0.5 text-xs font-bold">
                        Completed
                      </span>
                      <span className="text-xs font-semibold text-slate-400">CS203 Data Structures</span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white">Red-Black Tree Self-Balancing Implementation</p>
                    <p className="text-xs text-slate-500 mt-0.5">Submitted &bull; Grade: 98/100 (A+)</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="h-4 w-4" /> Submitted
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <div>
                  <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">Upcoming Examinations</h3>
                  <p className="text-xs text-slate-500">Live countdown, seating numbers, venues, and revision checklists</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border-2 border-rose-500/40 bg-white dark:bg-slate-900 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Algorithms &amp; Complexity</span>
                    <span className="rounded-full bg-rose-500 text-white px-2 py-0.5 text-[10px] font-extrabold">
                      5 DAYS
                    </span>
                  </div>
                  <p className="mt-3 font-heading text-xl font-black text-slate-900 dark:text-white">Midterm Exam</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Sports Hall &bull; Desk B-14</p>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold">
                    <span>Syllabus Mastered</span>
                    <span className="text-emerald-600 font-bold">9 / 12 Topics</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Operating Systems</span>
                    <span className="rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-extrabold">
                      12 DAYS
                    </span>
                  </div>
                  <p className="mt-3 font-heading text-xl font-black text-slate-900 dark:text-white">Written Paper</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Science Hall A &bull; Desk 88</p>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold">
                    <span>Syllabus Mastered</span>
                    <span className="text-amber-600 font-bold">5 / 10 Topics</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Discrete Mathematics</span>
                    <span className="rounded-full bg-blue-500 text-white px-2 py-0.5 text-[10px] font-extrabold">
                      19 DAYS
                    </span>
                  </div>
                  <p className="mt-3 font-heading text-xl font-black text-slate-900 dark:text-white">Final Exam</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Exam Center &bull; Desk 112</p>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold">
                    <span>Syllabus Mastered</span>
                    <span className="text-blue-600 font-bold">4 / 8 Topics</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-heading text-sm font-bold text-slate-900 dark:text-white">AI Study Assistant</h3>
                    <p className="text-[11px] text-slate-500">24/7 personalized tutor &bull; Strict zero-data-retention training policy</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-bold">
                  Ready
                </span>
              </div>

              {/* Chat Thread */}
              <div className="space-y-3 max-w-2xl mx-auto">
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-sm bg-theme-600 px-4 py-2.5 text-xs leading-5 text-white max-w-md shadow-sm">
                    Can you explain the difference between a Mutex and a Semaphore using a simple student analogy?
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white text-xs font-bold">
                    AI
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-4 py-3 text-xs leading-relaxed text-slate-800 dark:text-slate-200 shadow-sm max-w-lg">
                    <p className="font-bold mb-1 text-slate-950 dark:text-white">Here is the campus library analogy:</p>
                    <p className="mb-2">
                      &bull; <strong>Mutex (Mutual Exclusion):</strong> Think of a single private study room with one key. Only one student can hold the key and enter at a time. When they leave, they hand the key to the next person.
                    </p>
                    <p>
                      &bull; <strong>Semaphore:</strong> Think of a computer lab with 10 available workstations. A counter tracks how many seats are left. As long as the count is greater than zero, students can walk in. Once all 10 are occupied, newcomers must wait outside until someone finishes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Suggested action pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  💡 Generate 5 practice questions
                </span>
                <span className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  📝 Summarize lecture transcript
                </span>
                <span className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  ⚡ Build 20-min revision schedule
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Walkthrough Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-4xl rounded-3xl border border-white/20 bg-slate-950 p-6 text-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
                <h3 className="font-heading text-lg font-bold">Axon Platform Walkthrough (Interactive Preview)</h3>
              </div>
              <button
                onClick={() => setShowVideoModal(false)}
                className="rounded-xl bg-white/10 px-3 py-1 text-sm font-bold hover:bg-white/20 transition"
              >
                Close ✕
              </button>
            </div>

            {/* Simulated Video Player Screen */}
            <div className="relative aspect-video w-full rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 flex flex-col items-center justify-center p-6 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_70%)]" />
              
              <div className="relative z-10 text-center max-w-lg">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-theme-600 text-white shadow-lg shadow-theme-600/40">
                  {isPlaying ? <Play className="h-8 w-8 fill-current ml-1" /> : <Pause className="h-8 w-8" />}
                </div>
                <h4 className="font-heading text-xl font-bold">Full Tour: Timetables, Coursework &amp; AI Helper</h4>
                <p className="mt-2 text-xs text-slate-400">
                  Showing cloud synchronization across mobile and desktop devices.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">0:15 Smart Timetable</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">0:45 Priority Deadlines</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">1:15 Exam Countdowns</span>
                </div>
              </div>

              {/* Player Timeline Bar */}
              <div className="absolute bottom-4 inset-x-6">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-mono">
                  <span>0:32</span>
                  <span>1:30</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden cursor-pointer">
                  <div className="h-full bg-theme-500 rounded-full w-[35%]" />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <p>Tip: Click &ldquo;Try as guest&rdquo; on the homepage to explore the real interactive app immediately without signup.</p>
              <button
                onClick={() => {
                  setShowVideoModal(false)
                  const guestBtn = document.getElementById('guest-demo-btn') || document.getElementById('hero-guest-btn')
                  if (guestBtn) {
                    guestBtn.click()
                  } else {
                    window.location.href = '/login?guest=true'
                  }
                }}
                className="font-bold text-theme-400 hover:underline"
              >
                Launch Guest Demo Now &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
