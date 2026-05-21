import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md', bodyClassName = 'overflow-y-auto scrollbar-hide' }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 backdrop-blur-sm md:p-4">
      <div className={`glass flex h-full max-h-[100dvh] w-full flex-col overflow-hidden rounded-none border border-white/10 p-5 transition-transform md:max-h-[90vh] md:rounded-2xl md:p-6 ${maxWidth}`}>
        <div className="mb-4 flex shrink-0 items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={`min-h-0 flex-1 ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>
  )
}