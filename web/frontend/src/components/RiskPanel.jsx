import { motion } from 'framer-motion'
import RiskGauge from './RiskGauge'

export default function RiskPanel({ portfolio }) {
  const exposure = portfolio?.asset_class_exposure ?? {}
  const sector = portfolio?.sector_exposure ?? {}
  const total = portfolio?.portfolio_value ?? 1
  const riskUtil = Math.min(100, Object.values(exposure).reduce((a, v) => a + (v / total) * 100, 0) * 2)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl border border-white/10 bg-white/5 p-6"
    >
      <h3 className="text-lg font-display font-semibold text-white mb-4">Risk Exposure</h3>
      <div className="mb-6 flex justify-center">
        <RiskGauge riskLevel={Math.round(riskUtil)} />
      </div>
      <div className="space-y-4">
        <div>
          <div className="text-slate-400 text-sm mb-2">Asset Class</div>
          <div className="space-y-1">
            {Object.entries(exposure).map(([ac, val]) => {
              const pct = (val / total) * 100
              const warn = pct > 20
              return (
                <div key={ac} className="flex items-center gap-2">
<div className="flex-1 h-2 bg-white/10 rounded overflow-hidden">
                    <motion.div
                      className={`h-full rounded ${warn ? 'bg-apex-warning' : 'bg-apex-accent'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <span className="text-slate-300 text-sm w-24">{ac}</span>
                  <span className="text-white text-sm font-mono w-16">{pct.toFixed(1)}%</span>
                </div>
              )
            })}
            {Object.keys(exposure).length === 0 && <p className="text-slate-500 text-sm">No exposure</p>}
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-sm mb-2">Sector</div>
          <div className="space-y-1">
            {Object.entries(sector).slice(0, 5).map(([sec, val]) => {
              const pct = (val / total) * 100
              return (
                <div key={sec} className="flex justify-between text-sm">
                  <span className="text-slate-300">{sec}</span>
                  <span className="text-white font-mono">{pct.toFixed(1)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
