import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md', mobileMaxHeight = 'max-h-[calc(100%-0.5rem)]', bodyClassName = 'overflow-y-auto overflow-x-hidden scrollbar-hide' }) {
  if (!isOpen) return null
  const isIOS = typeof window !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
  const resolvedMaxHeight = (mobileMaxHeight === 'form' || mobileMaxHeight === 'max-h-[83%]')
    ? (isIOS ? 'max-h-[80%]' : 'max-h-[88%]')
    : mobileMaxHeight

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:inset-0 sm:p-4 backdrop-blur-sm"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className={`glass flex h-auto ${resolvedMaxHeight} sm:max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl border border-white/10 pt-6 pb-6 px-5 sm:p-6 transition-transform ${maxWidth}`}>
        <div className="mb-4 flex shrink-0 items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={`flex min-h-0 flex-1 flex-col ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>
  )
}