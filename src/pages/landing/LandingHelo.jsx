import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { Calendar, CheckSquare, Clock, LayoutDashboard, ChevronRight, User, Bell, Activity, Sparkles, Brain, GraduationCap, BarChart, Settings, BookOpen, AlertTriangle, ShieldCheck, Zap } from 'lucide-react'

// --- Reusable Glass Panel ---
const GlassPanel = ({ children, className = "" }) => (
  <div className={`backdrop-blur-xl bg-white/10 dark:bg-black/30 border border-white/20 shadow-2xl rounded-3xl overflow-hidden ${className}`}>
    {children}
  </div>
)

// --- Scene 1: The Ecosystem (0 - 0.07) ---
const EcosystemScene = ({ progress }) => {
  const opacity = useTransform(progress, [0, 0.04, 0.06], [1, 1, 0])
  const scale = useTransform(progress, [0, 0.06], [1, 2.5])
  const rotateCore = useTransform(progress, [0, 0.06], [0, 90])
  const counterRotateCore = useTransform(rotateCore, v => -v)
  const solarY = useTransform(progress, [0, 0.06], ['10vh', '-5vh'])
  
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none overflow-hidden will-change-transform" style={{ opacity }}>
      
      <motion.div className="absolute top-12 md:top-24 z-50 text-center px-4" style={{ opacity: useTransform(progress, [0, 0.03], [1, 0]) }}>
         <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[1.1] drop-shadow-2xl mb-4">
            The Ultimate <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-lg">Ecosystem.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 font-medium max-w-2xl mx-auto">
            A universe of intelligent tools, orbiting around your success.
          </p>
      </motion.div>

      {/* The 3D Solar System */}
      <motion.div className="relative w-full h-full flex items-center justify-center will-change-transform" style={{ scale, y: solarY }}>
        
        {/* Core Frame (provides isometric tilt) */}
        <div className="relative w-[800px] h-[800px] flex items-center justify-center perspective-[2000px]">
          
          {/* Tilted System */}
          <motion.div 
            className="relative w-full h-full flex items-center justify-center will-change-transform" 
            style={{ rotateX: 60, rotateZ: rotateCore, transformStyle: "preserve-3d" }}
          >
            
            {/* Inner Orbit */}
            <div className="absolute w-[300px] h-[300px] rounded-full border-2 border-blue-500/30 border-dashed animate-[spin_15s_linear_infinite]" style={{ transformStyle: "preserve-3d" }}>
              
              {/* Timetable Planet */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="animate-[spin_15s_linear_infinite_reverse]">
                  <motion.div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center border border-white/20 shadow-xl" style={{ rotateX: -60, rotateZ: counterRotateCore }}>
                    <Calendar className="w-8 h-8 text-white" />
                  </motion.div>
                </div>
              </div>
              
              {/* Assignments Planet */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                <div className="animate-[spin_15s_linear_infinite_reverse]">
                  <motion.div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center border border-white/20 shadow-xl" style={{ rotateX: -60, rotateZ: counterRotateCore }}>
                    <CheckSquare className="w-8 h-8 text-white" />
                  </motion.div>
                </div>
              </div>

            </div>

            {/* Outer Orbit */}
            <div className="absolute w-[500px] h-[500px] rounded-full border border-purple-500/30 animate-[spin_25s_linear_infinite_reverse]" style={{ transformStyle: "preserve-3d" }}>
              
              {/* AI Chat Planet */}
              <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="animate-[spin_25s_linear_infinite]">
                  <motion.div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center border border-white/20 shadow-xl" style={{ rotateX: -60, rotateZ: counterRotateCore }}>
                    <Brain className="w-10 h-10 text-white" />
                  </motion.div>
                </div>
              </div>
              
              {/* Exams Planet */}
              <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2">
                <div className="animate-[spin_25s_linear_infinite]">
                  <motion.div className="w-20 h-20 rounded-full bg-rose-500 flex items-center justify-center border border-white/20 shadow-xl" style={{ rotateX: -60, rotateZ: counterRotateCore }}>
                    <GraduationCap className="w-10 h-10 text-white" />
                  </motion.div>
                </div>
              </div>

            </div>

            {/* Central Axon Core */}
            <motion.div 
              className="absolute w-32 h-32 rounded-full bg-gradient-to-tr from-theme-500 to-purple-600 shadow-2xl flex flex-col items-center justify-center border-4 border-white/20"
              style={{ rotateX: -60, rotateZ: counterRotateCore }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <img src="/icons/logo.png" className="w-12 h-12 rounded-xl mb-1 shadow-md" alt="Axon" />
              <span className="text-white font-black text-xl tracking-tight leading-none">Axon</span>
            </motion.div>

          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// --- Scene 2: Timetable Waterfall (0.07 - 0.14) ---
const WaterfallScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.07, 0.09, 0.13, 0.14], [0, 1, 1, 0])

  const classes = [
    { time: "08:00 AM", name: "Data Structures", room: "Block A", color: "from-blue-500 to-cyan-500", delay: 0 },
    { time: "10:30 AM", name: "Software Engineering", room: "Lab 2", color: "from-purple-500 to-indigo-500", delay: 0.01 },
    { time: "01:00 PM", name: "Discrete Math", room: "Hall C", color: "from-rose-500 to-orange-500", delay: 0.02 },
    { time: "03:00 PM", name: "AI Fundamentals", room: "Block B", color: "from-emerald-500 to-teal-500", delay: 0.03 },
    { time: "05:30 PM", name: "Project Sync", room: "Online", color: "from-slate-700 to-slate-900", delay: 0.04 },
  ]

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center z-40 pointer-events-none pt-8 md:pt-16 pb-8 overflow-hidden" style={{ opacity }}>
      <div className="text-center z-50 shrink-0 mb-4 md:mb-8">
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight mb-2 md:mb-3 drop-shadow-lg">
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-500 to-purple-600">Perfect Flow.</span>
        </h2>
        <p className="text-base md:text-xl text-slate-600 dark:text-slate-400 font-medium px-4">Your schedule, cascading seamlessly through your day.</p>
      </div>

      <motion.div className="w-full max-w-5xl flex flex-col justify-center gap-3 md:gap-5 px-4 perspective-1000 flex-1 relative">
        {classes.map((cls, i) => {
          const itemY = useTransform(progress, [0.07 + cls.delay, 0.11 + cls.delay], ['100vh', '0vh'])
          const itemOpacity = useTransform(progress, [0.07 + cls.delay, 0.09 + cls.delay], [0, 1])
          const itemRotateX = useTransform(progress, [0.07 + cls.delay, 0.11 + cls.delay], [45, 0])
          
          // Glow effect when reaching center
          const glowOpacity = useTransform(progress, [0.10, 0.12, 0.13], [0, 1, 0])
          
          return (
            <motion.div 
              key={i} 
              className={`p-6 md:p-8 rounded-3xl bg-gradient-to-r ${cls.color} text-white shadow-2xl flex items-center justify-between border border-white/20 relative overflow-hidden`}
              style={{ y: itemY, opacity: itemOpacity, rotateX: itemRotateX, transformStyle: "preserve-3d" }}
            >
              <motion.div className="absolute inset-0 bg-white/20 blur-2xl z-0" style={{ opacity: glowOpacity }} />

              <div className="flex items-center gap-3 md:gap-6 relative z-10">
                <div className="px-3 md:px-6 py-2 md:py-3 rounded-2xl bg-black/20 backdrop-blur-md text-lg md:text-2xl font-black w-24 md:w-40 text-center shadow-inner">
                  {cls.time}
                </div>
                <div>
                  <h3 className="text-lg md:text-3xl font-bold drop-shadow-md leading-tight">{cls.name}</h3>
                  <p className="text-white/90 font-medium text-sm md:text-lg mt-1 flex items-center gap-1 md:gap-2">
                    <Calendar className="w-3 h-3 md:w-5 md:h-5" /> {cls.room}
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md shadow-lg border border-white/30 shrink-0 ml-2 md:ml-4 relative z-10">
                <ChevronRight className="w-5 h-5 md:w-8 md:h-8 text-white" />
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}

// --- Scene 3: Smart Alerts (0.14 - 0.21) ---
const SmartAlertsScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.14, 0.16, 0.20, 0.21], [0, 1, 1, 0])
  const scale = useTransform(progress, [0.14, 0.21], [0.8, 1.1])

  const notifs = [
    { title: "Upcoming Class", desc: "Software Engineering in 15 mins", icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", delay: 0 },
    { title: "Exam Reminder", desc: "Database Systems midterm tomorrow", icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", delay: 0.02 },
    { title: "Attendance Required!", desc: "Enter code: AX-8921 to mark presence", icon: ShieldCheck, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", delay: 0.04 },
  ]

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none px-4" style={{ opacity }}>
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white drop-shadow-lg">
          Never Miss a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-rose-500">Beat.</span>
        </h2>
      </div>

      <motion.div className="w-full max-w-sm h-[500px] md:h-[600px] bg-gradient-to-b from-slate-800 to-slate-950 rounded-[3.5rem] border-[12px] border-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col p-6 pt-16 perspective-1000 ring-1 ring-white/10" style={{ scale, rotateX: 5 }}>
        
        {/* Dynamic Island Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full flex items-center justify-end px-3">
           <div className="w-2.5 h-2.5 rounded-full bg-slate-800/80 mr-1" />
           <div className="w-2.5 h-2.5 rounded-full bg-slate-800/80" />
        </div>

        <div className="flex-1 flex flex-col gap-5 mt-4">
          {notifs.map((n, i) => {
            const slideIn = useTransform(progress, [0.14 + n.delay, 0.16 + n.delay], [-200, 0])
            const op = useTransform(progress, [0.14 + n.delay, 0.16 + n.delay], [0, 1])
            const pop = useTransform(progress, [0.16 + n.delay, 0.17 + n.delay], [1, 1.05])
            const Icon = n.icon
            return (
              <motion.div key={i} className={`w-full bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border ${n.border} shadow-lg flex gap-4 items-center`} style={{ x: slideIn, opacity: op, scale: pop }}>
                <div className={`w-12 h-12 rounded-full ${n.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-6 h-6 ${n.color}`} />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm tracking-wide">{n.title}</h4>
                  <p className="text-slate-400 text-xs mt-0.5">{n.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

// --- Scene 4: AI Chat (0.21 - 0.28) ---
const ChatScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.21, 0.23, 0.27, 0.28], [0, 1, 1, 0])
  const rotateY = useTransform(progress, [0.21, 0.28], [20, -20])
  const rotateX = useTransform(progress, [0.21, 0.28], [10, -5])
  const zShift = useTransform(progress, [0.21, 0.28], [-100, 100])
  
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none perspective-1000 px-4" style={{ opacity }}>
      <div className="absolute w-[800px] h-[800px] bg-gradient-to-r from-theme-600 to-purple-600 rounded-full blur-[120px] opacity-20" />

      <motion.div className="w-full max-w-4xl flex flex-col gap-6 relative z-10" style={{ rotateY, rotateX, z: zShift, transformStyle: "preserve-3d" }}>
        <div className="text-center mb-2" style={{ transform: "translateZ(50px)" }}>
           <div className="inline-flex items-center justify-center p-3 md:p-4 rounded-3xl bg-theme-500/20 text-theme-600 dark:text-theme-400 mb-4 md:mb-6 border border-theme-500/30 backdrop-blur-xl shadow-2xl">
            <Sparkles className="w-8 h-8 md:w-12 md:h-12" />
          </div>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-lg">
            Your Personal <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-500 to-purple-600 drop-shadow-xl">Genius.</span>
          </h2>
        </div>

        <GlassPanel className="w-full bg-slate-900/90 border-slate-700 shadow-[0_40px_100px_rgba(37,99,235,0.3)]" style={{ transform: "translateZ(20px)" }}>
          <div className="p-4 md:p-6 border-b border-slate-800 flex items-center gap-4 bg-black/20">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-tr from-theme-500 to-purple-600 flex items-center justify-center shadow-lg shadow-theme-500/30 border border-white/20 shrink-0">
              <Brain className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">Axon AI</h3>
              <p className="text-theme-400 text-xs md:text-sm font-medium">Always online, always helping.</p>
            </div>
          </div>
          
          <div className="p-6 md:p-8 flex flex-col gap-4 md:gap-6">
            <motion.div 
              className="self-end max-w-[85%] md:max-w-[80%] bg-theme-600 text-white p-4 md:p-5 rounded-3xl rounded-tr-sm text-base md:text-lg shadow-xl border border-white/10"
              style={{ 
                opacity: useTransform(progress, [0.23, 0.24], [0, 1]),
                y: useTransform(progress, [0.23, 0.24], [20, 0]),
                transform: "translateZ(30px)"
              }}
            >
              How should I prepare for tomorrow?
            </motion.div>
            
            <motion.div 
              className="self-start max-w-[85%] md:max-w-[80%] bg-slate-800 text-slate-200 p-4 md:p-5 rounded-3xl rounded-tl-sm text-base md:text-lg leading-relaxed shadow-xl border border-slate-700"
              style={{ 
                opacity: useTransform(progress, [0.25, 0.26], [0, 1]),
                y: useTransform(progress, [0.25, 0.26], [20, 0]),
                transform: "translateZ(40px)"
              }}
            >
              I've analyzed your upcoming exams. Based on your performance, you should focus on Database Normalization tonight. I've created a custom study plan for you!
            </motion.div>
          </div>
        </GlassPanel>
      </motion.div>
    </motion.div>
  )
}

// --- Scene 5: AI Study Plan Generator (0.28 - 0.35) ---
const StudyPlanScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.28, 0.30, 0.34, 0.35], [0, 1, 1, 0])
  
  // Chaotic nodes morphing into a structured grid
  const nodeY1 = useTransform(progress, [0.28, 0.32], [200, 0])
  const nodeX1 = useTransform(progress, [0.28, 0.32], [-200, 0])
  const nodeY2 = useTransform(progress, [0.28, 0.32], [-150, 0])
  const nodeX2 = useTransform(progress, [0.28, 0.32], [250, 0])
  
  const scannerY = useTransform(progress, [0.31, 0.33], ['-10%', '110%'])
  const scannerOpacity = useTransform(progress, [0.31, 0.32, 0.33], [0, 1, 0])

  const calendarOp = useTransform(progress, [0.32, 0.33], [0, 1])
  const chaosOp = useTransform(progress, [0.32, 0.33], [1, 0])

  const planData = [
    { time: "09:00 AM", subject: "Database Sys", topic: "Normalization", color: "bg-cyan-500", shadow: "shadow-cyan-500/50", width: "w-[100%]" },
    { time: "11:00 AM", subject: "Mathematics", topic: "Linear Algebra", color: "bg-purple-500", shadow: "shadow-purple-500/50", width: "w-[80%]" },
    { time: "01:30 PM", subject: "Programming", topic: "React Hooks", color: "bg-emerald-500", shadow: "shadow-emerald-500/50", width: "w-[60%]" },
    { time: "04:00 PM", subject: "Physics Lab", topic: "Quantum Mech", color: "bg-rose-500", shadow: "shadow-rose-500/50", width: "w-[40%]" },
    { time: "05:30 PM", subject: "Quick Review", topic: "Flashcards", color: "bg-amber-500", shadow: "shadow-amber-500/50", width: "w-[20%]" },
    { time: "08:00 PM", subject: "Mock Exam", topic: "Database Sys", color: "bg-blue-500", shadow: "shadow-blue-500/50", width: "w-[0%]" },
  ];

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none px-4" style={{ opacity }}>
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white drop-shadow-lg">
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">Architect.</span>
        </h2>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mt-2 font-medium">Generate perfect study plans instantly.</p>
      </div>

      <div className="relative w-full max-w-4xl h-64 md:h-96 flex items-center justify-center perspective-1000">
        {/* Chaotic State */}
        <motion.div className="absolute inset-0 flex items-center justify-center" style={{ opacity: chaosOp }}>
          <motion.div className="absolute p-3 bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded-xl blur-[1px] md:blur-[2px]" style={{ x: nodeX1, y: nodeY1 }}>Database Prep</motion.div>
          <motion.div className="absolute p-3 bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold rounded-xl blur-[1px]" style={{ x: nodeX2, y: nodeY2 }}>Read Chapter 4</motion.div>
          <motion.div className="absolute p-3 bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold rounded-xl blur-[2px] md:blur-[3px]" style={{ x: useTransform(progress, [0.28, 0.32], [0, -100]), y: useTransform(progress, [0.28, 0.32], [100, -50]) }}>Mock Exam</motion.div>
        </motion.div>

        {/* The AI Scanner Beam */}
        <motion.div className="absolute left-0 right-0 h-4 bg-gradient-to-b from-transparent via-cyan-400 to-transparent blur-sm z-50 rounded-full" style={{ top: scannerY, opacity: scannerOpacity, boxShadow: '0 0 50px rgba(34,211,238,0.8)' }} />

        {/* Structured Calendar State */}
        <motion.div className="w-full h-full grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4" style={{ opacity: calendarOp, rotateX: 10 }}>
          {planData.map((plan, i) => (
            <div key={i} className="bg-slate-100 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-xl p-3 md:p-4 flex flex-col gap-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(34,211,238,0.05)] transition-all">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">{plan.time}</span>
                <span className={`w-2 h-2 rounded-full ${plan.color} shadow-[0_0_8px] ${plan.shadow}`} />
              </div>
              <h4 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight text-left">{plan.subject}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-left truncate">{plan.topic}</p>
              
              <div className="w-full h-1.5 mt-auto bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                <div className={`h-full ${plan.color} ${plan.width} opacity-80 rounded-full`} />
              </div>
            </div>
          ))}
          
          <motion.div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-cyan-500 text-white px-4 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(34,211,238,0.5)] border border-cyan-300 flex items-center gap-2 text-sm md:text-base">
            <CheckSquare className="w-4 h-4 md:w-5 md:h-5" /> Plan Generated
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}

// --- Scene 6: Matrix (Assignments) (0.35 - 0.42) ---
const MatrixScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.35, 0.37, 0.41, 0.42], [0, 1, 1, 0])
  const scale = useTransform(progress, [0.35, 0.42], [0.8, 1.1])
  const rotateX = useTransform(progress, [0.35, 0.42], [20, -10]) 

  const assignments = [
    { title: "React Architecture", due: "Due Today", stat: "Urgent", color: "from-rose-500 to-red-600" },
    { title: "Database Systems", due: "Due Tomorrow", stat: "Pending", color: "from-amber-400 to-orange-500" },
    { title: "Ethics Essay", due: "Due In 3 Days", stat: "Drafting", color: "from-blue-400 to-indigo-500" },
    { title: "ML Model", due: "Due Next Week", stat: "Testing", color: "from-fuchsia-500 to-purple-600" },
    { title: "UI Design", due: "Due Next Week", stat: "Completed", color: "from-emerald-400 to-teal-500" },
    { title: "Physics Lab", due: "Due Next Month", stat: "Not Started", color: "from-slate-400 to-slate-600" },
  ]

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none px-4 pb-12" style={{ opacity }}>
      <div className="text-center mb-10 md:mb-16">
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-lg leading-tight">
          Crush Every <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500 drop-shadow-xl">Deadline.</span>
        </h2>
      </div>

      <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-6xl" style={{ scale, rotateX, perspective: 1200 }}>
        {assignments.map((item, i) => {
          const flip = useTransform(progress, [0.35 + (i * 0.008), 0.38 + (i * 0.008)], [90, 0])

          return (
            <motion.div 
              key={i} 
              className={`h-32 md:h-40 rounded-3xl bg-gradient-to-br ${item.color} p-4 md:p-6 flex flex-col justify-between text-white shadow-2xl border border-white/30`}
              style={{ rotateX: flip, transformStyle: "preserve-3d" }}
            >
              <div className="flex justify-between items-start">
                <span className="px-3 md:px-4 py-1 rounded-full bg-black/20 backdrop-blur-md text-xs md:text-sm font-bold tracking-wide shadow-inner">
                  {item.stat}
                </span>
                <CheckSquare className="w-5 h-5 md:w-6 md:h-6 text-white/70" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold drop-shadow-md">{item.title}</h3>
                <p className="text-white/80 font-medium text-xs md:text-sm mt-1">{item.due}</p>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}

// --- Scene 7: Exams Countdown (0.42 - 0.50) ---
const ExamsScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.42, 0.44, 0.48, 0.50], [0, 1, 1, 0])
  const ringScale = useTransform(progress, [0.42, 0.50], [0.5, 1.5])
  
  const yLeft = useTransform(progress, [0.42, 0.50], ['50vh', '-50vh'])
  const yRight = useTransform(progress, [0.42, 0.50], ['-50vh', '50vh'])

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none overflow-hidden" style={{ opacity }}>
      {/* Massive Glowing Ring */}
      <motion.div 
        className="absolute w-[600px] md:w-[800px] h-[600px] md:h-[800px] rounded-full border-[10px] md:border-[20px] border-rose-500/30 shadow-[0_0_150px_rgba(244,63,94,0.4)] flex items-center justify-center"
        style={{ scale: ringScale }}
      >
        <div className="w-[90%] h-[90%] rounded-full border-[2px] border-rose-400/50 border-dashed animate-[spin_20s_linear_infinite]" />
      </motion.div>

      <motion.div className="absolute left-10 md:left-32 z-20 hidden md:block" style={{ y: yLeft }}>
        <GlassPanel className="p-6 bg-slate-900/90 border-rose-500/30 shadow-[0_20px_50px_rgba(244,63,94,0.2)]">
          <p className="text-rose-400 font-bold mb-2 uppercase tracking-widest text-sm">Location</p>
          <h3 className="text-3xl text-white font-black">Main Hall</h3>
          <p className="text-slate-400 mt-2 text-sm">Seat B42</p>
        </GlassPanel>
      </motion.div>

      <motion.div className="absolute right-10 md:right-32 z-20 hidden md:block" style={{ y: yRight }}>
        <GlassPanel className="p-6 bg-slate-900/90 border-rose-500/30 shadow-[0_20px_50px_rgba(244,63,94,0.2)]">
          <p className="text-rose-400 font-bold mb-2 uppercase tracking-widest text-sm">Weightage</p>
          <h3 className="text-4xl text-white font-black">40%</h3>
          <p className="text-slate-400 mt-2 text-sm">Final Grade</p>
        </GlassPanel>
      </motion.div>

      <motion.div className="relative z-10 text-center" style={{ scale: useTransform(progress, [0.42, 0.50], [0.8, 1.2]) }}>
        <GraduationCap className="w-16 h-16 md:w-24 md:h-24 mx-auto text-rose-500 mb-6 drop-shadow-[0_0_30px_rgba(244,63,94,0.8)]" />
        <h2 className="text-5xl md:text-8xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-2xl">
          02<span className="text-rose-500 animate-pulse">:</span>14<span className="text-rose-500 animate-pulse">:</span>59
        </h2>
        <p className="text-xl md:text-3xl text-rose-500 dark:text-rose-200 mt-4 font-bold tracking-widest uppercase">Advanced Calculus</p>
        <p className="text-rose-600 dark:text-rose-400/80 mt-2 text-base md:text-lg font-medium">Be Ready.</p>
      </motion.div>
    </motion.div>
  )
}

// --- Scene 8: Reminders Storm (0.50 - 0.58) ---
const RemindersScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.50, 0.52, 0.56, 0.58], [0, 1, 1, 0])
  const textScale = useTransform(progress, [0.50, 0.58], [0.8, 1])

  // Increase the number of reminders for a denser storm
  const reminders = Array.from({ length: 24 }).map((_, i) => {
    // Use index for deterministic pseudo-random distribution
    const rand1 = Math.abs(Math.sin(i * 12.9898)) % 1;
    const rand2 = Math.abs(Math.cos(i * 78.233)) % 1;
    const rand3 = Math.abs(Math.sin(i * 45.123)) % 1;
    const rand4 = Math.abs(Math.cos(i * 93.412)) % 1;

    // Distribute evenly across 3 horizontal columns: left, center, right to fill the screen
    const col = i % 3;
    let baseLeft;
    if (col === 0) baseLeft = 5 + rand1 * 25; // 5% to 30% (Left)
    else if (col === 1) baseLeft = 35 + rand1 * 30; // 35% to 65% (Center)
    else baseLeft = 70 + rand1 * 25; // 70% to 95% (Right)

    return {
      left: baseLeft, 
      yCenter: -10 - rand2 * 70, // Float higher or lower: -10vh to -80vh
      rotate: (rand3 - 0.5) * 100, // Varied rotations
      depth: rand4 * 1.5 + 0.5, // 0.5 to 2.0 depth for parallax effect
      color: ['bg-amber-300 text-amber-900', 'bg-rose-300 text-rose-900', 'bg-emerald-300 text-emerald-900', 'bg-cyan-300 text-cyan-900', 'bg-fuchsia-300 text-fuchsia-900', 'bg-indigo-300 text-indigo-900'][i % 6],
      text: ['Buy groceries', 'Email professor', 'Pay rent', 'Call mom', 'Read chapter 3', 'Submit form', 'Gym @ 6PM', 'Doctor appt', 'Project due', 'Water plants'][i % 10]
    }
  })

  return (
    <motion.div className="absolute inset-0 z-40 pointer-events-none overflow-hidden" style={{ opacity }}>
      <motion.div className="absolute top-12 md:top-20 inset-x-0 text-center z-50 px-4" style={{ scale: textScale }}>
        <h2 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-2xl leading-[1.1]">
          Never Forget <br/>A Single <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-500">Detail.</span>
        </h2>
      </motion.div>

      {reminders.map((rem, i) => {
        // Enhanced Dramatic 3D flight path with parallax
        // Notes further back (lower depth) move slower
        // Reduced distances to ensure scroll feels extremely smooth and un-rushed
        const yStart = 40 + rem.depth * 5; 
        const yEnd = -60 - rem.depth * 10;
        const y = useTransform(progress, [0.50, 0.53, 0.55, 0.58], [`${yStart}vh`, `${rem.yCenter}vh`, `${rem.yCenter - 5}vh`, `${yEnd}vh`])
        
        // Horizontal drift for a natural floating feel
        const swayAmount = (i % 2 === 0 ? 15 : -15) * rem.depth;
        const x = useTransform(progress, [0.50, 0.54, 0.58], [0, swayAmount, swayAmount * -1.5])

        const rotate = useTransform(progress, [0.50, 0.54, 0.58], [rem.rotate - 20, rem.rotate, rem.rotate + 45])
        const noteOpacity = useTransform(progress, [0.50, 0.51, 0.56, 0.58], [0, 1, 1, 0])

        return (
          <motion.div
            key={i}
            className={`absolute bottom-0 w-24 md:w-40 aspect-square ${rem.color} p-3 md:p-5 shadow-lg flex flex-col justify-between rounded-bl-xl rounded-tr-md will-change-transform`}
            style={{ 
              left: `${rem.left}%`, 
              x,
              y, 
              rotate,
              scale: rem.depth,
              opacity: noteOpacity,
              zIndex: Math.round(rem.depth * 10)
            }}
          >
            <div className="w-full h-3 md:h-4 bg-black/10 absolute top-0 left-0" />
            <p className="font-bold text-sm md:text-xl mt-3 md:mt-4 leading-tight">{rem.text}</p>
            <div className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-current opacity-30 self-end" />
          </motion.div>
        )
      })}
    </motion.div>
  )
}


