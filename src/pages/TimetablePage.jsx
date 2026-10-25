import { ArrowRight, Calendar, ChevronDown, GraduationCap, MapPin, Plus, ShieldCheck, Sparkles, Trash2, User } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { saveSemesterPreferences } from '../lib/preferences'
import SEO from '../components/SEO'
import DateInput from '../components/DateInput'
import TimePicker from '../components/TimePicker'

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

export function getSemesterProgress(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return null

  let start = null
  if (/^\d{4}-\d{2}-\d{2}$/.test(startDateStr)) {
    const [sy, sm, sd] = startDateStr.split('-').map(Number)
    start = new Date(sy, sm - 1, sd, 0, 0, 0, 0)
  }

  let end = null
  if (/^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
    const [ey, em, ed] = endDateStr.split('-').map(Number)
    end = new Date(ey, em - 1, ed, 23, 59, 59, 999)
  }

  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
    return null
  }

  if (start > end) {
    return { isInvalid: true }
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)

  if (end && today > end) {
    return { isEnded: true }
  }

  // Align start date to the Monday of that week
  const startDay = start.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diffToMonday = startDay === 0 ? -6 : 1 - startDay
  const mondayStart = new Date(start)
  mondayStart.setDate(start.getDate() + diffToMonday)
  mondayStart.setHours(0, 0, 0, 0)

  if (today < mondayStart) {
    const msDiff = mondayStart.getTime() - today.getTime()
    const daysUntil = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)))
    return { isUpcoming: true, daysUntil }
  }

  const daysDiff = Math.floor((today.getTime() - mondayStart.getTime()) / (1000 * 60 * 60 * 24))
  const currentWeek = Math.floor(daysDiff / 7) + 1

  const totalDays = Math.floor((end.getTime() - mondayStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7))

  const clampedWeek = Math.min(currentWeek, totalWeeks)
  const remainingWeeks = Math.max(0, totalWeeks - clampedWeek)
  const percentage = Math.min(100, Math.max(0, Math.round((clampedWeek / totalWeeks) * 100)))

  return {
    isOngoing: true,
    currentWeek: clampedWeek,
    totalWeeks,
    remainingWeeks,
    percentage
  }
}

