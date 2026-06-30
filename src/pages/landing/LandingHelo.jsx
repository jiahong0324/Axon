import { useRef, useEffect } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { Calendar, CheckSquare, Clock, BookOpen, Settings, LayoutDashboard, ChevronRight, User, Bell, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

// --- Massive Immersive UI Components ---

const IntroSequence = ({ progress }) => {
  const scale = useTransform(progress, [0, 0.15], [1, 20])
  const opacity = useTransform(progress, [0, 0.1, 0.15], [1, 1, 0])
  const filter = useTransform(progress, [0, 0.15], ['blur(0px)', 'blur(20px)'])
  const y = useTransform(progress, [0, 0.15], ['0%', '100%'])

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none"
      style={{ opacity, filter, scale }}
    >
      <h1 className="text-[15vw] font-black text-white tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50 drop-shadow-2xl">
        AXON
      </h1>
      <motion.p 
        className="text-2xl md:text-4xl text-slate-300 font-medium tracking-widest uppercase mt-4"
        style={{ y, opacity: useTransform(progress, [0, 0.05], [1, 0]) }}
      >
        The Future of Learning
      </motion.p>
    </motion.div>
  )
}

const DashboardSequence = ({ progress }) => {
  // Enters 0.1, peaks 0.2, leaves 0.35
  const oMain = useTransform(progress, [0.1, 0.2, 0.3, 0.35], [0, 1, 1, 0])
  const sMain = useTransform(progress, [0.1, 0.2, 0.3, 0.35], [0.8, 1, 1, 1.2])
  
  // Parallax elements
  const card1Y = useTransform(progress, [0.1, 0.35], ['100%', '-100%'])
  const card2Y = useTransform(progress, [0.1, 0.35], ['150%', '-50%'])
  const card3X = useTransform(progress, [0.1, 0.35], ['-100%', '100%'])
  
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none" style={{ opacity: oMain }}>
      <motion.div className="relative w-full max-w-[1400px] aspect-video" style={{ scale: sMain }}>
        {/* Giant Welcome Header */}
        <motion.div 
          className="absolute top-10 left-10 md:top-20 md:left-20"
          style={{ x: card3X }}
        >
          <h2 className="text-6xl md:text-8xl font-bold text-white tracking-tight drop-shadow-2xl">
            Command<br/>Center
          </h2>
          <p className="text-2xl md:text-4xl text-slate-400 mt-6 max-w-xl">
            Your entire academic life, beautifully organized in one panoramic view.
          </p>
        </motion.div>

        {/* Floating Giant Cards */}
        <motion.div 
          className="absolute right-10 bottom-20 md:right-32 md:bottom-32 w-80 md:w-[450px] p-8 md:p-12 rounded-[3rem] bg-white/5 border border-white/10 backdrop-blur-3xl shadow-2xl"
          style={{ y: card1Y }}
        >
          <div className="w-20 h-20 rounded-3xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-8">
            <Calendar className="w-10 h-10" />
          </div>
          <h3 className="text-4xl md:text-5xl font-bold text-white mb-4">3 Classes</h3>
          <p className="text-xl text-slate-400">Scheduled for today. Next up: Engineering at 10:00 AM.</p>
        </motion.div>

        <motion.div 
          className="absolute left-10 bottom-10 md:left-40 md:-bottom-10 w-72 md:w-[400px] p-8 md:p-10 rounded-[3rem] bg-theme-600/20 border border-theme-500/30 backdrop-blur-3xl shadow-2xl"
          style={{ y: card2Y }}
        >
          <div className="w-16 h-16 rounded-2xl bg-theme-500/30 flex items-center justify-center text-theme-300 mb-6">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">2 Exams</h3>
          <p className="text-lg text-theme-200/70">Approaching this week. Keep up the pace.</p>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

const TimetableSequence = ({ progress }) => {
  // Enters 0.3, peaks 0.45, leaves 0.55
  const opacity = useTransform(progress, [0.3, 0.4, 0.5, 0.55], [0, 1, 1, 0])
  const scale = useTransform(progress, [0.3, 0.4, 0.5, 0.55], [0.8, 1, 1, 1.5])
  
  const row1X = useTransform(progress, [0.3, 0.55], ['-100vw', '100vw'])
  const row2X = useTransform(progress, [0.3, 0.55], ['100vw', '-100vw'])
  const row3X = useTransform(progress, [0.3, 0.55], ['-50vw', '50vw'])

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none" style={{ opacity }}>
      <motion.div className="w-full max-w-7xl px-8 flex flex-col gap-8 md:gap-12" style={{ scale }}>
        
        <div className="text-center mb-10">
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-4">Master Your Time</h2>
          <p className="text-2xl text-indigo-300">A timetable that flows with your day.</p>
        </div>

        <motion.div className="w-full p-8 md:p-10 rounded-[2.5rem] bg-indigo-900/40 border border-indigo-500/30 backdrop-blur-2xl flex items-center gap-10 shadow-2xl" style={{ x: row1X }}>
          <div className="text-4xl md:text-6xl font-black text-indigo-400 w-48 text-right shrink-0">09:00</div>
          <div className="w-2 h-32 rounded-full bg-indigo-500 hidden md:block"></div>
          <div>
            <h3 className="text-3xl md:text-5xl font-bold text-white">Software Engineering</h3>
            <p className="text-xl md:text-2xl text-indigo-200 mt-2 flex items-center gap-2"><Calendar className="w-6 h-6"/> Block A, Room 204</p>
          </div>
        </motion.div>

        <motion.div className="w-full p-8 md:p-10 rounded-[2.5rem] bg-purple-900/40 border border-purple-500/30 backdrop-blur-2xl flex items-center gap-10 shadow-2xl" style={{ x: row2X }}>
          <div className="text-4xl md:text-6xl font-black text-purple-400 w-48 text-right shrink-0">11:30</div>
          <div className="w-2 h-32 rounded-full bg-purple-500 hidden md:block"></div>
          <div>
            <h3 className="text-3xl md:text-5xl font-bold text-white">Database Systems</h3>
            <p className="text-xl md:text-2xl text-purple-200 mt-2 flex items-center gap-2"><Calendar className="w-6 h-6"/> Computer Lab 3</p>
          </div>
        </motion.div>

        <motion.div className="w-full p-8 md:p-10 rounded-[2.5rem] bg-rose-900/40 border border-rose-500/30 backdrop-blur-2xl flex items-center gap-10 shadow-2xl" style={{ x: row3X }}>
          <div className="text-4xl md:text-6xl font-black text-rose-400 w-48 text-right shrink-0">14:00</div>
          <div className="w-2 h-32 rounded-full bg-rose-500 hidden md:block"></div>
          <div>
            <h3 className="text-3xl md:text-5xl font-bold text-white">Artificial Intelligence</h3>
            <p className="text-xl md:text-2xl text-rose-200 mt-2 flex items-center gap-2"><Calendar className="w-6 h-6"/> Lecture Hall B</p>
          </div>
        </motion.div>

      </motion.div>
    </motion.div>
  )
}

