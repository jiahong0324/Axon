import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
export const useTheme = () => useContext(ThemeContext)

const accents = {
  blue: '#3B82F6',
  purple: '#8B5CF6',
  green: '#10B981',
  cyan: '#06B6D4',
  orange: '#F97316',
  red: '#EF4444'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accentColor') || 'blue')
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('fontSize') || 'medium')
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem('compactMode') === 'true')

  useEffect(() => {
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme
    document.documentElement.setAttribute('data-theme', resolved)
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accents[accentColor] || accents.blue)
    localStorage.setItem('accentColor', accentColor)
  }, [accentColor])

  useEffect(() => {
    document.documentElement.style.fontSize = fontSize === 'small' ? '15px' : fontSize === 'large' ? '18px' : '16px'
    localStorage.setItem('fontSize', fontSize)
  }, [fontSize])

  useEffect(() => { localStorage.setItem('compactMode', compactMode) }, [compactMode])

  const value = useMemo(() => ({
    theme, setTheme, accentColor, setAccentColor, fontSize, setFontSize, compactMode, setCompactMode
  }), [theme, accentColor, fontSize, compactMode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
