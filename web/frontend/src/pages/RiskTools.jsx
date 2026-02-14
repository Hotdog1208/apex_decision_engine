import { useState } from 'react'
import { Calculator } from 'lucide-react'

export default function RiskTools() {
  const [portfolio, setPortfolio] = useState(100000)
  const [riskPct, setRiskPct] = useState(2)
  const [stopPct, setStopPct] = useState(5)
  const [entry, setEntry] = useState(100)
  const [rewardPct, setRewardPct] = useState(10)
  const [winRate, setWinRate] = useState(50)

  const riskDollars = (portfolio * riskPct) / 100
  const positionSize = stopPct > 0 ? riskDollars / (entry * (stopPct / 100)) : 0
  const avgWin = entry * (rewardPct / 100)
  const avgLoss = entry * (stopPct / 100)
  const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss
  const rr = avgLoss > 0 ? (rewardPct / 100) / (stopPct / 100) : 0

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Calculator size={28} className="text-apex-accent" />
        Risk Tools
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-slate-700/50 bg-apex-dark/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Position Sizer</h2>
          <p className="text-slate-400 text-sm mb-4">Size position so risk per trade = X% of portfolio.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Portfolio value ($)</label>
              <input type="number" value={portfolio} onChange={(e) => setPortfolio(Number(e.target.value) || 0)} className="w-full rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Risk per trade (%)</label>
              <input type="number" value={riskPct} onChange={(e) => setRiskPct(Number(e.target.value) || 0)} className="w-full rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Entry price ($)</label>
              <input type="number" value={entry} onChange={(e) => setEntry(Number(e.target.value) || 0)} className="w-full rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Stop loss (%)</label>
              <input type="number" value={stopPct} onChange={(e) => setStopPct(Number(e.target.value) || 0)} className="w-full rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white" />
            </div>
          </div>
          <div className="mt-4 p-3 rounded bg-slate-800/50">
            <div className="text-slate-400 text-sm">Risk $</div>
            <div className="text-white font-mono">${riskDollars.toFixed(0)}</div>
            <div className="text-slate-400 text-sm mt-2">Shares to buy</div>
            <div className="text-apex-accent font-mono">{Math.floor(positionSize)}</div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700/50 bg-apex-dark/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Risk/Reward & Expectancy</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Reward (%)</label>
              <input type="number" value={rewardPct} onChange={(e) => setRewardPct(Number(e.target.value) || 0)} className="w-full rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Win rate (%)</label>
              <input type="number" value={winRate} onChange={(e) => setWinRate(Number(e.target.value) || 0)} className="w-full rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white" />
            </div>
          </div>
          <div className="mt-4 space-y-2 p-3 rounded bg-slate-800/50">
            <div><span className="text-slate-400">R:R ratio</span> <span className="text-white font-mono">{rr.toFixed(1)}</span></div>
            <div><span className="text-slate-400">Expectancy per share</span> <span className={expectancy >= 0 ? 'text-apex-profit' : 'text-apex-loss'}>{expectancy >= 0 ? '+' : ''}{expectancy.toFixed(2)}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
