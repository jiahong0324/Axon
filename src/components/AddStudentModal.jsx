import { Loader2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import Modal from './Modal'
import { useToast } from './Toast'
import { studentManager } from '../lib/manageStudent'

const initialForm = { full_name: '', email: '', password: '', university: '', course: '', student_id: '' }

export default function AddStudentModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await studentManager.createStudent(form)
      showToast('Student account created.', 'success')
      setForm(initialForm)
      onCreated?.()
      onClose()
    } catch (err) {
      showToast(err.message || 'Student account could not be created.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Student">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full Name"><input className="input" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></Field>
        <Field label="Email"><input className="input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Temporary Password"><input className="input" type="password" required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="University"><input className="input" value={form.university} onChange={e => setForm({ ...form, university: e.target.value })} /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Course"><input className="input" value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} /></Field>
          <Field label="Student ID"><input className="input" value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} /></Field>
        </div>
        <button className="manager-primary-btn w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Create Student Account
        </button>
      </form>
    </Modal>
  )
}

function Field({ label, children }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>
}