// --- Scene 9: Focus Mode (0.58 - 0.68) ---
const FocusScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.58, 0.60, 0.66, 0.68], [0, 1, 1, 0])
  const timerScale = useTransform(progress, [0.58, 0.68], [0.5, 1.2])

  const particles = Array.from({length: 40}).map(() => {
    const angle = (Math.random() * Math.PI * 2)
    const radius = 1000
    const startX = Math.cos(angle) * radius
    const startY = Math.sin(angle) * radius
    return { startX, startY }
  })

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none bg-slate-900 dark:bg-black" style={{ opacity }}>
      {particles.map((p, i) => {
        const pX = useTransform(progress, [0.58, 0.64], [p.startX, 0])
        const pY = useTransform(progress, [0.58, 0.64], [p.startY, 0])
        const pOp = useTransform(progress, [0.58, 0.64], [1, 0])
        return (
          <motion.div key={i} className="absolute w-1 md:w-2 h-1 md:h-2 bg-white rounded-full blur-[1px]" style={{ x: pX, y: pY, opacity: pOp }} />
        )
      })}
      
      <motion.div className="text-center relative z-10" style={{ scale: timerScale }}>
        <h2 className="text-6xl md:text-[10rem] font-black text-white tracking-tighter drop-shadow-[0_0_50px_rgba(255,255,255,0.8)]">
          25:00
        </h2>
        <p className="text-lg md:text-2xl text-slate-400 mt-2 md:mt-4 tracking-[0.3em] md:tracking-[0.5em] uppercase font-bold">Deep Work</p>
      </motion.div>
    </motion.div>
  )
}

