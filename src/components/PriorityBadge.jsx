const colors = {
  High: 'bg-red-500/20 text-red-400 border border-red-500/30',
  Medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  Low: 'bg-green-500/20 text-green-400 border border-green-500/30'
}

export default function PriorityBadge({ priority = 'Medium' }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[priority] || colors.Medium}`}>{priority}</span>
}
