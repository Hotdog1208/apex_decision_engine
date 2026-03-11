import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, RefreshCw, Zap, BarChart2 } from 'lucide-react'
import { api } from '../api'
import TradeTable from '../components/TradeTable'
import SignalChart from '../components/SignalChart'
import RiskPanel from '../components/RiskPanel'
import PageWrapper from '../components/PageWrapper'
import PageHeader from '../components/PageHeader'
import Card, { CardHeader, CardBody } from '../components/Card'
import MagneticButton from '../components/MagneticButton'

const QUOTE_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'SPY']

export default function LiveTrading() {
  const [trades, setTrades] = useState([])
  const [signals, setSignals] = useState([])
  const [portfolio, setPortfolio] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [t, s, p, snap] = await Promise.all([
        api.getTrades(),
        api.getSignals(),
        api.getPortfolio(),
        api.getMarketSnapshot(),
      ])
      setTrades(t?.trades ?? [])
      setSignals(s?.signals ?? [])
      setPortfolio(p)
      const stocks = snap?.stocks ?? []
      setQuotes(QUOTE_SYMBOLS.map((sym) => stocks.find((x) => x.symbol === sym)).filter(Boolean))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const runEngine = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.runEngine()
      setTrades(res?.trades ?? [])
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const approveTrade = async (tradeId) => {
    try {
      await api.approveTrade(tradeId)
      setTrades((prev) =>
        prev.map((t) => (t.trade_id === tradeId ? { ...t, lifecycle_state: 'active' } : t))
      )
    } catch (e) {
      setError(e.message)
    }
  }

  const closeTrade = async (tradeId) => {
    try {
      await api.closeTrade(tradeId)
      setTrades((prev) =>
        prev.map((t) => (t.trade_id === tradeId ? { ...t, lifecycle_state: 'closed' } : t))
      )
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <PageWrapper>
      <div className="space-y-8">
        <PageHeader
          title="Live Trading"
          subtitle="Run the decision engine, review signals, and approve or close trades."
          icon={Zap}
          action={
            <div className="flex gap-3">
            <MagneticButton onClick={runEngine} disabled={loading} variant="primary">
              <span className="flex items-center gap-2">
                <Play size={16} />
                Run Engine
              </span>
            </MagneticButton>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-3 rounded-lg border border-white/20 text-white hover:bg-white/5 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={18} />
              Refresh
            </motion.button>
            </div>
          }
        />

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-apex-loss/20 text-apex-loss border border-apex-loss/30"
          >
            {error}
          </motion.div>
        )}

        {/* Live quote strip — TradingView-style */}
        {quotes.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-white/10 bg-white/5 p-3 flex flex-wrap gap-4 items-center"
          >
            {quotes.map((q) => (
              <Link
                key={q.symbol}
                to={`/charts?symbol=${q.symbol}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <span className="font-data font-semibold text-white">{q.symbol}</span>
                <span className="font-data text-apex-accent">${(q.price ?? 0).toFixed(2)}</span>
                <span className={`text-xs font-data ${(q.returns_20d ?? 0) >= 0 ? 'text-apex-profit' : 'text-apex-loss'}`}>
                  {((q.returns_20d ?? 0) * 100).toFixed(1)}%
                </span>
                <BarChart2 size={14} className="text-white/40" />
              </Link>
            ))}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card animate delay={0.1} hover>
              <CardHeader title="Signal Scores" subtitle="Engine output by symbol" />
              <CardBody>
                <SignalChart signals={signals} />
              </CardBody>
            </Card>
          </div>
          <div>
            <RiskPanel portfolio={portfolio} />
          </div>
        </div>

        <Card animate delay={0.15} hover>
          <CardHeader title="Trade Recommendations" subtitle="Approve or close positions" />
          <CardBody noPadding>
            <div className="overflow-x-auto">
              <TradeTable trades={trades} onApprove={approveTrade} onClose={closeTrade} />
            </div>
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  )
}
