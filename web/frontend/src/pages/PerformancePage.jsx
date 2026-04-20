import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Award, BarChart3, Target, Calendar } from 'lucide-react'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'
import GlitchText from '../components/GlitchText'

export default function PerformancePage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getSignalPerformance()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageWrapper><div className="animate-pulse text-apex-cyan">Loading Performance Metrics...</div></PageWrapper>

  return (
    <PageWrapper>
      <div className="space-y-10">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-apex-accent text-xs uppercase font-data tracking-[0.3em] font-bold mb-2">Performance Audit</p>
            <GlitchText as="h1" text="Signal Performance" className="text-4xl font-display font-black text-white" />
          </div>
          <div className="text-right">
             <p className="text-white/40 text-[10px] font-data uppercase tracking-widest">Global Win Rate</p>
             <p className={`text-4xl font-display font-black ${stats?.win_rate >= 0.5 ? 'text-apex-profit' : 'text-apex-loss'}`}>
                {(stats?.win_rate * 100).toFixed(1)}%
             </p>
          </div>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatMiniCard label="Total Signals" value={stats?.total_signals} icon={BarChart3} color="text-white" />
          <StatMiniCard label="Outcomes Recorded" value={stats?.outcomes_recorded} icon={Target} color="text-apex-cyan" />
          <StatMiniCard label="Target Accuracy" value="90.0%" icon={Award} color="text-apex-accent" />
          <StatMiniCard label="Active Audit" value="Live" icon={Calendar} color="text-apex-profit" />
        </div>

        {/* Verdict Breakdown */}
        <div className="cyber-panel p-8 bg-black/60 border border-white/10">
          <h2 className="text-xs uppercase font-data tracking-widest text-white/50 mb-6">Breakdown by Signal Intent</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Object.entries(stats?.by_verdict || {}).map(([verdict, vStats]) => (
              <div key={verdict} className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className={`text-lg font-black font-display uppercase ${verdict === 'BUY' ? 'text-apex-profit' : verdict === 'AVOID' ? 'text-apex-loss' : 'text-apex-warning'}`}>
                    {verdict}
                  </span>
                  <span className="text-xs font-data text-white/40">{vStats.recorded} / {vStats.total} Audited</span>
                </div>
                <div className="h-1 bg-white/10 w-full overflow-hidden">
                  <div 
                    className={`h-full ${verdict === 'BUY' ? 'bg-apex-profit' : verdict === 'AVOID' ? 'bg-apex-loss' : 'bg-apex-warning'}`} 
                    style={{ width: `${vStats.win_rate * 100}%` }}
                  />
                </div>
                <p className="text-2xl font-display font-black text-white">{(vStats.win_rate * 100).toFixed(1)}% <span className="text-[10px] text-white/30 font-data">WIN RATE</span></p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-apex-accent/10 border border-apex-accent/20 text-apex-accent text-xs font-data leading-relaxed">
          <p className="font-bold mb-1 uppercase tracking-widest">NOTE TO ANALYST:</p>
          This dashboard tracks the efficacy of Claude 3.5 Sonnet signals against realised market outcomes. 
          A "WIN" is defined as a signal that reached its target price before its stop level or target timeframe expired.
        </div>
      </div>
    </PageWrapper>
  )
}

function StatMiniCard({ label, value, icon: Icon, color }) {
  return (
    <div className="cyber-panel p-5 bg-white/[0.02] border border-white/5">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-data text-white/30 uppercase tracking-widest">{label}</span>
        <Icon size={14} className={color} />
      </div>
      <p className="text-2xl font-display font-black text-white">{value}</p>
    </div>
  )
}
