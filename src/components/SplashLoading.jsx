export default function SplashLoading() {
  return (
    <div className="startup-splash fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0A0F1E]">
      <img 
        src="/icons/logo.png" 
        alt="Axon Logo" 
        className="relative z-10 h-28 w-28 rounded-3xl object-cover"
        style={{
          opacity: 0.75,
          filter: 'brightness(0.88)',
          boxShadow: '0 0 35px 5px rgba(59, 130, 246, 0.4)',
          animation: 'prerender-pulse 2.2s ease-in-out infinite'
        }}
      />
    </div>
  )
}
