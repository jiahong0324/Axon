import {
  ArrowUp,
  Bot,
  Brain,
  CalendarClock,
  Code2,
  FileText,
  HelpCircle,
  Languages,
  ListChecks,
  Sparkles,
  Table,
  Trash2,
  ImagePlus,
  X,
  Activity,
  Users,
  Mic,
  Square,
  Loader2
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { buildUserContext } from '../lib/buildUserContext'
import { askGroq, analyzeImageWithGroq, transcribeAudioWithGroq } from '../lib/groq'
import { markdownToHtml } from '../lib/utils'
import { useLanguage } from '../components/LanguageProvider'
import { supabase } from '../lib/supabase'

const studentActions = [
  { icon: Table, mobile: 'Show in table', tKey: 'table' },
  { icon: Brain, mobile: 'Explain', tKey: 'explain' },
  { icon: FileText, mobile: 'Summarize', tKey: 'summarize' },
  { icon: HelpCircle, mobile: 'Quiz me', tKey: 'quiz' },
  { icon: CalendarClock, mobile: 'Study plan', tKey: 'plan' },
  { icon: Languages, mobile: 'Translate', tKey: 'translate' },
  { icon: ListChecks, mobile: 'Prioritize', tKey: 'prioritize' },
  { icon: Sparkles, mobile: 'Notes', tKey: 'notes' },
  { icon: Code2, mobile: 'Code help', tKey: 'code' }
]

const managerActions = [
  { icon: FileText, mobile: 'Summarize', desktop: 'Summarize feedback', prompt: 'Summarize the recent student feedback tickets' },
  { icon: Sparkles, mobile: 'Draft', desktop: 'Draft announcement', prompt: 'Draft a new announcement for students' },
  { icon: Activity, mobile: 'Check-ins', desktop: 'Check-in activity', prompt: 'Show me the recent student check-in and workout activity across all students' },
  { icon: Users, mobile: 'Students', desktop: 'Student overview', prompt: 'Give me an overview of all active students and their assignments/exams' },
  { icon: ListChecks, mobile: 'Review', desktop: 'System activity', prompt: 'Review recent system activity logs across all students' }
]

const studentWelcome = {
  role: 'assistant',
  content: `Selamat datang! I am your dedicated AI Study Helper.\n\nHow can I support your software engineering studies today? You can ask me to explain algorithms, summarize notes, generate mock interview questions, or plan out your semester schedules!\n\nNote: I have secure access to your database. You can ask me about your timetable classes, pending assignments, upcoming exams, active reminders, academic exam results & CGPA, your exercise streak & workout history, or study articles & FAQ from our Public Landing Blog! I also know your Settings profile (University & Major) to tailor tips to your course!`,
  timestamp: new Date()
}

const managerWelcome = {
  role: 'assistant',
  content: `Welcome to the Manager AI Control Center!\n\nI have full secure access to your university database and all student data. You can ask me about student profiles, activity logs, daily check-ins & exercise stats, feedback tickets, announcements, blog posts, assignments, exams, and academic performance reports!`,
  timestamp: new Date()
}

export default function AIHelperPage({ role = 'student' }) {
  const isManager = role === 'manager'
  const welcomeMessage = isManager ? managerWelcome : studentWelcome
  const quickActions = isManager ? managerActions : studentActions
  const { t } = useLanguage()

  const [messages, setMessages] = useState(() => {
    const saved = JSON.parse(localStorage.getItem(isManager ? 'aiManagerChat' : 'aiChat') || '[]')
    return saved.length ? saved : [welcomeMessage]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [syncingCloud, setSyncingCloud] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  useEffect(() => {
    syncAIChatWithSupabase()

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        syncAIChatWithSupabase()
      }
    })

    function handleAutoRefresh() {
      if (document.visibilityState === 'visible') {
        syncAIChatWithSupabase()
      }
    }

    window.addEventListener('visibilitychange', handleAutoRefresh)
    window.addEventListener('focus', handleAutoRefresh)

    const channel = supabase
      .channel('ai-chat-auto-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_ai_chats' }, () => {
        syncAIChatWithSupabase()
      })
      .subscribe()

    return () => {
      authSub?.subscription?.unsubscribe()
      window.removeEventListener('visibilitychange', handleAutoRefresh)
      window.removeEventListener('focus', handleAutoRefresh)
      supabase.removeChannel(channel)
    }
  }, [isManager])

  async function syncAIChatWithSupabase() {
    try {
      setSyncingCloud(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: cloudMessages, error } = await supabase
        .from('student_ai_chats')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_manager', isManager)
        .order('created_at', { ascending: true })

      if (!error && cloudMessages && cloudMessages.length > 0) {
        const formatted = cloudMessages.map(m => ({
          role: m.role,
          content: m.content,
          image: m.image || undefined,
          timestamp: new Date(m.created_at)
        }))
        setMessages(formatted)
        localStorage.setItem(isManager ? 'aiManagerChat' : 'aiChat', JSON.stringify(formatted))
      } else if (!error && (!cloudMessages || cloudMessages.length === 0)) {
        // If Supabase has no messages, upload existing localStorage chat history to cloud
        const localSaved = JSON.parse(localStorage.getItem(isManager ? 'aiManagerChat' : 'aiChat') || '[]')
        const toUpload = localSaved.filter(m => m.content && !isWelcomeMessage(m.content)).map(m => ({
          user_id: user.id,
          role: m.role,
          content: m.content,
          image: m.image || null,
          is_manager: isManager
        }))
        if (toUpload.length > 0) {
          await supabase.from('student_ai_chats').insert(toUpload)
        }
      }
    } catch (err) {
      // Gracefully fall back to localStorage if table not created yet
    } finally {
      setSyncingCloud(false)
    }
  }

  async function saveMessageToCloud(msg) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('student_ai_chats').insert({
        user_id: user.id,
        role: msg.role,
        content: msg.content,
        image: msg.image || null,
        is_manager: isManager
      })
    } catch (e) {
      // Silent catch if table not yet created
    }
  }

  async function clearChatHistory() {
    setMessages([welcomeMessage])
    localStorage.setItem(isManager ? 'aiManagerChat' : 'aiChat', JSON.stringify([welcomeMessage]))
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase
        .from('student_ai_chats')
        .delete()
        .eq('user_id', user.id)
        .eq('is_manager', isManager)
    } catch (e) {}
  }

  function handleImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Compress image before setting to avoid payload limits and timeouts
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const maxDim = 2048
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        setSelectedImage({
          url: dataUrl,
          base64: dataUrl.split(',')[1],
          mimeType: 'image/jpeg'
        })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  function removeImage() {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.url)
      setSelectedImage(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' })
        if (audioBlob.size === 0) return

        setIsTranscribing(true)
        try {
          const reader = new FileReader()
          reader.onloadend = async () => {
            const base64Audio = reader.result?.split(',')[1]
            if (base64Audio) {
              try {
                const text = await transcribeAudioWithGroq(base64Audio, mediaRecorder.mimeType || 'audio/webm')
                if (text) {
                  setInput(prev => prev ? `${prev.trim()} ${text.trim()}` : text.trim())
                  requestAnimationFrame(() => {
                    if (textareaRef.current) {
                      textareaRef.current.focus()
                      textareaRef.current.style.height = '42px'
                      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`
                    }
                  })
                }
              } catch (err) {
                alert(t('ai.voiceError') || 'Could not transcribe voice.')
              } finally {
                setIsTranscribing(false)
              }
            } else {
              setIsTranscribing(false)
            }
          }
          reader.readAsDataURL(audioBlob)
        } catch (e) {
          setIsTranscribing(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      alert(t('ai.voiceError') || 'Microphone access denied or unavailable.')
    }
  }

  function stopVoiceRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  useEffect(() => {
    localStorage.setItem(isManager ? 'aiManagerChat' : 'aiChat', JSON.stringify(messages))
  }, [messages, isManager])

  useEffect(() => {
    if (focused) {
      document.body.classList.add('keyboard-open')
    } else {
      document.body.classList.remove('keyboard-open')
    }
    return () => document.body.classList.remove('keyboard-open')
  }, [focused])

  async function sendMessage() {
    if ((!input.trim() && !selectedImage) || loading) return
    const userText = input.trim()
    const imgData = selectedImage
    const ta = textareaRef.current

    if (ta) {
      ta.blur()
    }

    setTimeout(() => {
      setInput('')
      setSelectedImage(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (ta) ta.style.height = '42px'
    }, 150)

    const newMsg = { role: 'user', content: userText, timestamp: new Date() }
    if (imgData) newMsg.image = `data:${imgData.mimeType};base64,${imgData.base64}`

    setMessages(prev => [...prev, newMsg])
    saveMessageToCloud(newMsg)
    setLoading(true)

    await new Promise(resolve => setTimeout(resolve, 350))

    try {
      let answer = ''
      if (imgData) {
        answer = await analyzeImageWithGroq(imgData.base64, imgData.mimeType, userText || 'Describe this image', messages)
      } else {
        const context = await buildUserContext()
        answer = await askGroq(userText, context, messages)
      }
      const assistantMsg = { role: 'assistant', content: answer, timestamp: new Date() }
      setMessages(prev => [...prev, assistantMsg])
      saveMessageToCloud(assistantMsg)
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Oops! Something went wrong: ${err.message}`, timestamp: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function fillPrompt(prompt) {
    setInput(prompt)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  return (
    <main className="ai-helper-shell scrollbar-hide flex h-full flex-1 flex-col overflow-hidden pt-safe md:h-auto md:flex-row md:gap-5 md:overflow-y-auto md:p-6" style={{ background: 'var(--bg-primary)' }}>
      <aside className="ai-helper-panel card hidden w-64 shrink-0 md:block">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-theme-500/15 text-theme-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold">{t('ai.quickActions')}</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('ai.startTask')}</p>
          </div>
        </div>
        <div className="space-y-2">
          {quickActions.map(action => (
            <button key={action.tKey || action.desktop} className="ai-action-button btn-ghost w-full justify-start text-left text-sm" onClick={() => fillPrompt(action.tKey ? t(`ai.${action.tKey}`) : action.prompt)}>
              <action.icon className="h-4 w-4 text-theme-300" />
              <span>{action.tKey ? t(`ai.${action.tKey}`) : action.desktop}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="ai-chatbox flex min-h-0 flex-1 flex-col overflow-hidden md:card md:p-0">
        <header className="ai-chat-header flex shrink-0 items-center justify-between border-b px-4 py-3 md:px-5 md:py-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-theme-500 to-purple-600 text-white shadow-lg shadow-theme-500/20">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-base font-bold md:text-xl">{t('ai.title')}</h1>
              <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{t('ai.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="ai-clear-button min-h-0 min-w-0 rounded-xl p-2 text-sm transition-colors hover:bg-white/5" style={{ color: 'var(--text-muted)' }} onClick={clearChatHistory} aria-label="Clear chat" title="Clear chat history">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="ai-message-list scrollbar-hide flex min-h-0 flex-1 flex-col-reverse gap-3 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3.5 md:px-5 md:py-5">
          <div className="flex-1" />
          {loading && <TypingIndicator />}
          {[...messages].reverse().map((msg, i) => <Message key={`msg-${messages.length - 1 - i}`} msg={msg} />)}
        </div>

        <div className="ai-composer-wrap shrink-0 border-t backdrop-blur-xl md:border-0" style={{ borderColor: 'var(--border)' }}>
          {!focused && (
            <div className="ai-chip-rail scrollbar-hide overflow-x-auto px-4 pb-2 pt-3 md:hidden">
              <div className="flex w-max gap-2">
                {quickActions.map(action => (
                  <button
                    key={action.tKey || action.mobile}
                    onClick={() => fillPrompt(action.tKey ? t(`ai.${action.tKey}`) : action.prompt)}
                    className="ai-action-chip flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{ minHeight: '34px', minWidth: 'auto' }}
                  >
                    <action.icon className="h-3.5 w-3.5" />
                    <span>{action.tKey ? t(`ai.mobile${action.tKey.charAt(0).toUpperCase() + action.tKey.slice(1)}`) : action.mobile}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`ai-composer transition-all duration-300 ease-out px-4 md:p-3 ${
            focused ? 'pb-[calc(10px+env(safe-area-inset-bottom))] pt-1' : 'pb-[calc(82px+env(safe-area-inset-bottom))] pt-1 md:pb-3'
          }`}>
            {selectedImage && (
              <div className="mb-2 relative h-16 w-16 overflow-hidden rounded-lg border border-white/20 shadow-md">
                <img src={selectedImage.url} alt="Upload preview" className="h-full w-full object-cover" />
                <button 
                  onClick={removeImage} 
                  className="absolute right-1 top-1 flex h-5 w-5 min-h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-md transition-colors hover:bg-black"
                  style={{ padding: 0 }}
                >
                  <X className="h-3 w-3 shrink-0" />
                </button>
              </div>
            )}
            {isRecording && (
              <div className="mb-2 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-medium text-red-300 shadow-sm animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                  <span>{t('ai.voiceListening')}</span>
                </div>
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="rounded-lg bg-red-500 px-2.5 py-1 text-white hover:bg-red-600 transition-colors"
                >
                  Stop
                </button>
              </div>
            )}
            {isTranscribing && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-medium text-purple-300 shadow-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                <span>{t('ai.voiceTranscribing')}</span>
              </div>
            )}
            <div className={`ai-input-frame flex items-end gap-2 rounded-[1.35rem] border p-1.5 transition-all duration-300 ${
              focused ? 'is-focused' : ''
            }`}>
              <button
                type="button"
                className="mb-1 ml-1 flex h-8 w-8 min-h-[32px] min-w-[32px] shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                onClick={() => fileInputRef.current?.click()}
                title="Upload Image"
              >
                <ImagePlus className="h-4 w-4 shrink-0" />
              </button>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
              
              <button
                type="button"
                className={`mb-1 flex h-8 w-8 min-h-[32px] min-w-[32px] shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                  isRecording
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse'
                    : isTranscribing
                    ? 'text-purple-400 bg-purple-500/10'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                disabled={isTranscribing || loading}
                title={t('ai.voiceRecord')}
              >
                {isTranscribing ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : isRecording ? (
                  <Square className="h-3.5 w-3.5 shrink-0 fill-white" />
                ) : (
                  <Mic className="h-4 w-4 shrink-0" />
                )}
              </button>
              
              <textarea
                ref={textareaRef}
                className="scrollbar-hide flex-1 resize-none border-0 bg-transparent px-1 py-2.5 text-base outline-none shadow-none transition-all duration-200 focus:border-0 focus:ring-0 focus:shadow-none"
                style={{ color: 'var(--text-primary)', maxHeight: '128px', height: '42px' }}
                placeholder={t('ai.placeholder')}
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = '42px'
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
              <button
                type="button"
                className="ai-send-button flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-2xl text-white transition-all disabled:opacity-40"
                disabled={loading || (!input.trim() && !selectedImage)}
                onClick={sendMessage}
                onPointerDown={e => e.preventDefault()}
                aria-label="Send message"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return isUser ? (
    <div className="ai-message flex w-full min-w-0 justify-end">
      <div className="ai-user-bubble flex flex-col items-end max-w-[86%] min-w-0 break-words rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm leading-relaxed text-white md:max-w-[72%] md:px-4 md:py-3">
        {msg.image && <img src={msg.image} alt="User upload" className="mb-2 max-h-64 rounded-xl object-contain" />}
        {msg.content && <span className="break-words">{msg.content}</span>}
      </div>
    </div>
  ) : (
    <div className="ai-message flex w-full min-w-0 items-start gap-2 md:gap-2.5">
      <div className="ai-avatar flex h-7 w-7 shrink-0 items-center justify-center rounded-full md:h-8 md:w-8">
        <Bot className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </div>
      <div className="ai-assistant-bubble min-w-0 max-w-[calc(100%-2.25rem)] break-words rounded-2xl rounded-bl-md px-3.5 py-3 text-sm leading-relaxed overflow-hidden md:max-w-[88%] md:px-5 md:py-4">
        {isWelcomeMessage(msg.content) ? <WelcomeContent content={msg.content} /> : <div className="ai-formatted-content w-full min-w-0 overflow-x-auto" dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} />}
      </div>
    </div>
  )
}

function WelcomeContent({ content }) {
  return content.split('\n\n').map((part, i) => {
    if (part.startsWith('Note:')) {
      return <div key={i} className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs leading-relaxed text-yellow-200/90">{part}</div>
    }
    return <p key={i} className="mb-2 last:mb-0">{part}</p>
  })
}

function TypingIndicator() {
  return (
    <div className="ai-message flex items-start gap-2.5">
      <div className="ai-avatar flex h-8 w-8 shrink-0 items-center justify-center rounded-full"><Bot className="h-4 w-4" /></div>
      <div className="ai-assistant-bubble flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-md px-4 py-4">
        <span className="typing-dot h-2 w-2 rounded-full bg-purple-400" />
        <span className="typing-dot h-2 w-2 rounded-full bg-purple-400" />
        <span className="typing-dot h-2 w-2 rounded-full bg-purple-400" />
      </div>
    </div>
  )
}

function isWelcomeMessage(content = '') {
  return content.includes('secure access to your database') || content.includes('secure access to your university database') || content.includes('Welcome to the Manager AI Control Center')
}
