import { Brain } from 'lucide-react'

export default function SplashLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0A0F1E]">
      <img 
        src="/icons/logo-glowing.png" 
        alt="Axon Logo" 
        className="relative z-10 h-52 w-52 animate-pulse object-contain transition-all duration-1000"
      />
    </div>
  )
}
