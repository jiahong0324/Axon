import { createContext, useContext, useMemo, useState } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'

const ToastContext = createContext(null)
export const useToast = () => useContext(ToastContext)

const styles = {
  success: 'border-green-500/30 text-green-600 dark:text-green-300',
  error: 'border-red-500/30 text-red-600 dark:text-red-300',
  info: 'border-theme-500/30 text-theme-600 dark:text-theme-300'
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  function showToast(message, type = 'info') {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(toast => toast.id !== id)), 3000)
  }

  const value = useMemo(() => ({ showToast }), [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed left-4 right-4 top-4 z-[80] flex flex-col gap-3 md:left-auto md:w-[calc(100vw-2rem)] md:max-w-sm">
        {toasts.map(toast => {
          const Icon = icons[toast.type] || Info
          return (
            <div key={toast.id} className={`glass flex items-start gap-3 rounded-xl border p-3 shadow-xl ${styles[toast.type] || styles.info}`}>
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
              <button className="min-h-0 min-w-0 p-1" onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
