export default function EmptyState({ emoji = '📭', title, message = 'Nothing here yet.', subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
      <span className="mb-3 text-5xl">{emoji}</span>
      <p className="text-base font-semibold" style={{ color: 'var(--text-secondary, #cbd5e1)' }}>{title || message}</p>
      {subtitle && <p className="mt-1 max-w-sm text-sm">{subtitle}</p>}
    </div>
  )
}
