import { useState, useEffect, useRef, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || '/api'
const SK = 'ade_admin_key'

// ── helpers ──────────────────────────────────────────────────────────────────

async function adminFetch(path, method = 'GET', body = null, adminKey = '') {
  const url = `${API_BASE}${path}`
  const init = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (method === 'GET') {
    const sep = path.includes('?') ? '&' : '?'
    return fetch(`${url}${sep}admin_key=${encodeURIComponent(adminKey)}`, init)
  }
  init.body = JSON.stringify({ ...(body || {}), admin_key: adminKey })
  return fetch(url, init)
}

async function adminJson(path, method = 'GET', body = null, adminKey = '') {
  const res = await adminFetch(path, method, body, adminKey)
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText)
    let msg = txt
    try { msg = JSON.parse(txt)?.detail || JSON.parse(txt)?.message || txt } catch (_) {}
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── atoms ────────────────────────────────────────────────────────────────────

const C = {
  bg:      '#08090B',
  panel:   '#0E1014',
  border:  'rgba(255,255,255,0.07)',
  dim:     'rgba(255,255,255,0.22)',
  mid:     'rgba(255,255,255,0.50)',
  bright:  'rgba(255,255,255,0.85)',
  lime:    '#CCFF00',
  cyan:    '#00D4FF',
  red:     '#FF2052',
  orange:  '#FF7A00',
  green:   '#00E879',
  mono:    '"JetBrains Mono", "Fira Code", monospace',
}

const pill = (color) => ({
  display: 'inline-flex', alignItems: 'center', gap: '5px',
  padding: '2px 8px', fontSize: '9px', fontWeight: 700,
  letterSpacing: '0.14em', textTransform: 'uppercase',
  background: `${color}18`, color, border: `1px solid ${color}40`,
  fontFamily: C.mono,
})

function Dot({ on }) {
  return (
    <span style={{
      width: 6, height: 6, borderRadius: '50%',
      background: on ? C.green : 'rgba(255,255,255,0.15)',
      display: 'inline-block', flexShrink: 0,
      boxShadow: on ? `0 0 6px ${C.green}` : 'none',
    }} />
  )
}

function Label({ children }) {
  return (
    <span style={{
      fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em',
      textTransform: 'uppercase', color: C.lime, fontFamily: C.mono,
    }}>
      {children}
    </span>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
    }}>
      <Label>{children}</Label>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )
}

function Panel({ children, style }) {
  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      padding: '20px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function Btn({ children, onClick, disabled, loading, variant = 'primary', style }) {
  const base = {
    fontFamily: C.mono, fontSize: '9px', fontWeight: 700,
    letterSpacing: '0.14em', textTransform: 'uppercase',
    padding: '8px 16px', cursor: disabled || loading ? 'not-allowed' : 'pointer',
    border: 'none', transition: 'opacity 0.15s',
    opacity: disabled || loading ? 0.4 : 1,
    ...style,
  }
  const themes = {
    primary: { background: C.lime, color: '#000' },
    ghost:   { background: 'rgba(255,255,255,0.04)', color: C.mid, border: `1px solid ${C.border}` },
    danger:  { background: `${C.red}22`, color: C.red, border: `1px solid ${C.red}40` },
    cyan:    { background: `${C.cyan}18`, color: C.cyan, border: `1px solid ${C.cyan}40` },
  }
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{ ...base, ...themes[variant] }}>
      {loading ? '...' : children}
    </button>
  )
}

function Input({ value, onChange, placeholder, style, type = 'text', onKeyDown }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      style={{
        background: '#05070A',
        border: `1px solid ${C.border}`,
        color: C.bright,
        fontFamily: C.mono,
        fontSize: '11px',
        padding: '8px 12px',
        outline: 'none',
        width: '100%',
        letterSpacing: '0.04em',
        ...style,
      }}
    />
  )
}

// ── brief renderer ────────────────────────────────────────────────────────────

