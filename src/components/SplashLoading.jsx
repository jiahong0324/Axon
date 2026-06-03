import { Brain } from 'lucide-react'

export default function SplashLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0A0F1E]">
      <img src="/icons/logo.png" alt="Axon Logo" className="relative z-10 h-24 w-24 animate-pulse object-contain drop-shadow-[0_10px_20px_rgba(59,130,246,0.3)] dark:drop-shadow-[0_10px_20px_rgba(59,130,246,0.2)]" />
    </div>
  )
}
