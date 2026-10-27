import React from 'react'
import { AlertTriangle, RotateCcw, Trash2, HardDrive } from 'lucide-react'
import { purgeStorageBloat } from '../lib/safeStorage'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Axon ErrorBoundary caught error:', error, errorInfo)
    // If it's a quota error, immediately purge storage bloat to help recovery
    const isQuota =
      error?.name === 'QuotaExceededError' ||
      String(error?.message || '').toLowerCase().includes('quota')
    if (isQuota) {
      purgeStorageBloat()
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleClearCacheAndReload = () => {
    try {
      purgeStorageBloat()
      sessionStorage.clear()
    } catch (e) {}
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const isQuota =
        this.state.error?.name === 'QuotaExceededError' ||
        String(this.state.error?.message || '').toLowerCase().includes('quota')

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-center shadow-2xl space-y-5">
            <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center ${
              isQuota
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                : 'bg-red-500/15 border border-red-500/30 text-red-400'
            }`}>
              {isQuota ? <HardDrive className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
            </div>

            <div className="space-y-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                {isQuota ? 'Storage Quota Exceeded' : 'Something went wrong'}
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                {isQuota
                  ? "Your mobile browser's local cache is full (from saved meal photos or chat history). Tap 'Free Up Storage' below to clean cached images and restore Axon instantly (your account login will stay intact)!"
                  : "An unexpected display issue occurred. You can reload the page or reset the cached memory to restore normal operation."}
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-left">
                <p className="text-xs font-mono text-slate-400 break-words line-clamp-3">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isQuota ? 'Free Up Storage & Reload' : 'Reset Cache & Reload'}</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors border border-slate-700"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
