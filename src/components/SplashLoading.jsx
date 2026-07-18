import { Brain } from 'lucide-react'

export default function SplashLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0A0F1E]">
      <img 
        src="/icons/logo.png" 
        alt="Axon Logo" 
        className="relative z-10 h-28 w-28 rounded-3xl object-cover"
        style={{ boxShadow: '0 0 50px 10px rgba(59, 130, 246, 0.5)', opacity: 1 }}
      />
    </div>
  )
}
