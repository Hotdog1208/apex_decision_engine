import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import PageHeader from '../components/PageHeader'
import Card, { CardHeader, CardBody } from '../components/Card'

// Correct formulas:
// Position size (shares) = Risk $ / (Entry × Stop %) = Risk $ / (Entry × (StopPct/100))
// So: shares = riskDollars / (entry * (stopPct/100))
// R:R = Reward% / Stop% (e.g. 10% reward / 5% stop = 2)
// Expectancy per share = (WinRate × AvgWin) − ((1−WinRate) × AvgLoss) where AvgWin/AvgLoss in $ per share

export default function RiskTools() {
  const [portfolio, setPortfolio] = useState(100000)
  const [riskPct, setRiskPct] = useState(2)
  const [stopPct, setStopPct] = useState(5)
  const [entry, setEntry] = useState(100)
  const [rewardPct, setRewardPct] = useState(10)
  const [winRate, setWinRate] = useState(50)

  const riskDollars = (portfolio * riskPct) / 100
  const positionSize = stopPct > 0 && entry > 0 ? riskDollars / (entry * (stopPct / 100)) : 0
  const avgWin = entry * (rewardPct / 100)
  const avgLoss = entry * (stopPct / 100)
  const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss
  const rr = stopPct > 0 ? (rewardPct / 100) / (stopPct / 100) : 0

  return (
    <PageWrapper>
      <div className="space-y-8">
        <PageHeader
          title="Risk Tools"
          subtitle="Correct position sizing and R:R. Formulas: risk $ = portfolio × risk%; shares = risk $ ÷ (entry × stop%); R:R = reward% ÷ stop%."
          icon={Calculator}
        />

        <div className="grid md:grid-cols-2 gap-6">
          <Card animate hover>
            <CardHeader title="Position Sizer" subtitle="Size so risk per trade = X% of portfolio" />
            <CardBody>
              <p className="text-white/60 text-sm mb-4">
                Risk $ = Portfolio × Risk%. Shares = Risk $ ÷ (Entry × Stop%). Ensures you never risk more than your chosen % per trade.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-white/50 text-xs mb-1">Portfolio value ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={portfolio}
                    onChange={(e) => setPortfolio(Number(e.target.value) || 0)}
                    className="w-full rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1">Risk per trade (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={riskPct}
                    onChange={(e) => setRiskPct(Number(e.target.value) || 0)}
                    className="w-full rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1">Entry price ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={entry}
                    onChange={(e) => setEntry(Number(e.target.value) || 0)}
                    className="w-full rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1">Stop loss (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={stopPct}
                    onChange={(e) => setStopPct(Number(e.target.value) || 0)}
                    className="w-full rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-white/50 text-sm">Risk $</div>
                <div className="font-data text-white font-semibold text-lg">${riskDollars.toFixed(0)}</div>
                <div className="text-white/50 text-sm mt-2">Shares to buy</div>
                <div className="font-data text-apex-accent font-semibold text-lg">{Math.floor(positionSize)}</div>
              </div>
            </CardBody>
          </Card>

          <Card animate hover>
            <CardHeader title="Risk/Reward & Expectancy" subtitle="R:R = reward% ÷ stop%; Expectancy = (Win% × AvgWin) − (Loss% × AvgLoss)" />
            <CardBody>
              <div className="space-y-3">
                <div>
                  <label className="block text-white/50 text-xs mb-1">Reward target (%)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={rewardPct}
                    onChange={(e) => setRewardPct(Number(e.target.value) || 0)}
                    className="w-full rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1">Win rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={winRate}
                    onChange={(e) => setWinRate(Number(e.target.value) || 0)}
                    className="w-full rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/50">R:R ratio</span>
                  <span className="font-data text-white font-semibold">{rr.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Expectancy per share</span>
                  <span className={`font-data font-semibold ${expectancy >= 0 ? 'text-apex-profit' : 'text-apex-loss'}`}>
                    {expectancy >= 0 ? '+' : ''}{expectancy.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </PageWrapper>
  )
}