export default function TimetablePage() {
  const [user, setUser] = useState(null)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(initialForm)
  const [showForm, setShowForm] = useState(false)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const [analyzerStep, setAnalyzerStep] = useState('upload')
  const [linkedProfiles, setLinkedProfiles] = useState([])
  const [activeProfileId, setActiveProfileId] = useState(LIVE_PROFILE_ID)
  const [newProfileName, setNewProfileName] = useState('')
  const [showAddProfileModal, setShowAddProfileModal] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [semesterName, setSemesterName] = useState(() => localStorage.getItem('axon_semester_name') || '')
  const [semesterStartDate, setSemesterStartDate] = useState(() => localStorage.getItem('axon_semester_start_date') || '')
  const [semesterEndDate, setSemesterEndDate] = useState(() => localStorage.getItem('axon_semester_end_date') || '')
  const [showSemesterModal, setShowSemesterModal] = useState(false)
  const [semesterForm, setSemesterForm] = useState({ name: '', start_date: '', end_date: '' })
  const [showNewSemesterModal, setShowNewSemesterModal] = useState(false)
  const [showRolloverWizard, setShowRolloverWizard] = useState(false)
  const [rolloverStep, setRolloverStep] = useState(1)
  const [savedArchiveName, setSavedArchiveName] = useState('')
  const hasCheckedRollover = useRef(false)
  const [newSemesterForm, setNewSemesterForm] = useState({ archiveName: '', newName: '', newStartDate: '', newEndDate: '' })
  const [selectedDay, setSelectedDay] = useState(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return dayNames[new Date().getDay()]
  })

  const displayedDays = useMemo(() => {
    const presentDays = new Set(
      classes
        .map(c => (c.day ? c.day.trim().toLowerCase() : ''))
        .filter(Boolean)
    )
    return days.filter(d => presentDays.has(d.toLowerCase()))
  }, [classes])

  const activeMobileDay = useMemo(() => {
    if (displayedDays.length === 0) return 'Monday'
    if (displayedDays.includes(selectedDay)) return selectedDay
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const todayName = dayNames[new Date().getDay()]
    if (displayedDays.includes(todayName)) return todayName
    return displayedDays[0]
  }, [displayedDays, selectedDay])

  const gridColsClass = useMemo(() => {
    const count = displayedDays.length
    if (count <= 1) return 'grid-cols-1 max-w-lg'
    if (count === 2) return 'grid-cols-1 md:grid-cols-2 max-w-3xl'
    if (count === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    if (count === 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    if (count === 5) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
    if (count === 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7'
  }, [displayedDays.length])
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fetchGenRef = useRef(0)
  const { showToast } = useToast()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const { t } = useLanguage()
  const isLiveProfile = activeProfileId === LIVE_PROFILE_ID
  const activeProfile = isLiveProfile
    ? { id: LIVE_PROFILE_ID, name: semesterName ? semesterName : t('timetable.liveProfile'), source: 'live' }
    : linkedProfiles.find(profile => profile.id === activeProfileId)
  const today = new Date()
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const progressInfo = useMemo(() => {
    if (!isLiveProfile) return null
    return getSemesterProgress(semesterStartDate, semesterEndDate)
  }, [isLiveProfile, semesterStartDate, semesterEndDate])
  const previewProgress = useMemo(() => {
    if (!semesterForm.start_date && !semesterForm.end_date) return null
    return getSemesterProgress(semesterForm.start_date, semesterForm.end_date)
  }, [semesterForm.start_date, semesterForm.end_date])
  const newSemesterPreview = useMemo(() => {
    if (!newSemesterForm.newStartDate && !newSemesterForm.newEndDate) return null
    return getSemesterProgress(newSemesterForm.newStartDate, newSemesterForm.newEndDate)
  }, [newSemesterForm.newStartDate, newSemesterForm.newEndDate])
  const isSemesterEnded = isLiveProfile && classes.length > 0 && Boolean(semesterEndDate && /^\d{4}-\d{2}-\d{2}$/.test(semesterEndDate) && todayString > semesterEndDate)

  useEffect(() => { initializeTimetables() }, [])
  useEffect(() => {
    if (user) fetchClasses()

    function handleClassesUpdated() {
      if (user) {
        clearCache(classesCacheKey(user.id))
        fetchClasses()
      }
    }
    window.addEventListener('axon_classes_updated', handleClassesUpdated)
    window.addEventListener('focus', handleClassesUpdated)
    return () => {
      window.removeEventListener('axon_classes_updated', handleClassesUpdated)
      window.removeEventListener('focus', handleClassesUpdated)
    }
  }, [user, activeProfileId])
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setShowForm(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Auto-prompt rollover wizard for existing users whose previous semester ended
  useEffect(() => {
    if (loading || !user || !isLiveProfile || classes.length === 0) return
    if (hasCheckedRollover.current) return

    const needsRollover = isSemesterEnded
    const isDismissed = sessionStorage.getItem('axon_rollover_wizard_dismissed') === 'true'

    if (needsRollover && !isDismissed) {
      hasCheckedRollover.current = true
      openRolloverWizard()
    }
  }, [loading, user, isLiveProfile, classes.length, isSemesterEnded])

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
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setupProfiles(data.user)
    }).catch(() => {})
  }

  function setupProfiles(currentUser) {
    setUser(currentUser)
    const remoteProfiles = currentUser.user_metadata?.linked_timetables
    const localProfiles = readLinkedProfiles(currentUser.id)
    
    // Merge remote and local profiles by id to guarantee zero data loss
    const profileMap = new Map()
    if (Array.isArray(localProfiles)) {
      localProfiles.forEach(p => {
        if (p && p.id) profileMap.set(p.id, p)
      })
    }
    if (Array.isArray(remoteProfiles)) {
      remoteProfiles.forEach(p => {
        if (p && p.id) {
          const existing = profileMap.get(p.id)
          if (!existing || (p.classes?.length || 0) >= (existing.classes?.length || 0)) {
            profileMap.set(p.id, p)
          }
        }
      })
    }
    try {
      const backupPrefix = `axon_archived_backup_${currentUser.id}_`
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(backupPrefix)) {
          const raw = localStorage.getItem(key)
          if (raw) {
            const backedProfile = JSON.parse(raw)
            if (backedProfile && backedProfile.id && !profileMap.has(backedProfile.id)) {
              profileMap.set(backedProfile.id, backedProfile)
            }
          }
        }
      }
    } catch (_) {}
    const profiles = Array.from(profileMap.values())
    
    saveLinkedProfiles(currentUser.id, profiles)
    setLinkedProfiles(profiles)
    const savedActive = localStorage.getItem(activeKey(currentUser.id)) || LIVE_PROFILE_ID
    setActiveProfileId(savedActive === LIVE_PROFILE_ID || profiles.some(profile => profile.id === savedActive) ? savedActive : LIVE_PROFILE_ID)

    const metaSemesterName = currentUser.user_metadata?.semester_name !== undefined
      ? currentUser.user_metadata.semester_name
      : (currentUser.user_metadata?.preferences?.axon_semester_name ?? localStorage.getItem('axon_semester_name') ?? '')
    const metaSemesterStartDate = currentUser.user_metadata?.semester_start_date !== undefined
      ? currentUser.user_metadata.semester_start_date
      : (currentUser.user_metadata?.preferences?.axon_semester_start_date ?? localStorage.getItem('axon_semester_start_date') ?? '')
    const metaSemesterEndDate = currentUser.user_metadata?.semester_end_date !== undefined
      ? currentUser.user_metadata.semester_end_date
      : (currentUser.user_metadata?.preferences?.axon_semester_end_date ?? localStorage.getItem('axon_semester_end_date') ?? '')

    const initialName = String(metaSemesterName ?? '')
    const initialStartDate = String(metaSemesterStartDate ?? '')
    const initialEndDate = String(metaSemesterEndDate ?? '')

    setSemesterName(initialName)
    setSemesterStartDate(initialStartDate)
    setSemesterEndDate(initialEndDate)
    localStorage.setItem('axon_semester_name', initialName)
    localStorage.setItem('axon_semester_start_date', initialStartDate)
    localStorage.setItem('axon_semester_end_date', initialEndDate)
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
      window.hidePrerenderSplash?.()
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
    window.hidePrerenderSplash?.()
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
    setUser(prev => prev ? {
      ...prev,
      user_metadata: {
        ...prev.user_metadata,
        linked_timetables: nextProfiles
      }
    } : prev)
    supabase.auth.updateUser({ data: { linked_timetables: nextProfiles } }).then(({ data: authData }) => {
      if (authData?.user) setUser(authData.user)
    }).catch(err => console.error('Error persisting linked timetables:', err))
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
    if (linkedProfiles.length >= 10) return showToast(t('timetable.maxArchivedReached'), 'error')
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

  function openSemesterModal() {
    setSemesterForm({
      name: semesterName,
      start_date: semesterStartDate,
      end_date: semesterEndDate
    })
    setShowSemesterModal(true)
  }

  function openRolloverWizard() {
    const currentName = semesterName && semesterName !== 'My Timetable' && semesterName !== t('timetable.liveProfile')
      ? semesterName
      : ''
    setNewSemesterForm({
      archiveName: currentName,
      newName: 'My Timetable',
      newStartDate: '',
      newEndDate: ''
    })
    setSavedArchiveName('')
    setRolloverStep(classes.length > 0 ? 1 : 2)
    setShowRolloverWizard(true)
  }

  function openNewSemesterModal() {
    openRolloverWizard()
  }

  function handleDismissRollover() {
    if (rolloverStep === 2) {
      handleFinishNewSemester(false)
      return
    }
    sessionStorage.setItem('axon_rollover_wizard_dismissed', 'true')
    setShowRolloverWizard(false)
    showToast(t('timetable.rolloverDismissToast'), 'info')
  }

  async function handleSaveSemesterSettings(e) {
    e?.preventDefault()
    if (!user) return
    setIsSubmitting(true)
    const nextName = semesterForm.name.trim()
    const nextStartDate = semesterForm.start_date.trim()
    const nextEndDate = semesterForm.end_date.trim()

    setSemesterName(nextName)
    setSemesterStartDate(nextStartDate)
    setSemesterEndDate(nextEndDate)
    localStorage.setItem('axon_semester_name', nextName)
    localStorage.setItem('axon_semester_start_date', nextStartDate)
    localStorage.setItem('axon_semester_end_date', nextEndDate)

    const currentLinked = readLinkedProfiles(user.id)
    const updatedUser = await saveSemesterPreferences(user, {
      name: nextName,
      startDate: nextStartDate,
      endDate: nextEndDate,
      linkedProfiles: currentLinked
    })
    if (updatedUser) {
      setUser(updatedUser)
    }

    setShowSemesterModal(false)
    setIsSubmitting(false)
    showToast(t('timetable.semesterSaved'), 'success')
  }

  async function handleArchiveAndProceed(e) {
    e?.preventDefault()
    if (!user) return

    const archiveLabel = newSemesterForm.archiveName.trim()
    if (classes.length > 0 && !archiveLabel) {
      return showToast(t('timetable.archiveNameRequired'), 'error')
    }

    setIsSubmitting(true)

    const freshProfiles = readLinkedProfiles(user.id)
    let updatedProfiles = [...freshProfiles]

    // 1. If live profile has classes, prepare archived profile
    if (classes.length > 0) {
      if (freshProfiles.length >= 10) {
        setIsSubmitting(false)
        return showToast(t('timetable.maxArchivedReached'), 'error')
      }
      const profileId = `profile-${Date.now()}`
      const archivedProfile = {
        id: profileId,
        name: archiveLabel,
        classes: classes.map(c => ({ ...c, profile_id: profileId })),
        startDate: semesterStartDate || '',
        endDate: semesterEndDate || ''
      }
      updatedProfiles.push(archivedProfile)
      try {
        localStorage.setItem(`axon_archived_backup_${user.id}_${profileId}`, JSON.stringify(archivedProfile))
      } catch (_) {}
    }

    // 2. Persist to local storage and UI state
    saveLinkedProfiles(user.id, updatedProfiles)
    setLinkedProfiles(updatedProfiles)

    // 3. Persist to Supabase Auth FIRST before clearing live classes
    const replacements = user.user_metadata?.replacement_classes || []
    const remainingReplacements = replacements.filter(r => r.profile_id && r.profile_id !== 'account' && r.profile_id !== LIVE_PROFILE_ID)
    const { data: authUpdateResult, error: authErr } = await supabase.auth.updateUser({
      data: {
        replacement_classes: remainingReplacements,
        linked_timetables: updatedProfiles
      }
    })
    if (authErr) {
      console.error('Error saving archived timetable to cloud auth:', authErr)
      setIsSubmitting(false)
      return showToast(t('timetable.startNewSemesterFailed'), 'error')
    }
    if (authUpdateResult?.user) setUser(authUpdateResult.user)

    // 4. Archive is safely stored in cloud & local, now clear live classes in DB
    const { error: dbDeleteErr } = await supabase.from('classes').delete().eq('user_id', user.id)
    if (dbDeleteErr) {
      console.error('Error clearing live classes for new semester:', dbDeleteErr)
      setIsSubmitting(false)
      return showToast(t('timetable.startNewSemesterFailed'), 'error')
    }

    clearCache(classesCacheKey(user.id))
    setClasses([])
    setSavedArchiveName(archiveLabel)
    setIsSubmitting(false)
    showToast(t('timetable.archivedSuccess'), 'success')
    setRolloverStep(2)
  }

  async function handleFinishNewSemester(uploadForAI = false) {
    if (!user) return

    const nextName = newSemesterForm.newName.trim() || 'My Timetable'
    const nextStartDate = newSemesterForm.newStartDate.trim()
    const nextEndDate = newSemesterForm.newEndDate.trim()

    if (nextStartDate && nextEndDate && nextStartDate > nextEndDate) {
      return showToast(t('timetable.invalidDateRange'), 'error')
    }

    setIsSubmitting(true)
    setSemesterName(nextName)
    setSemesterStartDate(nextStartDate)
    setSemesterEndDate(nextEndDate)
    const currentLinked = readLinkedProfiles(user.id)
    const updatedUser = await saveSemesterPreferences(user, {
      name: nextName,
      startDate: nextStartDate,
      endDate: nextEndDate,
      linkedProfiles: currentLinked
    })
    if (updatedUser) {
      setUser(updatedUser)
    }

    sessionStorage.setItem('axon_rollover_wizard_dismissed', 'true')
    setShowRolloverWizard(false)
    setShowNewSemesterModal(false)
    setIsSubmitting(false)
    showToast(t('timetable.newSemesterStarted'), 'success')

    if (uploadForAI) {
      setAnalyzerOpen(true)
    }
  }

  const handleStartNewSemester = handleArchiveAndProceed

  async function promoteToMain(profileId) {
    if (!user || isLiveProfile) return
    const freshProfiles = readLinkedProfiles(user.id)
    const targetProfile = freshProfiles.find(p => p.id === profileId)
    if (!targetProfile) return

    if (!await confirm({
      title: t('timetable.promoteTitle'),
      message: t('timetable.promoteMessage', { name: targetProfile.name }),
      confirmText: t('timetable.promoteConfirm')
    })) return

    setIsSubmitting(true)
    setLoading(true)

    // Fetch current live classes from DB
    const { data: currentLiveClasses } = await supabase.from('classes').select('*').eq('user_id', user.id)

    // If current live has classes, archive them as a profile
    let nextProfiles = freshProfiles.filter(p => p.id !== profileId)
    if (currentLiveClasses && currentLiveClasses.length > 0) {
      const liveArchiveName = semesterName || t('timetable.previousSemester')
      const newArchivedId = `profile-${Date.now()}`
      const archivedProfile = {
        id: newArchivedId,
        name: liveArchiveName,
        classes: currentLiveClasses.map(c => ({ ...c, profile_id: newArchivedId })),
        startDate: semesterStartDate || '',
        endDate: semesterEndDate || ''
      }
      nextProfiles.push(archivedProfile)
      try {
        localStorage.setItem(`axon_archived_backup_${user.id}_${newArchivedId}`, JSON.stringify(archivedProfile))
      } catch (_) {}
    }

    // Clear live classes and insert targetProfile classes
    await supabase.from('classes').delete().eq('user_id', user.id)
    if (targetProfile.classes && targetProfile.classes.length > 0) {
      const liveRows = targetProfile.classes.map(({ id, profile_id, ...item }) => ({
        ...item,
        user_id: user.id
      }))
      const { error: insertErr } = await supabase.from('classes').insert(liveRows)
      if (insertErr) {
        console.error('Error restoring classes into live:', insertErr)
      }
    }

    clearCache(classesCacheKey(user.id))
    const targetStartDate = targetProfile.startDate || ''
    const targetEndDate = targetProfile.endDate || ''
    setSemesterName(targetProfile.name)
    setSemesterStartDate(targetStartDate)
    setSemesterEndDate(targetEndDate)

    const updatedUser = await saveSemesterPreferences(user, {
      name: targetProfile.name,
      startDate: targetStartDate,
      endDate: targetEndDate,
      linkedProfiles: nextProfiles
    })
    if (updatedUser) setUser(updatedUser)

    switchProfile(LIVE_PROFILE_ID)
    setIsSubmitting(false)
    showToast(t('timetable.promotedSuccess'), 'success')
    fetchClasses()
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
    const liveRows = rows.map(({ id, profile_id, ...item }) => ({ ...item, user_id: user.id }))
    const { error } = await supabase.from('classes').insert(liveRows)
    if (error) {
      console.error('Error inserting extracted classes:', error)
      return showToast(t('timetable.saveExtractedFailed'), 'error')
    }
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
      if (error) {
        console.error('Error clearing classes:', error)
        return showToast(t('timetable.clearFailed'), 'error')
      }
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
    if (showForm || analyzerOpen || showAddProfileModal) return
    setTouchEnd(null)
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })
  }

  const onTouchMove = (e) => {
    if (showForm || analyzerOpen || showAddProfileModal) return
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })
  }

  const onTouchEndHandler = () => {
    if (showForm || analyzerOpen || showAddProfileModal) return
    if (!touchStart || !touchEnd) return
    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > minSwipeDistance
    const isRightSwipe = distanceX < -minSwipeDistance
    
    // Ensure horizontal swipe is more dominant than vertical scroll
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      const currentIndex = displayedDays.indexOf(activeMobileDay)
      if (isLeftSwipe && currentIndex < displayedDays.length - 1) {
        setSelectedDay(displayedDays[currentIndex + 1])
      }
      if (isRightSwipe && currentIndex > 0) {
        setSelectedDay(displayedDays[currentIndex - 1])
      }
    }
  }

      {/* Semester progress subtitle element (Apple Calendar style) */}
      const semesterProgressSubtitle = isLiveProfile ? (
        progressInfo?.isOngoing ? (
          <button
            type="button"
            onClick={openSemesterModal}
            className="group inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer text-left py-0"
            title={t('timetable.semesterSettings')}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors">
              {t('timetable.week', { week: progressInfo.currentWeek })}
              <span className="text-slate-400 font-normal"> / {progressInfo.totalWeeks}</span>
            </span>
            {progressInfo.remainingWeeks > 0 && (
              <span className="text-slate-400 font-normal">
                · {t('timetable.weeksLeft', { count: progressInfo.remainingWeeks })}
              </span>
            )}
            <ChevronDown className="h-3 w-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </button>
        ) : isSemesterEnded ? (
          <button
            type="button"
            onClick={openNewSemesterModal}
            className="group inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-white transition-colors cursor-pointer text-left py-0"
            title={t('timetable.startNewSemester')}
          >
            <span className="text-xs">🌴</span>
            <span className="font-medium text-amber-200 group-hover:text-white transition-colors whitespace-nowrap">
              {t('timetable.semesterBreak')}
            </span>
            <ArrowRight className="h-3 w-3 text-amber-300/80 group-hover:text-white transition-transform group-hover:translate-x-0.5 shrink-0" />
          </button>
        ) : progressInfo?.isUpcoming ? (
          <button
            type="button"
            onClick={openSemesterModal}
            className="group inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-white transition-colors cursor-pointer text-left py-0"
            title={t('timetable.semesterSettings')}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
            </span>
            <span className="font-medium">
              {t('timetable.semesterUpcoming', { days: progressInfo.daysUntil })}
            </span>
            <ChevronDown className="h-3 w-3 text-blue-400/80 group-hover:text-white transition-colors" />
          </button>
        ) : (
          <button
            type="button"
            onClick={openSemesterModal}
            className="group inline-flex items-center gap-1 text-xs text-slate-400 hover:text-theme-300 transition-colors cursor-pointer text-left py-0"
            title={t('timetable.quickWeekTip')}
          >
            <Sparkles className="h-3 w-3 text-theme-400 group-hover:rotate-12 transition-transform" />
            <span>{t('timetable.setAcademicWeek')} →</span>
          </button>
        )
      ) : (
        <button
          type="button"
          onClick={() => promoteToMain(activeProfileId)}
          className="group inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer text-left py-0"
          title={t('timetable.promoteTitle')}
        >
          <span>{t('timetable.promoteConfirm')}</span>
          <ArrowRight className="h-3 w-3 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
        </button>
      )

      return (
    <>
      <SEO title="Timetable | Axon" description="View and manage your weekly lecture, tutorial, and practical timetable schedule." />
      <main 
        className="main-content"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
      <div className="mb-2 sm:mb-3 md:mb-6 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          {!loading ? (
            <div className="flex flex-col min-w-0 flex-1">
              <div className="relative inline-flex items-center group max-w-full">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="inline-flex items-center gap-1.5 focus:outline-none group text-left max-w-full"
                >
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-heading text-white group-hover:opacity-80 transition-opacity truncate leading-tight">
                    {isLiveProfile ? (semesterName || t('timetable.title')) : activeProfile?.name}
                  </h1>
                  <ChevronDown className={`h-4 w-4 text-slate-400 group-hover:text-white transition-all duration-200 shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
                </button>

                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-60 bg-slate-900 border border-white/10 shadow-xl shadow-black/50 rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-1.5 flex flex-col gap-1">
                        <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                          {t('timetable.timetables')}
                        </div>
                        <button 
                          onClick={() => { switchProfile(LIVE_PROFILE_ID); setIsDropdownOpen(false); }}
                          className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isLiveProfile ? 'bg-theme-500/20 text-theme-300' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                        >
                          <span className="truncate">{semesterName || t('timetable.liveProfile')}</span>
                          {isLiveProfile && <span className="text-[10px] bg-theme-500/30 text-theme-200 px-1.5 py-0.5 rounded font-mono ml-2">Active</span>}
                        </button>
                        {linkedProfiles.map(p => (
                          <button 
                            key={p.id}
                            onClick={() => { switchProfile(p.id); setIsDropdownOpen(false); }}
                            className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeProfileId === p.id ? 'bg-theme-500/20 text-theme-300' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                          >
                            <span className="truncate">{p.name}</span>
                          </button>
                        ))}
                        
                        <div className="h-px w-full bg-white/5 my-1" />

                        {isLiveProfile ? (
                          <>
                            <button 
                              onClick={() => { openSemesterModal(); setIsDropdownOpen(false); }}
                              className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors gap-2"
                            >
                              <Calendar className="h-4 w-4 text-slate-400" /> {t('timetable.semesterSettings')}
                            </button>
                            <button 
                              onClick={() => { openNewSemesterModal(); setIsDropdownOpen(false); }}
                              className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg text-theme-400 hover:bg-theme-500/10 transition-colors gap-2"
                            >
                              <Sparkles className="h-4 w-4" /> {t('timetable.startNewSemester')}
                            </button>
                            <div className="h-px w-full bg-white/5 my-1" />
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => { promoteToMain(activeProfileId); setIsDropdownOpen(false); }}
                              className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors gap-2"
                            >
                              <ArrowRight className="h-4 w-4 text-slate-400" /> {t('timetable.promoteConfirm')}
                            </button>
                            <div className="h-px w-full bg-white/5 my-1" />
                          </>
                        )}
                        
                        <button 
                          onClick={() => { setShowAddProfileModal(true); setIsDropdownOpen(false); }}
                          className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors gap-2"
                        >
                          <Plus className="h-4 w-4" /> {t('timetable.addProfile')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Apple Calendar-style Elegant Subtitle */}
              <div className="-mt-0.5 sm:-mt-1 flex items-center">
                {semesterProgressSubtitle}
              </div>
            </div>
          ) : (
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-heading text-white">{t('timetable.title')}</h1>
          )}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
            {!loading && (
              <>
                <button className="md:hidden text-theme-400 hover:text-theme-300 hover:bg-theme-500/10 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center justify-center shrink-0" onClick={() => setAnalyzerOpen(true)} title={t('timetable.extract')}>
                  <Sparkles className="h-5 w-5" />
                </button>
                <button className="md:hidden text-theme-400 hover:text-theme-300 hover:bg-theme-500/10 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center justify-center shrink-0" onClick={() => setShowForm(true)} title={t('timetable.addClass')}>
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
                  <button className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 ml-0.5 sm:ml-1" onClick={clearTimetable} title={t('timetable.clearAllTitle')}>
                    <Trash2 className="h-5 w-5" /> <span className="text-sm font-medium hidden sm:block">{t('timetable.clear')}</span>
                  </button>
                )}
                {!isLiveProfile && (
                  <button className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 ml-0.5 sm:ml-1" onClick={() => deleteLinkedProfile(activeProfileId)} title={t('timetable.deleteProfileTitle')}>
                    <Trash2 className="h-5 w-5" /> <span className="text-sm font-medium hidden sm:block">{t('common.delete')}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Semester Settings Modal */}
      <Modal isOpen={showSemesterModal} onClose={() => setShowSemesterModal(false)} title={t('timetable.editSemesterTitle')}>
        <form onSubmit={handleSaveSemesterSettings} className="space-y-4">
          <Field label={t('timetable.semesterName')}>
            <input
              className="input"
              placeholder="e.g. 2026 Semester 1"
              value={semesterForm.name}
              onChange={e => setSemesterForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('timetable.semesterStartDate')}>
              <DateInput
                value={semesterForm.start_date}
                onChange={e => setSemesterForm(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </Field>
            <Field label={t('timetable.semesterEndDate')}>
              <DateInput
                value={semesterForm.end_date}
                onChange={e => setSemesterForm(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </Field>
          </div>

          {previewProgress && !previewProgress.isInvalid && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-theme-400 shrink-0" />
                <span>
                  {previewProgress.isEnded
                    ? t('timetable.semesterEnded')
                    : previewProgress.isUpcoming
                    ? t('timetable.semesterUpcoming', { days: previewProgress.daysUntil })
                    : t('timetable.semesterProgressPreview', {
                        total: previewProgress.totalWeeks,
                        current: t('timetable.week', { week: previewProgress.currentWeek })
                      })}
                </span>
              </div>
              {previewProgress.remainingWeeks > 0 && !previewProgress.isEnded && !previewProgress.isUpcoming && (
                <span className="text-emerald-400 font-medium">
                  {t('timetable.weeksLeft', { count: previewProgress.remainingWeeks })}
                </span>
              )}
            </div>
          )}

          <p className="text-xs text-slate-400">{t('timetable.autoPauseDesc')}</p>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowSemesterModal(false)} className="btn-secondary flex-1">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? t('common.saving') : t('timetable.saveSemester')}
            </button>
          </div>
        </form>
      </Modal>


      {/* 2-Step Semester Rollover Wizard Modal */}
      <Modal
        isOpen={showRolloverWizard}
        onClose={handleDismissRollover}
        title={rolloverStep === 1 ? t('timetable.archiveStepTitle') : t('timetable.newSemesterStepTitle')}
        maxWidth="max-w-md"
      >
        {rolloverStep === 1 ? (
          /* STEP 1: Archive Previous Timetable */
          <form onSubmit={handleArchiveAndProceed} className="space-y-4 pt-1">
            {/* Friendly explanation */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25">
                <GraduationCap className="h-5 w-5" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('timetable.archiveNoticeText', { count: classes.length })}
              </p>
            </div>

            {/* Previous Timetable Name (Required) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <span>{t('timetable.oldSemesterNameLabel')}</span>
                <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                className="input py-2.5 px-3.5 text-base"
                placeholder={t('timetable.oldSemesterNamePlaceholder')}
                value={newSemesterForm.archiveName}
                onChange={e => setNewSemesterForm(prev => ({ ...prev, archiveName: e.target.value }))}
                autoFocus={typeof window !== 'undefined' && window.innerWidth >= 768}
              />
              <p className="text-[11px] text-slate-400">
                {t('timetable.archiveNameHelp')}
              </p>
            </div>

            {/* Action Buttons for Step 1 */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? t('common.saving') : t('timetable.saveAndProceedBtn')}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleDismissRollover}
                className="text-xs text-slate-400 hover:text-white py-1 transition-colors text-center"
              >
                {t('timetable.rolloverDismissBtn')}
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: Configure New Semester & AI Upload */
          <div className="space-y-4 pt-1">
            {/* Success archive confirmation badge if archived in step 1 */}
            {savedArchiveName && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{t('timetable.archivedBanner', { name: savedArchiveName })}</span>
              </div>
            )}

            {/* New Semester Timetable Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-300">
                <label className="truncate">{t('timetable.newSemesterNameLabel')}</label>
                <span className="text-[11px] font-normal text-slate-400 shrink-0">{t('timetable.defaultBadge')}</span>
              </div>
              <input
                type="text"
                className="input py-2.5 px-3.5 text-base"
                placeholder="My Timetable"
                value={newSemesterForm.newName}
                onChange={e => setNewSemesterForm(prev => ({ ...prev, newName: e.target.value }))}
                autoFocus={typeof window !== 'undefined' && window.innerWidth >= 768 && !savedArchiveName}
              />
            </div>

            {/* Semester Start Date & End Date */}
            <div className="grid grid-cols-2 gap-2.5">
              <Field label={t('timetable.semesterStartDate')}>
                <DateInput
                  className="input text-sm sm:text-base"
                  value={newSemesterForm.newStartDate}
                  onChange={e => setNewSemesterForm(prev => ({ ...prev, newStartDate: e.target.value }))}
                />
              </Field>
              <Field label={t('timetable.semesterEndDate')}>
                <DateInput
                  className="input text-sm sm:text-base"
                  value={newSemesterForm.newEndDate}
                  onChange={e => setNewSemesterForm(prev => ({ ...prev, newEndDate: e.target.value }))}
                />
              </Field>
            </div>

            {newSemesterPreview && !newSemesterPreview.isInvalid && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-theme-400 shrink-0" />
                  <span>
                    {newSemesterPreview.isUpcoming
                      ? t('timetable.semesterUpcoming', { days: newSemesterPreview.daysUntil })
                      : t('timetable.weekOf', { week: newSemesterPreview.currentWeek, total: newSemesterPreview.totalWeeks })}
                  </span>
                </div>
                {newSemesterPreview.remainingWeeks > 0 && !newSemesterPreview.isEnded && !newSemesterPreview.isUpcoming && (
                  <span className="text-emerald-400 font-medium">
                    {t('timetable.weeksLeft', { count: newSemesterPreview.remainingWeeks })}
                  </span>
                )}
              </div>
            )}

            {newSemesterPreview?.isInvalid && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                <span>⚠️ {t('timetable.invalidDateRange')}</span>
              </div>
            )}

            {/* Action Buttons for Step 2 */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleFinishNewSemester(true)}
                className="btn-primary w-full py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-theme-500/25 transition-all group"
              >
                <Sparkles className="h-4 w-4 text-white group-hover:rotate-12 transition-transform shrink-0" />
                <span className="font-bold text-sm">{isSubmitting ? t('common.saving') : t('timetable.uploadAIBtn')}</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleFinishNewSemester(false)}
                className="text-xs text-slate-400 hover:text-white py-1 transition-colors text-center"
              >
                {t('timetable.manualSetupBtn')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showAddProfileModal} onClose={() => setShowAddProfileModal(false)} title={t('timetable.addProfile')}>
        <div className="space-y-4">
          <Field label={t('timetable.profileName')}>
            <input className="input" placeholder={t('timetable.profilePlaceholder')} value={newProfileName} onChange={e => setNewProfileName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addLinkedProfile() }} />
          </Field>
          <button className="btn-primary w-full" onClick={addLinkedProfile}>{t('timetable.addProfile')}</button>
        </div>
      </Modal>
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={t('timetable.addClass')} mobileMaxHeight="form">
        <form onSubmit={addClass} className="space-y-4">
          <Field label={t('timetable.subject')}><input className="input" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></Field>
          <div className="flex items-center gap-2 mb-1 pl-1">
            <input type="checkbox" id="is_replacement" checked={form.is_replacement} onChange={e => setForm({ ...form, is_replacement: e.target.checked, date: '' })} className="rounded border-white/10 bg-[#192436] text-theme-500 focus:ring-theme-500" />
            <label htmlFor="is_replacement" className="text-sm font-medium text-slate-300">Replacement class (specific date)</label>
          </div>
          {form.is_replacement ? (
            <Field label="Date"><DateInput required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
          ) : (
            <Field label={t('timetable.day')}><select className="input" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>{days.map(d => <option key={d} value={d}>{t(`timetable.days.${d}`)}</option>)}</select></Field>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('timetable.startTime')}><TimePicker value={form.start_time} onChange={val => setForm({ ...form, start_time: val })} title={t('timetable.startTime')} /></Field>
            <Field label={t('timetable.endTime')}><TimePicker value={form.end_time} onChange={val => setForm({ ...form, end_time: val })} title={t('timetable.endTime')} /></Field>
          </div>
          <Field label={t('timetable.classType')}>
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: 'L', label: t('timetable.lecture') },
                { type: 'T', label: t('timetable.tutorial') },
                { type: 'P', label: t('timetable.practical') },
                { type: 'C', label: 'Class' }
              ].map(({ type, label }) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => updateType(type)}
                  className={`font-medium rounded-xl border px-1 py-3 text-[13px] sm:text-sm tracking-tight truncate ${form.class_type === type ? 'border-theme-500 bg-theme-500/20 text-theme-400' : 'border-white/10 text-slate-400'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('timetable.classroom')}><input className="input" placeholder="e.g. DK1" value={form.classroom} onChange={e => setForm({ ...form, classroom: e.target.value })} /></Field>
            <Field label={t('timetable.lecturer')}><input className="input" placeholder="Name" value={form.lecturer} onChange={e => setForm({ ...form, lecturer: e.target.value })} /></Field>
          </div>
          <button disabled={isSubmitting} className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? t('common.saving') : t('timetable.saveClass')}</button>
        </form>
      </Modal>
      {!loading && classes.length > 0 && displayedDays.length > 0 && (
        <div className="mb-4 flex w-full items-center justify-center md:hidden">
          <div className="flex w-full gap-1.5 px-2">
            {displayedDays.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`min-h-[44px] flex-1 rounded-full font-bold text-sm border transition-colors ${
                  activeMobileDay === day
                    ? 'border-theme-500 bg-theme-500 text-white'
                    : 'border-white/10 text-slate-400 hover:bg-white/5'
                }`}
              >
                {t(`timetable.days.${day}`).slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pb-3">
        {loading ? <SkeletonTimetable /> : (
        <div className="w-full">
          {/* Mobile View */}
          {classes.length > 0 && (
          <section className="flex flex-col md:hidden">
            {displayedDays.map(day => {
              if (activeMobileDay !== day) return null;
              const dayClasses = classes
                .filter(c => c.day?.toLowerCase() === day.toLowerCase())
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
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
          {classes.length > 0 && (
          <section className={`hidden md:grid gap-4 ${gridColsClass}`}>
            {displayedDays.map(day => {
              const dayClasses = classes
                .filter(c => c.day?.toLowerCase() === day.toLowerCase())
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
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
          )}
        </div>
        )}
      </div>

      {!loading && classes.length === 0 && (
        <div className="mt-8 flex flex-col items-center justify-center text-center px-4 py-16 border border-white/5 bg-white/[0.02] rounded-[32px]">
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
      <Modal
        isOpen={analyzerOpen}
        onClose={() => { setAnalyzerOpen(false); setAnalyzerStep('upload') }}
        title={t('timetable.importTitle')}
        maxWidth={analyzerStep === 'results' ? 'w-full sm:w-[96vw] sm:max-w-[1440px] 2xl:max-w-[1600px]' : 'max-w-lg'}
        panelClassName={analyzerStep === 'results' ? 'sm:!h-[90vh] sm:!max-h-[90vh]' : ''}
        bodyClassName="overflow-hidden"
        fullScreenMobile={analyzerStep === 'results'}
      >
        <ImageUploadAnalyzer type="timetable" onResult={saveAll} onStepChange={setAnalyzerStep} />
      </Modal>
      {ConfirmDialog}
    </main>
  </>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="label truncate text-xs block">{label}</span>
      {children}
    </label>
  )
}

function DesktopClassTile({ item, onDelete }) {
  const border = item.class_type === 'T' ? 'border-l-emerald-500' : item.class_type === 'P' ? 'border-l-purple-500' : item.class_type === 'C' ? 'border-l-pink-500' : 'border-l-blue-500'
  return (
    <article className={`group relative rounded-xl border border-white/10 bg-[#192436] border-l-4 ${border} p-4 transition-colors hover:bg-[#202e45] shadow-sm`}>
      <button className="btn-danger absolute right-1 top-1 opacity-100 xl:opacity-0 xl:group-hover:opacity-100" onClick={onDelete}><Trash2 className="h-4 w-4" /></button>
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
    C: { border: 'border-l-pink-500', text: 'text-pink-400', badge: 'bg-pink-500/20 text-pink-400' },
  }
  const colors = typeColors[item.class_type] || typeColors['C']

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
