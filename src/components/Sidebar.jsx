import { Award, Bell, BookOpen, Bot, CalendarDays, CheckSquare, LayoutDashboard, LogOut, MoreHorizontal, Settings, X, MessageSquare, Globe } from 'lucide-react'
import { useState } from 'react'
import FeedbackModal from './FeedbackModal'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { initials } from '../lib/utils'
import { useLanguage } from './LanguageProvider'
import { markExplicitLogout } from '../lib/authEvents'

const navItems = [
  { label: 'Home', tKey: 'sidebar.home', path: '/home', icon: LayoutDashboard },
  { label: 'Timetable', tKey: 'sidebar.timetable', path: '/timetable', icon: CalendarDays },
  { label: 'Assignments', tKey: 'sidebar.assignments', path: '/assignments', icon: CheckSquare },
  { label: 'Exams', tKey: 'sidebar.exams', path: '/exams', icon: BookOpen },
  { label: 'Results', tKey: 'sidebar.results', path: '/results', icon: Award },
  { label: 'AI Helper', tKey: 'sidebar.aiHelper', path: '/ai-helper', icon: Bot },
  { label: 'Reminders', tKey: 'sidebar.reminders', path: '/reminders', icon: Bell },
  { label: 'Settings', tKey: 'sidebar.settings', path: '/settings', icon: Settings }
]

export default function Sidebar({ user }) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [moreOpen, setMoreOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const name = user?.user_metadata?.full_name || user?.email || 'Student'
  const mainMobile = navItems.filter(item => ['Home', 'Timetable', 'Assignments', 'AI Helper'].includes(item.label))
  const moreItems = navItems.filter(item => ['Exams', 'Results', 'Reminders', 'Settings'].includes(item.label))

  async function logout() {
    markExplicitLogout()
    await supabase.auth.signOut()
    navigate('/login')
  }

  const linkClass = ({ isActive }) => `student-nav-link flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
    isActive ? 'is-active bg-theme-500 text-white shadow-lg shadow-theme-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
  }`

  return (
    <>
      <aside className="student-sidebar hidden w-60 shrink-0 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E293B] p-4 md:flex md:flex-col">
        <div className="mb-7 flex items-center gap-3 px-2">
          <img src="/icons/logo.png" alt="Axon logo" className="h-8 w-8 rounded-lg object-contain" />
          <div>
            <p className="font-heading text-lg font-bold gradient-text">Axon</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('sidebar.tagline')}</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-2">
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} end={item.path === '/home'} className={linkClass}>
              <item.icon className="h-5 w-5" />
              {item.tKey ? t(item.tKey) : item.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => setFeedbackOpen(true)} className="feedback-button mb-4 flex min-h-[48px] items-center gap-3 rounded-xl border border-theme-500/20 bg-theme-500/10 px-3 text-sm font-medium text-theme-400 transition-colors hover:bg-theme-500/20">
          <MessageSquare className="h-5 w-5" />
          {t('common.feedback')}
        </button>
        <div className="student-profile-card rounded-2xl border border-slate-200 dark:border-white/10 p-3">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-theme-500 font-semibold text-white">{initials(name)}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
          <NavLink to="/?view=true" className="mb-2 flex w-fit items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white">
            <Globe className="h-3.5 w-3.5" /> {t('common.officialWebsite')}
          </NavLink>
          <button onClick={logout} className="btn-ghost w-full justify-start text-red-400 hover:bg-red-500/10 hover:text-red-300">
            <LogOut className="h-4 w-4" /> {t('sidebar.logout')}
          </button>
        </div>
      </aside>
      <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 rounded-t-2xl border-t border-slate-200 dark:border-white/10 bg-white/85 dark:bg-navy-950/85 px-2 pt-2 backdrop-blur-xl md:hidden">
        {mainMobile.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/home'}
            className={({ isActive }) => `nav-item relative flex min-h-[56px] flex-col items-center justify-center rounded-xl text-[11px] font-medium ${isActive ? 'text-theme-500 dark:text-theme-400' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {({ isActive }) => <>
              {isActive && <span className="absolute top-1 h-1 w-1 rounded-full bg-theme-400" />}
              <item.icon className="mb-1 h-6 w-6" />
              <span className="max-w-full truncate">{item.tKey ? t(item.tKey) : item.label}</span>
            </>}
          </NavLink>
        ))}
        <button onClick={() => setMoreOpen(true)} className="nav-item flex min-h-[56px] flex-col items-center justify-center rounded-xl text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <MoreHorizontal className="mb-1 h-6 w-6" />
          <span>{t('common.more')}</span>
        </button>
      </nav>
      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white dark:bg-navy-900 p-4 pb-safe" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between text-slate-900 dark:text-white">
              <p className="font-semibold">{t('common.more')}</p>
              <button onClick={() => setMoreOpen(false)} className="rounded-lg p-2"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-2">
              {moreItems.map(item => (
                <NavLink key={item.path} to={item.path} onClick={() => setMoreOpen(false)} className="flex min-h-[52px] items-center gap-3 rounded-xl px-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5">
                  <item.icon className="h-5 w-5 text-theme-500 dark:text-theme-400" />
                  {item.tKey ? t(item.tKey) : item.label}
                </NavLink>
              ))}
              <div className="my-2 h-px bg-slate-200 dark:bg-white/10" />
              <NavLink to="/?view=true" onClick={() => setMoreOpen(false)} className="flex min-h-[52px] items-center gap-3 rounded-xl px-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5">
                <Globe className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                {t('common.officialWebsite')}
              </NavLink>
              <button onClick={logout} className="flex min-h-[52px] items-center gap-3 rounded-xl px-3 text-red-400 hover:bg-red-500/10">
                <LogOut className="h-5 w-5 text-red-400" />
                {t('sidebar.logout')}
              </button>
              <button onClick={() => { setMoreOpen(false); setFeedbackOpen(true) }} className="flex min-h-[52px] items-center gap-3 rounded-xl px-3 text-theme-500 dark:text-theme-400 hover:bg-slate-100 dark:hover:bg-white/5 font-medium">
                <MessageSquare className="h-5 w-5" />
                {t('common.feedback')}
              </button>
            </div>
          </div>
        </div>
      )}
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  )
}
