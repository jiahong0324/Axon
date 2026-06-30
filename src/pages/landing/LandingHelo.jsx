import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Calendar, CheckSquare, Clock, BookOpen, Settings, LayoutDashboard, ChevronRight, User, Bell } from 'lucide-react'

// --- Mock Data ---
const MOCK_DATA = {
  timetable: [
    { time: '09:00 AM', subject: 'Software Engineering', room: 'Block A, 204' },
    { time: '11:00 AM', subject: 'Database Systems', room: 'Lab 3' },
    { time: '02:00 PM', subject: 'Web Development', room: 'Block B, 102' }
  ],
  exams: [
    { subject: 'Artificial Intelligence', date: 'Jul 15, 2026', time: '10:00 AM', daysLeft: 15 },
    { subject: 'Data Structures', date: 'Jul 20, 2026', time: '02:00 PM', daysLeft: 20 },
  ],
  assignments: [
    { title: 'React UI Implementation', subject: 'Web Development', status: 'In Progress', due: 'Tomorrow' },
    { title: 'Database Normalization', subject: 'Database Systems', status: 'Pending', due: 'In 3 days' },
  ],
  settings: {
    name: 'Student',
    email: 'student@example.com',
    notifications: true,
    theme: 'Dark Mode'
  }
}

// --- Feature Mockups ---
const HomeMockup = () => (
  <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-b-[2rem] overflow-hidden p-6 gap-6">
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Welcome back 👋</h2>
        <p className="text-slate-500 dark:text-slate-400">Here's an overview of your day.</p>
      </div>
      <div className="h-12 w-12 rounded-full bg-theme-100 dark:bg-theme-900 flex items-center justify-center text-theme-600 dark:text-theme-400">
        <User className="w-6 h-6" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col gap-2">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Calendar className="w-5 h-5" />
        </div>
        <span className="font-semibold text-slate-700 dark:text-slate-200">3 Classes Today</span>
      </div>
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col gap-2">
        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <Clock className="w-5 h-5" />
        </div>
        <span className="font-semibold text-slate-700 dark:text-slate-200">2 Exams Soon</span>
      </div>
    </div>
    <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-4">
      <h3 className="font-bold text-slate-800 dark:text-white mb-4">Recent Activity</h3>
      <div className="flex flex-col gap-3">
        <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-700/50 animate-pulse"></div>
        <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-700/50 animate-pulse"></div>
      </div>
    </div>
  </div>
)

