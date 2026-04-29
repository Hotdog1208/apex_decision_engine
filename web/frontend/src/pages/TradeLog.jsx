import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, AlertTriangle, BarChart2 } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import UpgradePrompt from '../components/UpgradePrompt'
import toast from 'react-hot-toast'

const STATUS_TABS = [
  { key: 'all',       label: 'All Trades'       },
  { key: 'pending',   label: 'Pending'          },
  { key: 'win',       label: 'Wins'             },
  { key: 'loss',      label: 'Losses'           },
  { key: 'cancelled', label: 'Cancelled/Expired' },
]

const AGG_TABS = [
  { key: 0, label: 'All Levels'     },
  { key: 1, label: '1 — Conservative' },
  { key: 2, label: '2 — Moderate'   },
  { key: 3, label: '3 — Balanced'   },
  { key: 4, label: '4 — Aggressive' },
  { key: 5, label: '5 — APEX'       },
]

const AGG_COLORS = {
  1: '#64B5F6',
  2: '#81C784',
  3: '#FFD54F',
  4: '#FF8A65',
  5: '#CCFF00',
}

const STATUS_STYLES = {
  pending:   { color: '#64B5F6', label: 'PENDING'  },
  win:       { color: '#00E879', label: 'WIN'       },
  loss:      { color: '#FF2052', label: 'LOSS'      },
  cancelled: { color: 'rgba(255,255,255,0.35)', label: 'CANCELLED' },
  expired:   { color: 'rgba(255,255,255,0.25)', label: 'EXPIRED'   },
}

function StatsBar({ trades }) {
  const closed  = trades.filter(t => t.status === 'win' || t.status === 'loss')
  const wins    = trades.filter(t => t.status === 'win')
  const pending = trades.filter(t => t.status === 'pending')
  const winRate = closed.length ? Math.round((wins.length / closed.length) * 100) : null

  const pnlTrades   = closed.filter(t => t.pnl_percent != null)
  const avgRR       = trades.reduce((s, t) => s + (t.risk_reward_ratio || 0), 0) / (trades.filter(t=>t.risk_reward_ratio).length || 1)
  const best  = pnlTrades.length ? pnlTrades.reduce((a, b) => b.pnl_percent > a.pnl_percent ? b : a) : null
  const worst = pnlTrades.length ? pnlTrades.reduce((a, b) => b.pnl_percent < a.pnl_percent ? b : a) : null

  const stat = (label, value) => (
    <div style={{ textAlign: 'center', padding: '0 20px' }}>
      <div style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.30)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.90)' }}>
        {value}
      </div>
    </div>
  )

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '0',
      background: '#070A10', border: '1px solid rgba(255,255,255,0.07)',
      padding: '16px 0', marginBottom: '20px',
    }}>
      {stat('Win Rate', winRate !== null ? `${winRate}%` : '—')}
      <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.07)' }} />
      {stat('Total Trades', trades.length)}
      <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.07)' }} />
      {stat('Avg R/R', avgRR > 0 ? `${avgRR.toFixed(1)}:1` : '—')}
      <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.07)' }} />
      {stat('Best Trade', best ? `+${best.pnl_percent.toFixed(1)}% (${best.ticker})` : '—')}
      <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.07)' }} />
      {stat('Worst Trade', worst ? `${worst.pnl_percent.toFixed(1)}% (${worst.ticker})` : '—')}
      <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.07)' }} />
      {stat('Open Positions', pending.length)}
    </div>
  )
}

