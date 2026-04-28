import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Activity, TrendingUp, FileText, MessageSquare,
  Lock, Send, RefreshCw, Settings, ChevronDown, ChevronUp,
  Bot, Zap, X,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || '/api'
const SK = 'ade_admin_key'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          '#09090B',
  sidebar:     '#0C0D10',
  panel:       '#111318',
  input:       '#0D0F13',
  border:      'rgba(255,255,255,0.07)',
  borderFocus: 'rgba(255,255,255,0.20)',
  dim:         'rgba(255,255,255,0.25)',
  mid:         'rgba(255,255,255,0.50)',
  text:        'rgba(255,255,255,0.82)',
  bright:      '#FFFFFF',
  lime:        '#CCFF00',
  cyan:        '#00D4FF',
  green:       '#22C55E',
  red:         '#EF4444',
  orange:      '#F59E0B',
  mono:        '"JetBrains Mono","Fira Code",ui-monospace,monospace',
  sans:        '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
}

const TABS = [
  { id: 'chat',   label: 'CIPHER Chat',  Icon: MessageSquare, desc: 'Live Q&A with CIPHER' },
  { id: 'prism',  label: 'PRISM Signal', Icon: TrendingUp,    desc: 'Test signal generation' },
  { id: 'brief',  label: 'Daily Brief',  Icon: FileText,      desc: 'Generate full briefing' },
  { id: 'status', label: 'System',       Icon: Activity,      desc: 'Health & analytics' },
]

const VERDICT_COLOR = {
  STRONG_BUY: C.green, BUY: C.green,
  WATCH: C.orange,
  AVOID: C.red, STRONG_AVOID: C.red,
}

const AGGRESSION_LEVELS = [
  { level: 1, label: 'CONSERVATIVE', short: 'CNSV', color: '#22C55E' },
  { level: 2, label: 'MODERATE',     short: 'MOD',  color: '#84CC16' },
  { level: 3, label: 'BALANCED',     short: 'BALN', color: '#EAB308' },
  { level: 4, label: 'AGGRESSIVE',   short: 'AGGR', color: '#F97316' },
  { level: 5, label: 'APEX',         short: 'APEX', color: '#EF4444' },
]

const FIELD_ACCENT = {
  'INSTRUMENT':    '#FFFFFF',
  'CURRENT PRICE': '#00D4FF',
  'ENTRY ZONE':    '#CCFF00',
  'TARGET':        '#22C55E',
  'STOP-LOSS':     '#EF4444',
  'TIME HORIZON':  '#F59E0B',
  'RISK/REWARD':   'rgba(255,255,255,0.50)',
  'AGGRESSION NOTE': 'rgba(255,255,255,0.25)',
}

// ── Aggression selector ───────────────────────────────────────────────────────
function AggressionSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {AGGRESSION_LEVELS.map(({ level, label, short, color }) => {
        const active = value === level
        const isApex = level === 5
        return (
          <button
            key={level}
            onClick={() => onChange(level)}
            title={label}
            style={{
              fontFamily: C.mono,
              fontSize: '8px',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              padding: '4px 8px',
              background: active ? `${color}22` : 'transparent',
              color: active ? color : C.dim,
              border: `1px solid ${active ? color + '55' : C.border}`,
              cursor: 'pointer',
              transition: 'all 0.15s',
              animation: isApex && active ? 'adeApexPulse 2s ease-in-out infinite' : 'none',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.color = color; e.currentTarget.style.borderColor = color + '33' } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.color = C.dim; e.currentTarget.style.borderColor = C.border } }}
          >
            {short}
          </button>
        )
      })}
    </div>
  )
}

// ── API ───────────────────────────────────────────────────────────────────────
async function adminJson(path, method = 'GET', body = null, key = '') {
  let url = `${API_BASE}${path}`
  const init = { method, headers: {} }

  if (method === 'GET') {
    // No custom headers on GET — avoids CORS preflight entirely.
    // Admin key travels as a query param.
    url += (url.includes('?') ? '&' : '?') + `admin_key=${encodeURIComponent(key)}`
  } else {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify({ ...(body || {}), admin_key: key })
  }

  let res
  try {
    res = await fetch(url, init)
  } catch {
    throw new Error(
      'Network error — cannot reach the backend.\n' +
      '1. Check VITE_API_URL is set in Vercel → Settings → Environment Variables.\n' +
      '2. Check CORS_ORIGINS on Render includes your Vercel domain.\n' +
      '3. Render free tier sleeps after inactivity — wait 30 s then retry.'
    )
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText)
    let msg = txt
    try { const j = JSON.parse(txt); msg = j.detail || j.message || j.error || txt } catch (_) {}
    throw new Error(String(msg || `HTTP ${res.status}`))
  }
  return res.json()
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} style={{ color: C.bright, fontWeight: 700 }}>{p.slice(2, -2)}</strong>
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2)
      return <em key={i} style={{ color: C.mid }}>{p.slice(1, -1)}</em>
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2)
      return <code key={i} style={{ color: C.lime, fontFamily: C.mono, fontSize: '0.88em', background: 'rgba(204,255,0,0.08)', padding: '1px 5px' }}>{p.slice(1, -1)}</code>
    return p
  })
}

