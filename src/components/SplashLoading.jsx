import { Brain } from 'lucide-react'

export default function SplashLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0A0F1E]">
      <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl shadow-blue-500/20">
        <div className="absolute inset-0 animate-ping rounded-3xl bg-blue-500/30 opacity-75 duration-1000"></div>
        <Brain className="h-10 w-10 animate-pulse text-white" />
      </div>
    </div>
  )
}
