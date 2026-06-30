import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { Calendar, CheckSquare, Clock, LayoutDashboard, ChevronRight, User, Bell, Activity, Sparkles, Brain, GraduationCap, Briefcase, FileText, Target, AlertCircle, BookOpen, Star, MessagesSquare } from 'lucide-react'
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
  const orbitProgress = useTransform(progress, [0, 0.15], [0, 360])
  const rotateVal = useTransform(orbitProgress, v => v + angle + (delay * 30))
  
  const x = useTransform(rotateVal, v => Math.cos(v * Math.PI / 180) * radius)
  const y = useTransform(rotateVal, v => Math.sin(v * Math.PI / 180) * radius)
  
  const scale = useTransform(progress, [0, 0.02], [0, 1])

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

// --- Scene 1: Ecosystem Explosion (0 - 0.15) ---
const EcosystemScene = ({ progress }) => {
  // Starts fully visible, no weird white screen!
  const opacity = useTransform(progress, [0, 0.1, 0.15], [1, 1, 0])
  const mainScale = useTransform(progress, [0, 0.15], [1, 1.2])

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none" style={{ opacity }}>
      <GlassPanel className="w-full max-w-4xl p-8 relative z-10" style={{ scale: mainScale }}>
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-theme-500 to-purple-600 p-1 shadow-lg shadow-theme-500/30">
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
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-6 h-64">
          <div className="col-span-2 bg-white dark:bg-slate-800/80 rounded-2xl p-6 relative overflow-hidden group border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col justify-between">
            <div className="absolute inset-0 bg-gradient-to-br from-theme-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Activity Overview</h3>
                <p className="text-sm font-medium text-emerald-500 flex items-center gap-1 mt-1">
                  <Activity className="w-4 h-4" /> +24% this week
                </p>
              </div>
              <div className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-xs font-bold text-slate-500 dark:text-slate-400">
                Weekly
              </div>
            </div>

            {/* Mock Bar Chart */}
            <div className="relative z-10 flex items-end justify-between h-24 mt-4 gap-2 px-2">
              {[40, 70, 45, 90, 65, 80, 50].map((height, i) => (
                <div key={i} className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-t-md relative group/bar">
                  <motion.div 
                    initial={{ height: 0 }}
                    whileInView={{ height: `${height}%` }}
                    transition={{ delay: i * 0.1, duration: 1, type: 'spring' }}
                    className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-theme-600 to-theme-400 rounded-t-md opacity-80 group-hover/bar:opacity-100 transition-opacity"
                  />
                </div>
              ))}
            </div>
            
            <div className="relative z-10 flex justify-between px-2 mt-2 text-[10px] font-bold text-slate-400">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-theme-500 to-purple-600 rounded-2xl p-6 text-white flex flex-col justify-center items-center shadow-xl shadow-theme-500/30 border border-white/20 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
               <Star className="w-24 h-24" />
             </div>
             <Calendar className="w-12 h-12 mb-4 relative z-10" />
             <span className="text-5xl font-black drop-shadow-md relative z-10">5</span>
             <span className="font-bold text-sm mt-2 text-white/90 relative z-10 uppercase tracking-widest">Events Today</span>
          </div>
        </div>
      </GlassPanel>

      {/* Orbiting Widgets (More added for density!) */}
      <OrbitingWidget icon={Bell} color="from-rose-500 to-pink-600" title="New Alert" desc="Exam in 2 days" progress={progress} angle={0} radius={450} delay={0} />
      <OrbitingWidget icon={CheckSquare} color="from-emerald-400 to-teal-500" title="Completed" desc="React Assignment" progress={progress} angle={51} radius={500} delay={1} />
      <OrbitingWidget icon={Brain} color="from-purple-500 to-indigo-600" title="AI Insight" desc="Study time optimal" progress={progress} angle={102} radius={400} delay={2} />
      <OrbitingWidget icon={Clock} color="from-amber-400 to-orange-500" title="Reminder" desc="Submit draft soon" progress={progress} angle={153} radius={550} delay={3} />
      <OrbitingWidget icon={Activity} color="from-blue-400 to-cyan-500" title="Performance" desc="+12% this week" progress={progress} angle={204} radius={480} delay={4} />
      <OrbitingWidget icon={BookOpen} color="from-fuchsia-500 to-pink-600" title="Blog Post" desc="How to ace finals" progress={progress} angle={255} radius={520} delay={5} />
      <OrbitingWidget icon={MessagesSquare} color="from-indigo-400 to-blue-500" title="Feedback" desc="Tutor reviewed" progress={progress} angle={306} radius={430} delay={6} />

    </motion.div>
  )
}

