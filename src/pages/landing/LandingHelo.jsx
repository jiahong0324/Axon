import { useRef } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { Calendar, CheckSquare, Clock, LayoutDashboard, ChevronRight, User, Bell, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'

// --- Ultra-Premium Apple-Style Cinematic Components ---

const GlassCard = ({ children, className = "", style = {} }) => (
  <motion.div 
    className={`bg-[#0a0a0a]/60 backdrop-blur-[40px] rounded-3xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden ${className}`}
    style={style}
  >
    {children}
  </motion.div>
)

const IntroScene = ({ progress }) => {
  // 0 - 0.2: Fade in, scale massively to fly "through" the O
  const opacity = useTransform(progress, [0, 0.05, 0.15, 0.2], [0, 1, 1, 0])
  const scale = useTransform(progress, [0, 0.2], [0.8, 60])
  const blur = useTransform(progress, [0.1, 0.2], ['blur(0px)', 'blur(30px)'])

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 origin-center"
      style={{ opacity, scale, filter: blur }}
    >
      <h1 className="text-[12vw] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-500 pb-2">
        AXON
      </h1>
    </motion.div>
  )
}

const DashboardScene = ({ progress }) => {
  // Enters from darkness at 0.15, peaks at 0.3, rotates away and fades at 0.45
  const opacity = useTransform(progress, [0.15, 0.25, 0.35, 0.45], [0, 1, 1, 0])
  
  // 3D rotations for the cinematic "hero" shot of the dashboard
  const rotateX = useTransform(progress, [0.15, 0.45], [30, -30])
  const rotateY = useTransform(progress, [0.15, 0.45], [-20, 20])
  const z = useTransform(progress, [0.15, 0.3, 0.45], [-1000, 0, -500])
  
  // Parallax elements flying out
  const titleY = useTransform(progress, [0.15, 0.45], ['50%', '-150%'])
  const card1Z = useTransform(progress, [0.15, 0.45], [200, 600])
  const card2Z = useTransform(progress, [0.15, 0.45], [100, 400])

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-40" 
      style={{ opacity, perspective: 1200 }}
    >
      <motion.div 
        className="w-full max-w-[1200px] h-[700px] relative transform-style-3d"
        style={{ rotateX, rotateY, z }}
      >
        <motion.div className="absolute -top-20 left-0 md:left-20" style={{ y: titleY, translateZ: 300 }}>
          <h2 className="text-5xl md:text-8xl font-medium tracking-tight text-white mb-4 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">Pro.</h2>
          <h2 className="text-5xl md:text-8xl font-medium tracking-tight text-neutral-500">Found.</h2>
        </motion.div>

        <GlassCard className="absolute inset-x-4 md:inset-x-20 top-32 bottom-0 p-8 flex flex-col gap-6" style={{ translateZ: 0 }}>
          <div className="flex justify-between items-center pb-6 border-b border-white/5">
            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex gap-4">
              <div className="w-32 h-3 rounded-full bg-neutral-800"></div>
              <div className="w-16 h-3 rounded-full bg-neutral-800"></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 flex-1">
            <div className="col-span-2 rounded-2xl bg-gradient-to-br from-neutral-900 to-black border border-white/5 p-6 flex flex-col justify-end relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent_50%)]"></div>
              <Activity className="w-10 h-10 text-blue-500 mb-4" />
              <div className="w-1/2 h-4 rounded-full bg-neutral-800 mb-2"></div>
              <div className="w-3/4 h-4 rounded-full bg-neutral-800"></div>
            </div>
            <div className="rounded-2xl bg-neutral-900 border border-white/5"></div>
          </div>
        </GlassCard>

        {/* Floating Accent Cards */}
        <GlassCard className="absolute -right-10 top-40 w-80 p-8 flex flex-col gap-4 bg-[#050505]/80" style={{ translateZ: card1Z }}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-3xl font-medium text-white tracking-tight">Syncs Instantly.</h3>
          <p className="text-neutral-400">Your timetable perfectly aligned across the universe.</p>
        </GlassCard>

        <GlassCard className="absolute -left-10 bottom-10 w-72 p-6 flex flex-col gap-4 bg-[#050505]/80" style={{ translateZ: card2Z }}>
           <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-medium text-white tracking-tight">Smart Alerts.</h3>
        </GlassCard>

      </motion.div>
    </motion.div>
  )
}

