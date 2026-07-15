import { ChevronDown, ChevronsUpDown, MapPin, Plus, Sparkles, Trash2, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ClassTypeBadge from '../components/ClassTypeBadge'
import { useConfirmDialog } from '../components/ConfirmModal'
import EmptyState from '../components/EmptyState'
import ImageUploadAnalyzer from '../components/ImageUploadAnalyzer'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { logActivity } from '../lib/logActivity'
import { supabase } from '../lib/supabase'
import { classColors, days, formatTime } from '../lib/utils'
import { SkeletonTimetable } from '../components/SkeletonLoader'
import { useLanguage } from '../components/LanguageProvider'
import { clearCache, readCache, writeCache } from '../lib/cache'

const initialForm = { subject: '', day: 'Monday', start_time: '09:00', end_time: '10:00', lecturer: '', classroom: '', class_type: 'L', color: 'blue', is_replacement: false, date: '' }
const LIVE_PROFILE_ID = 'account'
const linkedKey = userId => `axon_linked_timetables_${userId}`
const activeKey = userId => `axon_active_timetable_${userId}`
const classesCacheKey = userId => `axon_classes_${userId}`

function readLinkedProfiles(userId) {
  try {
    return JSON.parse(localStorage.getItem(linkedKey(userId)) || '[]')
  } catch {
    return []
  }
}

function saveLinkedProfiles(userId, profiles) {
  localStorage.setItem(linkedKey(userId), JSON.stringify(profiles))
}

export default function TimetablePage() {
  const [user, setUser] = useState(null)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(initialForm)
  const [showForm, setShowForm] = useState(false)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const [linkedProfiles, setLinkedProfiles] = useState([])
  const [activeProfileId, setActiveProfileId] = useState(LIVE_PROFILE_ID)
  const [newProfileName, setNewProfileName] = useState('')
  const [showAddProfileModal, setShowAddProfileModal] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [mobileDay, setMobileDay] = useState(() => {
    const day = new Date().getDay()
    return day >= 1 && day <= 5 ? day - 1 : 0
  })
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fetchGenRef = useRef(0)
  const { showToast } = useToast()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const { t } = useLanguage()
  const activeProfile = activeProfileId === LIVE_PROFILE_ID
    ? { id: LIVE_PROFILE_ID, name: t('timetable.liveProfile'), source: 'live' }
    : linkedProfiles.find(profile => profile.id === activeProfileId)
  const isLiveProfile = activeProfileId === LIVE_PROFILE_ID

  useEffect(() => { initializeTimetables() }, [])
  useEffect(() => {
    if (user) fetchClasses()
  }, [user, activeProfileId])
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') setShowForm(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function initializeTimetables() {
    const { data: { session } } = await supabase.auth.getSession()
    const currentUser = session?.user
    if (!currentUser) {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      setupProfiles(user)
      return
    }
    setupProfiles(currentUser)
  }

  function setupProfiles(currentUser) {
    setUser(currentUser)
    const remoteProfiles = currentUser.user_metadata?.linked_timetables
    const localProfiles = readLinkedProfiles(currentUser.id)
    
    // If remoteProfiles exists in metadata (even if empty []), use it. Otherwise, use local.
    let profiles = remoteProfiles !== undefined ? remoteProfiles : localProfiles
    
    saveLinkedProfiles(currentUser.id, profiles)
    setLinkedProfiles(profiles)
    const savedActive = localStorage.getItem(activeKey(currentUser.id)) || LIVE_PROFILE_ID
    setActiveProfileId(savedActive === LIVE_PROFILE_ID || profiles.some(profile => profile.id === savedActive) ? savedActive : LIVE_PROFILE_ID)
  }

  async function fetchClasses() {
    if (!user) return
    const gen = ++fetchGenRef.current
    
    const today = new Date()
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    if (!isLiveProfile) {
      const freshProfiles = readLinkedProfiles(user.id)
      const freshProfile = freshProfiles.find(p => p.id === activeProfileId)
      let linkedClasses = freshProfile?.classes || []
      const validLinkedClasses = linkedClasses.filter(c => 
        (!c.is_replacement || !c.date || c.date >= todayString) &&
        (!c.profile_id || c.profile_id === activeProfileId)
      )
      
      if (fetchGenRef.current !== gen) return
      if (linkedClasses.length !== validLinkedClasses.length) {
        updateActiveLinkedClasses(validLinkedClasses)
      } else {
        setClasses(linkedClasses)
      }
      setLoading(false)
      return
    }

    let activeUser = user
    const cached = readCache(classesCacheKey(activeUser.id), 10 * 60 * 1000)
    if (cached) {
      const validCached = cached.filter(c => 
        (!c.is_replacement || !c.date || c.date >= todayString) &&
        (!c.profile_id || c.profile_id === 'account' || c.profile_id === LIVE_PROFILE_ID)
      )
      if (fetchGenRef.current !== gen) return
      setClasses(validCached)
      setLoading(false)
    } else {
      setLoading(true)
    }

    const [{ data: authData }, { data }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('classes').select('*').eq('user_id', activeUser.id)
    ])

    if (fetchGenRef.current !== gen) return
    if (authData?.user) {
      activeUser = authData.user
      setUser(authData.user)
    }

    let allReplacements = activeUser.user_metadata?.replacement_classes || []
    const validAllReplacements = allReplacements.filter(r => !r.date || r.date >= todayString)
    const validReplacements = validAllReplacements.filter(r => !r.profile_id || r.profile_id === 'account' || r.profile_id === LIVE_PROFILE_ID)
    
    if (allReplacements.length !== validAllReplacements.length) {
      const { data: updatedAuth } = await supabase.auth.updateUser({ data: { replacement_classes: validAllReplacements } })
      if (fetchGenRef.current !== gen) return
      if (updatedAuth?.user) {
        activeUser = updatedAuth.user
        setUser(updatedAuth.user)
      }
      allReplacements = validAllReplacements
    }

    if (fetchGenRef.current !== gen) return
    const combined = [...(data || []), ...validReplacements]
    writeCache(classesCacheKey(activeUser.id), combined)
    setClasses(combined)
    setLoading(false)
  }

  function switchProfile(profileId) {
    if (!user) return
    setLoading(true)
    setClasses([])
    localStorage.setItem(activeKey(user.id), profileId)
    setActiveProfileId(profileId)
  }

  function persistLinkedProfiles(nextProfiles) {
    if (!user) return
    setLinkedProfiles(nextProfiles)
    saveLinkedProfiles(user.id, nextProfiles)
    supabase.auth.updateUser({ data: { linked_timetables: nextProfiles } })
  }

  function updateActiveLinkedClasses(nextClasses) {
    const freshProfiles = readLinkedProfiles(user.id)
    const nextProfiles = freshProfiles.map(profile =>
      profile.id === activeProfileId ? { ...profile, classes: nextClasses } : profile
    )
    persistLinkedProfiles(nextProfiles)
    setClasses(nextClasses)
  }

  function addLinkedProfile() {
    if (linkedProfiles.length >= 5) return showToast('Maximum 5 linked timetables allowed.', 'error')
    const name = newProfileName.trim()
    if (!name) return showToast(t('timetable.profileRequired'), 'error')
    if (linkedProfiles.some(profile => profile.name.toLowerCase() === name.toLowerCase())) {
      return showToast(t('timetable.profileExists'), 'error')
    }
    const nextProfile = { id: `profile-${Date.now()}`, name, classes: [] }
    persistLinkedProfiles([...linkedProfiles, nextProfile])
    setNewProfileName('')
    setShowAddProfileModal(false)
    switchProfile(nextProfile.id)
    showToast(t('timetable.profileAdded'), 'success')
  }

  async function deleteLinkedProfile(profileId) {
    if (!await confirm({ title: t('timetable.deleteProfileTitle'), message: t('timetable.deleteProfileMessage'), confirmText: t('common.delete') })) return
    const nextProfiles = linkedProfiles.filter(profile => profile.id !== profileId)
    persistLinkedProfiles(nextProfiles)
    if (activeProfileId === profileId) {
      setLoading(true)
      setClasses([])
      switchProfile(LIVE_PROFILE_ID)
    }
    showToast(t('timetable.profileDeleted'), 'success')
  }

  async function addClass(e) {
    e?.preventDefault()
    setIsSubmitting(true)
    
    let finalForm = { ...form }
    if (form.is_replacement) {
      if (!form.date) {
        setIsSubmitting(false)
        return showToast('Please select a date', 'error')
      }
      const [year, month, day] = form.date.split('-').map(Number)
      const dayIndex = new Date(year, month - 1, day).getDay()
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      finalForm.day = dayNames[dayIndex]
    }

    if (!isLiveProfile) {
      const freshProfiles = readLinkedProfiles(user.id)
      const freshProfile = freshProfiles.find(p => p.id === activeProfileId)
      const currentClasses = freshProfile?.classes || []
      updateActiveLinkedClasses([...currentClasses, { ...finalForm, id: `local-${Date.now()}`, profile_id: activeProfileId }])
      showToast(t('timetable.added'), 'success')
      setForm(initialForm)
      setShowForm(false)
      setIsSubmitting(false)
      return
    }
    
    if (finalForm.is_replacement) {
      const { data: authData } = await supabase.auth.getUser()
      const activeUser = authData?.user || user
      if (authData?.user) setUser(authData.user)
      const newReplacement = { ...finalForm, id: `rep-${Date.now()}`, profile_id: LIVE_PROFILE_ID }
      const replacements = activeUser.user_metadata?.replacement_classes || []
      const { data, error } = await supabase.auth.updateUser({ data: { replacement_classes: [...replacements, newReplacement] } })
      if (error) {
        setIsSubmitting(false)
        return showToast(t('timetable.addFailed'), 'error')
      }
      if (data?.user) setUser(data.user)
    } else {
      const { is_replacement, date, ...dbForm } = finalForm
      const { error } = await supabase.from('classes').insert({ ...dbForm, user_id: user.id })
      if (error) {
        setIsSubmitting(false)
        return showToast(t('timetable.addFailed'), 'error')
      }
    }

    await logActivity('Added class', 'class', form.subject)
    clearCache(classesCacheKey(user.id))
    showToast(t('timetable.added'), 'success')
    setForm(initialForm)
    setShowForm(false)
    setIsSubmitting(false)
    fetchClasses()
  }

  async function saveAll(items) {
    const rows = items.map((item, index) => ({ ...item, id: item.id || `local-${Date.now()}-${index}`, color: item.color || classColors[item.class_type] || 'blue', profile_id: isLiveProfile ? LIVE_PROFILE_ID : activeProfileId }))
    if (!isLiveProfile) {
      const freshProfiles = readLinkedProfiles(user.id)
      const freshProfile = freshProfiles.find(p => p.id === activeProfileId)
      const currentClasses = freshProfile?.classes || []
      updateActiveLinkedClasses([...currentClasses, ...rows])
      showToast(t('timetable.savedExtracted'), 'success')
      setAnalyzerOpen(false)
      return
    }
    const liveRows = rows.map(({ id, ...item }) => ({ ...item, user_id: user.id }))
    const { error } = await supabase.from('classes').insert(liveRows)
    if (error) return showToast(t('timetable.saveExtractedFailed'), 'error')
    await Promise.all(liveRows.map(item => logActivity('Added class', 'class', item.subject)))
    clearCache(classesCacheKey(user.id))
    showToast(t('timetable.savedExtracted'), 'success')
    setAnalyzerOpen(false)
    fetchClasses()
  }

  async function deleteClass(id) {
    if (!await confirm({ title: t('timetable.deleteTitle'), message: t('timetable.deleteMessage'), confirmText: t('common.delete') })) return
    const deleted = classes.find(c => c.id === id)
    if (isLiveProfile) {
      if (deleted?.is_replacement) {
         const { data: authData } = await supabase.auth.getUser()
         const activeUser = authData?.user || user
         if (authData?.user) setUser(authData.user)
         const replacements = activeUser.user_metadata?.replacement_classes || []
         const nextReplacements = replacements.filter(r => r.id !== id)
         const { data } = await supabase.auth.updateUser({ data: { replacement_classes: nextReplacements } })
         if (data?.user) setUser(data.user)
      } else {
         await supabase.from('classes').delete().eq('id', id)
      }
      if (deleted) await logActivity('Deleted class', 'class', deleted.subject)
      clearCache(classesCacheKey(user.id))
      setClasses(prev => prev.filter(c => c.id !== id))
    } else {
      const freshProfiles = readLinkedProfiles(user.id)
      const freshProfile = freshProfiles.find(p => p.id === activeProfileId)
      const currentClasses = freshProfile?.classes || []
      updateActiveLinkedClasses(currentClasses.filter(c => c.id !== id))
    }
    showToast(t('timetable.deleted'), 'success')
  }

  async function clearTimetable() {
    if (!await confirm({ title: t('timetable.clearTitle'), message: t('timetable.clearMessage'), confirmText: t('common.clear') })) return
    if (isLiveProfile) {
      const { error } = await supabase.from('classes').delete().eq('user_id', user.id)
      if (error) return showToast(t('timetable.saveExtractedFailed'), 'error')
      const replacements = user.user_metadata?.replacement_classes || []
      const remainingReplacements = replacements.filter(r => r.profile_id && r.profile_id !== 'account' && r.profile_id !== LIVE_PROFILE_ID)
      const { data: updatedAuth } = await supabase.auth.updateUser({ data: { replacement_classes: remainingReplacements } })
      if (updatedAuth?.user) setUser(updatedAuth.user)
      clearCache(classesCacheKey(user.id))
    } else {
      updateActiveLinkedClasses([])
    }
    setClasses([])
    showToast(t('timetable.cleared'), 'success')
  }


  function updateType(type) {
    setForm(prev => ({ ...prev, class_type: type, color: classColors[type] }))
  }

  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })
  }

  const onTouchMove = (e) => setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return
    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > minSwipeDistance
    const isRightSwipe = distanceX < -minSwipeDistance
    
    // Ensure horizontal swipe is more dominant than vertical scroll
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isLeftSwipe) {
        setMobileDay(prev => Math.min(days.length - 1, prev + 1))
      }
      if (isRightSwipe) {
        setMobileDay(prev => Math.max(0, prev - 1))
      }
    }
  }

  return (
    <main 
      className="main-content"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndHandler}
    >
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          {!loading ? (
            <div className="relative flex items-center group">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1.5 focus:outline-none group"
              >
                <h1 className="page-title mb-0 text-white group-hover:opacity-80 transition-opacity">{isLiveProfile ? t('timetable.title') : activeProfile?.name}</h1>
                <ChevronDown className={`h-5 w-5 text-slate-400 group-hover:text-white transition-all duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-56 bg-slate-900 border border-white/10 shadow-xl shadow-black/50 rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1.5 flex flex-col gap-1">
                      <button 
                        onClick={() => { switchProfile(LIVE_PROFILE_ID); setIsDropdownOpen(false); }}
                        className={`flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isLiveProfile ? 'bg-theme-500/20 text-theme-300' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                      >
                        {t('timetable.liveProfile')} {t('timetable.title')}
                      </button>
                      {linkedProfiles.map(p => (
                        <button 
                          key={p.id}
                          onClick={() => { switchProfile(p.id); setIsDropdownOpen(false); }}
                          className={`flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeProfileId === p.id ? 'bg-theme-500/20 text-theme-300' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                        >
                          {p.name}
                        </button>
                      ))}
                      
                      <div className="h-px w-full bg-white/5 my-1" />
                      
                      <button 
                        onClick={() => { setShowAddProfileModal(true); setIsDropdownOpen(false); }}
                        className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg text-theme-400 hover:bg-theme-500/10 transition-colors gap-2"
                      >
                        <Plus className="h-4 w-4" /> {t('timetable.addProfile')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <h1 className="page-title mb-0">{t('timetable.title')}</h1>
          )}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            {!loading && (
              <>
                <button className="md:hidden text-theme-400 hover:text-theme-300 hover:bg-theme-500/10 p-2 rounded-lg transition-colors flex items-center justify-center shrink-0" onClick={() => setAnalyzerOpen(true)} title={t('timetable.extract')}>
                  <Sparkles className="h-5 w-5" />
                </button>
                <button className="md:hidden text-theme-400 hover:text-theme-300 hover:bg-theme-500/10 p-2 rounded-lg transition-colors flex items-center justify-center shrink-0" onClick={() => setShowForm(true)} title={t('timetable.addClass')}>
                  <Plus className="h-5 w-5" />
                </button>
                <div className="hidden md:flex flex-row gap-2">
                  <button className="btn-import justify-center px-3 text-sm" onClick={() => setAnalyzerOpen(true)}>
                    <Sparkles className="h-4 w-4 shrink-0" /> <span className="truncate">{t('timetable.extract')}</span>
                  </button>
                  <button className="btn-add justify-center px-3 text-sm" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 shrink-0" /> <span className="truncate">{t('timetable.addClass')}</span>
                    {isLiveProfile && (
                      <>
                        <span className="h-5 w-px bg-white/25 mx-1" />
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      </>
                    )}
                  </button>
                </div>
                {classes.length > 0 && isLiveProfile && (
                  <button className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 ml-1" onClick={clearTimetable} title={t('timetable.clearAllTitle')}>
                    <Trash2 className="h-5 w-5" /> <span className="text-sm font-medium hidden sm:block">{t('timetable.clear')}</span>
                  </button>
                )}
                {!isLiveProfile && (
                  <button className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 ml-1" onClick={() => deleteLinkedProfile(activeProfileId)} title={t('timetable.deleteProfileTitle')}>
                    <Trash2 className="h-5 w-5" /> <span className="text-sm font-medium hidden sm:block">{t('common.delete')}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>


      </div>
      <Modal isOpen={showAddProfileModal} onClose={() => setShowAddProfileModal(false)} title={t('timetable.addProfile')}>
        <div className="space-y-4">
          <Field label={t('timetable.profileName')}>
            <input className="input" placeholder={t('timetable.profilePlaceholder')} value={newProfileName} onChange={e => setNewProfileName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addLinkedProfile() }} />
          </Field>
          <button className="btn-primary w-full" onClick={addLinkedProfile}>{t('timetable.addProfile')}</button>
        </div>
      </Modal>
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={t('timetable.addClass')} mobileMaxHeight="max-h-[83%]">
        <form onSubmit={addClass} className="space-y-4">
          <Field label={t('timetable.subject')}><input className="input" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></Field>
          <div className="flex items-center gap-2 mb-1 pl-1">
            <input type="checkbox" id="is_replacement" checked={form.is_replacement} onChange={e => setForm({ ...form, is_replacement: e.target.checked, date: '' })} className="rounded border-white/10 bg-[#192436] text-theme-500 focus:ring-theme-500" />
            <label htmlFor="is_replacement" className="text-sm font-medium text-slate-300">Replacement class (specific date)</label>
          </div>
          {form.is_replacement ? (
            <Field label="Date"><input className="input" type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
          ) : (
            <Field label={t('timetable.day')}><select className="input" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>{days.map(d => <option key={d} value={d}>{t(`timetable.days.${d}`)}</option>)}</select></Field>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('timetable.startTime')}><input className="input" type="time" required value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></Field>
            <Field label={t('timetable.endTime')}><input className="input" type="time" required value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></Field>
          </div>
          <Field label={t('timetable.classType')}>
            <div className="grid grid-cols-3 gap-2">{['L', 'T', 'P'].map(type => <button type="button" key={type} onClick={() => updateType(type)} className={`font-medium rounded-xl border px-1 py-3 text-[13px] sm:text-sm tracking-tight truncate ${form.class_type === type ? 'border-theme-500 bg-theme-500/20 text-theme-400' : 'border-white/10 text-slate-400'}`}>{type === 'L' ? t('timetable.lecture') : type === 'T' ? t('timetable.tutorial') : t('timetable.practical')}</button>)}</div>
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('timetable.classroom')}><input className="input" placeholder="e.g. DK1" value={form.classroom} onChange={e => setForm({ ...form, classroom: e.target.value })} /></Field>
            <Field label={t('timetable.lecturer')}><input className="input" placeholder="Name" value={form.lecturer} onChange={e => setForm({ ...form, lecturer: e.target.value })} /></Field>
          </div>
          <button disabled={isSubmitting} className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? t('common.saving') : t('timetable.saveClass')}</button>
        </form>
      </Modal>
      {!loading && classes.length > 0 && (
        <div className="mb-4 flex w-full items-center justify-center md:hidden">
          <div className="flex w-full gap-1.5 px-2">
            {days.map((day, index) => <button key={day} onClick={() => setMobileDay(index)} className={`min-h-[44px] flex-1 rounded-full font-bold text-sm border transition-colors ${mobileDay === index ? 'border-theme-500 bg-theme-500 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{t(`timetable.days.${day}`).slice(0, 3)}</button>)}
          </div>
        </div>
      )}
      <div className="pb-3">
        {loading ? <SkeletonTimetable /> : (
        <div className="w-full">
          {/* Mobile View */}
          {classes.length > 0 && (
          <section className="flex flex-col md:hidden">
            {days.map((day, index) => {
              if (mobileDay !== index) return null;
              const dayClasses = classes.filter(c => c.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
              return (
                <div key={day} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="font-black tracking-wide text-[28px] text-white">
                      {t(`timetable.days.${day}`)}
                    </h2>
                  </div>
                  {dayClasses.length === 0 ? <EmptyState emoji="." message={t('timetable.freeDay')} /> : (
                    <div className="space-y-4">
                      {dayClasses.map(c => <MobileClassTile key={c.id} item={c} onDelete={() => deleteClass(c.id)} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </section>
          )}

          {/* Desktop View */}
          <section className="hidden md:grid gap-4 md:grid-cols-5">
            {days.map((day, index) => {
              const dayClasses = classes.filter(c => c.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
              return (
                <div key={day} className="card">
                  <h2 className="mb-4 font-bold">
                    {t(`timetable.days.${day}`)}
                  </h2>
                  {dayClasses.length === 0 ? <EmptyState emoji="." message={t('timetable.freeDay')} /> : (
                    <div className="space-y-3">
                      {dayClasses.map(c => <DesktopClassTile key={c.id} item={c} onDelete={() => deleteClass(c.id)} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        </div>
        )}
      </div>

      {!loading && classes.length === 0 && (
        <div className="mt-8 flex flex-col md:hidden items-center justify-center text-center px-4 py-16 border border-white/5 bg-white/[0.02] rounded-[32px]">
          <div className="w-16 h-16 bg-theme-500/20 text-theme-400 rounded-full flex items-center justify-center mb-6">
            {isLiveProfile ? <Sparkles className="h-8 w-8" /> : <Plus className="h-8 w-8" />}
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">No classes yet</h2>
          <p className="text-slate-400 max-w-sm mb-8 leading-relaxed">
            {isLiveProfile 
              ? "Get started by importing your timetable from a screenshot, or add your classes manually."
              : "Get started by adding your classes manually."}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <button className="btn-import flex-1 justify-center py-3.5 text-[15px]" onClick={() => setAnalyzerOpen(true)}>
              <Sparkles className="h-5 w-5 shrink-0" /> <span>{t('timetable.extract')}</span>
            </button>
            <button className="btn-add flex-1 justify-center py-3.5 text-[15px]" onClick={() => setShowForm(true)}>
              <Plus className="h-5 w-5 shrink-0" /> <span>{t('timetable.addClass')}</span>
            </button>
          </div>
        </div>
      )}
      <Modal isOpen={analyzerOpen} onClose={() => setAnalyzerOpen(false)} title={t('timetable.importTitle')} maxWidth="max-w-6xl" bodyClassName="overflow-hidden">
        <ImageUploadAnalyzer type="timetable" onResult={saveAll} />
      </Modal>
      {ConfirmDialog}
    </main>
  )
}

function Field({ label, children }) { return <label className="block"><span className="label">{label}</span>{children}</label> }

function DesktopClassTile({ item, onDelete }) {
  const border = item.class_type === 'T' ? 'border-l-emerald-500' : item.class_type === 'P' ? 'border-l-purple-500' : 'border-l-blue-500'
  return (
    <article className={`group relative rounded-xl border border-white/10 bg-[#192436] border-l-4 ${border} p-4 transition-colors hover:bg-[#202e45] shadow-sm`}>
      <button className="btn-danger absolute right-1 top-1 opacity-0 group-hover:opacity-100" onClick={onDelete}><Trash2 className="h-4 w-4" /></button>
      <div className="mb-2 pr-10 flex flex-wrap items-center gap-2">
        <ClassTypeBadge type={item.class_type} />
        {item.is_replacement && <span className="text-[10px] uppercase font-bold bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded-md border border-orange-500/20">Rep: {item.date}</span>}
      </div>
      <h3 className="font-semibold">{item.subject}</h3>
      <p className="muted">{formatTime(item.start_time)} - {formatTime(item.end_time)}</p>
      <p className="muted mt-2 flex items-center gap-2"><MapPin className="h-4 w-4" /> {item.classroom || 'TBA'}</p>
      <p className="muted mt-1 flex items-center gap-2"><User className="h-4 w-4" /> {item.lecturer || 'TBA'}</p>
    </article>
  )
}

function MobileClassTile({ item, onDelete }) {
  const typeColors = {
    L: { border: 'border-l-blue-500', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400' },
    T: { border: 'border-l-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400' },
    P: { border: 'border-l-purple-500', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-400' },
  }
  const colors = typeColors[item.class_type] || typeColors['L']

  const formattedStart = formatTime(item.start_time)
  const formattedEnd = formatTime(item.end_time)

  return (
    <article className="group relative flex gap-3 w-full">
      <div className={`flex flex-col font-black text-[15px] pt-1 shrink-0 w-[70px] text-center ${colors.text}`}>
        <span>{formattedStart}</span>
        <span className="opacity-70 mt-1">{formattedEnd}</span>
      </div>

      <div className={`flex-1 rounded-[20px] border border-white/10 bg-[#192436] p-5 border-l-4 ${colors.border} relative overflow-hidden shadow-sm transition-colors hover:bg-[#202e45]`}>
        <button className="btn-danger absolute right-2 top-2 opacity-0 group-hover:opacity-100 z-10" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </button>
        
        <div className="mb-3 flex flex-wrap items-center gap-2 pr-8">
          <ClassTypeBadge type={item.class_type} />
          {item.is_replacement && <span className="text-[10px] uppercase font-bold bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded-md border border-orange-500/20">Rep: {item.date}</span>}
        </div>
        
        <div className={`flex items-start gap-1.5 mb-2 font-bold text-sm ${colors.text}`}>
          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{item.classroom || 'TBA'}</span>
        </div>
        
        <h3 className="font-black text-white mb-4 uppercase leading-tight tracking-wider text-[15px]">
          {item.subject}
        </h3>
        
        <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
          <User className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.lecturer || 'TBA'}</span>
        </div>
      </div>
    </article>
  )
}
