import { Bell, Globe, GraduationCap, Mail, Megaphone, Pencil, Plus, Smartphone, Trash2, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useState } from 'react'
import { useConfirmDialog } from '../../components/ConfirmModal'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { dateLabel } from '../../lib/utils'
import AnnouncementComposerModal from '../../components/AnnouncementComposerModal'
import { parseAnnouncement } from '../../lib/announcements'

export default function ManagerAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const { showToast } = useToast()

  useEffect(() => { loadAnnouncements() }, [])

  async function loadAnnouncements() {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    setAnnouncements((data || []).map(parseAnnouncement))
  }

  function openNew() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setModalOpen(true)
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
        <div>
          <h1 className="page-title mb-1 flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-amber-400" /> Announcements & Notifications
          </h1>
          <p className="text-xs text-slate-400">
            Send 3-in-1 updates to all students, specific individuals, or course groups.
          </p>
        </div>
        <button className="manager-primary-btn" onClick={openNew}>
          <Plus className="h-4 w-4" /> New Announcement
        </button>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        {announcements.map(item => (
          <AnnouncementCard
            key={item.id}
            item={item}
            onEdit={() => openEdit(item)}
            onDelete={() => deleteAnnouncement(item)}
          />
        ))}
      </section>
      {announcements.length === 0 && (
        <div className="card text-center py-12">
          <Megaphone className="h-10 w-10 text-slate-500 mx-auto mb-2 opacity-50" />
          <p className="muted">No announcements published yet.</p>
        </div>
      )}

      <AnnouncementComposerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadAnnouncements}
        editingAnnouncement={editing}
      />
      {ConfirmDialog}
    </main>
  )
}

function AnnouncementCard({ item, onEdit, onDelete }) {
  const expired = item.expires_at && new Date(item.expires_at) < new Date()
  const tone = item.type === 'urgent'
    ? 'bg-red-500/15 text-red-300 border-red-500/30'
    : item.type === 'warning'
    ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
    : 'bg-theme-500/15 text-theme-300 border-theme-500/30'

  const channels = item.channels || { in_app: true, push: false, email: false }
  const targetType = item.target_type || 'all'
  const hasInApp = Boolean(channels.in_app)
  const hasPush = Boolean(channels.push)
  const hasEmail = Boolean(channels.email)

  return (
    <article className="card flex flex-col justify-between">
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${tone}`}>
                {item.type}
              </span>

              {/* Target Audience Badge */}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs text-slate-300 font-medium">
                {targetType === 'all' && <><Globe className="h-3 w-3 text-emerald-400" /> All Students</>}
                {targetType === 'individual' && <><User className="h-3 w-3 text-amber-400" /> {(item.target_ids || []).length} Students</>}
                {targetType === 'group' && <><GraduationCap className="h-3 w-3 text-sky-400" /> {item.target_group || 'Group'}</>}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h2>
          </div>
          <p className="shrink-0 text-xs text-slate-400">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </p>
        </div>

        <p className="muted mb-4 line-clamp-3 text-sm">{item.message}</p>
      </div>

      <div>
        {/* Delivery Channels used */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
          <span className="text-[11px] text-slate-400 mr-1">Channels:</span>
          {hasInApp && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/25 px-2 py-0.5 text-[11px] text-blue-300 font-medium">
              <Smartphone className="h-3 w-3" /> In-App
            </span>
          )}
          {hasPush && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 text-[11px] text-amber-300 font-medium">
              <Bell className="h-3 w-3" /> Push
            </span>
          )}
          {hasEmail && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 border border-purple-500/25 px-2 py-0.5 text-[11px] text-purple-300 font-medium">
              <Mail className="h-3 w-3" /> Email
            </span>
          )}
          {!hasInApp && !hasPush && !hasEmail && (
            <span className="text-[11px] text-slate-500 italic">None</span>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-slate-400">
            Expires: {item.expires_at ? dateLabel(item.expires_at) : 'No expiry'}
          </span>
          <span className={`rounded-full px-2.5 py-1 ${expired ? 'bg-slate-500/15 text-slate-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
            {expired ? 'Expired' : 'Active'}
          </span>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
          <button className="btn-ghost px-3 py-1.5 text-xs min-h-0" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button className="inline-flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto h-8 w-8 p-0 rounded-lg transition-colors shrink-0" onClick={onDelete} title="Delete announcement">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  )
}
