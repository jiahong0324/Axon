import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md', mobileMaxHeight = 'max-h-[calc(100%-0.5rem)]', bodyClassName = 'overflow-y-auto overflow-x-hidden scrollbar-hide', panelClassName = '', fullScreenMobile = false }) {
  useEffect(() => {
    if (!isOpen) return
    const mainEl = document.querySelector('.main-content') || document.querySelector('main')
    const originalMainOverflow = mainEl ? mainEl.style.overflow : ''
    const originalBodyOverflow = document.body.style.overflow

    if (mainEl) mainEl.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      if (mainEl) mainEl.style.overflow = originalMainOverflow
      document.body.style.overflow = originalBodyOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null
  const isIOS = typeof window !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
  const resolvedMaxHeight = mobileMaxHeight === 'form-exam'
    ? 'max-h-[88%]'
    : (mobileMaxHeight === 'form' || mobileMaxHeight === 'max-h-[83%]')
      ? (isIOS ? 'max-h-[80%]' : 'max-h-[88%]')
      : mobileMaxHeight

  const containerClasses = fullScreenMobile
    ? 'fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/80 backdrop-blur-md sm:p-4 overscroll-none'
    : 'fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 sm:p-4 backdrop-blur-md overscroll-none'

  const panelRounded = fullScreenMobile
    ? 'rounded-t-[28px] sm:rounded-2xl'
    : 'rounded-t-3xl sm:rounded-2xl'

  const panelHeight = fullScreenMobile
    ? 'h-[88dvh] max-h-[88dvh] sm:h-[85vh] sm:max-h-[85vh]'
    : `h-auto ${resolvedMaxHeight} sm:max-h-[85dvh] sm:max-h-[85vh]`

  return (
    <div
      className={containerClasses}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
      onWheel={e => e.stopPropagation()}
    >
      <div className={`glass flex ${panelHeight} w-full max-w-full box-border flex-col overflow-hidden ${panelRounded} border-t sm:border border-white/10 p-4 sm:p-6 pb-[max(env(safe-area-inset-bottom,0px),1.25rem)] sm:pb-6 transition-[max-width,width,transform] duration-300 ease-out overscroll-contain ${maxWidth} ${panelClassName}`}>
        {/* Mobile sheet drag handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2 shrink-0 sm:hidden" />
        <div className="mb-3 sm:mb-4 flex shrink-0 items-center justify-between gap-3 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold truncate flex-1 min-w-0">{title}</h2>
          <button type="button" onClick={onClose} className="!min-h-0 !min-w-0 h-8 w-8 sm:h-9 sm:w-9 shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={`flex min-h-0 flex-1 flex-col overscroll-contain [-webkit-overflow-scrolling:touch] ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>
  )
}