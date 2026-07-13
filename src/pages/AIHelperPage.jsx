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
  Trash2,
  ImagePlus,
  X
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { buildUserContext } from '../lib/buildUserContext'
import { askGroq, analyzeImageWithGroq } from '../lib/groq'
import { markdownToHtml } from '../lib/utils'
import { useLanguage } from '../components/LanguageProvider'

const studentActions = [
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
  { icon: FileText, mobile: 'Summarize', desktop: 'Summarize feedback', prompt: 'Summarize the recent student feedback' },
  { icon: Sparkles, mobile: 'Draft', desktop: 'Draft announcement', prompt: 'Draft a new announcement' },
  { icon: ListChecks, mobile: 'Review', desktop: 'Review activity', prompt: 'Review recent system activity' }
]

const studentWelcome = {
  role: 'assistant',
  content: `Selamat datang! I am your dedicated AI Study Helper.\n\nHow can I support your software engineering studies today? You can ask me to explain algorithms, summarize notes, generate mock interview questions, or plan out your semester schedules!\n\nNote: I have secure access to your database. You can ask me about your timetable classes, pending assignments, upcoming exams, active reminders, or your academic exam results & CGPA!`,
  timestamp: new Date()
}

const managerWelcome = {
  role: 'assistant',
  content: `Welcome to the Manager AI Control Center!\n\nI have full secure access to your university database. You can ask me to summarize student feedback, draft new announcements, or analyze system overviews!`,
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
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

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
      setMessages(prev => [...prev, { role: 'assistant', content: answer, timestamp: new Date() }])
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
          <button className="ai-clear-button min-h-0 min-w-0 rounded-xl p-2 text-sm transition-colors hover:bg-white/5" style={{ color: 'var(--text-muted)' }} onClick={() => setMessages([welcomeMessage])} aria-label="Clear chat">
            <Trash2 className="h-4 w-4" />
          </button>
        </header>

        <div className="ai-message-list scrollbar-hide flex min-h-0 flex-1 flex-col-reverse gap-3 overflow-y-auto overscroll-contain px-4 py-4 md:px-5 md:py-5">
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
                    <span>{action.mobile}</span>
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
    <div className="ai-message flex justify-end">
      <div className="ai-user-bubble flex flex-col items-end max-w-[86%] break-words rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed text-white md:max-w-[72%]">
        {msg.image && <img src={msg.image} alt="User upload" className="mb-2 max-h-64 rounded-xl object-contain" />}
        {msg.content && <span>{msg.content}</span>}
      </div>
    </div>
  ) : (
    <div className="ai-message flex items-start gap-2.5">
      <div className="ai-avatar flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
        <Bot className="h-4 w-4" />
      </div>
      <div className="ai-assistant-bubble max-w-[95%] break-words rounded-2xl rounded-bl-md px-4 py-3.5 text-sm leading-relaxed md:max-w-[88%] md:px-5 md:py-4">
        {isWelcomeMessage(msg.content) ? <WelcomeContent content={msg.content} /> : <div className="ai-formatted-content w-full" dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} />}
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
  return content.includes('secure access to your database')
}
