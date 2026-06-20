import { useState } from 'react'

export default function SubjectSelect({ value, onChange, subjects }) {
  const [forceInput, setForceInput] = useState(false)

  // If there are no subjects yet, just show a plain input
  if (subjects.length === 0) {
    return (
      <input 
        className="input" 
        required 
        placeholder="Subject name"
        value={value} 
        onChange={e => onChange(e.target.value)} 
      />
    )
  }

  const isCustom = value && !subjects.includes(value)

  if (forceInput || isCustom) {
    return (
      <div className="flex gap-2">
        <input 
          className="input" 
          placeholder="Subject name" 
          required 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          autoFocus={forceInput}
        />
        <button 
          type="button" 
          className="btn-ghost px-3 text-slate-400 shrink-0 text-sm" 
          onClick={() => { 
            setForceInput(false)
            onChange(subjects[0]) 
          }}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <select 
      className="input" 
      required 
      value={value || ''} 
      onChange={e => {
        if (e.target.value === '__NEW__') {
          setForceInput(true)
          onChange('')
        } else {
          onChange(e.target.value)
        }
      }}
    >
      <option value="" disabled>Select a subject</option>
      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
      <option value="__NEW__">+ Add new subject...</option>
    </select>
  )
}
