const config = {
  L: { label: 'Lecture', color: 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400' },
  T: { label: 'Tutorial', color: 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-green-500/30 dark:bg-green-500/20 dark:text-green-400' },
  P: { label: 'Practical', color: 'border border-violet-200 bg-violet-50 text-violet-700 dark:border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-400' }
}

export default function ClassTypeBadge({ type }) {
  const c = config[type] || config.L
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.color}`}>{c.label}</span>
}