const TimetableScene = ({ progress }) => {
  // Enters 0.35, peaks 0.5, leaves 0.6
  const opacity = useTransform(progress, [0.35, 0.45, 0.55, 0.6], [0, 1, 1, 0])
  const z = useTransform(progress, [0.35, 0.6], [500, -1000]) // Drops backward into the abyss
  const y1 = useTransform(progress, [0.35, 0.5], ['-150%', '0%'])
  const y2 = useTransform(progress, [0.35, 0.5], ['-200%', '0%'])
  const y3 = useTransform(progress, [0.35, 0.5], ['-250%', '0%'])

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 perspective-1000" 
      style={{ opacity }}
    >
      <motion.div className="w-full max-w-5xl px-6 flex flex-col gap-4" style={{ z, rotateX: 10 }}>
        
        <div className="mb-12 text-center">
          <h2 className="text-4xl md:text-6xl font-medium tracking-tight text-white mb-2">Time. <span className="text-neutral-600">Redefined.</span></h2>
        </div>

        {[
          { time: "09:00", subject: "Software Engineering", y: y1 },
          { time: "11:30", subject: "Database Architecture", y: y2 },
          { time: "14:00", subject: "Machine Learning", y: y3 }
        ].map((item, i) => (
          <motion.div key={i} style={{ y: item.y }}>
            <GlassCard className="w-full p-6 md:p-8 flex items-center gap-8 bg-[#0a0a0a]/80">
              <div className="text-3xl md:text-5xl font-medium text-neutral-500 tracking-tighter w-32 text-right">{item.time}</div>
              <div className="w-px h-16 bg-gradient-to-b from-transparent via-neutral-500 to-transparent"></div>
              <h3 className="text-2xl md:text-4xl font-medium text-white tracking-tight">{item.subject}</h3>
            </GlassCard>
          </motion.div>
        ))}

      </motion.div>
    </motion.div>
  )
}

const PulseScene = ({ progress }) => {
  // Enters 0.55, peaks 0.7, leaves 0.8
  const opacity = useTransform(progress, [0.55, 0.6, 0.75, 0.8], [0, 1, 1, 0])
  const dotScale = useTransform(progress, [0.55, 0.6], [0, 1])
  const ringScale = useTransform(progress, [0.6, 0.7], [0.1, 4])
  const ringOpacity = useTransform(progress, [0.6, 0.65, 0.75], [1, 0.5, 0])

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20" style={{ opacity }}>
      
      {/* The cinematic heartbeat explosion */}
      <motion.div className="absolute w-4 h-4 rounded-full bg-red-500 shadow-[0_0_30px_rgba(239,68,68,1)]" style={{ scale: dotScale }} />
      <motion.div 
        className="absolute w-[600px] h-[600px] rounded-full border-[2px] border-red-500/50 shadow-[inset_0_0_100px_rgba(239,68,68,0.2),0_0_100px_rgba(239,68,68,0.5)]" 
        style={{ scale: ringScale, opacity: ringOpacity }} 
      />

      <motion.div 
        className="relative z-10 text-center"
        style={{ 
          opacity: useTransform(progress, [0.6, 0.65], [0, 1]),
          y: useTransform(progress, [0.6, 0.75], [50, -50])
        }}
      >
        <h2 className="text-2xl font-medium text-red-500 tracking-widest uppercase mb-6">Exams</h2>
        <div className="text-[10vw] font-black tracking-tighter text-white leading-none drop-shadow-[0_0_40px_rgba(239,68,68,0.3)]">
          15 DAYS
        </div>
        <p className="text-3xl text-neutral-400 mt-6 tracking-tight">Until Data Structures Final.</p>
      </motion.div>
    </motion.div>
  )
}

