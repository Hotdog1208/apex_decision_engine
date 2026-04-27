import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { _supabaseMisconfigured } from './lib/supabase'
import './styles/tokens.css'
import './index.css'

// Suppress Supabase navigator.locks race errors. These fire when multiple tabs or
// concurrent requests compete for the auth token refresh lock. The session remains
// valid — the winning request already refreshed it. Not a real error; silence Sentry.
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || ''
  const name = event.reason?.name || ''
  if (
    msg.includes('Lock') && (msg.includes('stole') || msg.includes('steal')) ||
    (name === 'AbortError' && msg.toLowerCase().includes('lock'))
  ) {
    event.preventDefault()
  }
})

// Show a hard-stop banner if Supabase env vars are missing — prevents blank screen
if (_supabaseMisconfigured) {
  const banner = document.createElement('div')
  banner.innerHTML = `
    <div style="min-height:100vh;background:#0A0A0A;color:#fff;display:flex;align-items:center;justify-content:center;padding:32px;font-family:monospace">
      <div style="max-width:560px;width:100%">
        <div style="color:#CCFF00;font-size:11px;letter-spacing:.18em;text-transform:uppercase;margin-bottom:12px">Configuration Error</div>
        <h1 style="font-size:22px;font-weight:900;margin:0 0 16px;letter-spacing:-.02em">Supabase env vars not set</h1>
        <p style="color:rgba(255,255,255,.55);font-size:13px;line-height:1.7;margin:0 0 20px">
          <code style="color:#CCFF00">VITE_SUPABASE_URL</code> and <code style="color:#CCFF00">VITE_SUPABASE_ANON_KEY</code>
          must be set before the app can load.
        </p>
        <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);padding:16px;font-size:12px;line-height:1.8;color:rgba(255,255,255,.65)">
          <strong style="color:#fff;display:block;margin-bottom:8px">To fix:</strong>
          1. Go to <strong>Vercel → Project → Settings → Environment Variables</strong><br>
          2. Add <code>VITE_SUPABASE_URL</code> = your Supabase project URL<br>
          3. Add <code>VITE_SUPABASE_ANON_KEY</code> = your Supabase anon/public key<br>
          4. <strong>Redeploy</strong> (env vars are baked in at build time)
        </div>
        <p style="color:rgba(255,255,255,.28);font-size:11px;margin-top:16px">Local dev: copy <code>web/frontend/.env.example</code> → <code>.env.local</code></p>
      </div>
    </div>
  `
  document.getElementById('root').appendChild(banner)
  // Don't mount React — show the plain-HTML error instead
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — see browser for instructions')
}

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
if (SENTRY_DSN) {
  import('@sentry/react').then(({ init, browserTracingIntegration }) => {
    init({
      dsn: SENTRY_DSN,
      integrations: [browserTracingIntegration()],
      tracesSampleRate: 0.05,
      sendDefaultPii: false,
    })
  }).catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
