import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, ExternalLink } from 'lucide-react'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    api.getAlerts().then((r) => setAlerts(r.alerts || [])).catch(() => setAlerts([]))
  }, [])

  return (
    <PageWrapper>
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold text-white flex items-center gap-2 tracking-tight">
        <Bell size={28} className="text-apex-accent" />
        Alert Center
      </h1>
      <p className="text-white/50 text-sm">
        Breakouts, opportunities, and ADE-generated ideas. Configure alert preferences in Settings.
      </p>
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-white/40 py-8">No alerts yet. Run the engine or wait for new setups.</p>
        ) : (
          alerts.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -2 }}
              className="rounded-xl border border-white/10 bg-white/5 p-4 flex justify-between items-start hover:border-apex-accent/30 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-apex-accent font-medium">{a.type}</span>
                  <span className="text-white font-mono">{a.symbol}</span>
                  <span className="text-white/50 text-sm">Confidence {a.confidence}/100</span>
                </div>
                <h3 className="text-white font-medium mt-1">{a.title}</h3>
                <p className="text-white/70 text-sm mt-1">{a.message}</p>
                <p className="text-white/40 text-xs mt-2">{a.timestamp}</p>
              </div>
              <Link
                to={a.action_url || '/trading'}
                className="text-apex-accent hover:text-apex-accent-hover flex items-center gap-1 text-sm transition-colors"
              >
                View <ExternalLink size={14} />
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
    </PageWrapper>
  )
}