// --- Scene 2: Timetable Waterfall (0.15 - 0.3) ---
const WaterfallScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.15, 0.18, 0.27, 0.3], [0, 1, 1, 0])
  // We remove the container 'y' movement so the flex container stays perfectly centered
  // and the items don't get pushed off the bottom of the screen.

  const classes = [
    { time: "08:00 AM", name: "Data Structures", room: "Block A", color: "from-blue-500 to-cyan-500", delay: 0 },
    { time: "10:30 AM", name: "Software Engineering", room: "Lab 2", color: "from-purple-500 to-indigo-600", delay: 0.015 },
    { time: "01:00 PM", name: "Machine Learning", room: "Hall B", color: "from-rose-500 to-pink-600", delay: 0.03 },
    { time: "03:30 PM", name: "Web Development", room: "Block C", color: "from-emerald-500 to-teal-500", delay: 0.045 },
    { time: "05:00 PM", name: "Cybersecurity", room: "Lab 1", color: "from-amber-500 to-orange-600", delay: 0.06 },
  ]

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none pt-24" style={{ opacity }}>
      <div className="absolute top-8 md:top-12 inset-x-0 text-center z-50">
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight mb-3 drop-shadow-lg">
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-500 to-purple-600">Perfect Flow.</span>
        </h2>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium px-4">Your schedule, cascading seamlessly through your day.</p>
      </div>

      <motion.div className="w-full max-w-5xl flex flex-col gap-4 md:gap-6 px-4 perspective-1000 mt-20 md:mt-32">
        {classes.map((cls, i) => {
          // Adjust timing so the last item finishes moving by progress 0.25 
          // (well before the scene fades out at 0.27)
          const itemY = useTransform(progress, [0.15 + cls.delay, 0.20 + cls.delay], ['100vh', '0vh'])
          const itemOpacity = useTransform(progress, [0.15 + cls.delay, 0.18 + cls.delay], [0, 1])
          const itemRotateX = useTransform(progress, [0.15 + cls.delay, 0.20 + cls.delay], [45, 0])
          
          return (
            <motion.div 
              key={i} 
              className={`p-6 md:p-8 rounded-3xl bg-gradient-to-r ${cls.color} text-white shadow-[0_20px_40px_rgba(0,0,0,0.2)] flex items-center justify-between border border-white/20`}
              style={{ y: itemY, opacity: itemOpacity, rotateX: itemRotateX }}
            >
              <div className="flex items-center gap-4 md:gap-6">
                <div className="px-4 md:px-6 py-2 md:py-3 rounded-2xl bg-black/20 backdrop-blur-md text-xl md:text-2xl font-black w-32 md:w-40 text-center shadow-inner">
                  {cls.time}
                </div>
                <div>
                  <h3 className="text-xl md:text-3xl font-bold drop-shadow-md">{cls.name}</h3>
                  <p className="text-white/90 font-medium text-base md:text-lg mt-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5" /> {cls.room}
                  </p>
                </div>
              </div>
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md shadow-lg border border-white/30 shrink-0 ml-4">
                <ChevronRight className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}

// --- Scene 3: AI Chat Interactive (0.3 - 0.45) ---
const ChatScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.3, 0.33, 0.42, 0.45], [0, 1, 1, 0])
  const typingProgress = useTransform(progress, [0.34, 0.4], [0, 100])
  const [typedText, setTypedText] = useState("")
  
  const fullText = "I've analyzed your upcoming exams. Based on your performance, you should focus on Database Normalization tonight. I've created a custom study plan for you!"

  useEffect(() => {
    const unsubscribe = typingProgress.onChange(v => {
      const chars = Math.floor((v / 100) * fullText.length)
      setTypedText(fullText.substring(0, chars))
    })
    return () => unsubscribe()
  }, [typingProgress])

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none" style={{ opacity }}>
      <div className="absolute w-[800px] h-[800px] bg-gradient-to-r from-theme-600 to-purple-600 rounded-full blur-[120px] opacity-20"></div>

      <div className="w-full max-w-4xl flex flex-col gap-6 relative z-10 px-4">
        <div className="text-center mb-2">
           <div className="inline-flex items-center justify-center p-3 md:p-4 rounded-3xl bg-theme-500/20 text-theme-600 dark:text-theme-400 mb-4 md:mb-6 border border-theme-500/30 backdrop-blur-xl shadow-2xl">
            <Sparkles className="w-8 h-8 md:w-12 md:h-12" />
          </div>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-lg">
            Your Personal <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-500 to-purple-600 drop-shadow-xl">Genius.</span>
          </h2>
        </div>

        <GlassPanel className="w-full bg-slate-900/90 border-slate-700 shadow-[0_0_80px_rgba(37,99,235,0.2)]">
          <div className="p-4 md:p-6 border-b border-slate-800 flex items-center gap-4 bg-black/20">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-tr from-theme-500 to-purple-600 flex items-center justify-center shadow-lg shadow-theme-500/30 border border-white/20 shrink-0">
              <Brain className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">Axon AI</h3>
              <p className="text-theme-400 text-xs md:text-sm font-medium">Always online, always helping.</p>
            </div>
          </div>
          
          <div className="p-6 md:p-8 h-64 md:h-80 flex flex-col gap-4 md:gap-6">
            <motion.div 
              className="self-end max-w-[85%] md:max-w-[80%] bg-theme-600 text-white p-4 md:p-5 rounded-3xl rounded-tr-sm text-base md:text-lg shadow-xl border border-white/10"
              style={{ 
                opacity: useTransform(progress, [0.32, 0.34], [0, 1]),
                y: useTransform(progress, [0.32, 0.34], [20, 0]),
                scale: useTransform(progress, [0.32, 0.34], [0.95, 1])
              }}
            >
              How should I prepare for tomorrow?
            </motion.div>

            <motion.div 
              className="self-start max-w-[80%] bg-slate-800 text-slate-200 p-5 rounded-3xl rounded-tl-sm text-lg border border-slate-700 shadow-xl relative overflow-hidden"
              style={{ 
                opacity: useTransform(progress, [0.34, 0.36], [0, 1]),
                y: useTransform(progress, [0.34, 0.36], [20, 0]),
                scale: useTransform(progress, [0.34, 0.36], [0.95, 1])
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

// --- Scene 4: Assignment Matrix (0.45 - 0.6) ---
const MatrixScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.45, 0.48, 0.57, 0.6], [0, 1, 1, 0])
  const scale = useTransform(progress, [0.45, 0.6], [0.8, 1.1])
  const rotateX = useTransform(progress, [0.45, 0.6], [10, -10]) // Dynamic camera tilt

  const assignments = [
    { title: "React Architecture", due: "Today", stat: "Urgent", color: "from-rose-500 to-red-600" },
    { title: "Database Systems", due: "Tomorrow", stat: "Pending", color: "from-amber-400 to-orange-500" },
    { title: "Ethics Essay", due: "In 3 Days", stat: "Drafting", color: "from-blue-400 to-indigo-500" },
    { title: "ML Model", due: "Next Week", stat: "Testing", color: "from-purple-500 to-fuchsia-600" },
    { title: "UI Design", due: "Next Week", stat: "Completed", color: "from-emerald-400 to-teal-500" },
    { title: "Physics Lab", due: "Next Month", stat: "Not Started", color: "from-slate-400 to-slate-500" },
    { title: "Calculus III", due: "Next Month", stat: "Pending", color: "from-cyan-500 to-blue-600" },
    { title: "History Paper", due: "In 2 Weeks", stat: "Drafting", color: "from-pink-500 to-rose-600" },
    { title: "Group Project", due: "Tomorrow", stat: "Urgent", color: "from-yellow-400 to-amber-600" },
  ]

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none px-4 pt-16" style={{ opacity }}>
      <div className="text-center mb-6 md:mb-10">
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-lg leading-tight">
          Crush Every <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500 drop-shadow-xl">Deadline.</span>
        </h2>
      </div>

      <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-6xl" style={{ scale, rotateX, perspective: 1200 }}>
        {assignments.map((item, i) => {
          // Use a smaller delay multiplier (0.01) so the last item (8 * 0.01 = 0.08)
          // finishes at 0.45 + 0.08 = 0.53, safely before fade out starts at 0.57.
          const flip = useTransform(progress, [0.45 + (i * 0.01), 0.48 + (i * 0.01)], [90, 0])
          return (
            <motion.div 
              key={i} 
              className={`h-40 rounded-3xl bg-gradient-to-br ${item.color} p-6 flex flex-col justify-between text-white shadow-2xl border border-white/30`}
              style={{ rotateX: flip, transformStyle: "preserve-3d" }}
            >
              <div className="flex justify-between items-start">
                <span className="px-4 py-1 rounded-full bg-black/20 backdrop-blur-md text-sm font-bold tracking-wide shadow-inner">
                  {item.stat}
                </span>
                <CheckSquare className="w-6 h-6 text-white/70" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1 drop-shadow-sm">{item.title}</h3>
                <p className="text-white/90 font-bold text-sm">Due {item.due}</p>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}

// --- Scene 5: Exam Countdown (0.6 - 0.75) ---
const ExamScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.6, 0.63, 0.72, 0.75], [0, 1, 1, 0])
  
  const ringScale = useTransform(progress, [0.6, 0.7], [0.5, 2.5])
  const ringRotate = useTransform(progress, [0.6, 0.75], [0, 180])
  
  const yLeft = useTransform(progress, [0.6, 0.75], [300, -300])
  const yRight = useTransform(progress, [0.6, 0.75], [-300, 300])

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none" style={{ opacity }}>
      
      <motion.div 
        className="absolute w-[600px] h-[600px] rounded-full border-[10px] border-dashed border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.3)]"
        style={{ scale: ringScale, rotate: ringRotate }}
      />
      <motion.div 
        className="absolute w-[500px] h-[500px] rounded-full border-4 border-rose-500/80 shadow-[inset_0_0_80px_rgba(244,63,94,0.4),0_0_100px_rgba(244,63,94,0.6)]"
        style={{ scale: useTransform(ringScale, s => s * 0.9) }}
      />

      <motion.div 
        className="relative z-10 text-center"
        style={{ scale: useTransform(progress, [0.6, 0.65], [0.5, 1]) }}
      >
        <div className="inline-flex items-center gap-2 mb-6 px-6 py-2 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold backdrop-blur-md">
          <Target className="w-5 h-5" /> Final Exam Mode
        </div>
        <div className="text-8xl md:text-[10rem] font-black tracking-tighter text-slate-900 dark:text-white leading-none drop-shadow-2xl">
          12:00
        </div>
        <p className="text-3xl text-slate-600 dark:text-slate-300 mt-6 font-black tracking-tight">Hours Remaining.</p>
      </motion.div>

      <motion.div className="absolute left-10 md:left-32 z-20 hidden md:block" style={{ y: yLeft }}>
        <GlassPanel className="p-8 border-rose-500/40 bg-rose-500/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(244,63,94,0.2)] border-[2px]">
          <Target className="w-10 h-10 text-rose-500 mb-4" />
          <h4 className="text-3xl font-black text-slate-900 dark:text-white">Venue: Hall B</h4>
          <p className="text-slate-600 dark:text-slate-400 font-bold text-lg mt-2">Seat 42-A</p>
        </GlassPanel>
      </motion.div>

      <motion.div className="absolute right-10 md:right-32 z-20 hidden md:block" style={{ y: yRight }}>
        <GlassPanel className="p-8 border-purple-500/40 bg-purple-500/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(168,85,247,0.2)] border-[2px]">
          <FileText className="w-10 h-10 text-purple-500 mb-4" />
          <h4 className="text-3xl font-black text-slate-900 dark:text-white">Weightage: 40%</h4>
          <p className="text-slate-600 dark:text-slate-400 font-bold text-lg mt-2">Covers Chapters 1-8</p>
        </GlassPanel>
      </motion.div>

    </motion.div>
  )
}

