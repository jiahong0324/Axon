import { Brain } from 'lucide-react'

export default function SplashLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0A0F1E]">
      <img 
        src="/icons/logo.png" 
        alt="Axon Logo" 
        className="relative z-10 h-28 w-28 rounded-3xl object-cover"
        style={{
          opacity: 0.65,
          filter: 'brightness(0.75)',
          boxShadow: '0 0 30px 4px rgba(59, 130, 246, 0.35)',
          animation: 'prerender-pulse 2.2s ease-in-out infinite'
        }}
      />
    </div>
  )
}
