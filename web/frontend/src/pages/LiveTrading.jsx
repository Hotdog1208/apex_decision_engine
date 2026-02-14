import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, RefreshCw } from 'lucide-react'
import { api } from '../api'
import TradeTable from '../components/TradeTable'
import SignalChart from '../components/SignalChart'
import RiskPanel from '../components/RiskPanel'
import PageWrapper from '../components/PageWrapper'
import MagneticButton from '../components/MagneticButton'

export default function LiveTrading() {
  const [trades, setTrades] = useState([])
  const [signals, setSignals] = useState([])
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [t, s, p] = await Promise.all([
        api.getTrades(),
        api.getSignals(),
        api.getPortfolio(),
      ])
      setTrades(t?.trades ?? [])
      setSignals(s?.signals ?? [])
      setPortfolio(p)
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Live Trading</h1>
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
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-apex-loss/20 text-apex-loss border border-apex-loss/30"
          >
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-white/10 bg-white/5 p-6"
            >
              <h2 className="text-lg font-display font-semibold text-white mb-4">Signal Scores</h2>
              <SignalChart signals={signals} />
            </motion.div>
          </div>
          <div>
            <RiskPanel portfolio={portfolio} />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-white/10 bg-white/5 p-6 overflow-hidden"
        >
          <h2 className="text-lg font-display font-semibold text-white mb-4">Trade Recommendations</h2>
          <TradeTable trades={trades} onApprove={approveTrade} onClose={closeTrade} />
        </motion.div>
      </div>
    </PageWrapper>
  )
}
