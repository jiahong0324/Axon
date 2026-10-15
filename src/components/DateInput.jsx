import React, { useState, useEffect, useRef } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'

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

/**
 * DateInput component that strictly renders and formats dates as DD/MM/YYYY (date/month/year).
 * Handles native calendar picking via hidden date input while maintaining consistent DD/MM/YYYY display.
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
  ...props
}) {
  const [displayText, setDisplayText] = useState(() => formatIsoToDisplay(value))
  const nativePickerRef = useRef(null)

  useEffect(() => {
    setDisplayText(formatIsoToDisplay(value))
  }, [value])

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

  const handleNativeDateChange = (e) => {
    const nextIso = e.target.value
    setDisplayText(formatIsoToDisplay(nextIso))
    notifyChange(nextIso)
  }

  const openPicker = () => {
    if (disabled) return
    if (nativePickerRef.current) {
      if (typeof nativePickerRef.current.showPicker === 'function') {
        try {
          nativePickerRef.current.showPicker()
          return
        } catch (_) {}
      }
      nativePickerRef.current.focus()
      nativePickerRef.current.click()
    }
  }

  return (
    <div className="relative flex items-center w-full">
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
        className={`${className || 'input'} pr-10`}
        {...props}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8">
        <button
          type="button"
          tabIndex={-1}
          onClick={openPicker}
          disabled={disabled}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer pointer-events-auto"
          title="Open calendar"
          aria-label="Open calendar"
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
        </button>
        {/* Invisible native date picker over the icon for native calendar dropdown */}
        <input
          ref={nativePickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
          min={min}
          max={max}
          value={value || ''}
          onChange={handleNativeDateChange}
          className="absolute inset-0 opacity-0 cursor-pointer pointer-events-auto"
        />
      </div>
    </div>
  )
}
