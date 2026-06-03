import { useEffect, useState } from 'react'
import { MessageSquare, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { dateLabel } from '../../lib/utils'

export default function ManagerFeedbackPage() {
  const [feedback, setFeedback] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeedback()
  }, [])

  async function fetchFeedback() {
    setLoading(true)
    const { data: feedbackData } = await supabase.from('feedback').select('*').order('created_at', { ascending: false })
    
    if (feedbackData && feedbackData.length > 0) {
      const userIds = [...new Set(feedbackData.filter(f => f.user_id).map(f => f.user_id))]
      let profileData = []
      if (userIds.length > 0) {
        const { data } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
        profileData = data || []
      }
      
      const profileMap = {}
      if (profileData) {
        profileData.forEach(p => profileMap[p.id] = p)
      }
      setProfiles(profileMap)
      setFeedback(feedbackData)
    }
    setLoading(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('feedback').update({ status }).eq('id', id)
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, status } : f))
  }

  return (
    <main className="main-content">
      <header className="mb-8">
        <h1 className="page-title">Student Feedback</h1>
        <p className="text-slate-400">Review bug reports and feature requests from your students.</p>
      </header>

      {loading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-theme-500 border-t-transparent" /></div>
      ) : feedback.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">No feedback submitted yet!</div>
      ) : (
        <div className="grid gap-4">
          {feedback.map(item => {
            const user = profiles[item.user_id]
            const displayName = user?.full_name || item.name || 'Anonymous'
            const displayEmail = user?.email || item.email || 'No email provided'
            
            return (
              <div key={item.id} className="card flex flex-col md:flex-row md:items-start justify-between gap-6 p-6">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-theme-500/20 text-theme-400'}`}>
                    {item.status === 'resolved' ? <CheckCircle className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h3 className="font-semibold text-white">{displayName}</h3>
                      <span className="text-xs text-slate-500">{displayEmail}</span>
                      <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{dateLabel(item.created_at)}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-300">{item.message}</p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <select 
                    value={item.status}
                    onChange={(e) => updateStatus(item.id, e.target.value)}
                    className={`input py-2 text-sm font-medium ${item.status === 'resolved' ? 'border-green-500/30 text-green-400' : item.status === 'reviewed' ? 'border-yellow-500/30 text-yellow-400' : 'border-slate-700 text-slate-300'}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