// --- Scene 10: Knowledge Base (0.68 - 0.76) ---
const KnowledgeScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.68, 0.70, 0.74, 0.76], [0, 1, 1, 0])
  const spread = useTransform(progress, [0.68, 0.76], [1, 3])
  const coreScale = useTransform(progress, [0.68, 0.76], [1, 5])
  
  const nodes = [
    {x: -120, y: -80, label: "Physics Notes"},
    {x: 120, y: -60, label: "Blog"},
    {x: -80, y: 120, label: "Code Snippets"},
    {x: 100, y: 100, label: "Materials"}
  ]

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none overflow-hidden" style={{ opacity }}>
      <div className="absolute top-12 md:top-20 text-center z-50 px-4">
        <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white drop-shadow-lg">
          Connect Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500">Mind.</span>
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">Your notes, perfectly linked together.</p>
      </div>

      <div className="relative w-full h-full flex items-center justify-center perspective-1000">
        <motion.div className="absolute w-24 h-24 md:w-32 md:h-32 bg-purple-600 rounded-full blur-[40px] md:blur-[50px] shadow-[0_0_100px_rgba(147,51,234,1)] animate-pulse" style={{ scale: coreScale }} />
        
        {nodes.map((node, i) => {
          const moveX = useTransform(spread, s => node.x * s)
          const moveY = useTransform(spread, s => node.y * s)
          
          return (
            <motion.div key={i} className="absolute flex flex-col items-center" style={{ x: moveX, y: moveY }}>
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-slate-900/50 border border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.8)] backdrop-blur-md flex items-center justify-center">
                <BookOpen className="w-5 h-5 md:w-8 md:h-8 text-purple-300" />
              </div>
              <span className="text-xs md:text-sm text-white font-bold mt-2 bg-slate-900/80 px-3 py-1 rounded-full border border-purple-500/30 whitespace-nowrap">{node.label}</span>
            </motion.div>
          )
        })}

        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: -1 }}>
          {nodes.map((node, i) => {
            const x2 = useTransform(spread, s => `calc(50% + ${node.x * s}px)`)
            const y2 = useTransform(spread, s => `calc(50% + ${node.y * s}px)`)
            return (
              <motion.line key={i} x1="50%" y1="50%" x2={x2} y2={y2} stroke="rgba(168,85,247,0.2)" strokeWidth="1" strokeDasharray="4" />
            )
          })}
        </svg>
      </div>
    </motion.div>
  )
}

