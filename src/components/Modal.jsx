import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md', mobileMaxHeight = 'max-h-[calc(100%-0.5rem)]', bodyClassName = 'overflow-y-auto overflow-x-hidden scrollbar-hide' }) {
  useEffect(() => {
    if (!isOpen) return
    const mainEl = document.querySelector('.main-content') || document.querySelector('main')
    const originalMainOverflow = mainEl ? mainEl.style.overflow : ''
    const originalBodyOverflow = document.body.style.overflow

    if (mainEl) mainEl.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'

    return () => {
      if (mainEl) mainEl.style.overflow = originalMainOverflow
      document.body.style.overflow = originalBodyOverflow
    }
  }, [isOpen])

  if (!isOpen) return null
  const isIOS = typeof window !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
  const resolvedMaxHeight = mobileMaxHeight === 'form-exam'
    ? 'max-h-[88%]'
    : (mobileMaxHeight === 'form' || mobileMaxHeight === 'max-h-[83%]')
      ? (isIOS ? 'max-h-[80%]' : 'max-h-[88%]')
      : mobileMaxHeight

  return (
    <div
      className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4 backdrop-blur-sm overscroll-none"
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
      onWheel={e => e.stopPropagation()}
    >
      <div className={`glass flex h-auto ${resolvedMaxHeight} sm:max-h-[85dvh] sm:max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl border border-white/10 pt-6 pb-6 px-5 sm:p-6 transition-transform overscroll-contain ${maxWidth}`}>
        <div className="mb-4 flex shrink-0 items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white">
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