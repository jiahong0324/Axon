import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Clock, Sparkles, Check } from 'lucide-react'

/**
 * Parses "HH:mm" (24-hour string) into { h12, m, isPM }
 */
export function parseTimeTo12(timeStr) {
  const now = new Date()
  let h24 = now.getHours()
  let m = now.getMinutes()

  if (timeStr && /^\d{1,2}:\d{2}/.test(timeStr)) {
    const [hPart, mPart] = timeStr.split(':')
    h24 = parseInt(hPart, 10)
    m = parseInt(mPart, 10)
  }

  const isPM = h24 >= 12
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12

  return { h12, m, isPM }
}

/**
 * Converts { h12, m, isPM } to "HH:mm" (24-hour format)
 */
export function to24HourStr(h12, m, isPM) {
  let h24 = h12 % 12
  if (isPM) h24 += 12
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Formats "HH:mm" into a user-friendly display string like "09:44 PM"
 */
export function formatTimeDisplay(timeStr) {
  const { h12, m, isPM } = parseTimeTo12(timeStr)
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`
}

/**
 * Apple iOS-style Drum Wheel Column with non-passive step lock & high-performance touch scrolling
 */
function WheelColumn({ items, value, onChange, formatItem, itemHeight = 48, containerHeight = 192 }) {
  const scrollerRef = useRef(null)
  const isInteractingRef = useRef(false)
  const timeoutRef = useRef(null)
  const lastWheelTimeRef = useRef(0)

  const padY = (containerHeight - itemHeight) / 2

  // Initial scroll position on mount
  useEffect(() => {
    const idx = items.indexOf(value)
    if (idx !== -1 && scrollerRef.current) {
      scrollerRef.current.scrollTop = idx * itemHeight
    }
  }, [])

  // Sync scroll position when value changes from external actions (e.g. "Now" button)
  useEffect(() => {
    if (!isInteractingRef.current && scrollerRef.current) {
      const idx = items.indexOf(value)
      if (idx !== -1) {
        const target = idx * itemHeight
        if (Math.abs(scrollerRef.current.scrollTop - target) > 2) {
          scrollerRef.current.scrollTo({ top: target, behavior: 'smooth' })
        }
      }
    }
  }, [value, items, itemHeight])

  // Precision wheel step on desktop: MUST attach with { passive: false } to cancel browser native 100px wheel jump!
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const handleWheel = (e) => {
      e.preventDefault()
      e.stopPropagation()

      const now = performance.now()
      if (now - lastWheelTimeRef.current < 90) return
      lastWheelTimeRef.current = now

      const direction = e.deltaY > 0 ? 1 : -1
      const currentIdx = Math.round(scroller.scrollTop / itemHeight)
      const nextIdx = Math.max(0, Math.min(items.length - 1, currentIdx + direction))

      if (nextIdx !== currentIdx) {
        isInteractingRef.current = true
        scroller.scrollTo({ top: nextIdx * itemHeight, behavior: 'smooth' })
        onChange(items[nextIdx])
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          isInteractingRef.current = false
        }, 150)
      }
    }

    scroller.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      scroller.removeEventListener('wheel', handleWheel)
    }
  }, [items, itemHeight, onChange])

  // Smooth mobile touch & scroll handling: debounced settle to prevent layout thrashing on every frame
  const handleScroll = () => {
    isInteractingRef.current = true
    clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(() => {
      if (!scrollerRef.current) return
      const st = scrollerRef.current.scrollTop
      const index = Math.round(st / itemHeight)
      const clamped = Math.max(0, Math.min(items.length - 1, index))
      const item = items[clamped]
      if (item !== undefined && item !== value) {
        onChange(item)
      }
      isInteractingRef.current = false
    }, 60)
  }

  const handleItemClick = (item, idx) => {
    isInteractingRef.current = true
    onChange(item)
    if (scrollerRef.current) {
      scrollerRef.current.scrollTo({ top: idx * itemHeight, behavior: 'smooth' })
    }
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      isInteractingRef.current = false
    }, 150)
  }

  return (
    <div
      className="relative flex-1 select-none overflow-x-hidden overflow-y-hidden"
      style={{ height: `${containerHeight}px`, touchAction: 'pan-y' }}
    >
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        onTouchStart={() => { isInteractingRef.current = true }}
        onMouseDown={() => { isInteractingRef.current = true }}
        style={{
          paddingTop: `${padY}px`,
          paddingBottom: `${padY}px`,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch'
        }}
        className="h-full overflow-y-scroll overflow-x-hidden snap-y snap-mandatory [&::-webkit-scrollbar]:hidden overscroll-y-contain overscroll-x-none"
      >
        {items.map((item, idx) => {
          const isSelected = item === value
          return (
            <div
              key={item}
              onClick={() => handleItemClick(item, idx)}
              style={{ height: `${itemHeight}px`, touchAction: 'pan-y' }}
              className={`snap-center flex items-center justify-center font-mono font-bold text-2xl cursor-pointer select-none transition-opacity duration-150 ${
                isSelected
                  ? 'text-white font-extrabold opacity-100'
                  : 'text-slate-500 font-medium opacity-30 hover:opacity-60'
              }`}
            >
              {formatItem ? formatItem(item) : item}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TimePicker({
  value = '',
  onChange,
  disabled = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  const [coords, setCoords] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  // Parse initial or default to current device time
  const initial = parseTimeTo12(value)
  const [selectedH12, setSelectedH12] = useState(initial.h12)
  const [selectedM, setSelectedM] = useState(initial.m)
  const [selectedIsPM, setSelectedIsPM] = useState(initial.isPM)

  // Keep internal state aligned whenever value prop changes externally
  useEffect(() => {
    const parsed = parseTimeTo12(value)
    setSelectedH12(parsed.h12)
    setSelectedM(parsed.m)
    setSelectedIsPM(parsed.isPM)
  }, [value])

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Position popover relative to trigger on desktop
  const updateCoords = () => {
    if (!triggerRef.current || isMobile) return
    const rect = triggerRef.current.getBoundingClientRect()
    const popoverWidth = 320
    const popoverHeight = 360
    const padding = 12

    let left = rect.left
    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - popoverWidth - padding
    }
    left = Math.max(padding, left)

    let top = rect.bottom + 8
    if (top + popoverHeight > window.innerHeight - padding) {
      top = rect.top - popoverHeight - 8
    }

    setCoords({ top, left })
  }

  useEffect(() => {
    if (isOpen) {
      updateCoords()
      window.addEventListener('scroll', updateCoords, true)
      window.addEventListener('resize', updateCoords)
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true)
      window.removeEventListener('resize', updateCoords)
    }
  }, [isOpen, isMobile])

  // Click outside to close & Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleMouseDown = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('touchstart', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('touchstart', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSetNow = () => {
    const now = new Date()
    const nowH = now.getHours()
    const nowM = now.getMinutes()
    setSelectedIsPM(nowH >= 12)
    setSelectedH12(nowH % 12 === 0 ? 12 : nowH % 12)
    setSelectedM(nowM)
  }

  const handleConfirm = () => {
    const result24 = to24HourStr(selectedH12, selectedM, selectedIsPM)
    onChange?.(result24)
    setIsOpen(false)
  }

  const displayTime = formatTimeDisplay(value)

  const hoursList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const minutesList = Array.from({ length: 60 }, (_, i) => i)

  const popoverContent = (
    <div
      style={{ touchAction: 'pan-y' }}
      className="w-[300px] max-w-[92vw] text-slate-100 select-none space-y-3.5 overflow-x-hidden"
    >
      {/* 1. Header: Select Meal Time + Now */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Select Meal Time
          </span>
        </div>
        <button
          type="button"
          onClick={handleSetNow}
          className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
          title="Set to current device time"
        >
          <Sparkles className="h-3 w-3" /> Now
        </button>
      </div>

      {/* 2. AM / PM Segmented Control (Centered above the drum wheels) */}
      <div className="flex justify-center">
        <div className="relative inline-flex p-1 bg-slate-950/90 rounded-xl border border-white/10 w-full max-w-[220px] shadow-inner">
          <button
            type="button"
            onClick={() => setSelectedIsPM(false)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !selectedIsPM
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>☀️</span> AM
          </button>
          <button
            type="button"
            onClick={() => setSelectedIsPM(true)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              selectedIsPM
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🌙</span> PM
          </button>
        </div>
      </div>

      {/* 3. Time Drum Wheels Box (Hours & Minutes Centered & Wide) */}
      <div className="relative flex items-center justify-center bg-slate-950/80 rounded-2xl border border-white/5 overflow-hidden shadow-inner h-[192px] px-6">
        {/* Center Highlight Lens Bar */}
        <div
          className="absolute left-4 right-4 pointer-events-none rounded-xl bg-white/[0.08] border border-white/10 shadow-sm z-10"
          style={{
            top: '50%',
            height: '48px',
            transform: 'translateY(-50%)'
          }}
        />

        {/* Top & Bottom cylindrical drum vignette gradients */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none z-10" />

        {/* Hours Wheel Column */}
        <WheelColumn
          items={hoursList}
          value={selectedH12}
          onChange={setSelectedH12}
          formatItem={(h) => String(h).padStart(2, '0')}
          itemHeight={48}
          containerHeight={192}
        />

        {/* Colon Separator */}
        <span className="text-2xl font-extrabold text-slate-500 pb-1 z-20 select-none px-3">
          :
        </span>

        {/* Minutes Wheel Column */}
        <WheelColumn
          items={minutesList}
          value={selectedM}
          onChange={setSelectedM}
          formatItem={(m) => String(m).padStart(2, '0')}
          itemHeight={48}
          containerHeight={192}
        />
      </div>

      {/* 4. Action Footer: Cancel & Confirm */}
      <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-white/10">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-1 active:scale-95"
        >
          <Check className="h-3.5 w-3.5" /> Confirm Time
        </button>
      </div>
    </div>
  )

  return (
    <div className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium text-sm flex items-center justify-between transition-colors group cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Clock className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
          <span className="font-bold text-sm tracking-wide text-white">
            {displayTime}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
          Change
        </span>
      </button>

      {/* Popover / Modal Portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        isMobile ? (
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-hidden touch-none"
            onClick={() => setIsOpen(false)}
          >
            <div
              ref={popoverRef}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl shadow-black/90 animate-in zoom-in-95 duration-150 overflow-x-hidden touch-pan-y"
            >
              {popoverContent}
            </div>
          </div>
        ) : (
          coords && (
            <div
              ref={popoverRef}
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                zIndex: 99999,
                touchAction: 'pan-y'
              }}
              onMouseDown={e => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl shadow-black/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 overflow-x-hidden"
            >
              {popoverContent}
            </div>
          )
        ),
        document.body
      )}
    </div>
  )
}
