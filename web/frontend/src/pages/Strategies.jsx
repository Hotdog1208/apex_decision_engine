import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import PageHeader from '../components/PageHeader'
import Card, { CardHeader, CardBody } from '../components/Card'

const STRATEGY_LIST = [
  { id: 'equity_momentum', name: 'Equity Momentum', desc: 'Trend-following on equities', enabled: true },
  { id: 'equity_mean_reversion', name: 'Equity Mean Reversion', desc: 'Reversion to mean', enabled: false },
  { id: 'option_directional', name: 'Option Directional', desc: 'Directional options plays', enabled: true },
  { id: 'option_spread', name: 'Option Spread', desc: 'Credit/debit spreads', enabled: false },
  { id: 'future_trend', name: 'Future Trend', desc: 'Futures trend', enabled: true },
]

export default function Strategies() {
  const [strategies, setStrategies] = useState(STRATEGY_LIST)

  const toggle = (id) => {
    setStrategies((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)))
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        <PageHeader
          title="Strategy Management"
          subtitle="Enable or disable ADE strategies. Parameters live in system_config.py."
          icon={Settings2}
        />
        <Card animate hover>
          <CardBody>
            <p className="text-white/60 text-sm mb-4">
              These strategies feed the decision engine. Toggle below (UI state); persistent config is in backend.
            </p>
            <div className="space-y-2">
              {strategies.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-3 px-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div>
                    <span className="text-white font-medium">{s.name}</span>
                    {s.desc && <p className="text-white/50 text-xs mt-0.5">{s.desc}</p>}
                  </div>
                  <button
                    onClick={() => toggle(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      s.enabled ? 'bg-apex-profit/20 text-apex-profit' : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {s.enabled ? 'On' : 'Off'}
                  </button>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  )
}