// --- Scene 11: Analytics Cityscape (0.76 - 0.84) ---
const AnalyticsScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.76, 0.78, 0.82, 0.84], [0, 1, 1, 0])
  
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-end z-40 pointer-events-none overflow-hidden pb-20 md:pb-32" style={{ opacity }}>
      <div className="absolute top-12 md:top-20 text-center z-50 px-4">
        <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white drop-shadow-lg">
          Visualize <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">Growth.</span>
        </h2>
      </div>

      <div className="w-full h-[50vh] md:h-[60vh] max-w-5xl relative perspective-1000 flex items-end justify-center gap-2 md:gap-8 px-4 pb-12 border-b-4 border-emerald-500/30" style={{ transform: 'rotateX(20deg)' }}>
        {[10, 20, 35, 50, 65, 80, 100].map((h, i) => {
          const height = useTransform(progress, [0.76 + (i * 0.004), 0.79 + (i * 0.004)], ['0%', `${h}%`])
          return (
            <motion.div key={i} className="w-10 md:w-24 bg-gradient-to-t from-emerald-900 via-emerald-600 to-emerald-400 rounded-t-xl border-t-4 border-l-4 border-emerald-300 shadow-[0_0_40px_rgba(16,185,129,0.4)] relative" style={{ height }}>
              {h === 100 && (
                <div className="absolute -top-12 md:-top-16 left-1/2 -translate-x-1/2 bg-emerald-500 text-white font-black text-xl md:text-3xl px-4 md:px-6 py-2 rounded-full shadow-[0_0_40px_rgba(16,185,129,1)] border-2 border-emerald-300">
                  A+
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

// --- Scene 12: Settings Control Room (0.84 - 0.93) ---
const SettingsScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.84, 0.86, 0.91, 0.93], [0, 1, 1, 0])
  const explode = useTransform(progress, [0.84, 0.90], [0, 100])

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none px-4" style={{ opacity }}>
      <div className="absolute top-12 md:top-20 text-center z-50">
        <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white drop-shadow-lg">
          Total <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">Control.</span>
        </h2>
      </div>

      <div className="relative perspective-1000 w-full max-w-2xl h-[400px] md:h-[500px]">
        {/* Main Base Plate */}
        <motion.div className="absolute inset-0 bg-slate-100 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-300 dark:border-slate-600 rounded-3xl shadow-2xl" style={{ rotateX: 45, rotateZ: -20 }} />

        {/* Central Core */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ 
            rotateX: 45, rotateZ: -20,
            z: useTransform(explode, [0, 100], [0, 20])
          }}
        >
          <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-cyan-500/20 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-t-4 border-cyan-500 animate-[spin_4s_linear_infinite]" />
            <div className="absolute inset-4 rounded-full border-b-4 border-blue-500 animate-[spin_3s_linear_infinite_reverse]" />
            <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-full shadow-[0_0_50px_rgba(6,182,212,0.6)] animate-pulse flex items-center justify-center">
              <Zap className="text-white w-8 h-8 md:w-10 md:h-10" />
            </div>
          </div>
        </motion.div>

        {/* Floating Toggles */}
        <motion.div className="absolute top-10 md:top-20 left-10 md:left-20 bg-white dark:bg-slate-900 p-3 md:p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-xl" style={{ x: useTransform(explode, [0,100], [0, -40]), y: useTransform(explode, [0,100], [0, -80]), z: useTransform(explode, [0,100], [0, 50]) }}>
          <Settings className="text-cyan-500 w-5 h-5 md:w-6 md:h-6" />
          <span className="text-slate-800 dark:text-white font-bold text-sm md:text-base">Auto-Sync</span>
          <div className="w-10 md:w-12 h-5 md:h-6 bg-cyan-500 rounded-full relative ml-2 md:ml-4 shadow-[0_0_10px_rgba(6,182,212,0.5)]"><div className="absolute right-1 top-1 w-3 md:w-4 h-3 md:h-4 bg-white rounded-full" /></div>
        </motion.div>

        {/* Floating Color Picker */}
        <motion.div className="absolute bottom-10 md:bottom-20 right-10 md:right-20 bg-white dark:bg-slate-900 p-3 md:p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2 shadow-xl" style={{ x: useTransform(explode, [0,100], [0, 40]), y: useTransform(explode, [0,100], [0, 80]), z: useTransform(explode, [0,100], [0, 80]) }}>
          <span className="text-slate-800 dark:text-white font-bold mb-1 text-xs md:text-sm">Theme Engine</span>
          <div className="flex gap-2">
            {['bg-rose-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-purple-500'].map((c,i) => (
              <div key={i} className={`w-6 h-6 md:w-8 md:h-8 rounded-full ${c} border-2 ${i===1 ? 'border-slate-800 dark:border-white scale-110 shadow-[0_0_15px_rgba(6,182,212,0.8)]' : 'border-transparent'}`} />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}


// --- Scene 13: Grand Finale (0.93 - 1.0) ---
const FinaleScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.93, 0.95], [0, 1])
  const scale = useTransform(progress, [0.93, 1], [0.8, 1])
  const glow = useTransform(progress, [0.95, 1], [0, 1])

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-auto" style={{ opacity }}>
      <motion.div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-theme-500/10 via-white dark:via-slate-900 to-slate-100 dark:to-black z-0" style={{ opacity: glow }} />
      
      <motion.div className="text-center relative z-10 px-4" style={{ scale }}>
        <h2 className="text-5xl md:text-8xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-[0_0_50px_rgba(255,255,255,0.5)] mb-8">
          Unleash Your <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-500 to-purple-500">Potential.</span>
        </h2>
        
        <button className="px-8 md:px-10 py-4 md:py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-black text-lg md:text-2xl hover:scale-105 transition-transform shadow-[0_0_40px_rgba(0,0,0,0.2)] dark:shadow-[0_0_40px_rgba(255,255,255,0.4)] flex items-center gap-3 mx-auto">
          Try UniMind Now <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </motion.div>
    </motion.div>
  )
}

export default function LandingHelo() {
  const containerRef = useRef(null)
  const [scrollContainer, setScrollContainer] = useState(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setScrollContainer(document.getElementById('main-scroll-container'))
    setIsDark(document.documentElement.classList.contains('dark'))
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: scrollContainer ? { current: scrollContainer } : undefined,
    offset: ["start start", "end end"]
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 40,
    damping: 15,
    restDelta: 0.001
  })

  // Light Mode Cohesive Palette
  const bgColors = useTransform(smoothProgress, 
    [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], 
    [
      'linear-gradient(135deg, #0f172a 0%, #020617 100%)', // Eco (Forced Dark for aesthetic)
      'linear-gradient(135deg, #e0f2fe 0%, #e0e7ff 100%)', // Waterfall
      'linear-gradient(135deg, #f3e8ff 0%, #e0e7ff 100%)', // Alerts
      'linear-gradient(135deg, #f3e8ff 0%, #fae8ff 100%)', // Chat
      'linear-gradient(135deg, #ecfeff 0%, #e0f2fe 100%)', // Plan
      'linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%)', // Matrix
      'linear-gradient(135deg, #fff1f2 0%, #ffedd5 100%)', // Exams
      'linear-gradient(135deg, #020617 0%, #000000 100%)', // Void
      'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', // Base
      'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', // Analytics
      'linear-gradient(135deg, #f8fbff 0%, #EEF4FB 100%)', // Finale
    ]
  )

  // Dark Mode Cohesive Palette
  const darkBgColors = useTransform(smoothProgress, 
    [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], 
    [
      'linear-gradient(135deg, #0f172a 0%, #020617 100%)', // Eco
      'linear-gradient(135deg, #172554 0%, #0f172a 100%)', // Waterfall
      'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', // Alerts
      'linear-gradient(135deg, #2e1065 0%, #0f172a 100%)', // Chat
      'linear-gradient(135deg, #083344 0%, #020617 100%)', // Plan
      'linear-gradient(135deg, #2e1065 0%, #0f172a 100%)', // Matrix
      'linear-gradient(135deg, #4c0519 0%, #020617 100%)', // Exams
      'linear-gradient(135deg, #000000 0%, #000000 100%)', // Void
      'linear-gradient(135deg, #2e1065 0%, #020617 100%)', // Base
      'linear-gradient(135deg, #064e3b 0%, #020617 100%)', // Analytics
      'linear-gradient(135deg, #0f172a 0%, #020617 100%)', // Finale
    ]
  )

  return (
    <div className="w-full bg-white dark:bg-slate-900 selection:bg-theme-500/30">
      
      {/* 2600vh Container for 13 distinct scenes */}
      <div ref={containerRef} className="h-[2600vh] relative">
        <motion.div 
          className="sticky top-[73px] h-[calc(100dvh-73px)] w-full overflow-hidden flex flex-col items-center justify-center will-change-transform"
          style={{ background: isDark ? darkBgColors : bgColors }}
        >
          {/* Animated Background Mesh */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className={`absolute w-[800px] h-[800px] -top-[400px] -right-[400px] rounded-full blur-[100px] md:blur-[120px] animate-[pulse_8s_ease-in-out_infinite] ${isDark ? 'bg-theme-600/20' : 'bg-theme-300/30'}`} />
            <div className={`absolute w-[600px] h-[600px] -bottom-[300px] -left-[300px] rounded-full blur-[100px] md:blur-[120px] animate-[pulse_10s_ease-in-out_infinite_reverse] ${isDark ? 'bg-purple-600/20' : 'bg-purple-300/30'}`} />
          </div>

          <EcosystemScene progress={smoothProgress} />
          <WaterfallScene progress={smoothProgress} />
          <SmartAlertsScene progress={smoothProgress} />
          <ChatScene progress={smoothProgress} />
          <StudyPlanScene progress={smoothProgress} />
          <MatrixScene progress={smoothProgress} />
          <ExamsScene progress={smoothProgress} />
          <RemindersScene progress={smoothProgress} />
          <FocusScene progress={smoothProgress} />
          <KnowledgeScene progress={smoothProgress} />
          <AnalyticsScene progress={smoothProgress} />
          <SettingsScene progress={smoothProgress} />
          <FinaleScene progress={smoothProgress} />
        </motion.div>
      </div>

    </div>
  )
}
