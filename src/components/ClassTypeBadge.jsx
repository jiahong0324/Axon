const config = {
  L: { label: 'Lecture', color: 'border border-theme-200 bg-theme-50 text-theme-700 dark:border-theme-500/30 dark:bg-theme-500/20 dark:text-theme-400' },
  T: { label: 'Tutorial', color: 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-green-500/30 dark:bg-green-500/20 dark:text-green-400' },
  P: { label: 'Practical', color: 'border border-violet-200 bg-violet-50 text-violet-700 dark:border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-400' }
}

export default function ClassTypeBadge({ type }) {
  const c = config[type] || config.L
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.color}`}>{c.label}</span>
}