function Markdown({ text }) {
  if (!text) return null
  return (
    <div style={{ fontFamily: C.sans }}>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return <p key={i} style={{ fontFamily: C.mono, fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.lime, marginTop: 20, marginBottom: 8 }}>{line.slice(3)}</p>
        if (line.startsWith('### '))
          return <p key={i} style={{ fontFamily: C.mono, fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.mid, marginTop: 14, marginBottom: 5 }}>{line.slice(4)}</p>
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
              <span style={{ color: C.lime, flexShrink: 0, fontSize: '11px', marginTop: 1 }}>›</span>
              <p style={{ fontSize: '13px', color: C.text, lineHeight: 1.72, margin: 0 }}>{renderInline(line.slice(2))}</p>
            </div>
          )
        if (line === '---' || line === '—')
          return <div key={i} style={{ height: 1, background: C.border, margin: '14px 0' }} />
        if (!line.trim())
          return <div key={i} style={{ height: 8 }} />
        return <p key={i} style={{ fontSize: '13px', color: C.text, lineHeight: 1.72, marginBottom: 4 }}>{renderInline(line)}</p>
      })}
    </div>
  )
}

// ── Signal components ─────────────────────────────────────────────────────────
function ScoreBar({ label, value }) {
  const color = value >= 65 ? C.green : value >= 40 ? C.orange : C.red
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: C.mono, fontSize: '9px', color: C.dim, letterSpacing: '0.10em', textTransform: 'uppercase' }}>{label.replace(/_/g, ' ')}</span>
        <span style={{ fontFamily: C.mono, fontSize: '10px', color, fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: 2, transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
    </div>
  )
}

