export default function EmptyState({ emoji = '📭', message = 'Nothing here yet.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <span className="mb-3 text-4xl">{emoji}</span>
      <p className="text-sm">{message}</p>
    </div>
  )
}
