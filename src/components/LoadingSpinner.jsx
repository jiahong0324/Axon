export default function LoadingSpinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8'
  return (
    <div className="flex items-center justify-center p-8">
      <div className={`${s} animate-spin rounded-full border-2 border-blue-500 border-t-transparent`} />
    </div>
  )
}