const ExamSequence = ({ progress }) => {
  // Enters 0.5, peaks 0.65, leaves 0.75
  const opacity = useTransform(progress, [0.5, 0.6, 0.7, 0.75], [0, 1, 1, 0])
  const blur = useTransform(progress, [0.5, 0.6], ['blur(20px)', 'blur(0px)'])
  
  const ringScale = useTransform(progress, [0.5, 0.65, 0.75], [0.1, 1, 3])
  const contentY = useTransform(progress, [0.5, 0.65, 0.75], ['50%', '0%', '-50%'])

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none" style={{ opacity, filter: blur }}>
      
      {/* Giant Background Ring */}
      <motion.div 
        className="absolute w-[800px] h-[800px] rounded-full border-[40px] border-rose-500/20 shadow-[0_0_100px_rgba(244,63,94,0.3)]"
        style={{ scale: ringScale }}
      />
      
      <motion.div className="text-center relative z-10 max-w-4xl px-6" style={{ y: contentY }}>
        <div className="inline-flex items-center justify-center p-6 rounded-3xl bg-rose-500/20 text-rose-400 mb-8 border border-rose-500/30 backdrop-blur-xl">
          <Clock className="w-16 h-16" />
        </div>
        <h2 className="text-6xl md:text-8xl font-black text-white mb-6 drop-shadow-2xl tracking-tight">15 Days Left</h2>
        <h3 className="text-3xl md:text-5xl font-bold text-rose-200 mb-12">Data Structures Final Exam</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Date', val: 'Jul 20' },
            { label: 'Time', val: '09:00' },
            { label: 'Venue', val: 'Hall A' },
            { label: 'Weight', val: '40%' }
          ].map((stat, i) => (
            <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-lg flex flex-col items-center">
              <span className="text-lg text-slate-400 mb-2 uppercase tracking-widest">{stat.label}</span>
              <span className="text-3xl font-bold text-white">{stat.val}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

const AssignmentSequence = ({ progress }) => {
  // Enters 0.7, peaks 0.85, leaves 0.95
  const opacity = useTransform(progress, [0.7, 0.8, 0.9, 0.95], [0, 1, 1, 0])
  const x = useTransform(progress, [0.7, 0.95], ['50%', '-50%'])

  const cards = [
    { title: "React Architecture", course: "Web Dev", status: "In Progress", due: "Tomorrow", color: "from-blue-500 to-cyan-500" },
    { title: "Database Normalization", course: "Data Systems", status: "To Do", due: "In 3 Days", color: "from-emerald-500 to-teal-500" },
    { title: "ML Algorithm Analysis", course: "AI", status: "Review", due: "Next Week", color: "from-orange-500 to-rose-500" },
    { title: "Ethics Essay", course: "Philosophy", status: "Done", due: "Last Week", color: "from-purple-500 to-indigo-500" },
  ]

  return (
    <motion.div className="absolute inset-0 flex items-center z-40 pointer-events-none overflow-hidden" style={{ opacity }}>
      
      <div className="absolute top-20 left-20 md:top-32 md:left-32 z-50">
        <h2 className="text-5xl md:text-7xl font-bold text-white drop-shadow-2xl">Assignments,<br/>Visualized.</h2>
      </div>

      <motion.div className="flex gap-8 md:gap-16 px-[20vw] pt-32" style={{ x }}>
        {cards.map((card, i) => (
          <div key={i} className="w-[80vw] md:w-[600px] shrink-0 h-[500px] md:h-[600px] rounded-[3rem] bg-slate-900/80 border border-slate-700 backdrop-blur-3xl p-10 md:p-14 flex flex-col shadow-2xl relative overflow-hidden group">
            <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${card.color}`}></div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-auto">
                <span className="px-6 py-2 rounded-full bg-white/10 text-white font-semibold text-lg tracking-wide">
                  {card.course}
                </span>
                <span className="text-xl font-bold text-slate-300 bg-black/30 px-6 py-2 rounded-2xl">
                  {card.status}
                </span>
              </div>
              
              <div>
                <h3 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">{card.title}</h3>
                <div className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/5">
                  <CheckSquare className="w-8 h-8 text-slate-300" />
                  <span className="text-2xl font-semibold text-white">Due {card.due}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}

const FinaleSequence = ({ progress }) => {
  // Enters 0.9, peaks 1.0
  const opacity = useTransform(progress, [0.9, 0.95, 1], [0, 1, 1])
  const y = useTransform(progress, [0.9, 1], ['50px', '0px'])
  const scale = useTransform(progress, [0.9, 1], [0.9, 1])

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-50 bg-slate-950/80 backdrop-blur-md" style={{ opacity }}>
      <motion.div className="text-center px-6" style={{ y, scale }}>
        <h2 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter">Ready to Begin?</h2>
        <p className="text-2xl md:text-3xl text-slate-400 mb-12 max-w-2xl mx-auto">
          Join thousands of students organizing their academic lives with Axon.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link to="/register" className="pointer-events-auto px-10 py-5 rounded-full bg-theme-600 hover:bg-theme-500 text-white text-xl font-bold transition-all shadow-[0_0_40px_rgba(var(--theme-600),0.4)] hover:shadow-[0_0_60px_rgba(var(--theme-500),0.6)] hover:scale-105 active:scale-95">
            Get Started Free
          </Link>
          <Link to="/" className="pointer-events-auto px-10 py-5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl font-bold transition-all backdrop-blur-md hover:scale-105 active:scale-95">
            Back to Home
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function LandingHelo() {
  const wrapperRef = useRef(null)
  const containerRef = useRef(null)
  
  // Use a massive 800vh container for a very long, smooth scroll experience
  // Track scroll inside the wrapper since global body scroll is hidden
  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: wrapperRef,
    offset: ["start start", "end end"]
  })

  // Smooth out the scroll progress for buttery animations
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  // Dynamic Mesh Background Colors based on scroll progress
  const bg1 = useTransform(smoothProgress, 
    [0, 0.25, 0.5, 0.75, 1], 
    ['#0f172a', '#1e1b4b', '#4c1d95', '#064e3b', '#0f172a'] // Slate -> Indigo -> Purple -> Emerald -> Slate
  )
  const bg2 = useTransform(smoothProgress, 
    [0, 0.25, 0.5, 0.75, 1], 
    ['#020617', '#312e81', '#881337', '#0f766e', '#020617']
  )

  return (
    <div ref={wrapperRef} className="h-screen w-full overflow-y-auto overflow-x-hidden bg-slate-950 scroll-smooth">
      {/* Floating Navigation overlay for escape hatch */}
      <div className="fixed top-0 inset-x-0 p-6 z-[100] flex justify-between items-center pointer-events-none">
        <Link to="/" className="pointer-events-auto flex items-center gap-3 group bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-theme-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold font-heading">A</span>
          </div>
          <span className="font-heading font-bold text-white tracking-tight hidden sm:block">Axon</span>
        </Link>
        <Link to="/register" className="pointer-events-auto bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-slate-200 transition-colors">
          Sign Up
        </Link>
      </div>

      <div ref={containerRef} className="h-[800vh] relative">
        
        {/* Sticky viewport that stays on screen */}
        <div className="sticky top-0 h-[100dvh] w-full overflow-hidden flex flex-col items-center justify-center">
          
          {/* Animated Mesh Gradient Background */}
          <motion.div 
            className="absolute inset-0 z-0 opacity-50"
            style={{ 
              background: useTransform(
                [bg1, bg2], 
                ([c1, c2]) => `radial-gradient(circle at 50% 50%, ${c1} 0%, ${c2} 100%)`
              )
            }}
          />
          <div className="absolute inset-0 z-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>

          {/* Sequences */}
          <IntroSequence progress={smoothProgress} />
          <DashboardSequence progress={smoothProgress} />
          <TimetableSequence progress={smoothProgress} />
          <ExamSequence progress={smoothProgress} />
          <AssignmentSequence progress={smoothProgress} />
          <FinaleSequence progress={smoothProgress} />

          {/* Global Scroll Indicator (fades out at end) */}
          <motion.div 
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 text-white/50 z-50 pointer-events-none"
            style={{ opacity: useTransform(smoothProgress, [0.8, 0.9], [1, 0]) }}
          >
            <span className="text-xs font-bold uppercase tracking-[0.3em]">Scroll</span>
            <motion.div 
              className="w-[2px] h-12 bg-gradient-to-b from-white/50 to-transparent"
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            />
          </motion.div>

        </div>
      </div>
    </div>
  )
}