const KanbanScene = ({ progress }) => {
  // Enters 0.75, peaks 0.85, leaves 0.95
  const opacity = useTransform(progress, [0.75, 0.8, 0.9, 0.95], [0, 1, 1, 0])
  
  // Cinema pan effect from right to left
  const panX = useTransform(progress, [0.75, 0.95], ['50vw', '-50vw'])
  // Spotlight tracking
  const spotlightX = useTransform(progress, [0.75, 0.95], ['-100%', '200%'])

  return (
    <motion.div className="absolute inset-0 flex items-center pointer-events-none z-30 overflow-hidden" style={{ opacity }}>
      
      {/* Background ambient light */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03),transparent_70%)]"></div>

      <div className="absolute top-20 md:top-32 left-10 md:left-32">
        <h2 className="text-5xl md:text-7xl font-medium tracking-tight text-white">Focus.</h2>
        <p className="text-2xl text-neutral-500 mt-4">One assignment at a time.</p>
      </div>

      <motion.div className="flex gap-8 px-[10vw] mt-20" style={{ x: panX }}>
        {[
          { title: "React Architecture", due: "Tomorrow" },
          { title: "Database Normalization", due: "In 3 Days" },
          { title: "Ethics Essay", due: "Next Week" }
        ].map((item, i) => (
          <GlassCard key={i} className="w-[85vw] md:w-[500px] h-[600px] shrink-0 p-12 relative overflow-hidden bg-[#050505]">
            {/* Spotlight reflection */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent w-[200%] h-full skew-x-[-20deg]"
              style={{ x: spotlightX }}
            />
            
            <div className="w-16 h-16 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center mb-8">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-4xl md:text-5xl font-medium text-white tracking-tight leading-tight mb-4">{item.title}</h3>
            <p className="text-xl text-neutral-500">Due {item.due}</p>
          </GlassCard>
        ))}
      </motion.div>
    </motion.div>
  )
}

const FinaleScene = ({ progress }) => {
  // Enters 0.9, stays till 1
  const opacity = useTransform(progress, [0.9, 0.95], [0, 1])
  const y = useTransform(progress, [0.9, 1], [100, 0])

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-50 bg-black" style={{ opacity }}>
      <motion.div className="text-center px-6" style={{ y }}>
        <h2 className="text-6xl md:text-9xl font-medium tracking-tight text-white mb-6">Axon.</h2>
        <p className="text-2xl md:text-3xl text-neutral-400 mb-12">The ultimate academic companion.</p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <Link to="/register" className="px-10 py-5 rounded-full bg-white text-black text-xl font-medium transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
            Create an Account
          </Link>
          <Link to="/" className="px-10 py-5 rounded-full bg-neutral-900 border border-white/10 text-white text-xl font-medium transition-transform hover:bg-neutral-800 hover:scale-105 active:scale-95">
            Back to Reality
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function LandingHelo() {
  const wrapperRef = useRef(null)
  
  // Massive 1000vh container for ultimate cinematic pacing
  const { scrollYProgress } = useScroll({
    container: wrapperRef,
    offset: ["start start", "end end"]
  })

  // Spring smoothing for that heavy, deliberate Apple feel
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 30,
    restDelta: 0.001
  })

  return (
    <div ref={wrapperRef} className="h-screen w-full overflow-y-auto overflow-x-hidden bg-black scroll-smooth">
      
      {/* Minimal Top Nav */}
      <div className="fixed top-0 inset-x-0 px-8 py-6 z-[100] flex justify-between items-center pointer-events-none">
        <Link to="/" className="pointer-events-auto flex items-center gap-2 group mix-blend-difference text-white">
          <span className="font-medium tracking-tight text-xl">Axon</span>
        </Link>
        <Link to="/register" className="pointer-events-auto text-sm font-medium text-white px-4 py-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors">
          Sign Up
        </Link>
      </div>

      <div className="h-[1000vh] relative">
        <div className="sticky top-0 h-[100dvh] w-full overflow-hidden flex flex-col items-center justify-center bg-black perspective-1000">
          
          {/* Subtle global noise overlay to reduce banding in gradients */}
          <div className="absolute inset-0 z-0 bg-[url('/noise.png')] opacity-[0.04] mix-blend-screen pointer-events-none"></div>

          {/* Sequences */}
          <IntroScene progress={smoothProgress} />
          <DashboardScene progress={smoothProgress} />
          <TimetableScene progress={smoothProgress} />
          <PulseScene progress={smoothProgress} />
          <KanbanScene progress={smoothProgress} />
          <FinaleScene progress={smoothProgress} />

          {/* Minimal Scroll Indicator */}
          <motion.div 
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 text-white/40 z-50 pointer-events-none"
            style={{ opacity: useTransform(smoothProgress, [0, 0.05, 0.8, 0.9], [1, 0, 0, 0]) }}
          >
            <span className="text-[10px] font-medium tracking-[0.4em] uppercase">Scroll</span>
            <div className="w-[1px] h-12 bg-white/20 overflow-hidden relative">
              <motion.div 
                className="w-full h-1/2 bg-white absolute top-0"
                animate={{ y: [-24, 48] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              />
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}
