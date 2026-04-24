import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Award, Target, BarChart3, TrendingUp } from 'lucide-react'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'
import GlitchText from '../components/GlitchText'
import SkeletonLoader from '../components/SkeletonLoader'

const easing = [0.16, 1, 0.3, 1]

const VERDICT_BADGE = {
  STRONG_BUY: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30',
  BUY: 'text-apex-profit bg-apex-profit/10 border-apex-profit/30',
  WATCH: 'text-apex-warning bg-apex-warning/10 border-apex-warning/30',
  AVOID: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  STRONG_AVOID: 'text-apex-loss bg-apex-loss/10 border-apex-loss/30',
}

function accuracyColor(pct) {
  if (pct < 50) return { bar: 'bg-apex-loss', text: 'text-apex-loss' }
  if (pct <= 60) return { bar: 'bg-apex-warning', text: 'text-apex-warning' }
  return { bar: 'bg-apex-profit', text: 'text-apex-profit' }
}

export default function TrackRecord() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getAccuracy()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <PageWrapper>
        <div className="max-w-5xl mx-auto space-y-8">
          <SkeletonLoader height={48} width="40%" />
          <SkeletonLoader height={120} />
          <SkeletonLoader height={60} />
          <SkeletonLoader height={240} />
          <SkeletonLoader height={360} />
        </div>
      </PageWrapper>
    )
  }

  if (error || !stats || stats.error) {
    return (
      <PageWrapper>
        <div className="max-w-5xl mx-auto p-8 text-apex-loss border border-apex-loss/30 font-data text-sm">
          Failed to load track record: {error || stats?.message || 'Unknown error'}
        </div>
      </PageWrapper>
    )
  }

  const { evaluated, correct, accuracy_pct, by_verdict, total_signals, recent_entries, earliest_timestamp } = stats
  const hasEnough = (evaluated || 0) >= 10
  const colors = accuracyColor(accuracy_pct || 0)

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <p className="text-apex-accent text-xs uppercase font-data tracking-[0.3em] font-bold mb-2">Signal Intelligence</p>
          <GlitchText as="h1" text="ADE Track Record" className="text-4xl font-display font-black text-white" />
          {earliest_timestamp && (
            <p className="text-white/30 text-xs font-data mt-2">
              Tracking since {new Date(earliest_timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Signals Issued', value: total_signals ?? 0, icon: BarChart3, color: 'text-white' },
            { label: 'Evaluated', value: evaluated ?? 0, icon: Target, color: 'text-apex-cyan' },
            { label: 'Correct', value: correct ?? 0, icon: Award, color: 'text-apex-profit' },
            { label: 'Accuracy', value: hasEnough ? `${(accuracy_pct || 0).toFixed(1)}%` : '—', icon: TrendingUp, color: colors.text },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="cyber-panel p-5 bg-white/[0.02] border border-white/5">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-data text-white/30 uppercase tracking-widest">{label}</span>
                <Icon size={14} className={color} />
              </div>
              <p className={`text-2xl font-display font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Headline stat */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing }}
          className="cyber-panel border-l-[6px] border-l-apex-accent p-8 bg-black/40 overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-apex-accent/3 to-transparent pointer-events-none" />
          {hasEnough ? (
            <div className="relative z-10">
              <p className="text-white/40 text-xs font-data uppercase tracking-widest mb-3">Directional Accuracy Result</p>
              <p className="text-2xl md:text-3xl font-display font-black text-white leading-snug">
                ADE has been correct{' '}
                <span className={colors.text}>{correct}</span>
                {' '}out of{' '}
                <span className="text-white">{evaluated}</span>
                {' '}evaluated signals
              </p>
            </div>
          ) : (
            <div className="relative z-10">
              <p className="text-2xl font-display font-black text-apex-warning">Track record building — check back soon</p>
              <p className="text-white/40 text-sm font-data mt-2">
                {evaluated ?? 0} of 10 required evaluated signals. {10 - (evaluated ?? 0)} more needed.
              </p>
            </div>
          )}
        </motion.div>

        {/* Accuracy bar */}
        {hasEnough && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/40 text-xs font-data uppercase tracking-widest">
                Directional Accuracy — 1-3 day window
              </span>
              <span className={`text-xl font-display font-black ${colors.text}`}>
                {(accuracy_pct || 0).toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-white/10 w-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${accuracy_pct || 0}%` }}
                transition={{ duration: 1.2, ease: easing }}
                className={`h-full ${colors.bar}`}
              />
            </div>
            <div className="flex justify-between text-[9px] text-white/20 font-data uppercase">
              <span>0%</span>
              <span className="text-apex-loss/50">50% threshold</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Verdict breakdown table */}
        <div className="cyber-panel border border-white/10 bg-black/40 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xs font-data uppercase tracking-[0.2em] text-white/50">Breakdown by Verdict</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full font-data">
              <thead>
                <tr className="border-b border-white/5">
                  {['Verdict', 'Signals Issued', 'Correct', 'Accuracy'].map((h, i) => (
                    <th key={h} className={`py-3 text-[9px] text-white/30 uppercase tracking-[0.2em] ${i === 0 ? 'text-left px-6' : 'text-right px-6'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(by_verdict || {})
                  .filter(([, v]) => v.total > 0)
                  .map(([verdict, v]) => {
                    const ac = v.evaluated > 0 ? accuracyColor(v.accuracy) : null
                    return (
                      <tr key={verdict} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${VERDICT_BADGE[verdict] || 'text-white/50 bg-white/5 border-white/10'}`}>
                            {verdict}
                          </span>
                        </td>
                        <td className="text-right px-6 py-4 text-white text-sm">{v.total}</td>
                        <td className="text-right px-6 py-4 text-apex-profit text-sm">{v.correct}</td>
                        <td className="text-right px-6 py-4">
                          <span className={`text-sm ${ac ? ac.text : 'text-white/30'}`}>
                            {v.evaluated > 0 ? `${v.accuracy.toFixed(1)}%` : '—'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                {Object.values(by_verdict || {}).every((v) => v.total === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-white/30 text-xs">No signals logged yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent signals table */}
        <div className="cyber-panel border border-white/10 bg-black/40 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xs font-data uppercase tracking-[0.2em] text-white/50">Recent Signals (Last 20)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full font-data">
              <thead>
                <tr className="border-b border-white/5">
                  {['Symbol', 'Date', 'Verdict', 'Confidence', 'Outcome', 'Correct'].map((h, i) => (
                    <th key={h} className={`py-3 text-[9px] text-white/30 uppercase tracking-[0.2em] ${i <= 2 ? 'text-left px-4' : 'text-right px-4'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(recent_entries || []).map((entry) => {
                  const outcomePct =
                    entry.price_3d_later && entry.price_at_signal
                      ? ((entry.price_3d_later - entry.price_at_signal) / entry.price_at_signal * 100)
                      : null
                  const isPending = entry.correct === null && entry.outcome === null
                  const confPct = entry.confidence > 1 ? entry.confidence : entry.confidence * 100

                  return (
                    <tr key={entry.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-white font-bold text-sm">{entry.symbol}</td>
                      <td className="px-4 py-3 text-white/40 text-[10px]">
                        {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase border ${VERDICT_BADGE[entry.verdict?.toUpperCase()] || 'text-white/50 bg-white/5 border-white/10'}`}>
                          {entry.verdict}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 text-white/60 text-[10px]">
                        {confPct.toFixed(0)}%
                      </td>
                      <td className="text-right px-4 py-3">
                        {isPending ? (
                          <span className="text-white/25 text-[10px]">Pending</span>
                        ) : outcomePct !== null ? (
                          <span className={`text-[10px] font-bold ${outcomePct >= 0 ? 'text-apex-profit' : 'text-apex-loss'}`}>
                            {outcomePct >= 0 ? '+' : ''}{outcomePct.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-white/25 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 flex justify-end items-center">
                        {entry.correct === null ? (
                          <span className="text-white/25 text-[10px]">—</span>
                        ) : entry.correct ? (
                          <CheckCircle size={14} className="text-apex-profit" />
                        ) : (
                          <XCircle size={14} className="text-apex-loss" />
                        )}
                      </td>
                    </tr>
                  )
                })}
                {(!recent_entries || recent_entries.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-white/30 text-xs">No signals logged yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-white/25 text-xs font-body leading-relaxed text-center pb-4">
          ADE signals are for informational and educational purposes only. Past performance does not guarantee future results. This is not financial advice.
        </p>
      </div>
    </PageWrapper>
  )
}
