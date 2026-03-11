import { useState, useEffect } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'
import PageHeader from '../components/PageHeader'

const PREF_EMAIL_ALERTS = 'ade_pref_email_alerts'
const PREF_PUSH_ALERTS = 'ade_pref_push_alerts'

export default function Settings() {
  const [config, setConfig] = useState(null)
  const [emailAlerts, setEmailAlerts] = useState(() => localStorage.getItem(PREF_EMAIL_ALERTS) !== 'false')
  const [pushAlerts, setPushAlerts] = useState(() => localStorage.getItem(PREF_PUSH_ALERTS) === 'true')

  useEffect(() => {
    api.getConfig().then(setConfig)
  }, [])

  useEffect(() => {
    localStorage.setItem(PREF_EMAIL_ALERTS, String(emailAlerts))
  }, [emailAlerts])
  useEffect(() => {
    localStorage.setItem(PREF_PUSH_ALERTS, String(pushAlerts))
  }, [pushAlerts])

  if (!config) {
    return (
      <PageWrapper>
        <PageHeader title="Settings" icon={SettingsIcon} />
        <div className="text-white/50">Loading...</div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-2xl">
        <PageHeader title="Settings" subtitle="Alert preferences and system config." icon={SettingsIcon} />

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Alert preferences</h2>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} className="rounded" />
            <span className="text-slate-300 text-sm">Email alerts for price and system alerts</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={pushAlerts} onChange={(e) => setPushAlerts(e.target.checked)} className="rounded" />
            <span className="text-slate-300 text-sm">Browser push notifications</span>
          </label>
        </div>
      </div>

      <div className="bg-apex-dark rounded-lg border border-slate-700/50 p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Export</h2>
        <p className="text-slate-400 text-sm mb-2">Download your trade history as JSON.</p>
        <a href={api.exportTrades()} download="ade-trades.json" className="inline-block px-4 py-2 rounded-lg bg-apex-accent text-white text-sm font-medium">
          Export trades
        </a>
      </div>

      <div className="bg-apex-dark rounded-lg border border-slate-700/50 p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Data Source</h2>
        <p className="text-slate-400 text-sm mb-2">
          Current: <span className="text-white font-mono">{config.data_source}</span>
        </p>
        <p className="text-slate-500 text-xs">
          Set to "yahoo" in .env for live quotes/charts/screener (no key). "mock" = JSON only. "etrade" = when E*TRADE is configured. Add FINNHUB_API_KEY for real News and Calendar.
        </p>
      </div>

      <div className="bg-apex-dark rounded-lg border border-slate-700/50 p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Scoring Weights</h2>
        <p className="text-slate-400 text-sm mb-2">Configurable via system_config.py. Weights must sum to 1.0.</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(config.scoring_weights ?? {}).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-slate-300 capitalize">{k}</span>
              <span className="text-white font-mono">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-apex-dark rounded-lg border border-slate-700/50 p-4">
        <h2 className="text-lg font-semibold text-white mb-4">AI Trading Assistant (Chat)</h2>
        <p className="text-slate-400 text-sm mb-2">
          Set <span className="font-mono text-apex-accent">OPENAI_API_KEY</span> in your environment to enable the Chat page.
        </p>
        <p className="text-slate-500 text-xs">
          Optional: <span className="font-mono">OPENAI_CHAT_MODEL</span> (default: gpt-4o-mini). Restart the backend after setting env vars.
        </p>
      </div>

      <div className="bg-apex-dark rounded-lg border border-slate-700/50 p-4">
        <h2 className="text-lg font-semibold text-white mb-4">API Credentials</h2>
        <p className="text-slate-500 text-sm">
          E*TRADE API keys are stored securely. Configure via environment variables or secure config file when ready for live integration.
        </p>
      </div>
    </div>
    </PageWrapper>
  )
}
