import { ArrowUp, Bot, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { buildUserContext } from '../lib/buildUserContext'
import { askGroq } from '../lib/groq'
import { markdownToHtml } from '../lib/utils'

const quickActions = [
  { icon: '💡', mobile: 'Explain', desktop: 'Explain a concept simply', prompt: 'Explain a concept simply' },
  { icon: '📄', mobile: 'Summarize', desktop: 'Summarize my notes', prompt: 'Summarize my notes' },
  { icon: '❓', mobile: 'Quiz me', desktop: 'Generate quiz questions', prompt: 'Generate quiz questions' },
  { icon: '📅', mobile: 'Study plan', desktop: 'Make a study plan', prompt: 'Make a study plan' },
  { icon: '🌐', mobile: 'Translate', desktop: 'Translate to Chinese', prompt: 'Translate to Chinese' },
  { icon: '🎯', mobile: 'Prioritize', desktop: 'Help prioritize my tasks', prompt: 'Help prioritize my tasks' },
  { icon: '📝', mobile: 'Notes', desktop: 'Write study notes', prompt: 'Write study notes' },
  { icon: '🔍', mobile: 'Code help', desktop: 'Explain this code', prompt: 'Explain this code' }
]

const welcomeMessage = {
  role: 'assistant',
  content: `Selamat datang! 🎓 I am your dedicated AI Study Helper.\n\nHow can I support your software engineering studies today? You can ask me to explain algorithms, summarize notes, generate mock interview questions, or plan out your semester schedules!\n\n💡 Note: I have secure access to your database. You can ask me about your timetable classes, pending assignments, upcoming exams, or active reminders!`,
  timestamp: new Date()
}

export default function AIHelperPage() {
  const [messages, setMessages] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('aiChat') || '[]')
    return saved.length ? saved : [welcomeMessage]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('aiChat', JSON.stringify(messages))
  }, [messages])

  const scrollToBottom = (behavior = 'smooth') => {
    const container = containerRef.current
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior
      })
    }
  }

  useEffect(() => {
    // Scroll smoothly to the bottom when messages list or loading state changes
    scrollToBottom('smooth')
    
    // A quick secondary scroll to ensure DOM paint changes are fully captured
    const timer = setTimeout(() => scrollToBottom('smooth'), 60)
    return () => clearTimeout(timer)
  }, [messages, loading])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let timer
    const observer = new ResizeObserver(() => {
      // We debounce the resize event so we DO NOT interrupt the smooth scroll animation
      // that is triggered when a new message is added.
      clearTimeout(timer)
      timer = setTimeout(() => {
        scrollToBottom('smooth')
      }, 150)
    })

    observer.observe(container)
    return () => {
      observer.disconnect()
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (focused) {
      document.body.classList.add('keyboard-open')
    } else {
      document.body.classList.remove('keyboard-open')
    }
    return () => document.body.classList.remove('keyboard-open')
  }, [focused])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput('')
    
    // Auto-close the mobile keyboard when sending
    const ta = document.querySelector('textarea')
    if (ta) {
      ta.style.height = '40px'
      ta.blur()
    }
    // We do NOT call setFocused(false) instantly here anymore.
    // Instead, we let the textarea's onBlur handler set it with the 150ms delay.
    // This allows the keyboard closing transition to start smoothly before layout recalculations.
    
    setMessages(prev => [...prev, { role: 'user', content: userText, timestamp: new Date() }])
    setLoading(true)
    
    // Yield the main thread to the browser for 350ms so it can instantly paint the sent message 
    // and allow the heavy mobile keyboard closing animation to completely finish smoothly without CPU contention.
    await new Promise(resolve => setTimeout(resolve, 350))
    
    try {
      const context = await buildUserContext()
      const answer = await askGroq(userText, context)
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

  return (
    <main className="scrollbar-hide flex h-full flex-1 flex-col overflow-hidden pt-safe md:h-auto md:flex-row md:gap-5 md:overflow-y-auto md:p-6" style={{ background: 'var(--bg-primary)' }}>
      <aside className="card hidden w-64 shrink-0 md:block">
        <h2 className="mb-4 font-semibold">Quick Actions</h2>
        <div className="space-y-2">
          {quickActions.map(action => (
            <button key={action.desktop} className="btn-ghost w-full justify-start text-left text-sm" onClick={() => setInput(action.prompt)}>
              <span>{action.icon}</span>
              <span>{action.desktop}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-h-0 flex-1 flex-col md:card md:p-0">
        <header className="flex shrink-0 items-center justify-between border-b p-4" style={{ borderColor: 'var(--border)' }}>
          <h1 className="flex min-w-0 items-center gap-2 font-heading text-base font-bold md:text-xl"><Bot className="h-5 w-5 shrink-0 text-purple-400" /> AI Study Helper</h1>
          <button className="min-h-0 min-w-0 rounded-lg px-3 py-1.5 text-sm" style={{ color: 'var(--text-muted)' }} onClick={() => setMessages([welcomeMessage])}>
            Clear Chat
          </button>
        </header>

        <div 
          ref={containerRef}
          className="scrollbar-hide flex min-h-0 flex-1 flex-col justify-start gap-3 overflow-y-auto overscroll-contain p-4"
        >
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 border-t bg-navy-950/80 backdrop-blur-xl md:bg-transparent md:border-0 md:backdrop-blur-none" style={{ borderColor: 'var(--border)' }}>
          {/* Quick Actions Scrollbar */}
          {!focused && (
            <div className="scrollbar-hide overflow-x-auto px-4 py-2 md:hidden">
              <div className="flex w-max gap-2">
                {quickActions.map(action => (
                  <button
                    key={action.mobile}
                    onClick={() => setInput(action.prompt)}
                    className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-card)', minHeight: '32px', minWidth: 'auto' }}
                  >
                    <span className="text-sm">{action.icon}</span>
                    <span>{action.mobile}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Input Container */}
          <div className={`px-4 pt-1 md:p-3 ${
            focused ? 'pb-2' : 'pb-[calc(76px+env(safe-area-inset-bottom))]'
          }`}>
            <div 
              className={`flex items-end gap-2 rounded-2xl border p-1.5 transition-colors duration-200 ${
                focused ? 'border-blue-500 ring-2 ring-blue-500/20' : ''
              }`}
              style={{ background: 'var(--bg-input)', borderColor: focused ? 'transparent' : 'var(--border)' }}
            >
              <textarea
                className="scrollbar-hide flex-1 resize-none border-0 bg-transparent px-3 py-2 text-base focus:border-0 focus:ring-0 outline-none shadow-none focus:shadow-none"
                style={{ color: 'var(--text-primary)', maxHeight: '120px', height: '40px' }}
                placeholder=""
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = '40px'
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                  setTimeout(() => {
                    setFocused(false)
                  }, 300)
                }}
              />
              <button 
                type="button"
                className="flex h-9 min-h-9 w-9 min-w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white transition-opacity disabled:opacity-40" 
                disabled={loading || !input.trim()} 
                onClick={sendMessage}
                onPointerDown={e => e.preventDefault()}
              >
                <ArrowUp className="h-4 w-4" />
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
    <div className="flex justify-end" style={{ animation: 'fadeInQuick 0.15s ease-out forwards' }}>
      <div className="max-w-[85%] break-words rounded-2xl rounded-br-sm bg-blue-500 px-4 py-3 text-sm leading-relaxed text-white">
        {msg.content}
      </div>
    </div>
  ) : (
    <div className="flex items-start gap-2" style={{ animation: 'fadeIn 0.3s ease-out forwards' }}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
        <Bot className="h-4 w-4 text-purple-400" />
      </div>
      <div className="max-w-[85%] break-words rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
        {isWelcomeMessage(msg.content) ? <WelcomeContent content={msg.content} /> : <div dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} />}
      </div>
    </div>
  )
}

function WelcomeContent({ content }) {
  return content.split('\n\n').map((part, i) => {
    if (part.startsWith('💡')) {
      return <div key={i} className="mt-3 border-l-2 border-yellow-500/60 pl-3 text-xs leading-relaxed text-yellow-300/80">{part}</div>
    }
    return <p key={i} className="mb-2 last:mb-0">{part}</p>
  })
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2" style={{ animation: 'fadeInQuick 0.15s ease-out forwards' }}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20"><Bot className="h-4 w-4 text-purple-400" /></div>
      <div className="flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-sm px-4 py-4" style={{ background: 'var(--bg-card)' }}>
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
