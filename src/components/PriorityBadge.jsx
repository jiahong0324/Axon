const colors = {
  High: 'border border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-400',
  Medium: 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-yellow-500/30 dark:bg-yellow-500/20 dark:text-yellow-400',
  Low: 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-green-500/30 dark:bg-green-500/20 dark:text-green-400'
}

export default function PriorityBadge({ priority = 'Medium' }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[priority] || colors.Medium}`}>{priority}</span>
}
