import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { api } from '../api'
import { formatCurrency } from '../lib/format'

/** Pick symbols that look like indices or key names for a compact strip */
const STRIP_SYMBOLS = ['SPY', 'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA']

export default function MarketStrip() {
  const [snapshot, setSnapshot] = useState(null)

  useEffect(() => {
    api.getMarketSnapshot().then(setSnapshot).catch(() => setSnapshot(null))
  }, [])

  const stocks = snapshot?.stocks ?? []
  const items = STRIP_SYMBOLS.map((sym) => stocks.find((s) => s.symbol === sym)).filter(Boolean)

  if (items.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-wrap items-center gap-6 py-3 px-4 rounded-xl border border-white/10 bg-white/5 overflow-x-auto"
    >
      <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider shrink-0">
        <TrendingUp size={14} />
        <span>Market</span>
      </div>
      {items.map((s) => {
        const changePct = s.close_prev ? ((s.price - s.close_prev) / s.close_prev) * 100 : 0
        return (
          <div key={s.symbol} className="flex items-center gap-2 shrink-0">
            <span className="font-data font-semibold text-white">{s.symbol}</span>
            <span className="text-white/70 font-data text-sm">{formatCurrency(s.price, { decimals: 2 })}</span>
            <span className={`font-data text-xs ${changePct >= 0 ? 'text-apex-profit' : 'text-apex-loss'}`}>
              {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
            </span>
          </div>
        )
      })}
    </motion.div>
  )
}
