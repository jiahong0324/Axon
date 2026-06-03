import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useState } from 'react'
import { useConfirmDialog } from '../../components/ConfirmModal'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { dateLabel } from '../../lib/utils'
import { AnnouncementModal } from './ManagerDashboard'

const initialForm = { title: '', message: '', type: 'info', expires_at: '' }

export default function ManagerAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(initialForm)
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const { showToast } = useToast()

  useEffect(() => { loadAnnouncements() }, [])

  async function loadAnnouncements() {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    setAnnouncements(data || [])
  }

  function openNew() {
    setEditing(null)
    setForm(initialForm)
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({ title: item.title, message: item.message, type: item.type, expires_at: item.expires_at?.slice(0, 10) || '' })
    setModalOpen(true)
  }

  async function saveAnnouncement(e) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { ...form, manager_id: user.id, expires_at: form.expires_at || null }
    const response = editing
      ? await supabase.from('announcements').update(payload).eq('id', editing.id)
      : await supabase.from('announcements').insert(payload)
    if (response.error) return showToast('Announcement could not be saved.', 'error')
    showToast(editing ? 'Announcement updated.' : 'Announcement sent.', 'success')
    setModalOpen(false)
    loadAnnouncements()
  }

  async function deleteAnnouncement(item) {
    if (!await confirm({ title: 'Delete announcement?', message: `"${item.title}" will be removed for all students.`, confirmText: 'Delete' })) return
    const { error } = await supabase.from('announcements').delete().eq('id', item.id)
    if (error) return showToast('Announcement could not be deleted.', 'error')
    setAnnouncements(prev => prev.filter(a => a.id !== item.id))
    showToast('Announcement deleted.', 'success')
  }

  return (
    <main className="main-content">
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h1 className="page-title mb-0 flex items-center gap-2"><Megaphone className="h-6 w-6 text-amber-400" /> Announcements</h1>
        <button className="manager-primary-btn" onClick={openNew}><Plus className="h-4 w-4" /> New Announcement</button>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        {announcements.map(item => <AnnouncementCard key={item.id} item={item} onEdit={() => openEdit(item)} onDelete={() => deleteAnnouncement(item)} />)}
      </section>
      {announcements.length === 0 && <div className="card text-center"><p className="muted">No announcements yet.</p></div>}

      <AnnouncementModal isOpen={modalOpen} onClose={() => setModalOpen(false)} form={form} setForm={setForm} onSubmit={saveAnnouncement} />
      {ConfirmDialog}
    </main>
  )
}

function AnnouncementCard({ item, onEdit, onDelete }) {
  const expired = item.expires_at && new Date(item.expires_at) < new Date()
  const tone = item.type === 'urgent' ? 'bg-red-500/15 text-red-300 border-red-500/30' : item.type === 'warning' ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' : 'bg-theme-500/15 text-theme-300 border-theme-500/30'
  return (
    <article className="card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`mb-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${tone}`}>{item.type}</span>
          <h2 className="truncate text-lg font-bold">{item.title}</h2>
        </div>
        <p className="shrink-0 text-xs text-slate-500">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
      </div>
      <p className="muted mb-4 line-clamp-3">{item.message}</p>
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-white/5 px-2.5 py-1">Expires: {item.expires_at ? dateLabel(item.expires_at) : 'No expiry'}</span>
        <span className={`rounded-full px-2.5 py-1 ${expired ? 'bg-slate-500/15 text-slate-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{expired ? 'Expired' : 'Active'}</span>
      </div>
      <div className="flex gap-2">
        <button className="btn-ghost px-3" onClick={onEdit}><Pencil className="h-4 w-4" /> Edit</button>
        <button className="btn-danger ml-auto" onClick={onDelete}><Trash2 className="h-4 w-4" /></button>
      </div>
    </article>
  )
}
