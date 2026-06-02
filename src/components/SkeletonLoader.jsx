export function SkeletonCard() {
  return (
    <div className="card w-full h-full p-5 space-y-4">
      <div className="h-6 w-1/3 skeleton rounded-md" />
      <div className="h-10 w-full skeleton rounded-lg" />
      <div className="h-10 w-2/3 skeleton rounded-lg" />
    </div>
  )
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass p-4 rounded-xl flex items-center justify-between">
          <div className="space-y-2 w-1/2">
            <div className="h-5 w-full skeleton rounded-md" />
            <div className="h-4 w-2/3 skeleton rounded-md" />
          </div>
          <div className="h-8 w-8 skeleton rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-5 space-y-3">
          <div className="flex justify-between">
            <div className="h-4 w-1/2 skeleton rounded-md" />
            <div className="h-6 w-6 skeleton rounded-full" />
          </div>
          <div className="h-8 w-1/3 skeleton rounded-md" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTimetable() {
  return (
    <div className="grid md:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-6 w-full skeleton rounded-md mb-4" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="h-24 w-full skeleton rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  )
}