function BriefRenderer({ text }) {
  if (!text) return null
  return (
    <div style={{ fontFamily: C.mono }}>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return <p key={i} style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.lime, marginTop: 18, marginBottom: 6 }}>{line.slice(3)}</p>
        if (line.startsWith('### '))
          return <p key={i} style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.mid, marginTop: 12, marginBottom: 4 }}>{line.slice(4)}</p>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <p key={i} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.70)', lineHeight: 1.65, marginBottom: 2, paddingLeft: 12 }}><span style={{ color: C.lime, marginRight: 6 }}>›</span>{line.slice(2)}</p>
        if (line === '---' || line === '—')
          return <div key={i} style={{ height: 1, background: C.border, margin: '14px 0' }} />
        if (!line.trim())
          return <div key={i} style={{ height: 6 }} />
        return <p key={i} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.70)', lineHeight: 1.70, marginBottom: 3 }}>{line}</p>
      })}
    </div>
  )
}

// ── signal renderer ──────────────────────────────────────────────────────────

const VERDICT_COLOR = {
  STRONG_BUY: C.green, BUY: C.green, WATCH: C.orange,
  AVOID: C.red, STRONG_AVOID: C.red,
}

function SignalRenderer({ signal }) {
  if (!signal) return null
  const vc = VERDICT_COLOR[signal.verdict] || C.mid
  return (
    <div style={{ fontFamily: C.mono }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '22px', fontWeight: 900, color: C.bright, letterSpacing: '-0.02em' }}>{signal.symbol}</span>
        <span style={pill(vc)}>{signal.verdict}</span>
        <span style={pill(C.cyan)}>{signal.confidence ?? signal.raw_confidence ?? '—'}%</span>
        {signal.primary_timeframe && <span style={pill(C.dim)}>{signal.primary_timeframe}</span>}
        {signal.market_regime && <span style={pill(C.orange)}>{signal.market_regime}</span>}
      </div>

      {/* Price */}
      {signal.price > 0 && (
        <p style={{ fontSize: '11px', color: C.dim, marginBottom: 10 }}>
          Price: <span style={{ color: C.bright }}>${signal.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          {signal.composite_score != null && (
            <span style={{ marginLeft: 14 }}>Composite Score: <span style={{ color: C.lime }}>{signal.composite_score}/100</span></span>
          )}
        </p>
      )}

      {/* Reasoning */}
      {signal.reasoning && (
        <div style={{ marginBottom: 14 }}>
          <Label>Reasoning</Label>
          <p style={{ marginTop: 6, fontSize: '11px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.70 }}>{signal.reasoning}</p>
        </div>
      )}

      {/* Bull / Bear */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {signal.bull_case && (
          <div style={{ background: `${C.green}0A`, border: `1px solid ${C.green}25`, padding: '10px 12px' }}>
            <Label>Bull Case</Label>
            <p style={{ marginTop: 5, fontSize: '10px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{signal.bull_case}</p>
          </div>
        )}
        {signal.bear_case && (
          <div style={{ background: `${C.red}0A`, border: `1px solid ${C.red}25`, padding: '10px 12px' }}>
            <Label>Bear Case</Label>
            <p style={{ marginTop: 5, fontSize: '10px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{signal.bear_case}</p>
          </div>
        )}
      </div>

      {/* Key indicators */}
      {signal.key_indicators?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <Label>Key Indicators</Label>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {signal.key_indicators.map((ind, i) => (
              <span key={i} style={{ fontSize: '9px', fontFamily: C.mono, color: C.mid, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, padding: '3px 8px' }}>
                {ind}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Factor scores */}
      {signal.factor_scores && (
        <div style={{ marginBottom: 14 }}>
          <Label>Factor Scores</Label>
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
            {Object.entries(signal.factor_scores).map(([k, v]) => (
              <div key={k} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, padding: '6px 10px' }}>
                <div style={{ fontSize: '8px', color: C.dim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>{k.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: v > 60 ? C.green : v < 40 ? C.red : C.orange }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scalp / Long notes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {signal.scalp_note && (
          <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
            <Label>Scalp Note</Label>
            <p style={{ marginTop: 4, fontSize: '10px', color: C.mid, lineHeight: 1.6 }}>{signal.scalp_note}</p>
          </div>
        )}
        {signal.long_note && (
          <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
            <Label>Long Note</Label>
            <p style={{ marginTop: 4, fontSize: '10px', color: C.mid, lineHeight: 1.6 }}>{signal.long_note}</p>
          </div>
        )}
      </div>

      {signal.calibrated_label && (
        <p style={{ marginTop: 10, fontSize: '9px', color: C.dim, fontStyle: 'italic' }}>{signal.calibrated_label}</p>
      )}
    </div>
  )
}

// ── sections ─────────────────────────────────────────────────────────────────

function StatusSection({ adminKey }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const data = await adminJson('/admin/panel/status', 'GET', null, adminKey)
      setStatus(data)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }, [adminKey])

  useEffect(() => { fetch() }, [fetch])

  const svc = status?.services || {}

  return (
    <Panel>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <SectionTitle>System Status</SectionTitle>
        <Btn variant="ghost" onClick={fetch} loading={loading} style={{ marginBottom: 16 }}>Refresh</Btn>
      </div>
      {err && <p style={{ color: C.red, fontSize: '10px', marginBottom: 10 }}>{err}</p>}
      {status && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {[
            { label: 'Backend',        on: true,              value: status.backend },
            { label: 'Data Source',    on: true,              value: status.data_source },
            { label: 'Anthropic API',  on: svc.anthropic_api, value: svc.anthropic_api ? 'Connected' : 'NOT SET' },
            { label: 'Finnhub',        on: svc.finnhub,       value: svc.finnhub ? 'Connected' : 'NOT SET' },
            { label: 'Supabase',       on: svc.supabase,      value: svc.supabase ? 'Connected' : 'NOT SET' },
            { label: 'Stripe',         on: svc.stripe,        value: svc.stripe ? 'Connected' : 'NOT SET' },
            { label: 'Sentry',         on: svc.sentry,        value: svc.sentry ? 'Active' : 'Disabled' },
            { label: 'AI Model',       on: true,              value: status.model },
            { label: 'Cached Signals', on: true,              value: status.cached_signals },
            { label: 'Active Users',   on: true,              value: status.active_users },
            { label: 'Chats Today',    on: true,              value: status.total_chat_messages_today },
            { label: 'Market Regime',  on: true,              value: status.regime?.regime || '—' },
          ].map(({ label, on, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Dot on={on} />
                <span style={{ fontSize: '8px', color: C.dim, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: C.mono }}>{label}</span>
              </div>
              <span style={{ fontSize: '11px', color: C.bright, fontFamily: C.mono }}>{String(value)}</span>
            </div>
          ))}
        </div>
      )}
      {status?.accuracy?.evaluated > 0 && (
        <div style={{ marginTop: 16, padding: '12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
          <Label>Signal Accuracy</Label>
          <div style={{ marginTop: 8, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: C.mid, fontFamily: C.mono }}>
              Evaluated: <span style={{ color: C.bright }}>{status.accuracy.evaluated}</span>
            </span>
            <span style={{ fontSize: '11px', color: C.mid, fontFamily: C.mono }}>
              Accuracy: <span style={{ color: C.lime }}>{status.accuracy.accuracy_pct?.toFixed(1)}%</span>
            </span>
          </div>
        </div>
      )}
    </Panel>
  )
}

function PrismSection({ adminKey }) {
  const [symbol, setSymbol] = useState('AAPL')
  const [signal, setSignal] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const run = async () => {
    if (!symbol.trim()) return
    setLoading(true); setErr(''); setSignal(null)
    try {
      const data = await adminJson('/admin/panel/signal', 'POST', { symbol: symbol.trim().toUpperCase() }, adminKey)
      setSignal(data)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Panel>
      <SectionTitle>PRISM Signal Tester</SectionTitle>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <Input
          value={symbol}
          onChange={setSymbol}
          placeholder="Symbol (e.g. AAPL)"
          style={{ maxWidth: 180 }}
          onKeyDown={e => e.key === 'Enter' && run()}
        />
        <Btn onClick={run} loading={loading}>Generate Signal</Btn>
      </div>
      {err && <p style={{ color: C.red, fontSize: '10px', marginBottom: 10 }}>{err}</p>}
      {loading && (
        <p style={{ fontSize: '10px', color: C.dim, fontFamily: C.mono, letterSpacing: '0.10em' }}>
          Generating signal — calling Anthropic Claude...
        </p>
      )}
      {signal && <SignalRenderer signal={signal} />}
    </Panel>
  )
}

function CipherBriefSection({ adminKey }) {
  const [watchlistInput, setWatchlistInput] = useState('SPY, QQQ, NVDA, AAPL, TSLA')
  const [brief, setBrief] = useState(null)
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const generate = async () => {
    setLoading(true); setErr(''); setBrief(null); setMeta(null)
    const watchlist = watchlistInput.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    try {
      const data = await adminJson('/admin/panel/brief', 'POST', { watchlist }, adminKey)
      setBrief(data.brief)
      setMeta({ symbols: data.symbols, signal_count: data.signal_count, generated_at: data.generated_at })
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Panel>
      <SectionTitle>CIPHER Brief Generator</SectionTitle>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input
          value={watchlistInput}
          onChange={setWatchlistInput}
          placeholder="Watchlist (comma-separated)"
          style={{ maxWidth: 360 }}
          onKeyDown={e => e.key === 'Enter' && generate()}
        />
        <Btn onClick={generate} loading={loading} variant="cyan">Generate Brief</Btn>
      </div>
      {err && <p style={{ color: C.red, fontSize: '10px', marginBottom: 10 }}>{err}</p>}
      {loading && (
        <div>
          <p style={{ fontSize: '10px', color: C.dim, fontFamily: C.mono, letterSpacing: '0.10em' }}>
            Generating signals for watchlist, then composing CIPHER brief via Claude...
          </p>
          <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.20)', fontFamily: C.mono, marginTop: 4 }}>
            This may take 10–20 seconds on first run (cold data fetch + Claude call).
          </p>
        </div>
      )}
      {meta && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '9px', color: C.dim, fontFamily: C.mono }}>
            Symbols: <span style={{ color: C.bright }}>{meta.symbols?.join(', ')}</span>
          </span>
          <span style={{ fontSize: '9px', color: C.dim, fontFamily: C.mono }}>
            Signals: <span style={{ color: C.lime }}>{meta.signal_count}</span>
          </span>
          <span style={{ fontSize: '9px', color: C.dim, fontFamily: C.mono }}>
            At: <span style={{ color: C.mid }}>{meta.generated_at?.slice(0, 19).replace('T', ' ')} UTC</span>
          </span>
        </div>
      )}
      {brief && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, padding: '16px' }}>
          <BriefRenderer text={brief} />
        </div>
      )}
    </Panel>
  )
}

function CipherAskSection({ adminKey }) {
  const [watchlistInput, setWatchlistInput] = useState('SPY, QQQ, NVDA')
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  const ask = async () => {
    const q = question.trim()
    if (!q || loading) return
    setQuestion(''); setErr('')
    const prev = [...history, { role: 'user', content: q }]
    setHistory(prev)
    setLoading(true)
    const watchlist = watchlistInput.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    try {
      const data = await adminJson('/admin/panel/ask', 'POST', { question: q, watchlist, session_id: 'admin-session' }, adminKey)
      setHistory([...prev, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setErr(e.message)
      setHistory(prev)
    }
    setLoading(false)
  }

  return (
    <Panel>
      <SectionTitle>CIPHER Q&amp;A</SectionTitle>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input
          value={watchlistInput}
          onChange={setWatchlistInput}
          placeholder="Context watchlist (comma-separated)"
          style={{ maxWidth: 300, flex: '0 0 auto' }}
        />
        <Btn variant="ghost" onClick={() => setHistory([])} style={{ whiteSpace: 'nowrap' }}>Clear Chat</Btn>
      </div>

      {/* Conversation */}
      {history.length > 0 && (
        <div style={{
          minHeight: 120, maxHeight: 420, overflowY: 'auto',
          background: 'rgba(0,0,0,0.25)', border: `1px solid ${C.border}`,
          padding: '12px', marginBottom: 12,
        }}>
          {history.map((msg, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <span style={{
                fontSize: '8px', fontFamily: C.mono, letterSpacing: '0.14em',
                textTransform: 'uppercase', fontWeight: 700,
                color: msg.role === 'user' ? C.lime : C.cyan,
                marginBottom: 4, display: 'block',
              }}>
                {msg.role === 'user' ? 'You' : 'CIPHER'}
              </span>
              {msg.role === 'assistant'
                ? <BriefRenderer text={msg.content} />
                : <p style={{ fontSize: '11px', color: C.bright, fontFamily: C.mono, lineHeight: 1.65 }}>{msg.content}</p>
              }
            </div>
          ))}
          {loading && (
            <div>
              <span style={{ fontSize: '8px', fontFamily: C.mono, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: C.cyan, display: 'block', marginBottom: 4 }}>CIPHER</span>
              <p style={{ fontSize: '11px', color: C.dim, fontFamily: C.mono }}>Thinking...</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {err && <p style={{ color: C.red, fontSize: '10px', marginBottom: 8 }}>{err}</p>}

      <div style={{ display: 'flex', gap: 10 }}>
        <Input
          value={question}
          onChange={setQuestion}
          placeholder="Ask CIPHER anything about the market..."
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && ask()}
        />
        <Btn onClick={ask} loading={loading} variant="cyan" style={{ whiteSpace: 'nowrap' }}>Ask</Btn>
      </div>
      <p style={{ marginTop: 6, fontSize: '9px', color: C.dim, fontFamily: C.mono }}>Enter to send</p>
    </Panel>
  )
}

// ── gate ──────────────────────────────────────────────────────────────────────

function Gate({ onUnlock }) {
  const [key, setKey] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const attempt = async () => {
    if (!key.trim()) return
    setLoading(true); setErr('')
    try {
      await adminJson('/admin/panel/status', 'GET', null, key.trim())
      sessionStorage.setItem(SK, key.trim())
      onUnlock(key.trim())
    } catch (e) {
      setErr(e.message.includes('403') || e.message.toLowerCase().includes('invalid') ? 'Invalid admin key' : e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 32,
    }}>
      <div style={{ maxWidth: 400, width: '100%' }}>
        <Label>Admin Access</Label>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.bright, margin: '12px 0 8px', letterSpacing: '-0.02em' }}>
          ADE Admin Panel
        </h1>
        <p style={{ fontSize: 11, color: C.dim, fontFamily: C.mono, marginBottom: 24, lineHeight: 1.7 }}>
          Enter your <code style={{ color: C.lime }}>ADMIN_SECRET_KEY</code> to access the testing console.
        </p>
        <Input
          type="password"
          value={key}
          onChange={setKey}
          placeholder="Admin secret key"
          onKeyDown={e => e.key === 'Enter' && attempt()}
          style={{ marginBottom: 10 }}
        />
        {err && <p style={{ color: C.red, fontSize: '10px', fontFamily: C.mono, marginBottom: 10 }}>{err}</p>}
        <Btn onClick={attempt} loading={loading} style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
          Unlock Panel
        </Btn>
        <p style={{ marginTop: 16, fontSize: '9px', color: 'rgba(255,255,255,0.18)', fontFamily: C.mono }}>
          Session-only storage — key clears when tab closes.
        </p>
      </div>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(SK) || '')
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    if (adminKey) setUnlocked(true)
  }, [])

  if (!unlocked) {
    return <Gate onUnlock={(k) => { setAdminKey(k); setUnlocked(true) }} />
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.bright, fontFamily: C.mono }}>
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`, padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: C.panel, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.lime }}>ADE</span>
          <span style={{ color: C.border, fontSize: '18px' }}>|</span>
          <span style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.dim }}>Admin Console</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Dot on={true} />
          <span style={{ fontSize: '9px', color: C.dim, letterSpacing: '0.10em' }}>Authenticated</span>
          <Btn
            variant="ghost"
            onClick={() => { sessionStorage.removeItem(SK); setUnlocked(false); setAdminKey('') }}
            style={{ fontSize: '8px' }}
          >
            Lock
          </Btn>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <StatusSection adminKey={adminKey} />
        <PrismSection adminKey={adminKey} />
        <CipherBriefSection adminKey={adminKey} />
        <CipherAskSection adminKey={adminKey} />
      </div>
    </div>
  )
}