// --- Scene 6: Reminder Storm (0.75 - 0.9) ---
const ReminderScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.75, 0.78, 0.87, 0.9], [0, 1, 1, 0])
  const textScale = useTransform(progress, [0.75, 0.8], [0.8, 1])

  const reminders = Array.from({ length: 16 }).map((_, i) => ({
    title: ["Buy groceries", "Call Mom", "Pay fees", "Submit draft", "Meeting at 5", "Register classes", "Library book", "Gym session"][i % 8],
    time: ["Today", "Tomorrow", "In 2 hrs", "Next Week", "ASAP"][i % 5],
    color: ["bg-yellow-300 text-yellow-900", "bg-rose-300 text-rose-900", "bg-cyan-300 text-cyan-900", "bg-emerald-300 text-emerald-900", "bg-purple-300 text-purple-900"][i % 5],
    left: `${5 + (i * 5.5)}%`, 
    depth: 0.4 + (Math.random() * 2), // Deeper parallax
    rotation: -25 + (Math.random() * 50)
  }))

  return (
    <motion.div className="absolute inset-0 z-40 pointer-events-none overflow-hidden" style={{ opacity }}>
      <motion.div className="absolute top-12 md:top-20 inset-x-0 text-center z-50 px-4" style={{ scale: textScale }}>
        <h2 className="text-5xl md:text-7xl lg:text-[7rem] font-black text-slate-900 dark:text-white tracking-tight drop-shadow-2xl leading-[1.1]">
          Never Forget <br/>A Single <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-500">Detail.</span>
        </h2>
      </motion.div>

      {reminders.map((rem, i) => {
        const y = useTransform(progress, [0.75, 0.9], ['150vh', `${-120 * rem.depth}vh`])
        
        return (
          <motion.div 
            key={i}
            className={`absolute w-56 p-6 rounded-br-3xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] ${rem.color} border border-white/40`}
            style={{ 
              left: rem.left, 
              y, 
              rotate: rem.rotation,
              scale: 1 / rem.depth,
              zIndex: Math.floor(10 / rem.depth)
            }}
          >
            <AlertCircle className="w-8 h-8 mb-4 opacity-70" />
            <h4 className="text-xl font-black leading-tight mb-2 drop-shadow-sm">{rem.title}</h4>
            <p className="font-bold opacity-70 text-sm">{rem.time}</p>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

// --- Scene 7: The Grand Finale (0.9 - 1.0) ---
const FinaleScene = ({ progress }) => {
  const opacity = useTransform(progress, [0.9, 0.92], [0, 1])
  const scale = useTransform(progress, [0.9, 1], [0.8, 1])

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-auto" style={{ opacity }}>
      
      <motion.div 
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.5),rgba(139,92,246,0.5),transparent_70%)] blur-3xl"
        style={{ scale: useTransform(progress, [0.9, 1], [0.1, 2.5]) }}
      />

      <motion.div className="text-center relative z-10 px-4" style={{ scale }}>
        <div className="inline-block p-4 rounded-[2rem] bg-white/10 backdrop-blur-xl border-2 border-white/30 mb-8 shadow-2xl">
          <img src="/icons/logo.png" alt="Axon" className="w-24 h-24 rounded-2xl shadow-lg" />
        </div>
        
        <h1 className="text-6xl md:text-9xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-6 drop-shadow-2xl">
          Unleash Your <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-500 via-purple-500 to-rose-500">Potential.</span>
        </h1>
        <p className="text-2xl md:text-4xl text-slate-700 dark:text-slate-300 font-bold mb-14 drop-shadow-sm">The ultimate operating system for your academic life.</p>
        
        <Link to="/register" className="group relative inline-flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-theme-500 to-purple-600 rounded-full blur-[40px] opacity-60 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
          <div className="relative bg-gradient-to-r from-theme-500 to-purple-600 text-white px-16 py-8 rounded-full text-3xl font-black shadow-2xl flex items-center gap-4 transition-transform hover:scale-110 active:scale-95 border-[3px] border-white/30">
            GET STARTED NOW <ChevronRight className="w-10 h-10" />
          </div>
        </Link>
      </motion.div>
    </motion.div>
  )
}

// We extract the actual animated content into a child component so we can use hooks
// and attach the useScroll listener to the `#main-scroll-container`
function HeloContent({ containerRef }) {
  // Massive 1400vh container for ultimate smooth pacing of 7 scenes
  const { scrollYProgress } = useScroll({
    container: containerRef,
    offset: ["start start", "end end"]
  })

  // Lower stiffness/damping for even SMOOTHER, heavier, premium feel
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 40,
    damping: 20,
    restDelta: 0.001
  })

  // Vibrant Shifting Background across all 7 scenes
  const bgColors = useTransform(smoothProgress, 
    [0, 0.2, 0.4, 0.6, 0.8, 1], 
    [
      'linear-gradient(135deg, #f8fbff 0%, #EEF4FB 100%)', 
      'linear-gradient(135deg, #f3e8ff 0%, #e0e7ff 100%)', 
      'linear-gradient(135deg, #e0f2fe 0%, #e0e7ff 100%)', 
      'linear-gradient(135deg, #fae8ff 0%, #f3e8ff 100%)', 
      'linear-gradient(135deg, #0f172a 0%, #020617 100%)', 
      'linear-gradient(135deg, #0f172a 0%, #020617 100%)', 
    ]
  )

  const darkBgColors = useTransform(smoothProgress, 
    [0, 0.2, 0.4, 0.6, 0.8, 1], 
    [
      'linear-gradient(135deg, #0f172a 0%, #020617 100%)', 
      'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', 
      'linear-gradient(135deg, #172554 0%, #0f172a 100%)', 
      'linear-gradient(135deg, #2e1065 0%, #0f172a 100%)', 
      'linear-gradient(135deg, #020617 0%, #000000 100%)', 
      'linear-gradient(135deg, #020617 0%, #000000 100%)', 
    ]
  )

  return (
    <div className="w-full relative">
      {/* 1400vh Container for 7 distinct scenes */}
      <div className="h-[1400vh] relative">
        <motion.div 
          className="sticky top-[73px] h-[calc(100dvh-73px)] w-full overflow-hidden flex flex-col items-center justify-center dark:hidden"
          style={{ background: bgColors }}
        >
          {/* Animated Background Mesh - Light Mode */}
          <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none">
             <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-theme-400 blur-[150px] rounded-full mix-blend-multiply opacity-50 animate-blob"></div>
             <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-purple-400 blur-[150px] rounded-full mix-blend-multiply opacity-50 animate-blob animation-delay-2000"></div>
          </div>
          
          <EcosystemScene progress={smoothProgress} />
          <WaterfallScene progress={smoothProgress} />
          <ChatScene progress={smoothProgress} />
          <MatrixScene progress={smoothProgress} />
          <ExamScene progress={smoothProgress} />
          <ReminderScene progress={smoothProgress} />
          <FinaleScene progress={smoothProgress} />
          
          {/* Vibrant Scroll Indicator */}
          <motion.div 
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-50 pointer-events-none"
            style={{ opacity: useTransform(smoothProgress, [0.95, 0.98], [1, 0]) }}
          >
            <div className="w-8 h-14 rounded-full border-2 border-slate-400 dark:border-slate-600 flex justify-center p-1 bg-white/20 backdrop-blur-sm shadow-xl">
              <motion.div 
                className="w-2 h-3 bg-theme-500 rounded-full"
                animate={{ y: [0, 16, 0], opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              />
            </div>
            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-500 drop-shadow-sm">Scroll</span>
          </motion.div>
        </motion.div>

        <motion.div 
          className="sticky top-[73px] h-[calc(100dvh-73px)] w-full overflow-hidden hidden dark:flex flex-col items-center justify-center"
          style={{ background: darkBgColors }}
        >
          {/* Animated Background Mesh - Dark Mode */}
          <div className="absolute inset-0 opacity-20 mix-blend-screen pointer-events-none">
             <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-theme-600 blur-[150px] rounded-full opacity-50 animate-blob"></div>
             <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-purple-600 blur-[150px] rounded-full opacity-50 animate-blob animation-delay-2000"></div>
          </div>
          
          <EcosystemScene progress={smoothProgress} />
          <WaterfallScene progress={smoothProgress} />
          <ChatScene progress={smoothProgress} />
          <MatrixScene progress={smoothProgress} />
          <ExamScene progress={smoothProgress} />
          <ReminderScene progress={smoothProgress} />
          <FinaleScene progress={smoothProgress} />
          
          <motion.div 
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-50 pointer-events-none"
            style={{ opacity: useTransform(smoothProgress, [0.95, 0.98], [1, 0]) }}
          >
            <div className="w-8 h-14 rounded-full border-2 border-slate-600 flex justify-center p-1 bg-black/20 backdrop-blur-sm shadow-xl">
              <motion.div 
                className="w-2 h-3 bg-theme-400 rounded-full"
                animate={{ y: [0, 16, 0], opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              />
            </div>
            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-400 drop-shadow-sm">Scroll</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default function LandingHelo() {
  const [isReady, setIsReady] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    // Find the LandingLayout's main scroll container and attach the framer-motion useScroll to it
    const scrollContainer = document.getElementById('main-scroll-container')
    if (scrollContainer) {
      containerRef.current = scrollContainer
      setIsReady(true)
    }
  }, [])

  if (!isReady) return null

  return <HeloContent containerRef={containerRef} />
}
