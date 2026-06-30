import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion'
import { Calendar, CheckSquare, Clock, LayoutDashboard, ChevronRight, User, Bell, Activity, Sparkles, Send, Brain, GraduationCap, Briefcase } from 'lucide-react'
import { Link } from 'react-router-dom'

// --- Reusable Vibrant UI Components ---

const GlassPanel = ({ children, className = "", style = {} }) => (
  <motion.div 
    className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-white/40 dark:border-white/10 shadow-2xl overflow-hidden ${className}`}
    style={style}
  >
    {children}
  </motion.div>
)

const OrbitingWidget = ({ icon: Icon, color, title, desc, progress, angle, radius, delay }) => {
  // Use scroll progress to drive the orbit
  const orbitProgress = useTransform(progress, [0, 0.25], [0, 360])
  const rotateVal = useTransform(orbitProgress, v => v + angle + (delay * 30))
  
  // Calculate X and Y based on rotation
  const x = useTransform(rotateVal, v => Math.cos(v * Math.PI / 180) * radius)
  const y = useTransform(rotateVal, v => Math.sin(v * Math.PI / 180) * radius)
  
  // Floating up into existence
  const scale = useTransform(progress, [0, 0.05], [0, 1])

  return (
    <motion.div 
      className={`absolute w-64 p-4 rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-xl flex items-center gap-4`}
      style={{ x, y, scale }}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h4 className="font-bold text-slate-800 dark:text-white text-sm">{title}</h4>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </motion.div>
  )
}

// --- Scene 1: Ecosystem Explosion ---
const EcosystemScene = ({ progress }) => {
  // Scene active 0 - 0.25
  const opacity = useTransform(progress, [0, 0.05, 0.2, 0.25], [0, 1, 1, 0])
  const mainScale = useTransform(progress, [0, 0.25], [0.8, 1.2])

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none" style={{ opacity }}>
      
      {/* Central Dashboard */}
      <GlassPanel className="w-full max-w-4xl p-8 relative z-10" style={{ scale: mainScale }}>
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-theme-500 to-purple-600 p-1">
              <div className="w-full h-full rounded-full border-2 border-white bg-white/20 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back! 👋</h2>
              <p className="text-theme-600 dark:text-theme-400 font-medium">Your Axon Ecosystem is thriving.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-6 h-64">
          <div className="col-span-2 bg-slate-100 dark:bg-slate-800 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-theme-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Activity Overview</h3>
            <div className="w-full h-32 bg-gradient-to-r from-theme-400 to-purple-500 rounded-xl rounded-b-none clip-path-chart mt-auto absolute bottom-0 inset-x-0 opacity-50"></div>
          </div>
          <div className="bg-gradient-to-br from-theme-500 to-blue-600 rounded-2xl p-6 text-white flex flex-col justify-center items-center shadow-lg shadow-theme-500/30">
             <Calendar className="w-12 h-12 mb-4" />
             <span className="text-4xl font-black">5</span>
             <span className="font-medium">Events Today</span>
          </div>
        </div>
      </GlassPanel>

      {/* Orbiting Widgets */}
      <OrbitingWidget icon={Bell} color="from-rose-500 to-pink-600" title="New Alert" desc="Exam in 2 days" progress={progress} angle={0} radius={450} delay={0} />
      <OrbitingWidget icon={CheckSquare} color="from-emerald-400 to-teal-500" title="Completed" desc="React Assignment" progress={progress} angle={72} radius={500} delay={1} />
      <OrbitingWidget icon={Brain} color="from-purple-500 to-indigo-600" title="AI Insight" desc="Study time optimal" progress={progress} angle={144} radius={400} delay={2} />
      <OrbitingWidget icon={Clock} color="from-amber-400 to-orange-500" title="Reminder" desc="Submit draft soon" progress={progress} angle={216} radius={550} delay={3} />
      <OrbitingWidget icon={Activity} color="from-blue-400 to-cyan-500" title="Performance" desc="+12% this week" progress={progress} angle={288} radius={480} delay={4} />

    </motion.div>
  )
}

// --- Scene 2: Timetable Waterfall ---
const WaterfallScene = ({ progress }) => {
  // Scene active 0.25 - 0.5
  const opacity = useTransform(progress, [0.25, 0.3, 0.45, 0.5], [0, 1, 1, 0])
  const y = useTransform(progress, [0.25, 0.5], ['-50%', '50%'])

  const classes = [
    { time: "08:00 AM", name: "Data Structures", room: "Block A", color: "from-blue-500 to-cyan-500", delay: 0 },
    { time: "10:30 AM", name: "Software Engineering", room: "Lab 2", color: "from-purple-500 to-indigo-600", delay: 0.02 },
    { time: "01:00 PM", name: "Machine Learning", room: "Hall B", color: "from-rose-500 to-pink-600", delay: 0.04 },
    { time: "03:30 PM", name: "Web Development", room: "Block C", color: "from-emerald-500 to-teal-500", delay: 0.06 },
    { time: "05:00 PM", name: "Cybersecurity", room: "Lab 1", color: "from-amber-500 to-orange-600", delay: 0.08 },
  ]

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none" style={{ opacity }}>
      <div className="absolute top-20 text-center">
        <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight mb-4 drop-shadow-lg">
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-500 to-purple-600">Perfect Flow.</span>
        </h2>
        <p className="text-xl text-slate-600 dark:text-slate-400 font-medium">Your schedule, cascading seamlessly through your day.</p>
      </div>

      <motion.div className="w-full max-w-5xl flex flex-col gap-6 px-4" style={{ y }}>
        {classes.map((cls, i) => {
          // Staggered Y entry
          const itemY = useTransform(progress, [0.25 + cls.delay, 0.35 + cls.delay], ['100vh', '0vh'])
          const itemOpacity = useTransform(progress, [0.25 + cls.delay, 0.3 + cls.delay], [0, 1])
          
          return (
            <motion.div 
              key={i} 
              className={`p-6 md:p-8 rounded-3xl bg-gradient-to-r ${cls.color} text-white shadow-2xl flex items-center justify-between border border-white/20`}
              style={{ y: itemY, opacity: itemOpacity }}
            >
              <div className="flex items-center gap-6">
                <div className="px-6 py-3 rounded-2xl bg-black/20 backdrop-blur-md text-2xl font-black w-40 text-center">
                  {cls.time}
                </div>
                <div>
                  <h3 className="text-3xl font-bold">{cls.name}</h3>
                  <p className="text-white/80 font-medium text-lg mt-1 flex items-center gap-2">
                    <Calendar className="w-5 h-5" /> {cls.room}
                  </p>
                </div>
              </div>
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <ChevronRight className="w-8 h-8 text-white" />
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}

// --- Scene 3: AI Chat Interactive ---
const ChatScene = ({ progress }) => {
  // Scene active 0.5 - 0.75
  const opacity = useTransform(progress, [0.5, 0.55, 0.7, 0.75], [0, 1, 1, 0])
  
  // Calculate typing progress based on scroll
  const typingProgress = useTransform(progress, [0.55, 0.65], [0, 100])
  const [typedText, setTypedText] = useState("")
  
  const fullText = "I've analyzed your upcoming exams. Based on your performance, you should focus on Database Normalization tonight. I've created a study plan for you!"

  useEffect(() => {
    const unsubscribe = typingProgress.onChange(v => {
      const chars = Math.floor((v / 100) * fullText.length)
      setTypedText(fullText.substring(0, chars))
    })
    return () => unsubscribe()
  }, [typingProgress])

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none" style={{ opacity }}>
      
      {/* Huge Glowing Background Sphere */}
      <div className="absolute w-[800px] h-[800px] bg-gradient-to-r from-theme-600 to-purple-600 rounded-full blur-[120px] opacity-20"></div>

      <div className="w-full max-w-4xl flex flex-col gap-8 relative z-10 px-4">
        
        <div className="text-center mb-4">
           <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-theme-500/20 text-theme-600 dark:text-theme-400 mb-6 border border-theme-500/30 backdrop-blur-xl">
            <Sparkles className="w-12 h-12" />
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-lg">
            Your Personal <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-500 to-purple-600">Genius.</span>
          </h2>
        </div>

        {/* AI Chat Window */}
        <GlassPanel className="w-full bg-slate-900/90 border-slate-700 shadow-[0_0_80px_rgba(37,99,235,0.2)]">
          <div className="p-6 border-b border-slate-800 flex items-center gap-4 bg-black/20">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-theme-500 to-purple-600 flex items-center justify-center shadow-lg shadow-theme-500/30">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Axon AI</h3>
              <p className="text-theme-400 text-sm font-medium">Always online, always helping.</p>
            </div>
          </div>
          
          <div className="p-8 h-80 flex flex-col gap-6">
            
            {/* User Message */}
            <motion.div 
              className="self-end max-w-[80%] bg-theme-600 text-white p-5 rounded-3xl rounded-tr-sm text-lg shadow-xl"
              style={{ 
                opacity: useTransform(progress, [0.52, 0.54], [0, 1]),
                y: useTransform(progress, [0.52, 0.54], [20, 0])
              }}
            >
              How should I prepare for tomorrow?
            </motion.div>

            {/* AI Message */}
            <motion.div 
              className="self-start max-w-[80%] bg-slate-800 text-slate-200 p-5 rounded-3xl rounded-tl-sm text-lg border border-slate-700 shadow-xl relative overflow-hidden"
              style={{ 
                opacity: useTransform(progress, [0.55, 0.57], [0, 1]),
                y: useTransform(progress, [0.55, 0.57], [20, 0])
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-theme-500/10 to-purple-500/10 pointer-events-none"></div>
              {typedText}
              {typedText.length < fullText.length && typedText.length > 0 && (
                <span className="inline-block w-2 h-5 bg-theme-500 ml-1 animate-pulse"></span>
              )}
            </motion.div>
          </div>
        </GlassPanel>
      </div>
    </motion.div>
  )
}

// --- Scene 4: Assignment Matrix ---
const MatrixScene = ({ progress }) => {
  // Scene active 0.75 - 0.9
  const opacity = useTransform(progress, [0.75, 0.8, 0.85, 0.9], [0, 1, 1, 0])
  const scale = useTransform(progress, [0.75, 0.9], [0.8, 1.1])

  const assignments = [
    { title: "React Architecture", due: "Today", stat: "Urgent", color: "from-rose-500 to-red-600" },
    { title: "Database Systems", due: "Tomorrow", stat: "Pending", color: "from-amber-400 to-orange-500" },
    { title: "Ethics Essay", due: "In 3 Days", stat: "Drafting", color: "from-blue-400 to-indigo-500" },
    { title: "ML Model", due: "Next Week", stat: "Testing", color: "from-purple-500 to-fuchsia-600" },
    { title: "UI Design", due: "Next Week", stat: "Completed", color: "from-emerald-400 to-teal-500" },
    { title: "Physics Lab", due: "Next Month", stat: "Not Started", color: "from-slate-400 to-slate-500" },
  ]

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none px-4" style={{ opacity }}>
      <div className="text-center mb-16">
        <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-lg">
          Crush Every <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Deadline.</span>
        </h2>
      </div>

      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl" style={{ scale, perspective: 1200 }}>
        {assignments.map((item, i) => {
          // Flip effect based on scroll
          const flip = useTransform(progress, [0.75 + (i * 0.02), 0.8 + (i * 0.02)], [90, 0])
          
          return (
            <motion.div 
              key={i} 
              className={`h-48 rounded-3xl bg-gradient-to-br ${item.color} p-6 flex flex-col justify-between text-white shadow-2xl border border-white/20`}
              style={{ rotateX: flip, transformStyle: "preserve-3d" }}
            >
              <div className="flex justify-between items-start">
                <span className="px-4 py-1.5 rounded-full bg-black/20 backdrop-blur-md text-sm font-bold tracking-wide">
                  {item.stat}
                </span>
                <CheckSquare className="w-6 h-6 text-white/50" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">{item.title}</h3>
                <p className="text-white/80 font-medium">Due {item.due}</p>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}

// --- Scene 5: The Dual Power Finale ---
const FinaleScene = ({ progress }) => {
  // Scene active 0.9 - 1.0
  const opacity = useTransform(progress, [0.9, 0.95], [0, 1])
  const splitProgress = useTransform(progress, [0.9, 1], [0, 100])

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-50 overflow-hidden pointer-events-auto" style={{ opacity }}>
      
      {/* Student Side (Top Left Diagonal) */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-theme-600 to-purple-800 flex items-start justify-start p-10 md:p-20"
        style={{ clipPath: useTransform(splitProgress, v => `polygon(0 0, 100% 0, 0 ${v}%)`) }}
      >
        <div className="max-w-xl">
          <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-xl flex items-center justify-center mb-8 border border-white/20">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-6xl md:text-8xl font-black text-white leading-tight">For <br/>Students.</h2>
          <p className="text-2xl text-theme-200 mt-6">Unleash your academic potential with intelligent tracking.</p>
        </div>
      </motion.div>

      {/* Manager Side (Bottom Right Diagonal) */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-amber-500 to-red-700 flex items-end justify-end p-10 md:p-20"
        style={{ clipPath: useTransform(splitProgress, v => `polygon(100% 100%, 0 100%, 100% ${100-v}%)`) }}
      >
        <div className="max-w-xl text-right">
          <div className="w-20 h-20 rounded-3xl bg-black/20 backdrop-blur-xl flex items-center justify-center mb-8 border border-black/20 ml-auto">
            <Briefcase className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-6xl md:text-8xl font-black text-white leading-tight">For <br/>Managers.</h2>
          <p className="text-2xl text-amber-200 mt-6">Oversee, analyze, and empower your student body.</p>
        </div>
      </motion.div>

      {/* Center CTA Button */}
      <motion.div 
        className="relative z-10"
        style={{ 
          scale: useTransform(progress, [0.95, 1], [0, 1]),
          opacity: useTransform(progress, [0.95, 0.98], [0, 1])
        }}
      >
        <Link to="/register" className="group relative inline-flex items-center justify-center">
          <div className="absolute inset-0 bg-white rounded-full blur-[40px] opacity-30 group-hover:opacity-60 transition-opacity duration-500"></div>
          <div className="relative bg-white text-slate-900 px-12 py-6 rounded-full text-2xl font-black shadow-[0_0_50px_rgba(255,255,255,0.4)] flex items-center gap-4 transition-transform hover:scale-110 active:scale-95">
            START YOUR JOURNEY <ChevronRight className="w-8 h-8" />
          </div>
        </Link>
      </motion.div>

    </motion.div>
  )
}

export default function LandingHelo() {
  const wrapperRef = useRef(null)
  
  // Massive 1000vh container for ultimate smooth pacing
  const { scrollYProgress } = useScroll({
    container: wrapperRef,
    offset: ["start start", "end end"]
  })

  // Spring smoothing for that heavy, deliberate feel
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 30,
    restDelta: 0.001
  })

  // Vibrant Shifting Background
  const bgColors = useTransform(smoothProgress, 
    [0, 0.25, 0.5, 0.75, 1], 
    [
      'linear-gradient(135deg, #f8fbff 0%, #EEF4FB 100%)', // Light/Theme base
      'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)', // Indigo/Purple
      'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', // Dark AI
      'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)', // Emerald/Cyan
      'linear-gradient(135deg, #000000 0%, #000000 100%)', // Black split bg base
    ]
  )

  return (
    <div ref={wrapperRef} className="h-screen w-full overflow-y-auto overflow-x-hidden scroll-smooth bg-slate-50 dark:bg-slate-950">
      
      {/* Floating Navigation overlay */}
      <div className="fixed top-0 inset-x-0 p-6 z-[100] flex justify-between items-center pointer-events-none">
        <Link to="/" className="pointer-events-auto flex items-center gap-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl hover:scale-105 transition-transform">
          <img src="/icons/logo.png" alt="Axon Logo" className="h-8 w-8 rounded-lg shadow-sm" />
          <span className="font-heading font-black text-xl text-slate-900 dark:text-white tracking-tight">Axon</span>
        </Link>
        <Link to="/register" className="pointer-events-auto bg-gradient-to-r from-theme-500 to-purple-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-theme-500/30 hover:scale-105 transition-transform">
          Get Started
        </Link>
      </div>

      <div className="h-[1000vh] relative">
        <motion.div 
          className="sticky top-0 h-[100dvh] w-full overflow-hidden flex flex-col items-center justify-center"
          style={{ background: bgColors }}
        >
          
          {/* Animated Background Mesh */}
          <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none">
             <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-theme-400 blur-[150px] rounded-full mix-blend-multiply opacity-50 animate-blob"></div>
             <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-purple-400 blur-[150px] rounded-full mix-blend-multiply opacity-50 animate-blob animation-delay-2000"></div>
          </div>

          {/* Sequences */}
          <EcosystemScene progress={smoothProgress} />
          <WaterfallScene progress={smoothProgress} />
          <ChatScene progress={smoothProgress} />
          <MatrixScene progress={smoothProgress} />
          <FinaleScene progress={smoothProgress} />

          {/* Vibrant Scroll Indicator */}
          <motion.div 
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-50 pointer-events-none"
            style={{ opacity: useTransform(smoothProgress, [0.9, 0.95], [1, 0]) }}
          >
            <div className="w-8 h-14 rounded-full border-2 border-slate-400 dark:border-slate-600 flex justify-center p-1">
              <motion.div 
                className="w-2 h-3 bg-theme-500 rounded-full"
                animate={{ y: [0, 16, 0], opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              />
            </div>
            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-500 dark:text-slate-400">Scroll</span>
          </motion.div>

        </motion.div>
      </div>
    </div>
  )
}
