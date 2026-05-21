import { ArrowUp, Bot, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { buildUserContext } from '../lib/buildUserContext'
import { askGroq } from '../lib/groq'
import { markdownToHtml } from '../lib/utils'

const prompts = [
  '💡 Explain a concept simply',
  '📄 Summarize my notes',
  '❓ Generate quiz questions',
  '📅 Make a study plan',
  '🇨🇳 Translate to Chinese',
  '🎯 Help prioritize my tasks',
  '📝 Write study notes',
  '🔍 Explain this code'
]

const welcomeMessage = {
  role: 'ai',
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
  const bottomRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('aiChat', JSON.stringify(messages))
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userText, timestamp: new Date() }])
    setLoading(true)
    try {
      const context = await buildUserContext()
      const answer = await askGroq(userText, context)
      setMessages(prev => [...prev, { role: 'assistant', content: answer, timestamp: new Date() }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I could not reach the AI service right now. Check your Groq API key and try again.', timestamp: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="main-content flex gap-5">
      <aside className="card hidden w-64 shrink-0 md:block">
        <h2 className="mb-4 font-semibold">Quick Actions</h2>
        <div className="space-y-2">
          {prompts.map(prompt => <button key={prompt} className="btn-ghost w-full justify-start text-left text-sm" onClick={() => setInput(prompt)}>{prompt}</button>)}
        </div>
      </aside>
      <section className="card flex min-h-[calc(100vh-7rem)] flex-1 flex-col p-0">
        <header className="flex items-center justify-between border-b border-white/10 p-4">
          <h1 className="flex items-center gap-2 font-heading text-xl font-bold"><Bot className="h-5 w-5 text-purple-400" /> AI Study Helper</h1>
          <button className="btn-ghost px-3 py-2" onClick={() => setMessages([welcomeMessage])}><Trash2 className="h-4 w-4" /> Clear Chat</button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
          {loading && <div className="flex w-fit gap-2 rounded-2xl bg-navy-900 p-4"><span className="typing-dot h-2 w-2 rounded-full bg-purple-400" /><span className="typing-dot h-2 w-2 rounded-full bg-purple-400" /><span className="typing-dot h-2 w-2 rounded-full bg-purple-400" /></div>}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-white/10 p-4 md:static">
          <div className="mb-3 flex gap-2 overflow-x-auto md:hidden">
            {prompts.map(prompt => <button key={prompt} className="shrink-0 whitespace-nowrap rounded-full border border-slate-600 px-3 py-1.5 text-sm text-slate-300" onClick={() => setInput(prompt)}>{prompt}</button>)}
          </div>
          <div className="flex items-end gap-3">
            <textarea
              className="input max-h-40 min-h-[52px] flex-1 resize-none"
              placeholder="Ask me anything about your studies..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            />
            <button className="btn-primary rounded-full px-4" disabled={loading || !input.trim()} onClick={send}><ArrowUp className="h-5 w-5" /></button>
          </div>
        </div>
      </section>
    </main>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  const isWelcome = !isUser && msg.content?.includes('secure access to your database')
  const parts = isWelcome ? msg.content.split('💡 Note:') : null
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${isUser ? 'bg-blue-500 text-white' : 'ai-bubble bg-navy-900 text-slate-200'}`}>
        {!isUser && <div className="mb-2 grid h-8 w-8 place-items-center rounded-full bg-purple-600"><Bot className="h-4 w-4 text-white" /></div>}
        {isWelcome ? (
          <div>
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(parts[0]) }} />
            <div className="mt-3 border-l-4 border-yellow-400/70 pl-3 text-yellow-100" dangerouslySetInnerHTML={{ __html: markdownToHtml(`💡 Note:${parts[1]}`) }} />
          </div>
        ) : <div dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} />}
      </div>
    </div>
  )
}
