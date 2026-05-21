const config = {
  L: { label: 'Lecture', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  T: { label: 'Tutorial', color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  P: { label: 'Practical', color: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' }
}

export default function ClassTypeBadge({ type }) {
  const c = config[type] || config.L
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.color}`}>{c.label}</span>
}
