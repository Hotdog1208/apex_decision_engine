import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, ExternalLink, Inbox, AlertTriangle, Activity } from 'lucide-react'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'
import SkeletonLoader from '../components/SkeletonLoader'
import GlitchText from '../components/GlitchText'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    api.getAlerts()
      .then((r) => setAlerts(r.alerts || []))
      .catch((e) => { setError(e.message); setAlerts([]) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()

    // Connect to WebSocket for real-time UOA alerts
    const wsUrl = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/ws`
    const ws = new WebSocket(wsUrl)

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.event === 'high_conviction_uoa') {
          const confidence = Math.round((msg.data.probability || 0) * 100)
          const newAlert = {
            id: `uoa-${Date.now()}`,
            type: 'UOA_ALERT',
            symbol: msg.data.anomaly.ticker || 'UNKNOWN',
            confidence: confidence,
            title: `High Conviction UOA Detected`,
            message: `Massive ${msg.data.anomaly.type} activity. Vol/OI: ${msg.data.features?.vol_oi_ratio?.toFixed(2)}. Trend Alignment: ${msg.data.features?.trend_alignment}.`,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            action_url: `/charts?symbol=${msg.data.anomaly.ticker || 'SPY'}`
          }
          setAlerts(prev => [newAlert, ...prev])
        }
      } catch (err) { }
    }

    return () => {
      ws.close()
    }
  }, [])

  return (
    <PageWrapper className="min-h-screen pb-32">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[30%] -right-40 w-96 h-96 bg-apex-cyan/5 rounded-full blur-[100px]" />
      </div>

      <div className="space-y-8 relative z-10 pt-8 max-w-5xl mx-auto">
        <div className="mb-12 relative flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-[3px] border-white/10 pb-6">
          <div className="absolute -left-4 bottom-0 w-2 h-12 bg-apex-cyan" />
          <div>
            <div className="flex items-center gap-3 mb-2 text-apex-cyan/70">
              <Bell size={18} className="animate-[wiggle_2s_ease-in-out_infinite]" />
              <span className="text-xs font-data uppercase tracking-[0.4em]">System Notifications</span>
            </div>
            <GlitchText as="h1" text="DEFCON_1" className="text-5xl md:text-7xl font-display font-black text-white tracking-tighter mix-blend-difference" />
            <p className="max-w-xl text-white/50 text-sm font-data uppercase tracking-widest mt-4 leading-relaxed border-l border-apex-cyan/30 pl-4">
              Breakouts, anomalies, and ADE-generated intelligence vectors.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <div className="text-apex-cyan font-data text-2xl font-black drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">
              {loading ? '--' : alerts.length} <span className="text-sm">ACTIVE</span>
            </div>
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-xl bg-apex-loss/20 text-apex-loss border border-apex-loss/30 text-sm font-data flex items-center gap-3 shadow-[0_0_20px_rgba(255,0,85,0.2)]">
            <AlertTriangle size={16} className="animate-pulse" />
            {error}
          </motion.div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonLoader key={i} height={120} className="rounded-none border-l-2 border-white/20 bg-black/40" />
            ))}
          </div>
        )}

        {!loading && alerts.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-white/10 bg-black/40 p-16 text-center cyber-panel overflow-hidden relative"
          >
            <div className="absolute inset-0 scanlines opacity-20 pointer-events-none" />
            <Inbox size={48} className="text-white/20 mx-auto mb-6 relative z-10" />
            <GlitchText as="h3" text="ZERO ANOMALIES" className="text-3xl font-display font-black text-white/40 tracking-tighter relative z-10" />
            <p className="text-white/30 text-xs font-data uppercase tracking-[0.2em] mt-4 relative z-10">Run the engine or wait for new setups.</p>
          </motion.div>
        )}

        {!loading && alerts.length > 0 && (
          <div className="space-y-4 relative">
            <div className="absolute -left-[35px] top-0 bottom-0 w-[2px] bg-white/10 hidden md:block" />

            <AnimatePresence>
              {alerts.map((a, i) => {
                const isHighConfidence = a.confidence >= 80;
                const borderColor = isHighConfidence ? 'border-apex-cyan' : 'border-white/20';
                const bgColor = isHighConfidence ? 'bg-apex-cyan/5' : 'bg-black/60';
                const shadow = isHighConfidence ? 'shadow-[0_0_30px_rgba(0,240,255,0.1)]' : '';

                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className={`relative rounded-none border-l-[4px] border-y border-r border-r-white/10 border-y-white/10 ${borderColor} ${bgColor} ${shadow} p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:bg-black/80 transition-all cyber-panel`}
                  >
                    {/* Timeline Node */}
                    <div className="absolute -left-[39px] top-1/2 -translate-y-1/2 w-[10px] h-[10px] border-2 border-black bg-apex-cyan rounded-full hidden md:block group-hover:scale-150 transition-transform shadow-[0_0_10px_rgba(0,240,255,0.8)]" />

                    {/* Scanline hover effect */}
                    <div className="absolute inset-0 scanlines opacity-0 group-hover:opacity-30 pointer-events-none transition-opacity" />

                    <div className="flex-1 relative z-10 w-full min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 text-[10px] font-data font-bold uppercase tracking-widest ${isHighConfidence ? 'bg-apex-cyan text-black' : 'bg-white/10 text-white/70'}`}>
                          {a.type}
                        </span>
                        <span className="text-white font-display font-black text-lg tracking-wider">{a.symbol}</span>
                        <div className="flex-1 border-b border-white/10 max-w-[100px] hidden sm:block" />
                        <span className={`text-[10px] font-data font-bold tracking-[0.2em] flex items-center gap-2 ${isHighConfidence ? 'text-apex-cyan drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]' : 'text-white/50'}`}>
                          <Activity size={10} className={isHighConfidence ? 'animate-pulse' : ''} />
                          CFD: {a.confidence}/100
                        </span>
                      </div>

                      <h3 className="text-white font-display font-semibold text-xl md:text-2xl mt-3 tracking-tight group-hover:text-apex-cyan transition-colors line-clamp-1">{a.title}</h3>
                      <p className="text-white/60 text-sm mt-2 font-body leading-relaxed line-clamp-2">{a.message}</p>

                      <p className="text-white/30 text-[10px] font-data uppercase tracking-[0.2em] mt-4 flex items-center gap-2">
                        <span>T_{a.timestamp.replace(/ /g, '_')}</span>
                        {isHighConfidence && <span className="text-apex-cyan/50">// HIGH_PRIORITY</span>}
                      </p>
                    </div>

                    <Link
                      to={a.action_url || '/trading'}
                      className={`relative z-10 shrink-0 w-full md:w-auto text-center px-6 py-4 border ${isHighConfidence ? 'border-apex-cyan text-apex-cyan hover:bg-apex-cyan hover:text-black shadow-[inset_0_0_15px_rgba(0,240,255,0.2)]' : 'border-white/20 text-white/70 hover:bg-white hover:text-black'} font-data text-xs uppercase font-bold tracking-widest transition-all flex items-center justify-center gap-2 group/btn`}
                    >
                      <span>Engage</span>
                      <ExternalLink size={14} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                    </Link>

                    {/* Decorative Corner */}
                    <div className="absolute top-0 right-0 p-1 opacity-20 pointer-events-none hidden md:block">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M24 0H0" stroke="currentColor" strokeWidth="2" />
                        <path d="M24 24V0" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageWrapper >
  )
}
