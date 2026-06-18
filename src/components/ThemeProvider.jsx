import { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react'

const ThemeContext = createContext(null)
export const useTheme = () => useContext(ThemeContext)

const accents = {
  blue: '#3B82F6',
  purple: '#8B5CF6',
  green: '#10B981',
  cyan: '#06B6D4',
  orange: '#F97316',
  red: '#EF4444',
  pink: '#EC4899'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accentColor') || 'blue')
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('fontSize') || 'medium')
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem('fontFamily') || 'sans')
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem('compactMode') === 'true')

  const isMounted = useRef({ theme: false, accentColor: false, fontSize: false, fontFamily: false, compactMode: false })

  useEffect(() => {
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme
    document.documentElement.setAttribute('data-theme', resolved)
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    localStorage.setItem('theme', theme)
    if (isMounted.current.theme) {
      import('../lib/preferences').then(m => m.updatePreference(null, 'theme', theme))
    }
    isMounted.current.theme = true
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accents[accentColor] || accents.blue)
    document.documentElement.setAttribute('data-accent', accentColor)
    localStorage.setItem('accentColor', accentColor)
    if (isMounted.current.accentColor) {
      import('../lib/preferences').then(m => m.updatePreference(null, 'accentColor', accentColor))
    }
    isMounted.current.accentColor = true
  }, [accentColor])

  useEffect(() => {
    document.documentElement.style.fontSize = fontSize === 'small' ? '15px' : fontSize === 'large' ? '18px' : '16px'
    localStorage.setItem('fontSize', fontSize)
    if (isMounted.current.fontSize) {
      import('../lib/preferences').then(m => m.updatePreference(null, 'fontSize', fontSize))
    }
    isMounted.current.fontSize = true
  }, [fontSize])

  useEffect(() => {
    document.documentElement.setAttribute('data-font', fontFamily)
    localStorage.setItem('fontFamily', fontFamily)
    if (isMounted.current.fontFamily) {
      import('../lib/preferences').then(m => m.updatePreference(null, 'fontFamily', fontFamily))
    }
    isMounted.current.fontFamily = true
  }, [fontFamily])

  useEffect(() => {
    localStorage.setItem('compactMode', compactMode)
    if (isMounted.current.compactMode) {
      import('../lib/preferences').then(m => m.updatePreference(null, 'compactMode', compactMode))
    }
    isMounted.current.compactMode = true
  }, [compactMode])

  useEffect(() => {
    const handleSync = () => {
      setTheme(localStorage.getItem('theme') || 'dark')
      setAccentColor(localStorage.getItem('accentColor') || 'blue')
      setFontSize(localStorage.getItem('fontSize') || 'medium')
      setFontFamily(localStorage.getItem('fontFamily') || 'sans')
      setCompactMode(localStorage.getItem('compactMode') === 'true')
    }
    
    window.addEventListener('preferences-synced', handleSync)
    return () => window.removeEventListener('preferences-synced', handleSync)
  }, [])

  const value = useMemo(() => ({
    theme, setTheme, accentColor, setAccentColor, fontSize, setFontSize, fontFamily, setFontFamily, compactMode, setCompactMode
  }), [theme, accentColor, fontSize, fontFamily, compactMode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
