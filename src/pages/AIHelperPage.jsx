import { ArrowUp, Bot, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { buildUserContext } from '../lib/buildUserContext'
import { askGroq } from '../lib/groq'
import { markdownToHtml } from '../lib/utils'

const prompts = [
  'Explain a concept simply',
  'Summarize my notes',
  'Generate quiz questions',
  'Make a study plan',
  'Translate to Chinese',
  'Help prioritize my tasks',
  'Write study notes',
  'Explain this code'
]

export default function AIHelperPage() {
  const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem('aiChat') || '[]'))
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { localStorage.setItem('aiChat', JSON.stringify(messages)); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userText }])
    setLoading(true)
    try {
      const context = await buildUserContext()
      const answer = await askGroq(userText, context)
      setMessages(prev => [...prev, { role: 'assistant', content: answer }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I could not reach the AI service right now. Check your Groq API key and try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="main-content flex gap-5">
      <aside className="card hidden w-64 shrink-0 md:block">
        <h2 className="mb-4 font-semibold">Quick Actions</h2>
        <div className="space-y-2">{prompts.map(prompt => <button key={prompt} className="btn-ghost w-full justify-start text-left text-sm" onClick={() => setInput(prompt)}>{prompt}</button>)}</div>
      </aside>
      <section className="card flex min-h-[calc(100vh-7rem)] flex-1 flex-col p-0">
        <header className="flex items-center justify-between border-b border-white/10 p-4">
          <h1 className="flex items-center gap-2 font-heading text-xl font-bold"><Bot className="h-5 w-5 text-purple-400" /> AI Study Helper</h1>
          <button className="btn-ghost px-3 py-2" onClick={() => setMessages([])}><Trash2 className="h-4 w-4" /> Clear Chat</button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && <div className="mx-auto mt-10 max-w-md text-center text-slate-400">Ask about your schedule, deadlines, exams, notes, or code. I’ll include your UniMind data automatically.</div>}
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
          {loading && <div className="flex gap-2 rounded-2xl bg-navy-900 p-4 w-fit"><span className="typing-dot h-2 w-2 rounded-full bg-purple-400" /><span className="typing-dot h-2 w-2 rounded-full bg-purple-400" /><span className="typing-dot h-2 w-2 rounded-full bg-purple-400" /></div>}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto md:hidden">{prompts.map(prompt => <button key={prompt} className="btn-ghost shrink-0 px-3 py-2 text-xs" onClick={() => setInput(prompt)}>{prompt}</button>)}</div>
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
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${isUser ? 'bg-blue-500 text-white' : 'bg-navy-900 text-slate-200'}`}>
        {!isUser && <Bot className="mb-2 h-5 w-5 text-purple-400" />}
        <div dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} />
      </div>
    </div>
  )
}
