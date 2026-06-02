import { Eye, Pencil, Plus, Search, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AddStudentModal from '../../components/AddStudentModal'
import EditStudentPanel from '../../components/EditStudentPanel'
import { supabase } from '../../lib/supabase'
import { initials } from '../../lib/utils'

export default function ManagerStudentsPage() {
  const [students, setStudents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => { loadStudents() }, [])

  async function loadStudents() {
    const [studentsRes, assignmentsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false }),
      supabase.from('assignments').select('id,user_id,status').neq('status', 'Done')
    ])
    setStudents(studentsRes.data || [])
    setAssignments(assignmentsRes.data || [])
  }

  const pendingByStudent = useMemo(() => assignments.reduce((map, item) => {
    map[item.user_id] = (map[item.user_id] || 0) + 1
    return map
  }, {}), [assignments])

  const filtered = students.filter(student => {
    const text = `${student.full_name || ''} ${student.email || ''} ${student.student_id || ''}`.toLowerCase()
    return text.includes(query.toLowerCase())
  })

  return (
    <main className="main-content">
      <div className="mb-6 flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div>
          <h1 className="page-title mb-1 flex items-center gap-2"><Users className="h-6 w-6 text-amber-400" /> Students</h1>
          <p className="muted">Manage student profiles, access, and records.</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative min-w-0 md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input className="input pl-10" placeholder="Search name, email, or ID" value={query} onChange={e => setQuery(e.target.value)} />
          </label>
          <button className="manager-primary-btn" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Student</button>
        </div>
      </div>

      <section className="card hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Student</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Course</th>
              <th className="px-3 py-3">Assignments</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filtered.map(student => (
              <tr key={student.id}>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar student={student} />
                    <div><p className="font-semibold">{student.full_name || 'Unnamed student'}</p><p className="text-xs text-slate-500">{student.student_id || 'No student ID'}</p></div>
                  </div>
                </td>
                <td className="px-3 py-4 text-slate-300">{student.email}</td>
                <td className="px-3 py-4 text-slate-300">{student.course || 'Not set'}</td>
                <td className="px-3 py-4">{pendingByStudent[student.id] || 0} pending</td>
                <td className="px-3 py-4"><StatusBadge active={student.is_active !== false} /></td>
                <td className="px-3 py-4">
                  <div className="flex justify-end gap-2">
                    <button className="btn-ghost px-3" onClick={() => setEditing(student)}><Pencil className="h-4 w-4" /> Edit</button>
                    <Link className="btn-ghost px-3" to={`/manager/students/${student.id}`}><Eye className="h-4 w-4" /> View</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="muted py-8 text-center">No students match your search.</p>}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {filtered.map(student => (
          <article key={student.id} className="card">
            <div className="mb-3 flex items-center gap-3">
              <Avatar student={student} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{student.full_name || 'Unnamed student'}</p>
                <p className="truncate text-xs text-slate-500">{student.email}</p>
              </div>
              <StatusBadge active={student.is_active !== false} />
            </div>
            <p className="muted mb-3">{pendingByStudent[student.id] || 0} pending assignments</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost px-3" onClick={() => setEditing(student)}><Pencil className="h-4 w-4" /> Edit</button>
              <Link className="btn-ghost px-3" to={`/manager/students/${student.id}`}><Eye className="h-4 w-4" /> View</Link>
            </div>
          </article>
        ))}
      </section>

      <AddStudentModal isOpen={addOpen} onClose={() => setAddOpen(false)} onCreated={loadStudents} />
      {editing && <EditStudentPanel student={editing} onClose={() => setEditing(null)} onSaved={loadStudents} />}
    </main>
  )
}

function Avatar({ student }) {
  return <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full font-semibold text-white" style={{ background: student.avatar_color || '#F59E0B' }}>{initials(student.full_name || student.email)}</div>
}

function StatusBadge({ active }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>{active ? 'Active' : 'Deactivated'}</span>
}
