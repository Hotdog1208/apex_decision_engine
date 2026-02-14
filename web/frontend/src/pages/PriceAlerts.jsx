import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { api } from '../api'

export default function PriceAlerts() {
  const [alerts, setAlerts] = useState([])
  const [symbol, setSymbol] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [condition, setCondition] = useState('above')

  const load = () => api.getPriceAlerts().then((r) => setAlerts(r.alerts || [])).catch(() => setAlerts([]))

  useEffect(() => {
    load()
  }, [])

  const create = () => {
    if (!symbol.trim() || !targetPrice) return
    api.createPriceAlert({
      symbol: symbol.trim().toUpperCase(),
      target_price: Number(targetPrice),
      condition: condition,
    }).then(() => {
      setSymbol('')
      setTargetPrice('')
      load()
    }).catch(console.error)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Bell size={28} className="text-apex-accent" />
        Price Alerts
      </h1>
      <p className="text-slate-400 text-sm">Get notified when a symbol crosses your target price.</p>

      <div className="flex flex-wrap gap-2 items-end">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Symbol"
          className="rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white w-24"
        />
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white"
        >
          <option value="above">above</option>
          <option value="below">below</option>
        </select>
        <input
          type="number"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          placeholder="Price"
          className="rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white w-28"
        />
        <button onClick={create} className="px-4 py-2 rounded-lg bg-apex-accent text-white text-sm font-medium">
          Add Alert
        </button>
      </div>

      <div className="rounded-lg border border-slate-700/50 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50 text-slate-400">
            <tr>
              <th className="px-4 py-2">Symbol</th>
              <th className="px-4 py-2">Condition</th>
              <th className="px-4 py-2">Target</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {alerts.map((a) => (
              <tr key={a.id} className="border-t border-slate-700/50">
                <td className="px-4 py-2 font-mono">{a.symbol}</td>
                <td className="px-4 py-2">{a.condition}</td>
                <td className="px-4 py-2">${a.target_price}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {alerts.length === 0 && (
          <p className="px-4 py-6 text-slate-500 text-center">No price alerts yet. Add one above.</p>
        )}
      </div>
    </div>
  )
}
