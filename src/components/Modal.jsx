import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  mobileMaxHeight = 'max-h-[80dvh]',
  bodyClassName = 'overflow-y-auto overflow-x-hidden scrollbar-hide',
  panelClassName = '',
  fullScreenMobile = false
}) {
  useEffect(() => {
    if (!isOpen) return
    const mainEl = document.querySelector('.main-content') || document.querySelector('main')
    const originalMainOverflow = mainEl ? mainEl.style.overflow : ''
    const originalBodyOverflow = document.body.style.overflow

    if (mainEl) mainEl.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-open')

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      if (mainEl) mainEl.style.overflow = originalMainOverflow
      document.body.style.overflow = originalBodyOverflow
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const resolvedMaxHeight = (
    mobileMaxHeight === 'form-exam' ||
    mobileMaxHeight === 'form' ||
    mobileMaxHeight === 'max-h-[83%]' ||
    mobileMaxHeight === 'max-h-[calc(100%-0.5rem)]'
  )
    ? 'max-h-[80dvh] max-h-[80vh]'
    : mobileMaxHeight

  // Cover full viewport (inset-0) so bottom navigation bar is completely hidden while modal is open
  // Add pt-[max(env(safe-area-inset-top,0px),3.5rem)] so modal top is never squished by phone notch / dynamic island
  const containerClasses = fullScreenMobile
    ? 'fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/80 backdrop-blur-md sm:p-4 overscroll-none overflow-x-hidden touch-pan-y !m-0 pt-[max(env(safe-area-inset-top,0px),3.5rem)] sm:pt-4'
    : 'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 sm:p-4 backdrop-blur-md overscroll-none overflow-x-hidden touch-pan-y !m-0 pt-[max(env(safe-area-inset-top,0px),3.5rem)] sm:pt-4'

  const panelRounded = fullScreenMobile
    ? 'rounded-t-[28px] sm:rounded-2xl'
    : 'rounded-t-3xl sm:rounded-2xl'

  const panelHeight = fullScreenMobile
    ? 'h-[80dvh] max-h-[80dvh] sm:h-[85vh] sm:max-h-[85vh]'
    : `h-auto ${resolvedMaxHeight} sm:max-h-[85dvh] sm:max-h-[85vh]`

  const modalElement = (
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
      <div className={`glass flex ${panelHeight} w-full max-w-full box-border flex-col overflow-hidden overflow-x-hidden ${panelRounded} border-t sm:border border-white/10 p-4 sm:p-6 pb-[max(env(safe-area-inset-bottom,0px),1.75rem)] sm:pb-6 transition-[max-width,width,transform] duration-300 ease-out overscroll-contain touch-pan-y ${maxWidth} ${panelClassName}`}>
        {/* Mobile sheet drag handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2 shrink-0 sm:hidden" />
        <div className="mb-3 sm:mb-4 flex shrink-0 items-center justify-between gap-3 min-w-0 w-full">
          <h2 className="text-base sm:text-lg font-semibold truncate flex-1 min-w-0">{title}</h2>
          <button type="button" onClick={onClose} className="!min-h-0 !min-w-0 h-8 w-8 sm:h-9 sm:w-9 shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={`flex min-h-0 flex-1 flex-col w-full max-w-full min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch] ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(modalElement, document.body)
  }

  return modalElement
}
