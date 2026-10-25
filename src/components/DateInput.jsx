import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Converts ISO YYYY-MM-DD to DD/MM/YYYY display format.
 */
export function formatIsoToDisplay(isoStr) {
  if (!isoStr || typeof isoStr !== 'string') return ''
  const trimmed = isoStr.trim()
  const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!match) return ''
  const [, y, m, d] = match
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
}

/**
 * Converts DD/MM/YYYY (or DD-MM-YYYY / DD.MM.YYYY) to ISO YYYY-MM-DD.
 * Returns empty string if invalid.
 */
export function parseDisplayToIso(displayStr) {
  if (!displayStr || typeof displayStr !== 'string') return ''
  const trimmed = displayStr.trim()
  const match = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (!match) return ''
  const [, d, m, y] = match
  const day = parseInt(d, 10)
  const month = parseInt(m, 10)
  const year = parseInt(y, 10)
  if (month < 1 || month > 12) return ''
  if (day < 1 || day > 31) return ''
  if (year < 1970 || year > 2100) return ''

  const testDate = new Date(year, month - 1, day)
  if (
    testDate.getFullYear() !== year ||
    testDate.getMonth() !== month - 1 ||
    testDate.getDate() !== day
  ) {
    return ''
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function formatIso(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function generateCalendarDays(year, month) {
  const days = []
  const firstDay = new Date(year, month, 1)
  // Monday as 0, Sunday as 6
  const startDay = (firstDay.getDay() + 6) % 7
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  // Previous month trailing days
  for (let i = startDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const prevDate = new Date(year, month - 1, d)
    days.push({
      year: prevDate.getFullYear(),
      month: prevDate.getMonth(),
      day: d,
      isCurrentMonth: false,
    })
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    days.push({
      year,
      month,
      day: d,
      isCurrentMonth: true,
    })
  }

  // Next month leading days (fill 35 or 42 grid cells)
  const totalCells = days.length <= 35 ? 35 : 42
  const nextMonthCount = totalCells - days.length
  for (let d = 1; d <= nextMonthCount; d++) {
    const nextDate = new Date(year, month + 1, d)
    days.push({
      year: nextDate.getFullYear(),
      month: nextDate.getMonth(),
      day: d,
      isCurrentMonth: false,
    })
  }

  return days
}

/**
 * DateInput component that strictly renders and formats dates as DD/MM/YYYY (date/month/year).
 * Clicking the calendar icon opens an interactive calendar dropdown where user can pick a date.
 */
export default function DateInput({
  value = '',
  onChange,
  placeholder = 'DD/MM/YYYY',
  className = '',
  name,
  id,
  required = false,
  disabled = false,
  min,
  max,
  customTrigger,
  ...props
}) {
  const [displayText, setDisplayText] = useState(() => formatIsoToDisplay(value))
  const [isOpen, setIsOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const [coords, setCoords] = useState(null)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)

  const containerRef = useRef(null)
  const popoverRef = useRef(null)

  useEffect(() => {
    setDisplayText(formatIsoToDisplay(value))
  }, [value])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const notifyChange = (isoValue) => {
    if (typeof onChange === 'function') {
      onChange({ target: { value: isoValue, name } })
    }
  }

  const handleTextChange = (e) => {
    const raw = e.target.value
    setDisplayText(raw)

    if (!raw.trim()) {
      notifyChange('')
      return
    }

    const iso = parseDisplayToIso(raw)
    if (iso) {
      notifyChange(iso)
    }
  }

  const handleBlur = () => {
    if (!displayText.trim()) {
      if (value) notifyChange('')
      return
    }
    const iso = parseDisplayToIso(displayText)
    if (iso) {
      setDisplayText(formatIsoToDisplay(iso))
      if (iso !== value) notifyChange(iso)
    } else {
      // Revert invalid input to last valid value
      setDisplayText(formatIsoToDisplay(value))
    }
  }

  const updateCoords = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const popoverWidth = 280
    const popoverHeight = 310
    const spaceBelow = window.innerHeight - rect.bottom
    const showAbove = spaceBelow < popoverHeight && rect.top > popoverHeight

    let top = showAbove ? rect.top - popoverHeight - 6 : rect.bottom + 6
    let left = rect.left
    if (rect.width < popoverWidth) {
      left = rect.left + (rect.width - popoverWidth) / 2
    }
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12)
    }
    if (left < 12) left = 12

    setCoords({ top, left, width: popoverWidth })
  }

  const togglePicker = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
    if (disabled) return

    if (!isOpen) {
      let initialYear = new Date().getFullYear()
      let initialMonth = new Date().getMonth()

      if (value) {
        const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
        if (match) {
          initialYear = parseInt(match[1], 10)
          initialMonth = parseInt(match[2], 10) - 1
        }
      } else if (displayText) {
        const parsed = parseDisplayToIso(displayText)
        if (parsed) {
          const match = parsed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
          if (match) {
            initialYear = parseInt(match[1], 10)
            initialMonth = parseInt(match[2], 10) - 1
          }
        }
      }

      setViewYear(initialYear)
      setViewMonth(initialMonth)
      updateCoords()
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  const handleSelectDate = (isoDate) => {
    setDisplayText(formatIsoToDisplay(isoDate))
    notifyChange(isoDate)
    setIsOpen(false)
  }

  const handlePrevMonth = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  const handleNextMonth = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    updateCoords()

    const handleScrollOrResize = () => {
      updateCoords()
    }

    const handleMouseDown = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
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

  // Year options for quick select dropdown
  const currentYear = new Date().getFullYear()
  const minYear = Math.min(viewYear, currentYear - 8)
  const maxYear = Math.max(viewYear, currentYear + 8)
  const yearOptions = []
  for (let y = minYear; y <= maxYear; y++) {
    yearOptions.push(y)
  }

  const calendarDays = isOpen ? generateCalendarDays(viewYear, viewMonth) : []
  const today = new Date()
  const todayIso = formatIso(today.getFullYear(), today.getMonth(), today.getDate())

  const calendarContent = (
    <div className="w-[280px] text-slate-100 select-none">
      {/* Header: Month/Year navigation */}
      <div className="flex items-center justify-between gap-1 mb-2.5">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="!min-h-0 !min-w-0 h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          title="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5">
          <select
            value={viewMonth}
            onChange={(e) => setViewMonth(Number(e.target.value))}
            className="bg-slate-800/90 hover:bg-slate-700/80 text-slate-100 font-semibold text-xs py-1 px-2 rounded-lg border border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-colors"
          >
            {MONTH_NAMES.map((mName, idx) => (
              <option key={idx} value={idx} className="bg-slate-900 text-slate-100">
                {mName}
              </option>
            ))}
          </select>

          <select
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
            className="bg-slate-800/90 hover:bg-slate-700/80 text-slate-100 font-semibold text-xs py-1 px-2 rounded-lg border border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-colors"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y} className="bg-slate-900 text-slate-100">
                {y}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="!min-h-0 !min-w-0 h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          title="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 py-1 mb-1 border-b border-white/5">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1 place-items-center text-center text-xs">
        {calendarDays.map((item, idx) => {
          const itemIso = formatIso(item.year, item.month, item.day)
          const isSelected = value === itemIso
          const isToday = todayIso === itemIso
          const isDisabled = (min && itemIso < min) || (max && itemIso > max)

          let cellClass = '!min-h-0 !min-w-0 h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-all font-medium select-none '
          if (isDisabled) {
            cellClass += 'opacity-20 cursor-not-allowed pointer-events-none text-slate-600'
          } else if (isSelected) {
            cellClass += 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/40 ring-1 ring-indigo-400'
          } else if (isToday) {
            cellClass += 'border border-indigo-400/60 bg-indigo-500/15 text-indigo-300 font-bold hover:bg-indigo-500/25'
          } else if (item.isCurrentMonth) {
            cellClass += 'text-slate-200 hover:bg-white/10 hover:text-white'
          } else {
            cellClass += 'text-slate-600 hover:text-slate-400 hover:bg-white/5'
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={isDisabled}
              onClick={() => handleSelectDate(itemIso)}
              className={cellClass}
            >
              {item.day}
            </button>
          )
        })}
      </div>

      {/* Footer: Quick Actions */}
      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => handleSelectDate(todayIso)}
          className="!min-h-0 !min-w-0 px-2.5 py-1 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 font-semibold transition-colors"
        >
          Today
        </button>
        <div className="flex items-center gap-1.5">
          {!required && (
            <button
              type="button"
              onClick={() => {
                setDisplayText('')
                notifyChange('')
                setIsOpen(false)
              }}
              className="!min-h-0 !min-w-0 px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            >
              Clear
            </button>
          )}
          {isMobile && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="!min-h-0 !min-w-0 px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {customTrigger ? (
        <div
          ref={containerRef}
          onClick={togglePicker}
          className="relative inline-flex items-center group cursor-pointer"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              togglePicker(e)
            }
          }}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          {typeof customTrigger === 'function'
            ? customTrigger({ isOpen, toggle: togglePicker, value })
            : customTrigger}
        </div>
      ) : (
        <div ref={containerRef} className="relative flex items-center w-full min-w-0">
          <input
        type="text"
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        value={displayText}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`w-full min-w-0 ${className || 'input'} pr-8 text-sm sm:text-base`}
        {...props}
      />
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto">
        <button
          type="button"
          tabIndex={-1}
          onClick={togglePicker}
          disabled={disabled}
          className={`!min-h-0 !min-w-0 h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
            isOpen ? 'text-indigo-400 bg-indigo-500/15' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title="Open calendar"
          aria-label="Open calendar"
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
        </button>
      </div>
        </div>
      )}

      {/* Interactive Calendar Popover Portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        isMobile ? (
          /* Mobile centered sheet with backdrop */
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
            onTouchStart={(e) => {
              if (e.target === e.currentTarget) setIsOpen(false)
            }}
          >
            <div
              ref={popoverRef}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700/90 rounded-2xl p-3.5 shadow-2xl shadow-black/90 animate-in zoom-in-95 duration-150"
            >
              {calendarContent}
            </div>
          </div>
        ) : (
          /* Desktop anchored popover */
          coords && (
            <div
              ref={popoverRef}
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                zIndex: 99999,
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700/90 rounded-2xl p-3.5 shadow-2xl shadow-black/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
            >
              {calendarContent}
            </div>
          )
        ),
        document.body
      )}
    </>
  )
}