function AggBadge({ level }) {
  const color = AGG_COLORS[level] || 'rgba(255,255,255,0.35)'
  return (
    <span style={{
      fontFamily: 'var(--font-data, monospace)', fontSize: '7px', fontWeight: 700,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      background: `${color}18`, color, border: `1px solid ${color}40`,
      padding: '2px 6px', whiteSpace: 'nowrap',
    }}>
      L{level}
    </span>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.cancelled
  return (
    <span style={{
      fontFamily: 'var(--font-data, monospace)', fontSize: '7px', fontWeight: 700,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color: s.color, border: `1px solid ${s.color}40`,
      padding: '2px 6px',
    }}>
      {s.label}
    </span>
  )
}

function TradeCard({ trade, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState({
    status:     '',
    exit_price: '',
    notes:      trade.notes || '',
  })

  const isEditable = ['pending'].includes(trade.status)
  const today = new Date().toISOString().split('T')[0]

  const handleSave = async () => {
    if (!form.status) { toast.error('Select a result first'); return }
    setSaving(true)
    try {
      await api.updateCipherTrade(trade.id, {
        status:     form.status,
        exit_price: form.exit_price ? parseFloat(form.exit_price) : undefined,
        exit_date:  new Date().toISOString(),
        notes:      form.notes || undefined,
      })
      toast.success(`Trade marked ${form.status.toUpperCase()}`)
      onUpdate()
    } catch (e) {
      toast.error('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const td = trade.trade_date ? new Date(trade.trade_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'
  const dl = trade.exit_deadline ? new Date(trade.exit_deadline) : null
  const dlStr = dl ? dl.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
  const isExpiringSoon = dl && dl <= new Date(Date.now() + 86400000)
  const pnl = trade.pnl_percent != null ? trade.pnl_percent : null

  return (
    <div style={{ background: '#070A10', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '4px' }}>
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'grid', alignItems: 'center', gap: '12px',
          padding: '14px 18px', cursor: 'pointer', background: 'transparent', border: 'none',
          gridTemplateColumns: '70px 70px 1fr 80px 80px 80px 80px 64px 28px',
        }}
      >
        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.35)', textAlign: 'left' }}>{td}</span>
        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.90)', textAlign: 'left' }}>{trade.ticker}</span>
        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.40)', textAlign: 'left', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{trade.strategy_type}</span>
        <span style={{ display: 'flex', justifyContent: 'center' }}><AggBadge level={trade.aggression_level} /></span>
        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', color: 'rgba(255,255,255,0.55)', textAlign: 'right' }}>
          {trade.entry_zone_low ? `$${parseFloat(trade.entry_zone_low).toFixed(2)}` : '—'}
        </span>
        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', color: '#00E879', textAlign: 'right' }}>
          {trade.target ? `$${parseFloat(trade.target).toFixed(2)}` : '—'}
        </span>
        <span style={{
          fontFamily: 'var(--font-data, monospace)', fontSize: '10px', textAlign: 'right',
          color: isExpiringSoon ? '#FF8A65' : 'rgba(255,255,255,0.35)',
        }}>
          {dlStr}
        </span>
        <span style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
          {pnl !== null && (
            <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', fontWeight: 700, color: pnl >= 0 ? '#00E879' : '#FF2052' }}>
              {pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}%
            </span>
          )}
          <StatusBadge status={trade.status} />
        </span>
        <span style={{ color: 'rgba(255,255,255,0.30)', display: 'flex', justifyContent: 'center' }}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Full brief */}
              {trade.full_cipher_brief && (
                <div style={{
                  marginTop: '16px', padding: '14px', background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'var(--font-data, monospace)',
                  fontSize: '10px', color: 'rgba(255,255,255,0.60)', lineHeight: 1.7, whiteSpace: 'pre-wrap',
                  maxHeight: '200px', overflowY: 'auto',
                }}>
                  {trade.full_cipher_brief}
                </div>
              )}

              {/* Validation warnings */}
              {trade.validation_warnings && trade.validation_warnings.length > 0 && (
                <div style={{
                  marginTop: '10px', padding: '10px 14px',
                  background: 'rgba(255,138,0,0.06)', border: '1px solid rgba(255,138,0,0.20)',
                }}>
                  {trade.validation_warnings.map((w, i) => (
                    <div key={i} style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: '#FF8A65', marginBottom: '4px' }}>
                      ⚠ {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Mark result section */}
              {isEditable && (
                <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.30)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Mark Result
                  </div>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    {/* Status toggles */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[['win', '#00E879', '✓ WIN'], ['loss', '#FF2052', '✗ LOSS'], ['cancelled', 'rgba(255,255,255,0.35)', '— CANCEL']].map(([s, c, lbl]) => (
                        <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
                          style={{
                            padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font-data, monospace)',
                            fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                            background: form.status === s ? `${c}18` : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${form.status === s ? c : 'rgba(255,255,255,0.08)'}`,
                            color: form.status === s ? c : 'rgba(255,255,255,0.35)',
                          }}>
                          {lbl}
                        </button>
                      ))}
                    </div>

                    {/* Exit price */}
                    <div>
                      <div style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.25)', marginBottom: '4px', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Exit Price</div>
                      <input
                        type="number" step="0.01" placeholder="$0.00"
                        value={form.exit_price}
                        onChange={e => setForm(f => ({ ...f, exit_price: e.target.value }))}
                        style={{
                          width: '90px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                          color: 'rgba(255,255,255,0.80)', padding: '6px 8px', fontFamily: 'var(--font-data, monospace)',
                          fontSize: '11px', outline: 'none',
                        }}
                      />
                    </div>

                    {/* Notes */}
                    <div style={{ flex: 1, minWidth: '160px' }}>
                      <div style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.25)', marginBottom: '4px', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Notes</div>
                      <input
                        type="text" placeholder="Optional notes..."
                        value={form.notes}
                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        style={{
                          width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                          color: 'rgba(255,255,255,0.80)', padding: '6px 8px', fontFamily: 'var(--font-data, monospace)',
                          fontSize: '11px', outline: 'none',
                        }}
                      />
                    </div>

                    {/* Save */}
                    <button
                      onClick={handleSave}
                      disabled={saving || !form.status}
                      style={{
                        padding: '7px 16px', cursor: saving || !form.status ? 'not-allowed' : 'pointer',
                        background: form.status ? 'rgba(204,255,0,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${form.status ? 'rgba(204,255,0,0.28)' : 'rgba(255,255,255,0.07)'}`,
                        color: form.status ? '#CCFF00' : 'rgba(255,255,255,0.25)',
                        fontFamily: 'var(--font-data, monospace)', fontSize: '9px', fontWeight: 700,
                        letterSpacing: '0.14em', textTransform: 'uppercase',
                      }}>
                      {saving ? 'Saving...' : 'Save Result'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function exportCSV(trades) {
  const headers = ['Date','Ticker','Strategy','Aggression','Entry Low','Entry High','Target','Stop','Exit Price','PnL%','Status','Notes']
  const rows = trades.map(t => [
    t.trade_date || '',
    t.ticker || '',
    t.strategy_type || '',
    t.aggression_level || '',
    t.entry_zone_low != null ? parseFloat(t.entry_zone_low).toFixed(4) : '',
    t.entry_zone_high != null ? parseFloat(t.entry_zone_high).toFixed(4) : '',
    t.target != null ? parseFloat(t.target).toFixed(4) : '',
    t.stop_loss != null ? parseFloat(t.stop_loss).toFixed(4) : '',
    t.exit_price != null ? parseFloat(t.exit_price).toFixed(4) : '',
    t.pnl_percent != null ? parseFloat(t.pnl_percent).toFixed(2) : '',
    t.status || '',
    (t.notes || '').replace(/,/g, ';'),
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `cipher-trade-log-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function TradeLog() {
  const { tier } = useAuth()
  const [trades,    setTrades]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [statusTab, setStatusTab] = useState('all')
  const [aggTab,    setAggTab]    = useState(0)

  if (tier && tier !== 'apex') {
    return (
      <div style={{ paddingTop: '60px' }}>
        <UpgradePrompt requiredTier="apex" feature="CIPHER Trade Log" />
      </div>
    )
  }

  const fetchTrades = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getCipherTradeLog(
        statusTab === 'cancelled' ? undefined : statusTab,
        aggTab || undefined,
      )
      let rows = res.trades || []
      // Client-side filter for cancelled+expired combined tab
      if (statusTab === 'cancelled') {
        rows = rows.filter(t => t.status === 'cancelled' || t.status === 'expired')
      }
      setTrades(rows)
    } catch (e) {
      toast.error('Could not load trade log')
    } finally {
      setLoading(false)
    }
  }, [statusTab, aggTab])

  useEffect(() => { fetchTrades() }, [fetchTrades])

  const tabBtn = (active, label, onClick) => (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', cursor: 'pointer', fontFamily: 'var(--font-data, monospace)',
        fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
        background: active ? 'rgba(204,255,0,0.10)' : 'transparent',
        border: active ? '1px solid rgba(204,255,0,0.28)' : '1px solid rgba(255,255,255,0.07)',
        color: active ? '#CCFF00' : 'rgba(255,255,255,0.40)',
      }}>
      {label}
    </button>
  )

  return (
    <div style={{ paddingTop: '32px', paddingBottom: '60px' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#CCFF00', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={10} />
            CIPHER · TRADE LOG
          </div>
          <h1 style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '26px', fontWeight: 900, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em', margin: 0 }}>
            Trade Log
          </h1>
          <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>
            Auto-logged from every CIPHER trade recommendation.
          </p>
        </div>

        <button
          onClick={() => exportCSV(trades)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', cursor: 'pointer',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.60)', fontFamily: 'var(--font-data, monospace)',
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
          <Download size={12} />
          Export CSV
        </button>
      </div>

      {/* Stats bar */}
      <StatsBar trades={trades} />

      {/* Status tabs (row 1) */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
        {STATUS_TABS.map(t => tabBtn(statusTab === t.key, t.label, () => setStatusTab(t.key)))}
      </div>

      {/* Aggression tabs (row 2) */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {AGG_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setAggTab(t.key)}
            style={{
              padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-data, monospace)',
              fontSize: '8px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
              background: aggTab === t.key ? `${AGG_COLORS[t.key] || 'rgba(255,255,255,0.15)'}18` : 'transparent',
              border: aggTab === t.key
                ? `1px solid ${AGG_COLORS[t.key] || 'rgba(255,255,255,0.25)'}60`
                : '1px solid rgba(255,255,255,0.06)',
              color: aggTab === t.key ? (AGG_COLORS[t.key] || 'rgba(255,255,255,0.70)') : 'rgba(255,255,255,0.30)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid', gap: '12px', padding: '8px 18px',
        gridTemplateColumns: '70px 70px 1fr 80px 80px 80px 80px 64px 28px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {['Date','Ticker','Strategy','Level','Entry','Target','Deadline','P&L / Status',''].map((h, i) => (
          <span key={i} style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: i >= 4 ? 'right' : 'left' }}>
            {h}
          </span>
        ))}
      </div>

      {/* Trade rows */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: 'var(--font-data, monospace)', fontSize: '10px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.18em', textTransform: 'uppercase' }} className="animate-pulse">
          Loading trade log...
        </div>
      ) : trades.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '11px', color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em' }}>
            No trades in this view.
          </div>
          <div style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.18)', marginTop: '6px', letterSpacing: '0.06em' }}>
            CIPHER auto-logs every trade recommendation. Generate a trade to see it here.
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '4px' }}>
          {trades.map(t => (
            <TradeCard key={t.id} trade={t} onUpdate={fetchTrades} />
          ))}
        </div>
      )}
    </div>
  )
}
