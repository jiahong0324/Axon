import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import 'katex/dist/katex.min.css'
import { datadogRum } from '@datadog/browser-rum'

const datadogAppId = import.meta.env.VITE_DATADOG_APPLICATION_ID || '32016b10-deaf-4537-9a77-6ac3375262dd'
const datadogClientToken = import.meta.env.VITE_DATADOG_CLIENT_TOKEN || 'pub450d21a0888e8b8ffa1c9a7f95103ef0'
const datadogSite = import.meta.env.VITE_DATADOG_SITE || 'us5.datadoghq.com'

if (datadogAppId && datadogClientToken) {
  datadogRum.init({
    applicationId: datadogAppId,
    clientToken: datadogClientToken,
    site: datadogSite,
    service: 'axon-pwa',
    env: import.meta.env.MODE || 'production',
    version: '1.0.0',
    sessionSampleRate: 100,
    sessionReplaySampleRate: 100,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: 'mask-user-input',
  })

  datadogRum.startSessionReplayRecording()
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.update()
    }).catch(console.error)
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