function SignalResult({ signal }) {
  if (!signal) return null
  const vc = VERDICT_COLOR[signal.verdict] || C.mid
  return (
    <div>
      {/* Header */}
      <div style={{ padding: '24px 28px', borderBottom: `1px solid ${C.border}`, background: `linear-gradient(135deg, ${vc}08 0%, transparent 55%)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ fontFamily: C.mono, fontSize: '30px', fontWeight: 900, color: C.bright, letterSpacing: '-0.02em' }}>{signal.symbol}</span>
              <span style={{ fontFamily: C.mono, fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', background: `${vc}18`, color: vc, border: `1px solid ${vc}40` }}>
                {signal.verdict}
              </span>
            </div>
            {signal.price > 0 && (
              <div style={{ fontFamily: C.mono, fontSize: '12px', color: C.mid }}>
                ${signal.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span style={{ marginLeft: 20, color: C.dim }}>Score: <span style={{ color: C.lime, fontWeight: 700 }}>{signal.composite_score}/100</span></span>
                {signal.market_regime && <span style={{ marginLeft: 20, color: C.dim }}>Regime: <span style={{ color: C.orange }}>{signal.market_regime}</span></span>}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: C.mono, fontSize: '36px', fontWeight: 900, color: vc, lineHeight: 1 }}>{signal.confidence}%</div>
            <div style={{ fontFamily: C.mono, fontSize: '8px', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2 }}>Confidence</div>
            {signal.primary_timeframe && (
              <span style={{ display: 'inline-block', marginTop: 6, fontFamily: C.mono, fontSize: '8px', color: C.mid, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                {signal.timeframe_label || signal.primary_timeframe}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {signal.reasoning && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: C.mono, fontSize: '8px', color: C.dim, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>Reasoning</div>
            <p style={{ fontFamily: C.sans, fontSize: '13px', color: C.text, lineHeight: 1.75 }}>{signal.reasoning}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
          {signal.bull_case && (
            <div style={{ padding: '14px 16px', background: `${C.green}07`, border: `1px solid ${C.green}22` }}>
              <div style={{ fontFamily: C.mono, fontSize: '8px', color: C.green, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>Bull Case</div>
              <p style={{ fontFamily: C.sans, fontSize: '12px', color: C.text, lineHeight: 1.65 }}>{signal.bull_case}</p>
            </div>
          )}
          {signal.bear_case && (
            <div style={{ padding: '14px 16px', background: `${C.red}07`, border: `1px solid ${C.red}22` }}>
              <div style={{ fontFamily: C.mono, fontSize: '8px', color: C.red, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>Bear Case</div>
              <p style={{ fontFamily: C.sans, fontSize: '12px', color: C.text, lineHeight: 1.65 }}>{signal.bear_case}</p>
            </div>
          )}
        </div>

        {signal.key_indicators?.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: C.mono, fontSize: '8px', color: C.dim, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10 }}>Key Indicators</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {signal.key_indicators.map((ind, i) => (
                <span key={i} style={{ fontFamily: C.mono, fontSize: '10px', color: C.mid, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, padding: '4px 10px' }}>{ind}</span>
              ))}
            </div>
          </div>
        )}

        {signal.factor_scores && Object.keys(signal.factor_scores).length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: C.mono, fontSize: '8px', color: C.dim, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12 }}>Factor Scores</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 28px' }}>
              {Object.entries(signal.factor_scores).map(([k, v]) => <ScoreBar key={k} label={k} value={v} />)}
            </div>
          </div>
        )}

        {(signal.scalp_note || signal.long_note) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['Scalp Note', signal.scalp_note], ['Long Note', signal.long_note]].map(([lbl, txt]) => txt && (
              <div key={lbl} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: C.mono, fontSize: '8px', color: C.dim, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 5 }}>{lbl}</div>
                <p style={{ fontFamily: C.sans, fontSize: '12px', color: C.mid, lineHeight: 1.6 }}>{txt}</p>
              </div>
            ))}
          </div>
        )}

        {signal.calibrated_label && (
          <p style={{ marginTop: 14, fontFamily: C.mono, fontSize: '9px', color: C.dim, fontStyle: 'italic' }}>{signal.calibrated_label}</p>
        )}
      </div>
    </div>
  )
}

// ── Status tab ────────────────────────────────────────────────────────────────
function StatusCard({ label, value, on }) {
  return (
    <div style={{ padding: '14px 18px', background: C.panel, border: `1px solid ${on ? C.green + '28' : C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: on ? C.green : 'rgba(255,255,255,0.14)', flexShrink: 0, boxShadow: on ? `0 0 7px ${C.green}` : 'none' }} />
        <span style={{ fontFamily: C.mono, fontSize: '8px', color: C.dim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <span style={{ fontFamily: C.mono, fontSize: '12px', color: on ? C.bright : C.dim, fontWeight: on ? 500 : 400 }}>{String(value)}</span>
    </div>
  )
}

function SectionLabel({ children }) {
  return <div style={{ fontFamily: C.mono, fontSize: '8px', color: C.dim, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>{children}</div>
}

function StatusTab({ adminKey }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try { setStatus(await adminJson('/admin/panel/status', 'GET', null, adminKey)) }
    catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }, [adminKey])

  useEffect(() => { load() }, [load])

  const svc = status?.services || {}

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: C.mono, fontSize: '14px', fontWeight: 700, color: C.bright, marginBottom: 4, letterSpacing: '-0.01em' }}>System Status</h2>
          <p style={{ fontFamily: C.mono, fontSize: '10px', color: C.dim }}>Live health check across all services</p>
        </div>
        <button onClick={load} disabled={loading} style={{ fontFamily: C.mono, fontSize: '9px', color: C.dim, background: 'transparent', border: `1px solid ${C.border}`, padding: '7px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.10em', textTransform: 'uppercase', transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.borderFocus}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
        >
          <RefreshCw size={10} style={{ animation: loading ? 'adeAdminSpin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {err && <div style={{ padding: '12px 16px', background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red, fontFamily: C.mono, fontSize: '11px', marginBottom: 24, borderRadius: 0 }}>{err}</div>}

      {status && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div>
            <SectionLabel>Integrations</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
              <StatusCard label="Anthropic API" on={svc.anthropic_api} value={svc.anthropic_api ? 'Connected' : 'Not configured'} />
              <StatusCard label="Supabase"      on={svc.supabase}      value={svc.supabase ? 'Connected' : 'Not configured'} />
              <StatusCard label="Stripe"        on={svc.stripe}        value={svc.stripe ? 'Connected' : 'Not configured'} />
              <StatusCard label="Finnhub"       on={svc.finnhub}       value={svc.finnhub ? 'Connected' : 'Not configured'} />
              <StatusCard label="Sentry"        on={svc.sentry}        value={svc.sentry ? 'Active' : 'Disabled'} />
            </div>
          </div>

          <div>
            <SectionLabel>Runtime</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
              <StatusCard label="Backend"       on={true}                      value="OK" />
              <StatusCard label="Data Source"   on={true}                      value={status.data_source} />
              <StatusCard label="AI Model"      on={true}                      value={status.model?.replace('claude-', '')} />
              <StatusCard label="Cached Signals" on={status.cached_signals > 0} value={`${status.cached_signals} cached`} />
              <StatusCard label="Active Users"   on={status.active_users > 0}   value={`${status.active_users} sessions`} />
              <StatusCard label="Chats Today"   on={true}                      value={`${status.total_chat_messages_today} messages`} />
              <StatusCard label="Market Regime" on={true}                      value={status.regime?.regime || '—'} />
            </div>
          </div>

          {status.accuracy?.evaluated > 0 && (
            <div>
              <SectionLabel>Signal Accuracy</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
                <StatusCard label="Total Evaluated" on={true} value={status.accuracy.evaluated} />
                <StatusCard label="Overall Accuracy" on={status.accuracy.accuracy_pct >= 50} value={`${status.accuracy.accuracy_pct?.toFixed(1)}%`} />
                {status.accuracy.by_verdict && Object.entries(status.accuracy.by_verdict).map(([v, d]) => (
                  <StatusCard key={v} label={v} on={(d.accuracy || 0) >= 50} value={`${(d.accuracy || 0).toFixed(0)}% (n=${d.evaluated || 0})`} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── PRISM tab ─────────────────────────────────────────────────────────────────
function PrismTab({ adminKey }) {
  const [symbol, setSymbol] = useState('AAPL')
  const [signal, setSignal] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const generate = async () => {
    const sym = symbol.trim().toUpperCase()
    if (!sym || loading) return
    setLoading(true); setErr(''); setSignal(null)
    try { setSignal(await adminJson('/admin/panel/signal', 'POST', { symbol: sym }, adminKey)) }
    catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '18px 28px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <input
          value={symbol}
          onChange={e => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 10))}
          onKeyDown={e => e.key === 'Enter' && generate()}
          placeholder="Ticker symbol"
          style={{ width: 160, background: C.input, border: `1px solid ${C.border}`, color: C.bright, fontFamily: C.mono, fontSize: '14px', padding: '10px 14px', outline: 'none', letterSpacing: '0.08em', transition: 'border-color 0.15s' }}
          onFocus={e => e.target.style.borderColor = C.borderFocus}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <button onClick={generate} disabled={loading || !symbol.trim()} style={{ fontFamily: C.mono, fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '10px 20px', background: C.lime, color: '#000', border: 'none', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: !symbol.trim() ? 0.5 : 1, flexShrink: 0 }}>
          <Zap size={12} />{loading ? 'Generating...' : 'Generate Signal'}
        </button>
        {loading && <span style={{ fontFamily: C.mono, fontSize: '10px', color: C.dim }}>Calling Claude · 5–15s</span>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {err && <div style={{ margin: '20px 28px', padding: '12px 16px', background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red, fontFamily: C.mono, fontSize: '11px' }}>{err}</div>}

        {!signal && !loading && !err && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, opacity: 0.3 }}>
            <TrendingUp size={40} color={C.lime} />
            <p style={{ fontFamily: C.mono, fontSize: '10px', color: C.dim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Enter a symbol above to run PRISM</p>
          </div>
        )}

        {signal && (
          <div style={{ margin: '24px 28px', background: C.panel, border: `1px solid ${C.border}` }}>
            <SignalResult signal={signal} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Brief tab ─────────────────────────────────────────────────────────────────
function BriefTab({ adminKey }) {
  const [wlInput, setWlInput] = useState('SPY, QQQ, NVDA, AAPL, TSLA')
  const [brief, setBrief] = useState(null)
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const generate = async () => {
    if (loading) return
    setLoading(true); setErr(''); setBrief(null); setMeta(null)
    const watchlist = wlInput.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    try {
      const d = await adminJson('/admin/panel/brief', 'POST', { watchlist }, adminKey)
      setBrief(d.brief)
      setMeta({ symbols: d.symbols, signal_count: d.signal_count, generated_at: d.generated_at })
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '18px 28px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={wlInput}
            onChange={e => setWlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder="Watchlist: SPY, QQQ, NVDA..."
            style={{ flex: '1 1 280px', minWidth: 0, background: C.input, border: `1px solid ${C.border}`, color: C.bright, fontFamily: C.mono, fontSize: '12px', padding: '10px 14px', outline: 'none', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = C.borderFocus}
            onBlur={e => e.target.style.borderColor = C.border}
          />
          <button onClick={generate} disabled={loading} style={{ fontFamily: C.mono, fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '10px 20px', background: `${C.cyan}18`, color: C.cyan, border: `1px solid ${C.cyan}40`, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, opacity: loading ? 0.6 : 1 }}>
            <FileText size={12} />{loading ? 'Generating...' : 'Generate Brief'}
          </button>
        </div>
        {loading && <p style={{ fontFamily: C.mono, fontSize: '9px', color: C.dim, marginTop: 8 }}>Fetching signals → composing with Claude · 15–30 seconds</p>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {err && <div style={{ padding: '12px 16px', background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red, fontFamily: C.mono, fontSize: '11px', marginBottom: 20 }}>{err}</div>}

        {!brief && !loading && !err && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, opacity: 0.3 }}>
            <FileText size={40} color={C.cyan} />
            <p style={{ fontFamily: C.mono, fontSize: '10px', color: C.dim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Configure watchlist above and generate</p>
          </div>
        )}

        {meta && (
          <div style={{ display: 'flex', gap: 20, marginBottom: 20, padding: '10px 14px', background: C.panel, border: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: C.mono, fontSize: '9px', color: C.dim }}>Symbols: <span style={{ color: C.bright }}>{meta.symbols?.join(' · ')}</span></span>
            <span style={{ fontFamily: C.mono, fontSize: '9px', color: C.dim }}>Signals used: <span style={{ color: C.lime }}>{meta.signal_count}</span></span>
            <span style={{ fontFamily: C.mono, fontSize: '9px', color: C.dim }}>{meta.generated_at?.slice(0, 19).replace('T', ' ')} UTC</span>
          </div>
        )}

        {brief && <div style={{ maxWidth: 720 }}><Markdown text={brief} /></div>}
      </div>
    </div>
  )
}

// ── Chat tab ──────────────────────────────────────────────────────────────────
function ChatMessage({ msg }) {
  const isUser = msg.role === 'user'
  const time = msg.ts ? new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24, padding: '0 28px' }}>
        <div style={{ maxWidth: '72%' }}>
          <div style={{ textAlign: 'right', marginBottom: 6 }}>
            <span style={{ fontFamily: C.mono, fontSize: '9px', color: C.dim }}>You · {time}</span>
          </div>
          <div style={{ padding: '14px 18px', background: '#16191F', border: `1px solid rgba(255,255,255,0.09)` }}>
            <p style={{ fontFamily: C.sans, fontSize: '13px', color: C.bright, lineHeight: 1.72, margin: 0 }}>{msg.content}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 28, padding: '0 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, background: `${C.cyan}14`, border: `1px solid ${C.cyan}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Bot size={13} color={C.cyan} />
        </div>
        <span style={{ fontFamily: C.mono, fontSize: '9px', fontWeight: 700, color: C.cyan, letterSpacing: '0.14em', textTransform: 'uppercase' }}>CIPHER</span>
        <span style={{ fontFamily: C.mono, fontSize: '9px', color: C.dim }}>{time}</span>
      </div>
      <div style={{ paddingLeft: 38 }}>
        <CipherOutputRenderer text={msg.content} />
      </div>
    </div>
  )
}

const THINKING_STAGES = [
  { delay: 0,     text: 'Scanning market conditions...' },
  { delay: 4000,  text: 'Searching for catalysts...' },
  { delay: 9000,  text: 'Fetching live prices...' },
  { delay: 16000, text: 'Analyzing trade setups...' },
  { delay: 26000, text: 'Composing intelligence...' },
]

function ThinkingIndicator() {
  const [stageIdx, setStageIdx] = useState(0)

  useEffect(() => {
    const timers = THINKING_STAGES.slice(1).map((s, i) =>
      setTimeout(() => setStageIdx(i + 1), s.delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div style={{ marginBottom: 24, padding: '0 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, background: `${C.cyan}14`, border: `1px solid ${C.cyan}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Bot size={13} color={C.cyan} />
        </div>
        <span style={{ fontFamily: C.mono, fontSize: '9px', fontWeight: 700, color: C.cyan, letterSpacing: '0.14em', textTransform: 'uppercase' }}>CIPHER</span>
      </div>
      <div style={{ paddingLeft: 38, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '11px' }}>⚡</span>
        <span style={{ fontFamily: C.mono, fontSize: '10px', color: C.dim, transition: 'opacity 0.4s' }}>{THINKING_STAGES[stageIdx].text}</span>
        <span style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: C.cyan + '55', display: 'inline-block', animation: `adeAdminBounce 1.3s ease-in-out ${i * 0.18}s infinite` }} />
          ))}
        </span>
      </div>
    </div>
  )
}

// ── Trade cards (structured CIPHER output) ────────────────────────────────────
function parseTrades(text) {
  if (!text.includes('═══')) return null
  const sections = text.split(/^═{5,}.*$/m).filter(s => s.trim())
  const trades = sections.filter(s => /TRADE\s+\d+/i.test(s.trim()))
  if (!trades.length) return null

  return trades.map(block => {
    const lines = block.split('\n')
    const trade = { title: '', symbol: '', strategy: '', fields: [], prose: [] }
    let proseSection = null

    for (const line of lines) {
      const t = line.trim()
      if (!t || /^━{5,}/.test(t)) continue

      if (!trade.symbol) {
        const m = t.match(/^TRADE\s+\d+:\s*([A-Z0-9.]+)\s*[—–-]+\s*(.+)/i)
        if (m) { trade.title = t; trade.symbol = m[1]; trade.strategy = m[2].trim(); continue }
      }

      const fm = t.match(/^▸\s+([A-Z][A-Z\s\/]+?):\s*(.+)/)
      if (fm) { trade.fields.push({ key: fm[1].trim(), val: fm[2].trim() }); proseSection = null; continue }

      // Named prose section header (all-caps line ending with :)
      const sh = t.match(/^([A-Z][A-Z\s]{4,}):?\s*$/)
      if (sh && !t.startsWith('▸')) { proseSection = sh[1].trim(); continue }

      if (t) trade.prose.push({ section: proseSection, text: t })
    }

    return trade
  })
}

function TradeCard({ trade, index }) {
  const groupedProse = []
  let last = null
  for (const { section, text } of trade.prose) {
    if (!last || last.section !== section) { last = { section, lines: [] }; groupedProse.push(last) }
    last.lines.push(text)
  }

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, marginBottom: 10 }}>
      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, background: 'rgba(0,212,255,0.04)' }}>
        <div style={{ fontFamily: C.mono, fontSize: '7px', color: C.dim, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>TRADE {index + 1}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: C.mono, fontSize: '20px', fontWeight: 900, color: C.bright, letterSpacing: '-0.01em' }}>{trade.symbol}</span>
          <span style={{ fontFamily: C.sans, fontSize: '11px', color: C.mid }}>{trade.strategy}</span>
        </div>
      </div>

      {trade.fields.length > 0 && (
        <div style={{ padding: '12px 18px', borderBottom: groupedProse.length ? `1px solid ${C.border}` : 'none' }}>
          {trade.fields.map(({ key, val }) => (
            <div key={key} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: C.mono, fontSize: '7px', color: C.dim, letterSpacing: '0.12em', textTransform: 'uppercase', width: 112, flexShrink: 0, paddingTop: 3, lineHeight: 1.5 }}>{key}</span>
              <span style={{ fontFamily: C.mono, fontSize: '11px', color: FIELD_ACCENT[key] || C.text, lineHeight: 1.5 }}>{val}</span>
            </div>
          ))}
        </div>
      )}

      {groupedProse.length > 0 && (
        <div style={{ padding: '12px 18px' }}>
          {groupedProse.map(({ section, lines }, gi) => (
            <div key={gi} style={{ marginBottom: gi < groupedProse.length - 1 ? 10 : 0 }}>
              {section && (
                <div style={{ fontFamily: C.mono, fontSize: '7px', color: C.dim, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4 }}>{section}</div>
              )}
              {lines.map((ln, li) => (
                <p key={li} style={{ fontFamily: C.sans, fontSize: '12px', color: C.text, lineHeight: 1.7, margin: '0 0 2px' }}>{ln}</p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CipherOutputRenderer({ text }) {
  if (!text) return null
  const trades = parseTrades(text)
  if (!trades) return <Markdown text={text} />

  const firstSep = text.indexOf('═══')
  const preamble = firstSep > 0 ? text.slice(0, firstSep).trim() : ''
  const postMatch = text.match(/\*This is intelligence[^*]+\*\s*$/)
  const postamble = postMatch ? postMatch[0].replace(/\*/g, '') : ''

  return (
    <div>
      {preamble && <div style={{ marginBottom: 14 }}><Markdown text={preamble} /></div>}
      {trades.map((trade, i) => <TradeCard key={i} trade={trade} index={i} />)}
      {postamble && (
        <p style={{ fontFamily: C.sans, fontSize: '11px', color: C.dim, fontStyle: 'italic', marginTop: 12 }}>{postamble}</p>
      )}
    </div>
  )
}

const STARTER_PROMPTS = [
  'What does NVDA look like for a swing trade right now?',
  'Is the market regime favorable for buying dips?',
  'Compare the signals on SPY and QQQ',
  'What are the highest-confidence setups in my watchlist?',
]

function ChatTab({ adminKey }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [watchlist, setWatchlist] = useState('SPY, QQQ, NVDA')
  const [showCtx, setShowCtx] = useState(false)
  const [aggression, setAggression] = useState(() => {
    const saved = localStorage.getItem('cipher_aggression')
    return saved ? Math.max(1, Math.min(5, parseInt(saved, 10))) : 3
  })
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const textareaRef = useRef(null)

  const setAggressionPersist = (v) => {
    setAggression(v)
    localStorage.setItem('cipher_aggression', String(v))
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const q = input.trim()
    if (!q || loading) return
    setInput(''); setErr('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const wl = watchlist.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    const ts = new Date().toISOString()
    const updated = [...messages, { role: 'user', content: q, ts }]
    setMessages(updated)
    setLoading(true)

    try {
      const data = await adminJson('/admin/panel/ask', 'POST', { question: q, watchlist: wl, session_id: 'admin-session', aggression_level: aggression }, adminKey)
      setMessages([...updated, { role: 'assistant', content: data.reply, ts: new Date().toISOString() }])
    } catch (e) {
      setErr(e.message)
    }
    setLoading(false)
    setTimeout(() => textareaRef.current?.focus(), 60)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const onInputChange = (e) => {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 28px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}`, flexShrink: 0 }} />
          <span style={{ fontFamily: C.mono, fontSize: '10px', fontWeight: 700, color: C.bright, letterSpacing: '0.12em', textTransform: 'uppercase' }}>CIPHER</span>
          <span style={{ fontFamily: C.mono, fontSize: '9px', color: C.dim, display: 'none' }}>admin mode</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AggressionSelector value={aggression} onChange={setAggressionPersist} />
          <div style={{ width: 1, height: 18, background: C.border }} />
          <button onClick={() => setShowCtx(o => !o)} style={{ fontFamily: C.mono, fontSize: '9px', color: showCtx ? C.bright : C.dim, background: showCtx ? 'rgba(255,255,255,0.06)' : 'transparent', border: `1px solid ${showCtx ? C.borderFocus : C.border}`, padding: '5px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '0.10em', textTransform: 'uppercase', transition: 'all 0.15s' }}>
            <Settings size={10} /> Context {showCtx ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
          </button>
          {messages.length > 0 && (
            <button onClick={() => { setMessages([]); setErr('') }} style={{ fontFamily: C.mono, fontSize: '9px', color: C.dim, background: 'transparent', border: `1px solid ${C.border}`, padding: '5px 12px', cursor: 'pointer', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Context panel */}
      {showCtx && (
        <div style={{ padding: '14px 28px', borderBottom: `1px solid ${C.border}`, background: '#0A0B0E', flexShrink: 0 }}>
          <div style={{ fontFamily: C.mono, fontSize: '8px', color: C.dim, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 7 }}>Signal Context Watchlist</div>
          <input
            value={watchlist}
            onChange={e => setWatchlist(e.target.value)}
            placeholder="SPY, QQQ, NVDA..."
            style={{ width: '100%', maxWidth: 340, background: C.input, border: `1px solid ${C.border}`, color: C.bright, fontFamily: C.mono, fontSize: '11px', padding: '8px 12px', outline: 'none', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = C.borderFocus}
            onBlur={e => e.target.style.borderColor = C.border}
          />
          <p style={{ fontFamily: C.mono, fontSize: '9px', color: C.dim, marginTop: 6 }}>CIPHER generates live signals for these tickers before answering</p>
        </div>
      )}

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 20 }}>
        {messages.length === 0 && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70%', padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, background: `${C.cyan}10`, border: `1px solid ${C.cyan}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Bot size={26} color={C.cyan} />
            </div>
            <h3 style={{ fontFamily: C.sans, fontSize: '18px', fontWeight: 600, color: C.bright, marginBottom: 8 }}>CIPHER is ready</h3>
            <p style={{ fontFamily: C.sans, fontSize: '13px', color: C.mid, maxWidth: 420, lineHeight: 1.7, marginBottom: 28 }}>
              Ask about specific tickers, regime analysis, signal interpretation, or options setups. CIPHER fetches live signals before responding.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 540, width: '100%' }}>
              {STARTER_PROMPTS.map(p => (
                <button key={p} onClick={() => { setInput(p); setTimeout(() => textareaRef.current?.focus(), 50) }}
                  style={{ textAlign: 'left', padding: '12px 14px', background: C.panel, border: `1px solid ${C.border}`, color: C.mid, fontFamily: C.sans, fontSize: '12px', cursor: 'pointer', lineHeight: 1.5, transition: 'border-color 0.15s, color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderFocus; e.currentTarget.style.color = C.text }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.mid }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
        {loading && <ThinkingIndicator />}
        {err && (
          <div style={{ margin: '0 28px 20px', padding: '10px 14px', background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red, fontFamily: C.mono, fontSize: '11px' }}>
            {err}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 28px', background: '#0A0B0E', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 0, background: C.panel, border: `1px solid ${C.border}`, transition: 'border-color 0.15s' }}
          onFocusCapture={e => e.currentTarget.style.borderColor = C.borderFocus}
          onBlurCapture={e => e.currentTarget.style.borderColor = C.border}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            placeholder="Ask CIPHER about the market…"
            rows={1}
            style={{ flex: 1, background: 'transparent', border: 'none', color: C.bright, fontFamily: C.sans, fontSize: '13px', padding: '14px 16px', outline: 'none', resize: 'none', lineHeight: 1.6, maxHeight: 160, overflow: 'auto' }}
          />
          <button onClick={send} disabled={loading || !input.trim()} style={{ padding: '0 16px', background: input.trim() && !loading ? C.lime : 'transparent', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'flex-end', paddingBottom: 14, transition: 'background 0.15s', flexShrink: 0 }}>
            <Send size={15} color={input.trim() && !loading ? '#000' : 'rgba(255,255,255,0.18)'} />
          </button>
        </div>
        <p style={{ fontFamily: C.mono, fontSize: '9px', color: 'rgba(255,255,255,0.18)', marginTop: 7 }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

// ── Gate ──────────────────────────────────────────────────────────────────────
function Gate({ onUnlock }) {
  const [key, setKey] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const attempt = async () => {
    if (!key.trim() || loading) return
    setLoading(true); setErr('')
    try {
      await adminJson('/admin/panel/status', 'GET', null, key.trim())
      sessionStorage.setItem(SK, key.trim())
      onUnlock(key.trim())
    } catch (e) {
      const msg = e.message
      setErr(msg.includes('503') ? 'ADMIN_SECRET_KEY not set on server — add it in Render environment variables' : msg.includes('403') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('forbidden') ? 'Invalid admin key' : msg)
    }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 380, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
          <div style={{ width: 34, height: 34, background: C.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: C.mono, fontSize: '15px', fontWeight: 900, color: '#000' }}>A</span>
          </div>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: '10px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.bright, lineHeight: 1 }}>ADE</div>
            <div style={{ fontFamily: C.mono, fontSize: '8px', color: C.dim, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2 }}>Admin Console</div>
          </div>
        </div>

        <h1 style={{ fontFamily: C.sans, fontSize: '24px', fontWeight: 700, color: C.bright, marginBottom: 8, letterSpacing: '-0.02em' }}>Sign in</h1>
        <p style={{ fontFamily: C.sans, fontSize: '13px', color: C.mid, marginBottom: 28, lineHeight: 1.65 }}>
          Enter your <code style={{ fontFamily: C.mono, color: C.lime, fontSize: '11px', background: 'rgba(204,255,0,0.08)', padding: '2px 6px' }}>ADMIN_SECRET_KEY</code> to access the testing console.
        </p>

        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder="Admin secret key"
          autoFocus
          style={{ width: '100%', background: C.panel, border: `1px solid ${C.border}`, color: C.bright, fontFamily: C.sans, fontSize: '14px', padding: '13px 16px', outline: 'none', marginBottom: 10, boxSizing: 'border-box', transition: 'border-color 0.15s' }}
          onFocus={e => e.target.style.borderColor = C.borderFocus}
          onBlur={e => e.target.style.borderColor = C.border}
        />

        {err && <div style={{ padding: '10px 14px', background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red, fontFamily: C.sans, fontSize: '12px', marginBottom: 10, lineHeight: 1.5 }}>{err}</div>}

        <button onClick={attempt} disabled={loading || !key.trim()} style={{ width: '100%', padding: '13px', background: C.lime, color: '#000', border: 'none', fontFamily: C.sans, fontWeight: 700, fontSize: '14px', cursor: loading || !key.trim() ? 'not-allowed' : 'pointer', opacity: !key.trim() ? 0.45 : 1, letterSpacing: '0.01em', transition: 'opacity 0.15s' }}>
          {loading ? 'Verifying…' : 'Continue →'}
        </button>

        <p style={{ fontFamily: C.mono, fontSize: '9px', color: 'rgba(255,255,255,0.18)', marginTop: 16, textAlign: 'center', letterSpacing: '0.06em' }}>
          Session-only · clears when tab closes
        </p>
      </div>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, setTab, onLock }) {
  return (
    <div style={{ width: 224, flexShrink: 0, display: 'flex', flexDirection: 'column', background: C.sidebar, borderRight: `1px solid ${C.border}`, height: '100%' }}>
      <div style={{ padding: '20px 18px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: C.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: C.mono, fontSize: '12px', fontWeight: 900, color: '#000' }}>A</span>
          </div>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: '10px', fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: C.bright, lineHeight: 1 }}>ADE</div>
            <div style={{ fontFamily: C.mono, fontSize: '8px', color: C.dim, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>Admin Console</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '10px 10px 0' }}>
        <div style={{ fontFamily: C.mono, fontSize: '8px', color: C.dim, letterSpacing: '0.16em', textTransform: 'uppercase', padding: '10px 10px 8px' }}>Tools</div>
        {TABS.map(({ id, label, Icon, desc }) => {
          const active = activeTab === id
          return (
            <button key={id} onClick={() => setTab(id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 1, background: active ? 'rgba(204,255,0,0.07)' : 'transparent', border: `1px solid ${active ? 'rgba(204,255,0,0.15)' : 'transparent'}`, borderLeft: `2px solid ${active ? C.lime : 'transparent'}`, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={14} color={active ? C.lime : C.dim} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: C.mono, fontSize: '10px', fontWeight: active ? 700 : 400, color: active ? C.lime : C.mid, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.2 }}>{label}</div>
                <div style={{ fontFamily: C.mono, fontSize: '8px', color: C.dim, marginTop: 2 }}>{desc}</div>
              </div>
            </button>
          )
        })}
      </nav>

      <div style={{ padding: '12px 10px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', marginBottom: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}`, flexShrink: 0 }} />
          <span style={{ fontFamily: C.mono, fontSize: '9px', color: C.dim, letterSpacing: '0.10em' }}>Authenticated</span>
        </div>
        <button onClick={onLock} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'transparent', border: `1px solid ${C.border}`, cursor: 'pointer', color: C.dim, transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderFocus; e.currentTarget.style.color = C.mid }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim }}
        >
          <Lock size={11} />
          <span style={{ fontFamily: C.mono, fontSize: '9px', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Lock Session</span>
        </button>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(SK) || '')
  const [unlocked, setUnlocked] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')

  useEffect(() => { if (adminKey) setUnlocked(true) }, [])

  const lock = () => { sessionStorage.removeItem(SK); setAdminKey(''); setUnlocked(false) }

  if (!unlocked) {
    return <Gate onUnlock={k => { setAdminKey(k); setUnlocked(true) }} />
  }

  const content = {
    chat:   <ChatTab   adminKey={adminKey} />,
    prism:  <PrismTab  adminKey={adminKey} />,
    brief:  <BriefTab  adminKey={adminKey} />,
    status: <StatusTab adminKey={adminKey} />,
  }

  return (
    <>
      <style>{`
        @keyframes adeAdminBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.55; }
          30% { transform: translateY(-7px); opacity: 1; }
        }
        @keyframes adeAdminSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes adeApexPulse {
          0%, 100% { box-shadow: 0 0 6px #EF444440; }
          50%       { box-shadow: 0 0 18px #EF444470; }
        }
        /* Reset the global cursor:none that index.css applies to body/buttons/inputs */
        .ade-admin-root,
        .ade-admin-root * { box-sizing: border-box; margin: 0; padding: 0; cursor: auto !important; }
        .ade-admin-root button,
        .ade-admin-root [role="button"],
        .ade-admin-root a { cursor: pointer !important; }
        .ade-admin-root input,
        .ade-admin-root textarea,
        .ade-admin-root select { cursor: text !important; }
        .ade-admin-root textarea::placeholder,
        .ade-admin-root input::placeholder { color: rgba(255,255,255,0.22); }
        .ade-admin-root textarea { font-family: ${C.sans}; }
      `}</style>
      <div className="ade-admin-root" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', background: C.bg, color: C.text, overflow: 'hidden' }}>
        <Sidebar activeTab={activeTab} setTab={setActiveTab} onLock={lock} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {content[activeTab]}
        </main>
      </div>
    </>
  )
}
