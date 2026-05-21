import { Bell, BookOpen, Bot, CalendarDays, CheckSquare, LayoutDashboard, LogOut, Settings } from 'lucide-react'
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
  const name = user?.user_metadata?.full_name || user?.email || 'Student'

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const linkClass = ({ isActive }) => `flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
    isActive ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
  }`

  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-white/10 bg-navy-950/70 p-4 md:flex md:flex-col">
        <div className="mb-7 flex items-center gap-3 px-2">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 font-bold">U</div>
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
      <nav className="glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 gap-1 rounded-t-2xl px-2 pb-safe pt-2 md:hidden">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `flex min-h-[56px] flex-col items-center justify-center rounded-xl text-[11px] font-medium ${isActive ? 'bg-blue-500 text-white' : 'text-slate-400'}`}
          >
            <item.icon className="mb-1 h-5 w-5" />
            <span className="max-w-full truncate">{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
