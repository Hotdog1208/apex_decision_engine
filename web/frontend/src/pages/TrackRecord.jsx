import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Target, Award, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'
import GlitchText from '../components/GlitchText'
import SkeletonLoader from '../components/SkeletonLoader'
import StatCard from '../components/ui/StatCard'
import AccuracyBar from '../components/ui/AccuracyBar'
import DataTable from '../components/ui/DataTable'
import VerdictBadge from '../components/ui/VerdictBadge'
import OutcomeIndicator from '../components/ui/OutcomeIndicator'

const easing = [0.16, 1, 0.3, 1]

function accuracyColor(pct) {
  if (pct >= 60) return '#00FF88'
  if (pct >= 50) return '#CCFF00'
  if (pct >= 40) return '#FFEA00'
  return '#FF0055'
}

export default function TrackRecord() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

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
          <SkeletonLoader height={44} width="38%" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <SkeletonLoader key={i} height={90} />)}
          </div>
          <SkeletonLoader height={60} />
          <SkeletonLoader height={220} />
          <SkeletonLoader height={320} />
        </div>
      </PageWrapper>
    )
  }

  if (error || !stats || stats.error) {
    return (
      <PageWrapper>
        <div className="max-w-5xl mx-auto p-8" style={{ background: 'rgba(255,0,85,0.06)', border: '1px solid rgba(255,0,85,0.25)', fontFamily: 'var(--font-data, monospace)', fontSize: '12px', color: 'rgba(255,0,85,0.80)' }}>
          Error: {error || stats?.message || 'Unknown error'}
        </div>
      </PageWrapper>
    )
  }

  const {
    evaluated, correct, accuracy_pct, by_verdict,
    total_signals, recent_entries, earliest_timestamp,
    avg_conf_correct, avg_conf_incorrect,
    avg_pct_change_correct, avg_pct_change_incorrect,
  } = stats

  const hasEnough  = (evaluated || 0) >= 10
  const accColor   = accuracyColor(accuracy_pct || 0)

  // Verdict breakdown table data
  const verdictRows = Object.entries(by_verdict || {})
    .filter(([, v]) => v.total > 0)
    .map(([verdict, v]) => ({
      id:       verdict,
      verdict,
      total:    v.total,
      evaluated: v.evaluated,
      correct:   v.correct,
      accuracy:  v.evaluated > 0 ? v.accuracy : null,
    }))

  const verdictColumns = [
    {
      key: 'verdict', label: 'Verdict',
      render: (v) => <VerdictBadge verdict={v} size="sm" />,
    },
    { key: 'total',    label: 'Issued',   align: 'right', color: 'rgba(255,255,255,0.72)' },
    { key: 'evaluated',label: 'Evaluated',align: 'right', color: 'rgba(255,255,255,0.50)' },
    { key: 'correct',  label: 'Correct',  align: 'right', color: '#00FF88' },
    {
      key: 'accuracy', label: 'Accuracy', align: 'right',
      render: (v) => v != null
        ? <span style={{ fontFamily: 'var(--font-data, monospace)', color: accuracyColor(v), fontWeight: 700 }}>{v.toFixed(1)}%</span>
        : <span style={{ color: 'rgba(255,255,255,0.22)' }}>—</span>,
    },
  ]

  // Recent entries table data
  const recentColumns = [
    {
      key: 'symbol', label: 'Symbol',
      render: (v) => <span style={{ fontFamily: 'var(--font-display, sans-serif)', fontWeight: 900, color: '#FFFFFF' }}>{v}</span>,
    },
    {
      key: 'timestamp', label: 'Date', color: 'rgba(255,255,255,0.38)',
      render: (v) => <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px' }}>{new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</span>,
    },
    {
      key: 'verdict', label: 'Verdict',
      render: (v) => <VerdictBadge verdict={v} size="sm" />,
    },
    {
      key: 'confidence', label: 'Conf.', align: 'right',
      render: (v) => {
        const pct = v > 1 ? v : v * 100
        return <span style={{ fontFamily: 'var(--font-data, monospace)', color: 'rgba(255,255,255,0.55)', fontSize: '10px' }}>{pct.toFixed(0)}%</span>
      },
    },
    {
      key: 'pct_change_3d', label: 'Return 3d', align: 'right',
      render: (v, row) => {
        const isPending = row.correct === null && row.outcome === null
        if (isPending) return <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '10px', fontFamily: 'var(--font-data, monospace)' }}>Pending</span>
        if (v == null && row.price_3d_later && row.price_at_signal) {
          const pct = ((row.price_3d_later - row.price_at_signal) / row.price_at_signal * 100)
          return <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', fontWeight: 700, color: pct >= 0 ? '#00FF88' : '#FF0055' }}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</span>
        }
        if (v != null) return <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', fontWeight: 700, color: v >= 0 ? '#00FF88' : '#FF0055' }}>{v >= 0 ? '+' : ''}{v.toFixed(2)}%</span>
        return <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '10px', fontFamily: 'var(--font-data, monospace)' }}>—</span>
      },
    },
    {
      key: 'correct', label: 'Result', align: 'right',
      render: (v, row) => {
        const pctChange = row.pct_change_3d ?? (
          row.price_3d_later && row.price_at_signal
            ? (row.price_3d_later - row.price_at_signal) / row.price_at_signal * 100
            : null
        )
        return <OutcomeIndicator correct={v} pctChange={pctChange} />
      },
    },
  ]

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto space-y-10">

        {/* ── Terminal header ── */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(204,255,0,0.70)', fontWeight: 700 }}>
              Signal Intelligence
            </span>
            <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>
              · Track Record Terminal
            </span>
          </div>
          <GlitchText as="h1" text="ADE Track Record" className="text-4xl font-display font-black text-white" />
          {earliest_timestamp && (
            <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '8px', letterSpacing: '0.06em' }}>
              Tracking since{' '}
              {new Date(earliest_timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Signals Issued" value={total_signals ?? 0} icon={BarChart3} />
          <StatCard label="Evaluated"      value={evaluated ?? 0}    icon={Target}    color="#00F0FF" />
          <StatCard label="Correct"        value={correct ?? 0}      icon={Award}     color="#00FF88" />
          <StatCard
            label="Accuracy"
            value={hasEnough ? `${(accuracy_pct || 0).toFixed(1)}%` : '—'}
            icon={TrendingUp}
            color={hasEnough ? accColor : 'rgba(255,255,255,0.35)'}
            subLabel={hasEnough ? undefined : `${evaluated ?? 0}/10 evaluated`}
          />
        </div>

        {/* ── Confidence calibration row ── */}
        {hasEnough && (avg_conf_correct > 0 || avg_conf_incorrect > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4" style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.12)' }}>
              <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: '#00FF88', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '4px' }}>Avg Confidence — Correct Signals</p>
              <p style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '22px', fontWeight: 900, color: '#00FF88' }}>{avg_conf_correct?.toFixed(1)}%</p>
            </div>
            <div className="p-4" style={{ background: 'rgba(255,0,85,0.04)', border: '1px solid rgba(255,0,85,0.12)' }}>
              <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: '#FF0055', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '4px' }}>Avg Confidence — Incorrect Signals</p>
              <p style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '22px', fontWeight: 900, color: '#FF0055' }}>{avg_conf_incorrect?.toFixed(1)}%</p>
            </div>
          </div>
        )}

        {/* ── Headline accuracy banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing }}
          className="p-8 relative overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.40)', border: '1px solid rgba(255,255,255,0.08)', borderLeft: `4px solid ${accColor}` }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 80% at 0% 50%, ${accColor}06 0%, transparent 70%)` }} />
          {hasEnough ? (
            <div className="relative z-10">
              <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '10px' }}>
                Directional Accuracy Result
              </p>
              <p style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '18px', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.35 }}>
                ADE has been correct{' '}
                <span style={{ color: accColor }}>{correct}</span>
                {' '}of{' '}
                <span>{evaluated}</span>
                {' '}evaluated signals
              </p>
            </div>
          ) : (
            <div className="relative z-10">
              <p style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '20px', fontWeight: 900, color: '#FFEA00' }}>
                Track record building — {evaluated ?? 0} of 10 required
              </p>
              <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>
                {10 - (evaluated ?? 0)} more evaluated signals needed before accuracy is reported.
              </p>
            </div>
          )}
        </motion.div>

        {/* ── Accuracy bar ── */}
        {hasEnough && (
          <AccuracyBar
            value={accuracy_pct || 0}
            label="Directional Accuracy"
            subtitle="1-3 day forward return window"
            showThreshold
          />
        )}

        {/* ── PnL stats row ── */}
        {hasEnough && (avg_pct_change_correct != null || avg_pct_change_incorrect != null) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {avg_pct_change_correct != null && (
              <div className="p-4 flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <TrendingUp size={20} style={{ color: '#00FF88', flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '3px' }}>Avg Return — Correct</p>
                  <p style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '20px', fontWeight: 900, color: '#00FF88' }}>+{avg_pct_change_correct?.toFixed(2)}%</p>
                </div>
              </div>
            )}
            {avg_pct_change_incorrect != null && (
              <div className="p-4 flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <TrendingDown size={20} style={{ color: '#FF0055', flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '3px' }}>Avg Return — Incorrect</p>
                  <p style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '20px', fontWeight: 900, color: '#FF0055' }}>{avg_pct_change_incorrect?.toFixed(2)}%</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Verdict breakdown table ── */}
        <section>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.018)' }}>
            <DollarSign size={12} style={{ color: 'rgba(255,255,255,0.30)' }} />
            <h2 style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.20em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>
              Breakdown by Verdict
            </h2>
          </div>
          <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none' }}>
            <DataTable
              columns={verdictColumns}
              rows={verdictRows}
              emptyMessage="No signals logged yet."
            />
          </div>
        </section>

        {/* ── Recent signals table ── */}
        <section>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.018)' }}>
            <BarChart3 size={12} style={{ color: 'rgba(255,255,255,0.30)' }} />
            <h2 style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.20em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>
              Recent Signals (Last 20)
            </h2>
          </div>
          <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none' }}>
            <DataTable
              columns={recentColumns}
              rows={recent_entries || []}
              emptyMessage="No signals logged yet."
            />
          </div>
        </section>

        {/* ── Disclaimer ── */}
        <p style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '11px', color: 'rgba(255,255,255,0.22)', lineHeight: 1.6, textAlign: 'center', paddingBottom: '16px' }}>
          ADE signals are for informational and educational purposes only. Past performance does not guarantee future results. This is not financial advice.
        </p>
      </div>
    </PageWrapper>
  )
}