const TimetableMockup = () => (
  <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-b-[2rem] overflow-hidden p-6 gap-4">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
        <Calendar className="w-5 h-5" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Today's Schedule</h2>
    </div>
    <div className="flex flex-col gap-4">
      {MOCK_DATA.timetable.map((item, i) => (
        <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex flex-col items-center justify-center pr-4 border-r border-slate-100 dark:border-slate-700">
            <span className="text-sm font-bold text-theme-600 dark:text-theme-400">{item.time.split(' ')[0]}</span>
            <span className="text-xs text-slate-400">{item.time.split(' ')[1]}</span>
          </div>
          <div className="flex flex-col justify-center">
            <h4 className="font-bold text-slate-800 dark:text-slate-100">{item.subject}</h4>
            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              {item.room}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
)

const ExamMockup = () => (
  <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-b-[2rem] overflow-hidden p-6 gap-4">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
        <Clock className="w-5 h-5" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Upcoming Exams</h2>
    </div>
    <div className="grid gap-4">
      {MOCK_DATA.exams.map((exam, i) => (
        <div key={i} className="relative p-5 rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 shadow-md border border-slate-200/50 dark:border-slate-700 overflow-hidden">
          <div className="absolute top-0 right-0 p-3 bg-rose-500 text-white rounded-bl-2xl font-bold text-sm shadow-sm">
            {exam.daysLeft} days left
          </div>
          <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2 pr-20">{exam.subject}</h3>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {exam.date}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {exam.time}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)

const AssignmentMockup = () => (
  <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-b-[2rem] overflow-hidden p-6 gap-4">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
        <CheckSquare className="w-5 h-5" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Assignments</h2>
    </div>
    <div className="flex flex-col gap-3">
      {MOCK_DATA.assignments.map((task, i) => (
        <div key={i} className="p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm border-l-4 border-emerald-500 flex items-center justify-between group">
          <div className="flex flex-col">
            <h4 className="font-bold text-slate-800 dark:text-slate-100">{task.title}</h4>
            <span className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wide">{task.subject}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs px-2 py-1 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-bold">
              {task.due}
            </span>
            <span className="text-xs text-slate-400">{task.status}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)

const SettingsMockup = () => (
  <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-b-[2rem] overflow-hidden p-6 gap-6">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
        <Settings className="w-5 h-5" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Settings</h2>
    </div>
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm">
      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-theme-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
        {MOCK_DATA.settings.name[0]}
      </div>
      <div>
        <h3 className="font-bold text-lg text-slate-800 dark:text-white">{MOCK_DATA.settings.name}</h3>
        <p className="text-sm text-slate-500">{MOCK_DATA.settings.email}</p>
      </div>
    </div>
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-700/50">
      <div className="p-4 flex items-center justify-between">
        <span className="font-medium flex items-center gap-2 dark:text-slate-200"><Bell className="w-4 h-4 text-slate-400" /> Notifications</span>
        <div className="w-10 h-6 bg-theme-500 rounded-full relative">
          <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full shadow-sm"></div>
        </div>
      </div>
      <div className="p-4 flex items-center justify-between">
        <span className="font-medium flex items-center gap-2 dark:text-slate-200"><Settings className="w-4 h-4 text-slate-400" /> Theme</span>
        <span className="text-sm text-slate-500">{MOCK_DATA.settings.theme}</span>
      </div>
    </div>
  </div>
)

export default function LandingHelo() {
  const containerRef = useRef(null)
  
  // Create a scroll sequence over a 500vh container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })

  // Feature Title Transformations
  // 0-0.2: Home, 0.2-0.4: Timetable, 0.4-0.6: Exam, 0.6-0.8: Assignment, 0.8-1.0: Setting
  
  const titleText = useTransform(scrollYProgress, 
    [0, 0.15, 0.2, 0.35, 0.4, 0.55, 0.6, 0.75, 0.8, 1],
    [
      "Your intelligent dashboard.", "Your intelligent dashboard.",
      "Never miss a class.", "Never miss a class.",
      "Ace your exams.", "Ace your exams.",
      "Stay on top of assignments.", "Stay on top of assignments.",
      "Personalize your experience.", "Personalize your experience."
    ]
  )

  const titleDescription = useTransform(scrollYProgress,
    [0, 0.15, 0.2, 0.35, 0.4, 0.55, 0.6, 0.75, 0.8, 1],
    [
      "Get a quick overview of your day, all in one place.", "Get a quick overview of your day, all in one place.",
      "Beautiful, easy-to-read timetable management.", "Beautiful, easy-to-read timetable management.",
      "Track your upcoming exams with integrated countdowns.", "Track your upcoming exams with integrated countdowns.",
      "Organize tasks and deadlines effortlessly.", "Organize tasks and deadlines effortlessly.",
      "Customize Axon to work exactly how you want it to.", "Customize Axon to work exactly how you want it to."
    ]
  )

  // Opacity controls for cross-fading mockups
  const oHome = useTransform(scrollYProgress, [0, 0.18, 0.22], [1, 1, 0])
  const oTimetable = useTransform(scrollYProgress, [0.18, 0.22, 0.38, 0.42], [0, 1, 1, 0])
  const oExam = useTransform(scrollYProgress, [0.38, 0.42, 0.58, 0.62], [0, 1, 1, 0])
  const oAssignment = useTransform(scrollYProgress, [0.58, 0.62, 0.78, 0.82], [0, 1, 1, 0])
  const oSetting = useTransform(scrollYProgress, [0.78, 0.82, 1], [0, 1, 1])

  // Scale and Y translation for a slight pop-in effect on scroll
  const scaleEffect = useTransform(scrollYProgress, 
    [0, 0.18, 0.2, 0.22, 0.38, 0.4, 0.42, 0.58, 0.6, 0.62, 0.78, 0.8, 0.82, 1],
    [1, 1, 0.95, 1, 1, 0.95, 1, 1, 0.95, 1, 1, 0.95, 1, 1]
  )

  return (
    <div ref={containerRef} className="h-[500vh] relative bg-slate-900">
      
      {/* Sticky Container - this stays on screen while user scrolls through 500vh */}
      <div className="sticky top-0 h-[100dvh] w-full flex flex-col items-center justify-center overflow-hidden">
        
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 bg-slate-950 pointer-events-none z-0">
          <motion.div 
            className="absolute -top-1/2 -left-1/2 w-full h-full bg-theme-600/20 blur-[120px] rounded-full"
            style={{ 
              x: useTransform(scrollYProgress, [0, 1], ['0%', '50%']),
              y: useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
            }}
          />
          <motion.div 
            className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-indigo-600/20 blur-[120px] rounded-full"
            style={{ 
              x: useTransform(scrollYProgress, [0, 1], ['0%', '-50%']),
              y: useTransform(scrollYProgress, [0, 1], ['0%', '-20%'])
            }}
          />
        </div>

        {/* Content Wrapper */}
        <div className="relative z-10 max-w-6xl w-full px-6 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 h-full py-20">
          
          {/* Text Side */}
          <div className="flex-1 text-center lg:text-left space-y-6 lg:max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-4 min-h-[140px] lg:min-h-[180px] flex items-end pb-2">
                <motion.span>{titleText}</motion.span>
              </h1>
              <motion.p className="text-lg text-slate-400 font-medium leading-relaxed min-h-[80px]">
                {titleDescription}
              </motion.p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="hidden lg:flex items-center gap-2 text-theme-400 text-sm font-bold uppercase tracking-widest mt-12"
            >
              <div className="w-8 h-[2px] bg-theme-500"></div>
              Keep scrolling to explore
            </motion.div>
          </div>

          {/* Device Mockup Side */}
          <div className="flex-1 w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[420px] mx-auto relative lg:perspective-[1000px]">
            <motion.div 
              className="relative w-full aspect-[9/19] max-h-[75vh] lg:max-h-none rounded-[2.5rem] border-[8px] border-slate-800 bg-black shadow-2xl overflow-hidden flex flex-col"
              style={{ scale: scaleEffect, rotateY: -5, rotateX: 5 }}
            >
              {/* Fake Device Notch */}
              <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-50 pointer-events-none">
                <div className="w-[120px] h-full bg-slate-800 rounded-b-[1rem]"></div>
              </div>

              {/* App Header (Shared) */}
              <div className="pt-8 pb-4 px-6 bg-white dark:bg-slate-950 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 relative z-20 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-theme-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold font-heading">A</span>
                  </div>
                  <span className="font-heading font-bold text-slate-900 dark:text-white tracking-tight">Axon</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                </div>
              </div>

              {/* Dynamic Content Layers inside device */}
              <div className="relative flex-1 w-full bg-slate-950 rounded-b-[2rem] overflow-hidden">
                
                {/* 1. Home Mockup */}
                <motion.div className="absolute inset-0 z-10" style={{ opacity: oHome }}>
                  <HomeMockup />
                </motion.div>

                {/* 2. Timetable Mockup */}
                <motion.div className="absolute inset-0 z-10" style={{ opacity: oTimetable }}>
                  <TimetableMockup />
                </motion.div>

                {/* 3. Exam Mockup */}
                <motion.div className="absolute inset-0 z-10" style={{ opacity: oExam }}>
                  <ExamMockup />
                </motion.div>

                {/* 4. Assignment Mockup */}
                <motion.div className="absolute inset-0 z-10" style={{ opacity: oAssignment }}>
                  <AssignmentMockup />
                </motion.div>

                {/* 5. Setting Mockup */}
                <motion.div className="absolute inset-0 z-10" style={{ opacity: oSetting }}>
                  <SettingsMockup />
                </motion.div>
                
              </div>
            </motion.div>
            
            {/* Scroll Indicator Mobile */}
            <motion.div 
              className="lg:hidden absolute -bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400"
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <span className="text-xs font-bold uppercase tracking-widest">Scroll</span>
              <div className="w-[1px] h-8 bg-gradient-to-b from-slate-400 to-transparent"></div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  )
}
