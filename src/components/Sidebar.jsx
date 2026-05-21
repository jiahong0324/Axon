import { Bell, BookOpen, Bot, CalendarDays, CheckSquare, LayoutDashboard, LogOut, MoreHorizontal, Settings, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { initials } from '../lib/utils'

const navItems = [
  { label: 'Home', path: '/', icon: LayoutDashboard },
  { label: 'Timetable', path: '/timetable', icon: CalendarDays },
  { label: 'Assignments', path: '/assignments', icon: CheckSquare },
  { label: 'Exams', path: '/exams', icon: BookOpen },
  { label: 'AI Helper', path: '/ai-helper', icon: Bot },
  { label: 'Reminders', path: '/reminders', icon: Bell },
  { label: 'Settings', path: '/settings', icon: Settings }
]

export default function Sidebar({ user }) {
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const name = user?.user_metadata?.full_name || user?.email || 'Student'
  const mainMobile = navItems.filter(item => ['Home', 'Timetable', 'Assignments', 'AI Helper'].includes(item.label))
  const moreItems = navItems.filter(item => ['Exams', 'Reminders', 'Settings'].includes(item.label))

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const linkClass = ({ isActive }) => `flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
    isActive ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
  }`

  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-white/10 bg-[#1E293B] p-4 md:flex md:flex-col">
        <div className="mb-7 flex items-center gap-3 px-2">
          <img src="/icons/logo.png" alt="UniMind logo" className="h-8 w-8 rounded-lg object-contain" />
          <div>
            <p className="font-heading text-lg font-bold gradient-text">UniMind</p>
            <p className="text-xs text-slate-500">Study command center</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-2">
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} className={linkClass}>
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 rounded-2xl border border-white/10 p-3">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-500 font-semibold text-white">{initials(name)}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="btn-ghost w-full justify-start">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>
      <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 rounded-t-2xl border-t border-white/10 bg-navy-950/85 px-2 pt-2 backdrop-blur-xl md:hidden">
        {mainMobile.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `relative flex min-h-[56px] flex-col items-center justify-center rounded-xl text-[11px] font-medium ${isActive ? 'text-blue-400' : 'text-slate-400'}`}
          >
            {({ isActive }) => <>
              {isActive && <span className="absolute top-1 h-1 w-1 rounded-full bg-blue-400" />}
              <item.icon className="mb-1 h-6 w-6" />
              <span className="max-w-full truncate">{item.label.split(' ')[0]}</span>
            </>}
          </NavLink>
        ))}
        <button onClick={() => setMoreOpen(true)} className="flex min-h-[56px] flex-col items-center justify-center rounded-xl text-[11px] font-medium text-slate-400">
          <MoreHorizontal className="mb-1 h-6 w-6" />
          <span>More</span>
        </button>
      </nav>
      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-navy-900 p-4 pb-safe" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">More</p>
              <button onClick={() => setMoreOpen(false)} className="rounded-lg p-2"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-2">
              {moreItems.map(item => (
                <NavLink key={item.path} to={item.path} onClick={() => setMoreOpen(false)} className="flex min-h-[52px] items-center gap-3 rounded-xl px-3 text-slate-200 hover:bg-white/5">
                  <item.icon className="h-5 w-5 text-blue-400" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
