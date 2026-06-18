import React, { createContext, useContext, useEffect, useState } from 'react'
import { translations } from '../lib/i18n/translations'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('appLanguage') || 'en'
  })

  // Listen to preference changes from syncPreferences
  useEffect(() => {
    const handleSync = () => {
      const storedLang = localStorage.getItem('appLanguage')
      if (storedLang && storedLang !== language) {
        setLanguageState(storedLang)
      }
    }
    const handleLanguageChanged = (e) => {
      setLanguageState(e.detail)
    }
    
    window.addEventListener('language-changed', handleLanguageChanged)
    window.addEventListener('preferences-synced', handleSync)

    return () => {
      window.removeEventListener('language-changed', handleLanguageChanged)
      window.removeEventListener('preferences-synced', handleSync)
    }
  }, [language])

  const t = (key, params = {}) => {
    let text = translations[language]?.[key] || translations['en']?.[key] || key
    
    // Simple parameter replacement: {name}
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param])
    })
    return text
  }

  const changeLanguage = (lang) => {
    setLanguageState(lang)
    // We don't save to localStorage here directly, we let the preferences.js updatePreference handle it
    // But we trigger a fast UI update locally
  }

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
