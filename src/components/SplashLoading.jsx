import { Brain } from 'lucide-react'

export default function SplashLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0A0F1E]">
      <img 
        src="/icons/logo.png" 
        alt="Axon Logo" 
        className="relative z-10 h-28 w-28 animate-pulse object-contain transition-all duration-1000"
        style={{ filter: 'drop-shadow(0 0 35px rgb(var(--color-theme-500) / 0.5))' }}
      />
    </div>
  )
}
