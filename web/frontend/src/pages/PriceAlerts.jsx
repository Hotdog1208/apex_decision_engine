import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, Trash2, BarChart2 } from 'lucide-react'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'
import PageHeader from '../components/PageHeader'
import Card, { CardBody } from '../components/Card'

export default function PriceAlerts() {
  const [alerts, setAlerts] = useState([])
  const [quotes, setQuotes] = useState({})
  const [symbol, setSymbol] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [condition, setCondition] = useState('above')

  const load = () => api.getPriceAlerts().then((r) => setAlerts(r.alerts || [])).catch(() => setAlerts([]))

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const syms = [...new Set(alerts.map((a) => a.symbol).filter(Boolean))]
    if (syms.length === 0) return
    api
      .getQuotes(syms)
      .then((r) => {
        const map = {}
        for (const q of r.quotes || []) map[q.symbol] = q
        setQuotes(map)
      })
      .catch(() => {})
  }, [alerts])

  const create = () => {
    if (!symbol.trim() || !targetPrice) return
    api
      .createPriceAlert({
        symbol: symbol.trim().toUpperCase(),
        target_price: Number(targetPrice),
        condition,
      })
      .then(() => {
        setSymbol('')
        setTargetPrice('')
        load()
      })
      .catch(console.error)
  }

  const remove = (alertId) => {
    api.deletePriceAlert(alertId).then(load).catch(console.error)
  }

  const isTriggered = (a) => {
    const price = quotes[a.symbol]?.price
    if (price == null) return false
    const target = a.target_price ?? a.price ?? 0
    return a.condition === 'above' ? price >= target : price <= target
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        <PageHeader
          title="Price Alerts"
          subtitle="Get notified when price crosses your target. Near 100% accurate—powered by live quotes."
          icon={Bell}
        />

        <Card animate hover>
          <CardBody>
            <div className="flex flex-wrap gap-3 items-end">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Symbol"
                className="rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white w-24"
                maxLength={8}
              />
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
              <input
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Target price"
                className="rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white w-28"
              />
              <button
                onClick={create}
                className="px-4 py-2 rounded-lg bg-apex-accent text-black text-sm font-medium hover:opacity-90"
              >
                Add Alert
              </button>
            </div>
          </CardBody>
        </Card>

        <Card animate hover>
          <CardBody noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-white/60 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3">Condition</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Current</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 w-16" />
                  </tr>
                </thead>
                <tbody className="text-white/90">
                  {alerts.map((a) => {
                    const current = quotes[a.symbol]?.price
                    const target = a.target_price ?? a.price ?? 0
                    const triggered = isTriggered(a)
                    return (
                      <motion.tr
                        key={a.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-t border-white/5 hover:bg-white/5"
                      >
                        <td className="px-4 py-3 font-data font-medium">{a.symbol}</td>
                        <td className="px-4 py-3 capitalize">{a.condition}</td>
                        <td className="px-4 py-3 font-data text-apex-accent">${target.toFixed(2)}</td>
                        <td className="px-4 py-3 font-data">
                          {current != null ? `$${current.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {triggered ? (
                            <span className="text-apex-profit font-medium">Triggered</span>
                          ) : current != null ? (
                            <span className="text-white/50">Watching</span>
                          ) : (
                            <span className="text-white/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/charts?symbol=${a.symbol}`} className="text-apex-accent hover:underline text-xs mr-2">
                            Chart
                          </Link>
                          <button
                            onClick={() => remove(a.id)}
                            className="text-white/40 hover:text-apex-loss p-1 inline-flex"
                            aria-label="Delete alert"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {alerts.length === 0 && (
              <p className="px-4 py-8 text-white/40 text-center">No price alerts. Add one above.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  )
}
