import { useState } from 'react'
import { Loader2, MessageSquare } from 'lucide-react'
import Modal from './Modal'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'

export default function FeedbackModal({ isOpen, onClose }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('feedback').insert({
      user_id: user.id,
      message: message.trim()
    })
    setLoading(false)

    if (error) {
      showToast('Could not send feedback. Please try again.', 'error')
    } else {
      showToast('Feedback sent! Thank you for helping us improve.', 'success')
      setMessage('')
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Feedback">
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-theme-500/20 bg-theme-500/10 p-4">
        <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-theme-400" />
        <p className="text-sm text-slate-300">
          Have a suggestion, found a bug, or want a new feature? Let us know below! Your managers will review this.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="label">Your Message</span>
          <textarea
            className="input min-h-[120px]"
            placeholder="I think it would be great if..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            autoFocus
          />
        </label>
        <div className="mt-2 flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button disabled={loading || !message.trim()} className="btn-primary flex-1">
            {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Send'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
