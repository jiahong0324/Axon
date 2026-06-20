const colors = {
  High: 'border-red-500/30 bg-red-500/10 text-red-400',
  Medium: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  Low: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
}

const dots = {
  High: 'bg-red-400',
  Medium: 'bg-amber-400',
  Low: 'bg-emerald-400'
}

export default function PriorityBadge({ priority = 'Medium' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors[priority] || colors.Medium}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[priority] || dots.Medium}`} />
      {priority}
    </span>
  )
}
