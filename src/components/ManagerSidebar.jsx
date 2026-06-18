import { Activity, FileText, LayoutDashboard, LogOut, Megaphone, MoreHorizontal, Settings, Users, X, MessageSquare, Globe, Bot, BookOpen } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { initials } from '../lib/utils'
import { markExplicitLogout } from '../lib/authEvents'

const navItems = [
  { label: 'Dashboard', path: '/manager', icon: LayoutDashboard },
  { label: 'Students', path: '/manager/students', icon: Users },
  { label: 'Announcements', path: '/manager/announcements', icon: Megaphone },
  { label: 'Reports', path: '/manager/reports', icon: FileText },
  { label: 'Activity', path: '/manager/activity', icon: Activity },
  { label: 'Feedback', path: '/manager/feedback', icon: MessageSquare },
  { label: 'Blog Posts', path: '/manager/blog', icon: BookOpen },
  { label: 'AI Helper', path: '/manager/ai-helper', icon: Bot },
  { label: 'Settings', path: '/manager/settings', icon: Settings }
]

export default function ManagerSidebar({ user, profile }) {
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Manager'
  const mainMobile = navItems.filter(item => ['Dashboard', 'Students', 'Announcements', 'AI Helper'].includes(item.label))
  const moreItems = navItems.filter(item => ['Reports', 'Activity', 'Feedback', 'Blog Posts', 'Settings'].includes(item.label))

  async function logout() {
    markExplicitLogout()
    await supabase.auth.signOut()
    navigate('/login')
  }

  const linkClass = ({ isActive }) => `flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
    isActive ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
  }`

  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E293B] p-4 md:flex md:flex-col">
        <div className="mb-7 flex items-center gap-3 px-2">
          <img src="/icons/logo.png" alt="Axon logo" className="h-8 w-8 rounded-lg object-contain" />
          <div>
            <p className="font-heading text-lg font-bold manager-gradient-text">Axon</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manager Portal</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-2">
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} end={item.path === '/manager'} className={linkClass}>
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 rounded-2xl border border-slate-200 dark:border-white/10 p-3">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500 font-semibold text-white">{initials(name)}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{profile?.email || user?.email}</p>
            </div>
          </div>
          <NavLink to="/?view=true" className="mb-2 flex w-fit items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white">
            <Globe className="h-3.5 w-3.5" /> Official Website
          </NavLink>
          <button onClick={logout} className="btn-ghost w-full justify-start text-red-400 hover:bg-red-500/10 hover:text-red-300">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>
      <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 rounded-t-2xl border-t border-slate-200 dark:border-white/10 bg-white/85 dark:bg-navy-950/85 px-2 pt-2 backdrop-blur-xl md:hidden">
        {mainMobile.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/manager'}
            className={({ isActive }) => `nav-item relative flex min-h-[56px] flex-col items-center justify-center rounded-xl text-[11px] font-medium ${isActive ? 'text-amber-500 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {({ isActive }) => <>
              {isActive && <span className="absolute top-1 h-1 w-1 rounded-full bg-amber-400" />}
              <item.icon className="mb-1 h-6 w-6" />
              <span className="max-w-full truncate">{item.label}</span>
            </>}
          </NavLink>
        ))}
        <button onClick={() => setMoreOpen(true)} className="nav-item flex min-h-[56px] flex-col items-center justify-center rounded-xl text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <MoreHorizontal className="mb-1 h-6 w-6" />
          <span>More</span>
        </button>
      </nav>
      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white dark:bg-navy-900 p-4 pb-safe" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between text-slate-900 dark:text-white">
              <p className="font-semibold">More</p>
              <button onClick={() => setMoreOpen(false)} className="rounded-lg p-2"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-2">
              {moreItems.map(item => (
                <NavLink key={item.path} to={item.path} onClick={() => setMoreOpen(false)} className="flex min-h-[52px] items-center gap-3 rounded-xl px-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5">
                  <item.icon className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                  {item.label}
                </NavLink>
              ))}
              <div className="my-2 h-px bg-slate-200 dark:bg-white/10" />
              <NavLink to="/?view=true" onClick={() => setMoreOpen(false)} className="flex min-h-[52px] items-center gap-3 rounded-xl px-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5">
                <Globe className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                Official Website
              </NavLink>
              <button onClick={logout} className="flex min-h-[52px] items-center gap-3 rounded-xl px-3 text-red-400 hover:bg-red-500/10">
                <LogOut className="h-5 w-5 text-red-400" />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
