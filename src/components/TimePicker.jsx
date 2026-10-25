import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Clock, Sparkles, Check, ChevronUp, ChevronDown } from 'lucide-react'

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

export default function TimePicker({
  value = '',
  onChange,
  className = '',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)

  const parsed = parseTimeTo12(value)
  const [selectedH12, setSelectedH12] = useState(parsed.h12)
  const [selectedM, setSelectedM] = useState(parsed.m)
  const [selectedIsPM, setSelectedIsPM] = useState(parsed.isPM)
  const [coords, setCoords] = useState(null)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Sync internal state when opened or when value changes
  useEffect(() => {
    if (isOpen) {
      const p = parseTimeTo12(value)
      setSelectedH12(p.h12)
      setSelectedM(p.m)
      setSelectedIsPM(p.isPM)
      updateCoords()
    }
  }, [isOpen, value])

  const updateCoords = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const popoverWidth = 320
    const popoverHeight = 440
    const spaceBelow = window.innerHeight - rect.bottom
    const showAbove = spaceBelow < popoverHeight && rect.top > popoverHeight

    let top = showAbove ? rect.top - popoverHeight - 6 : rect.bottom + 6
    let left = rect.left
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, rect.right - popoverWidth)
    }
    if (left < 12) left = 12

    setCoords({ top, left, width: popoverWidth })
  }

  useEffect(() => {
    if (!isOpen) return

    updateCoords()

    const handleScrollOrResize = () => updateCoords()
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
      if (e.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('touchstart', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
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
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

  const popoverContent = (
    <div className="w-[320px] max-w-[92vw] text-slate-100 select-none space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
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

      {/* Main Clock Digital Display Card */}
      <div className="flex items-center justify-center gap-3 py-3 bg-slate-950/70 rounded-xl border border-white/5">
        {/* Hour Stepper & Readout */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => setSelectedH12(h => (h % 12) + 1)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Next hour"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <span className="text-3xl font-extrabold text-white font-mono w-14 text-center">
            {String(selectedH12).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => setSelectedH12(h => (h === 1 ? 12 : h - 1))}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Previous hour"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <span className="text-3xl font-bold text-slate-500 pb-1.5 animate-pulse">:</span>

        {/* Minute Stepper & Readout */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => setSelectedM(m => (m + 1) % 60)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="+1 minute"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <span className="text-3xl font-extrabold text-white font-mono w-14 text-center">
            {String(selectedM).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => setSelectedM(m => (m - 1 + 60) % 60)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="-1 minute"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* AM / PM Segmented Toggle */}
        <div className="flex flex-col gap-1 ml-1 p-1 bg-slate-900 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => setSelectedIsPM(false)}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              !selectedIsPM
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => setSelectedIsPM(true)}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              selectedIsPM
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            PM
          </button>
        </div>
      </div>

      {/* Quick Hours Grid (1 - 12) */}
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
          Hour
        </span>
        <div className="grid grid-cols-6 gap-1">
          {hoursList.map(h => {
            const active = selectedH12 === h
            return (
              <button
                key={h}
                type="button"
                onClick={() => setSelectedH12(h)}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  active
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-400'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-white/5'
                }`}
              >
                {h}
              </button>
            )
          })}
        </div>
      </div>

      {/* Quick Minutes Grid (00 - 55) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Minute
          </span>
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => setSelectedM(m => (m - 1 + 60) % 60)}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5"
            >
              -1m
            </button>
            <button
              type="button"
              onClick={() => setSelectedM(m => (m + 1) % 60)}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5"
            >
              +1m
            </button>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {minutesList.map(m => {
            const active = selectedM === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedM(m)}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  active
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-400'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-white/5'
                }`}
              >
                :{String(m).padStart(2, '0')}
              </button>
            )
          })}
        </div>
      </div>

      {/* Common Meal Presets */}
      <div className="pt-2 border-t border-white/5">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
          Quick Meal Times
        </span>
        <div className="grid grid-cols-4 gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => { setSelectedH12(8); setSelectedM(30); setSelectedIsPM(false) }}
            className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5 flex flex-col items-center transition-all"
          >
            <span className="font-bold">🍳 8:30</span>
            <span className="text-[9px] text-slate-500">Breakfast</span>
          </button>
          <button
            type="button"
            onClick={() => { setSelectedH12(12); setSelectedM(30); setSelectedIsPM(true) }}
            className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5 flex flex-col items-center transition-all"
          >
            <span className="font-bold">🍱 12:30</span>
            <span className="text-[9px] text-slate-500">Lunch</span>
          </button>
          <button
            type="button"
            onClick={() => { setSelectedH12(4); setSelectedM(0); setSelectedIsPM(true) }}
            className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5 flex flex-col items-center transition-all"
          >
            <span className="font-bold">🍎 4:00</span>
            <span className="text-[9px] text-slate-500">Snack</span>
          </button>
          <button
            type="button"
            onClick={() => { setSelectedH12(7); setSelectedM(0); setSelectedIsPM(true) }}
            className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5 flex flex-col items-center transition-all"
          >
            <span className="font-bold">🍲 7:00</span>
            <span className="text-[9px] text-slate-500">Dinner</span>
          </button>
        </div>
      </div>

      {/* Action Footer */}
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
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          >
            <div
              ref={popoverRef}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl shadow-black/90 animate-in zoom-in-95 duration-150"
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
                zIndex: 99999
              }}
              onMouseDown={e => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl shadow-black/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
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
