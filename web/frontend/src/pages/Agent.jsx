import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, RefreshCw, Send, Zap, Clock, Settings, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import UpgradePrompt from '../components/UpgradePrompt'
import ApexOnboarding from '../components/ApexOnboarding'
import { api } from '../api'
import toast from 'react-hot-toast'

const AGG_LABELS = { 1: 'CNSV', 2: 'BAL', 3: 'STD', 4: 'AGG', 5: 'APEX' }
const AGG_COLORS = { 1: '#00D4FF', 2: '#7DE8A0', 3: '#CCFF00', 4: '#FFB800', 5: '#FF4444' }

// ── CIPHER trade card: field definitions ─────────────────────────────────────
const TRADE_FIELDS = {
  INSTRUMENT:            { label: 'Instrument',    color: 'rgba(255,255,255,0.88)' },
  CURRENT_PRICE:         { label: 'Price',         color: 'rgba(255,255,255,0.65)' },
  ENTRY:                 { label: 'Entry',         color: '#00D4FF' },
  TARGET:                { label: 'Target',        color: '#00E879' },
  STOP:                  { label: 'Stop',          color: '#FF2052' },
  HORIZON:               { label: 'Horizon',       color: '#FFB800' },
  RR:                    { label: 'R/R',           color: '#CCFF00' },
  MAX_LOSS_PER_CONTRACT: { label: 'Max Loss/Ct',   color: '#FF6B6B' },
  DELTA_EST:             { label: 'Delta Est.',    color: 'rgba(255,255,255,0.65)' },
  PROB_PROFIT:           { label: 'Prob. Profit',  color: '#7DE8A0' },
  THESIS:                { label: 'Thesis',        color: 'rgba(255,255,255,0.82)' },
  KILLS:                 { label: 'Kills If',      color: '#FF6B6B',  small: true },
  CONFIRMS:              { label: 'Confirms',      color: '#7DE8A0',  small: true },
}
const TRADE_FIELD_KEYS = new Set(Object.keys(TRADE_FIELDS))

// Parse the lines inside a --- block into a structured trade object.
// Handles multi-line THESIS by collecting continuation lines until the next field.
function parseTradeBlock(lines) {
  const result = { header: null, fields: [], disclaimer: null }
  let activeKey = null
  let activeVal = []

  const flush = () => {
    if (!activeKey) return
    const joined = activeVal
      .map(l => l.trim())
      .filter(l => l.trim() !== '.' && l.trim() !== '')
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
    result.fields.push({ key: activeKey, value: joined })
    activeKey = null
    activeVal = []
  }

  for (const line of lines) {
    // Disclaimer lines
    if (line.startsWith('⚠') || /intelligence only|not financial advice/i.test(line)) {
      flush()
      result.disclaimer = line
      continue
    }
    // Trade header: "TRADE 1: NVDA — EARNINGS_PRE_PRINT"
    const hm = line.match(/^TRADE (\d+):\s*(.+?)\s*—\s*(.+)$/)
    if (hm) {
      result.header = { num: hm[1], ticker: hm[2].trim(), strategy: hm[3].trim() }
      continue
    }
    // Field line: "ENTRY: $2.50..."
    const colonIdx = line.indexOf(': ')
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx)
      if (TRADE_FIELD_KEYS.has(key)) {
        flush()
        activeKey = key
        activeVal = [line.slice(colonIdx + 2)]
        continue
      }
    }
    // Continuation line for current field
    if (activeKey) activeVal.push(line)
  }
  flush()
  return result
}

// Styled card for one CIPHER trade block
function TradeCard({ lines }) {
  const { header, fields, disclaimer } = parseTradeBlock(lines)
  if (!header && fields.length === 0) return null

  return (
    <div style={{
      background: '#070A10',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 2px 20px rgba(0,0,0,0.55)',
      padding: '16px 18px',
      marginTop: '14px',
      marginBottom: '14px',
      overflow: 'hidden',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      {/* ── Trade header ── */}
      {header && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
          paddingBottom: '10px', marginBottom: '12px',
          borderBottom: '1px solid rgba(204,255,0,0.10)',
        }}>
          <span style={{
            fontFamily: 'var(--font-data, monospace)', fontSize: '8px', fontWeight: 700,
            background: '#CCFF00', color: '#000', padding: '2px 6px',
            letterSpacing: '0.08em', flexShrink: 0,
          }}>
            T{header.num}
          </span>
          <span style={{
            fontFamily: 'var(--font-display, sans-serif)', fontSize: '17px', fontWeight: 900,
            color: '#CCFF00', letterSpacing: '-0.01em',
          }}>
            {header.ticker}
          </span>
          <span style={{
            fontFamily: 'var(--font-data, monospace)', fontSize: '8px', fontWeight: 700,
            color: 'rgba(255,255,255,0.32)', letterSpacing: '0.12em', textTransform: 'uppercase',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            padding: '2px 8px', flexShrink: 0,
          }}>
            {header.strategy.replace(/_/g, ' ')}
          </span>
        </div>
      )}

      {/* ── Fields ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {fields.map(({ key, value }) => {
          const cfg = TRADE_FIELDS[key]
          if (!cfg) return null

          // Split "[annotation]" off the value
          const bm = value.match(/^([^\[]+?)(\s*\[.+\])?$/)
          const mainVal = bm ? bm[1].trim() : value
          const annotation = bm?.[2]?.trim()
          const labelSize = cfg.small ? '11px' : '13px'
          const valueSize = cfg.small ? '13px' : '14px'

          if (key === 'THESIS') {
            return (
              <div key={key} style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                  <span style={{ color: '#CCFF00', fontSize: '11px', flexShrink: 0 }}>▸</span>
                  <strong style={{
                    fontFamily: 'var(--font-data, monospace)', fontSize: '13px', fontWeight: 700,
                    color: 'rgba(255,255,255,0.40)', letterSpacing: '0.12em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>
                    Thesis
                  </strong>
                </div>
                <p style={{
                  fontFamily: 'var(--font-data, monospace)', fontSize: '14px',
                  color: 'rgba(255,255,255,0.82)', lineHeight: 1.7,
                  margin: 0, paddingLeft: '18px',
                  wordBreak: 'break-word', overflowWrap: 'anywhere',
                }}>
                  {value}
                </p>
              </div>
            )
          }

          return (
            <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
              <span style={{
                color: '#CCFF00', fontSize: '11px', flexShrink: 0, lineHeight: 1.4,
              }}>▸</span>
              <span style={{ fontFamily: 'var(--font-data, monospace)', lineHeight: 1.45 }}>
                <strong style={{
                  fontSize: labelSize, fontWeight: 700,
                  color: 'rgba(255,255,255,0.40)', letterSpacing: '0.12em',
                  textTransform: 'uppercase', whiteSpace: 'nowrap', marginRight: '6px',
                }}>
                  {cfg.label}:
                </strong>
                <span style={{ fontSize: valueSize, color: cfg.color, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {mainVal}
                </span>
                {annotation && (
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', marginLeft: '5px' }}>
                    {annotation}
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Disclaimer ── */}
      {disclaimer && (
        <p style={{
          fontFamily: 'var(--font-data, monospace)', fontSize: '11px',
          color: 'rgba(255,255,255,0.50)', fontStyle: 'italic',
          marginTop: '12px', paddingTop: '8px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          {disclaimer}
        </p>
      )}
    </div>
  )
}

// ── Markdown-only line renderer (brief panel + non-trade chat text) ───────────
function BriefLine({ line }) {
  if (line.startsWith('## ')) {
    return (
      <p style={{
        fontFamily: 'var(--font-data, monospace)', fontSize: '10px', fontWeight: 700,
        letterSpacing: '0.18em', textTransform: 'uppercase', color: '#CCFF00',
        marginTop: '18px', marginBottom: '6px',
      }}>
        {line.slice(3)}
      </p>
    )
  }
  if (line.startsWith('### ')) {
    return (
      <p style={{
        fontFamily: 'var(--font-data, monospace)', fontSize: '9px', fontWeight: 700,
        letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
        marginTop: '14px', marginBottom: '4px',
      }}>
        {line.slice(4)}
      </p>
    )
  }
  if (line.startsWith('- ') || line.startsWith('* ')) {
    return (
      <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '11px', color: 'rgba(255,255,255,0.70)', lineHeight: 1.65, marginBottom: '2px', paddingLeft: '12px' }}>
        <span style={{ color: '#CCFF00', marginRight: '6px' }}>›</span>
        {renderInline(line.slice(2))}
      </p>
    )
  }
  if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
    return (
      <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', color: 'rgba(255,255,255,0.28)', fontStyle: 'italic', marginTop: '16px' }}>
        {line.slice(1, -1)}
      </p>
    )
  }
  if (line.startsWith('⚠') || line.startsWith('✅') || line.startsWith('⚡')) {
    return (
      <p style={{
        fontFamily: 'var(--font-data, monospace)', fontSize: '9px',
        color: '#FFB800', background: 'rgba(255,184,0,0.06)',
        border: '1px solid rgba(255,184,0,0.18)', padding: '4px 8px',
        marginTop: '6px', lineHeight: 1.5,
      }}>
        {line}
      </p>
    )
  }
  if (line === '—' || line === '---') {
    return <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />
  }
  if (!line.trim()) return <div style={{ height: '8px' }} />
  return (
    <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '11px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.70, marginBottom: '4px' }}>
      {renderInline(line)}
    </p>
  )
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'rgba(255,255,255,0.90)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

// Segments content into trade blocks (between --- markers) and plain text.
// Trade blocks are routed to TradeCard; everything else to BriefLine.
function BriefDisplay({ content }) {
  if (!content) return null

  const segments = []
  const lines = content.split('\n')
  let textBuf = []
  let tradeBuf = null   // null = not in a trade block

  const flushText = () => {
    if (textBuf.length) { segments.push({ type: 'text', lines: [...textBuf] }); textBuf = [] }
  }

  for (const line of lines) {
    if (line.trim() === '---') {
      if (tradeBuf === null) {
        // Opening delimiter — start collecting trade lines
        flushText()
        tradeBuf = []
      } else {
        // Closing delimiter — emit trade block if it has a TRADE header
        if (tradeBuf.some(l => /^TRADE \d+:/.test(l))) {
          segments.push({ type: 'trade', lines: tradeBuf })
        } else {
          // Not a real trade block; treat content as text
          textBuf.push('---', ...tradeBuf)
        }
        tradeBuf = null
      }
    } else if (tradeBuf !== null) {
      tradeBuf.push(line)
    } else {
      textBuf.push(line)
    }
  }

  // Flush any unclosed trade block or remaining text
  if (tradeBuf !== null && tradeBuf.length) {
    tradeBuf.some(l => /^TRADE \d+:/.test(l))
      ? segments.push({ type: 'trade', lines: tradeBuf })
      : (textBuf.push(...tradeBuf))
  }
  flushText()

  return (
    <div style={{ padding: '4px 0' }}>
      {segments.map((seg, i) =>
        seg.type === 'trade'
          ? <TradeCard key={i} lines={seg.lines} />
          : seg.lines.map((line, j) => <BriefLine key={`${i}-${j}`} line={line} />)
      )}
    </div>
  )
}

// ── Voice helpers ─────────────────────────────────────────────────────────────
function useSpeech(enabled) {
  const speak = useCallback((text) => {
    if (!enabled || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const cleanText = text.replace(/[#*_`]/g, '').replace(/\n+/g, '. ')
    const utt = new SpeechSynthesisUtterance(cleanText)
    utt.rate  = 1.0
    utt.pitch = 0.88
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.name.includes('Google') && v.lang === 'en-US')
      || voices.find(v => v.lang === 'en-US' && !v.name.includes('Female'))
      || voices.find(v => v.lang.startsWith('en'))
    if (preferred) utt.voice = preferred
    window.speechSynthesis.speak(utt)
  }, [enabled])

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
  }, [])

  return { speak, stop }
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Agent() {
  const { user, tier } = useAuth()
  const [brief, setBrief]                 = useState(null)
  const [briefTs, setBriefTs]             = useState(null)
  const [loading, setLoading]             = useState(true)
  const [generating, setGenerating]       = useState(false)
  const [cooldownEnd, setCooldownEnd]     = useState(null)
  const [voiceEnabled, setVoiceEnabled]   = useState(false)
  const [listening, setListening]         = useState(false)
  const [query, setQuery]                 = useState('')
  const [askLoading, setAskLoading]       = useState(false)
  const [conversation, setConversation]   = useState([])
  const [prefs, setPrefs]                 = useState(null)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [sessionId]                       = useState(() => `cipher-${Date.now()}`)
  const [aggressionLevel, setAggressionLevel] = useState(3)
  const [cipherStats, setCipherStats]     = useState(null)
  const [pendingPositions, setPendingPositions] = useState([])
  const chatEndRef                        = useRef(null)
  const recRef                            = useRef(null)
  const { speak, stop } = useSpeech(voiceEnabled)

  // Gate: APEX only
  if (tier && tier !== 'apex') {
    return (
      <div style={{ paddingTop: '60px' }}>
        <UpgradePrompt requiredTier="apex" feature="CIPHER Agent" />
      </div>
    )
  }

  useEffect(() => {
    if (tier !== 'apex') return
    let cancelled = false

    const init = async () => {
      setLoading(true)
      try {
        const [briefData, prefsData, statsData, pendingData] = await Promise.all([
          api.getAgentBrief(),
          api.getAgentPreferences(),
          api.getCipherStats().catch(() => null),
          api.getPendingPositions().catch(() => []),
        ])
        if (cancelled) return
        if (briefData?.brief) {
          setBrief(briefData.brief)
          setBriefTs(briefData.generated_at)
        }
        setPrefs(prefsData)
        setVoiceEnabled(prefsData?.voice_mode || false)
        if (statsData) setCipherStats(statsData)
        setPendingPositions(pendingData || [])
        // Show onboarding if not complete
        if (!prefsData?.onboarding_complete) {
          setOnboardingOpen(true)
        }
      } catch (err) {
        if (!cancelled) toast.error('Could not reach CIPHER — ' + (err.message || 'check backend'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [tier])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  const generateBrief = async () => {
    if (generating) return
    setGenerating(true)
    try {
      const res = await api.generateAgentBrief()
      setBrief(res.brief)
      setBriefTs(res.generated_at)
      setCooldownEnd(Date.now() + 3600_000)
      toast.success('Brief generated.')
      if (voiceEnabled) speak(res.brief)
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('rate limit') || msg.includes('429')) {
        toast.error(msg.replace('Brief rate limit: ', ''))
        setCooldownEnd(Date.now() + 3600_000)
      } else {
        toast.error('Generation failed — ' + msg)
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleAsk = async (q = query) => {
    const question = (q || '').trim()
    if (!question || askLoading) return
    setQuery('')
    setAskLoading(true)
    setConversation(prev => [...prev, { role: 'user', content: question }])
    try {
      const res = await api.askAgent(question, sessionId, aggressionLevel)
      setConversation(prev => [...prev, {
        role: 'cipher',
        content: res.reply,
        trade_ids: res.trade_ids || [],
      }])
      if (voiceEnabled) speak(res.reply)
    } catch (err) {
      setConversation(prev => [...prev, { role: 'cipher', content: `Uplink error: ${err.message}` }])
    } finally {
      setAskLoading(false)
    }
  }

  const handleQuickMark = async (tradeId, status) => {
    try {
      await api.updateCipherTrade(tradeId, { status })
      setConversation(prev => prev.map(msg => ({
        ...msg,
        trade_ids: (msg.trade_ids || []).map(t =>
          t.id === tradeId ? { ...t, _marked: status } : t
        ),
      })))
      toast.success(`Trade marked as ${status.toUpperCase()}`)
      api.getCipherStats().then(setCipherStats).catch(() => {})
      api.getPendingPositions().then(setPendingPositions).catch(() => {})
    } catch (err) {
      toast.error('Could not update trade: ' + err.message)
    }
  }

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { toast.error('Voice input not supported in this browser'); return }
    if (recRef.current) recRef.current.abort()
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript
      handleAsk(t)
    }
    rec.onerror = () => setListening(false)
    rec.onend   = () => setListening(false)
    rec.start()
    recRef.current = rec
    setListening(true)
  }

  const stopListening = () => {
    recRef.current?.abort()
    setListening(false)
  }

  const readBriefAloud = () => {
    if (brief) speak(brief)
  }

  const onOnboardingComplete = async () => {
    try {
      const prefsData = await api.getAgentPreferences()
      setPrefs(prefsData)
      setVoiceEnabled(prefsData?.voice_mode || false)
    } catch (_) {}
  }

  const cooldownSeconds = cooldownEnd ? Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000)) : 0

  return (
    <div style={{ paddingTop: '32px', paddingBottom: '60px' }}>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div style={{
              width: '8px', height: '8px', background: '#CCFF00',
              boxShadow: '0 0 10px rgba(204,255,0,0.7)',
            }} className="animate-pulse" />
            <span style={{
              fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
              letterSpacing: '0.22em', textTransform: 'uppercase', color: '#CCFF00', fontWeight: 700,
            }}>
              CIPHER · APEX AGENT · ONLINE
            </span>
            {cipherStats?.show_badge && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700,
                background: 'rgba(204,255,0,0.10)', color: '#CCFF00',
                border: '1px solid rgba(204,255,0,0.25)', padding: '2px 8px',
              }}>
                <TrendingUp size={9} />
                {cipherStats.win_rate}% WIN RATE
              </span>
            )}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display, sans-serif)', fontSize: '28px',
            fontWeight: 900, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em',
          }}>
            Your Intelligence Agent
          </h1>
          <p style={{
            fontFamily: 'var(--font-data, monospace)', fontSize: '10px',
            color: 'rgba(255,255,255,0.35)', marginTop: '6px', letterSpacing: '0.06em',
          }}>
            On-demand market briefs. Personalized signals. Voice interaction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice toggle */}
          <button
            onClick={() => { setVoiceEnabled(v => !v); if (voiceEnabled) stop() }}
            title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
            style={{
              padding: '8px 12px', border: voiceEnabled ? '1px solid rgba(204,255,0,0.30)' : '1px solid rgba(255,255,255,0.10)',
              background: voiceEnabled ? 'rgba(204,255,0,0.08)' : 'rgba(255,255,255,0.03)',
              color: voiceEnabled ? '#CCFF00' : 'rgba(255,255,255,0.35)', cursor: 'pointer',
            }}>
            {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Setup */}
          <button
            onClick={() => setOnboardingOpen(true)}
            title="CIPHER setup"
            style={{
              padding: '8px 12px', border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
            }}>
            <Settings size={14} />
          </button>

          {/* Aggression selector */}
          <div className="flex items-center" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
            title="CIPHER aggression level">
            {[1, 2, 3, 4, 5].map(lvl => (
              <button
                key={lvl}
                onClick={() => setAggressionLevel(lvl)}
                style={{
                  padding: '7px 10px',
                  background: aggressionLevel === lvl ? `${AGG_COLORS[lvl]}18` : 'transparent',
                  color: aggressionLevel === lvl ? AGG_COLORS[lvl] : 'rgba(255,255,255,0.22)',
                  border: 'none', borderRight: lvl < 5 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  fontFamily: 'var(--font-data, monospace)', fontSize: '8px', fontWeight: 700,
                  letterSpacing: '0.10em', cursor: 'pointer',
                  transition: 'color 0.15s, background 0.15s',
                }}
                title={`L${lvl}: ${AGG_LABELS[lvl]}`}
              >
                L{lvl}
              </button>
            ))}
          </div>

          {/* Generate brief */}
          <button
            onClick={generateBrief}
            disabled={generating || cooldownSeconds > 0}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 18px', cursor: generating || cooldownSeconds > 0 ? 'not-allowed' : 'pointer',
              background: generating || cooldownSeconds > 0 ? 'rgba(204,255,0,0.05)' : 'rgba(204,255,0,0.12)',
              border: '1px solid rgba(204,255,0,0.25)', color: generating || cooldownSeconds > 0 ? 'rgba(204,255,0,0.35)' : '#CCFF00',
              fontFamily: 'var(--font-data, monospace)', fontSize: '9px', fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>
            {generating ? (
              <><RefreshCw size={12} className="animate-spin" /> Generating...</>
            ) : cooldownSeconds > 0 ? (
              <><Clock size={12} /> {Math.ceil(cooldownSeconds / 60)}m</>
            ) : (
              <><Zap size={12} /> Generate Brief</>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{
          padding: '80px 0', textAlign: 'center',
          fontFamily: 'var(--font-data, monospace)', fontSize: '10px',
          color: 'rgba(255,255,255,0.25)', letterSpacing: '0.18em', textTransform: 'uppercase',
        }} className="animate-pulse">
          CIPHER connecting...
        </div>
      ) : (
        <div className="grid gap-6" style={{ gridTemplateColumns: brief ? '1fr 360px' : '1fr' }}>

          {/* Brief panel */}
          <div>
            {brief ? (
              <div style={{
                background: '#070A10', border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 0 40px rgba(0,0,0,0.6)',
              }}>
                {/* Brief header */}
                <div className="flex items-center justify-between px-6 py-4"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-3">
                    <span style={{
                      fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                      letterSpacing: '0.22em', textTransform: 'uppercase', color: '#CCFF00', fontWeight: 700,
                    }}>
                      CIPHER BRIEF
                    </span>
                    {briefTs && (
                      <span style={{
                        fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                        color: 'rgba(255,255,255,0.22)', letterSpacing: '0.08em',
                      }}>
                        {new Date(briefTs).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {voiceEnabled && (
                    <button
                      onClick={readBriefAloud}
                      title="Read brief aloud"
                      style={{
                        padding: '5px 10px', border: '1px solid rgba(204,255,0,0.20)',
                        background: 'rgba(204,255,0,0.06)', color: '#CCFF00',
                        fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                        letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
                      }}>
                      <Volume2 size={11} />
                    </button>
                  )}
                </div>

                {/* Brief content */}
                <div className="px-6 py-5">
                  <BriefDisplay content={brief} />
                </div>
              </div>
            ) : (
              /* Empty state */
              <div style={{
                background: '#070A10', border: '1px solid rgba(255,255,255,0.06)',
                padding: '60px 40px', textAlign: 'center',
              }}>
                <div style={{
                  width: '48px', height: '48px', margin: '0 auto 20px',
                  border: '1px solid rgba(204,255,0,0.20)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Zap size={20} style={{ color: '#CCFF00' }} />
                </div>
                <p style={{
                  fontFamily: 'var(--font-data, monospace)', fontSize: '11px',
                  color: 'rgba(255,255,255,0.50)', letterSpacing: '0.08em', marginBottom: '8px',
                }}>
                  No brief yet.
                </p>
                <p style={{
                  fontFamily: 'var(--font-data, monospace)', fontSize: '10px',
                  color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em',
                }}>
                  Hit "Generate Brief" to have CIPHER analyze your watchlist.
                </p>
              </div>
            )}
          </div>

          {/* Chat panel — shown when brief exists */}
          {brief && (
            <div style={{
              background: '#070A10', border: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', flexDirection: 'column', height: '520px',
            }}>
              <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                <span style={{
                  fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                  letterSpacing: '0.20em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
                }}>
                  Ask CIPHER
                </span>
              </div>

              {/* Conversation */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ minHeight: 0 }}>
                {conversation.length === 0 && (
                  <div style={{
                    fontFamily: 'var(--font-data, monospace)', fontSize: '10px',
                    color: 'rgba(255,255,255,0.22)', fontStyle: 'italic', textAlign: 'center',
                    paddingTop: '30px',
                  }}>
                    Ask me anything about your signals or the market.
                  </div>
                )}
                {conversation.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div style={{
                      maxWidth: '90%',
                      background: msg.role === 'user' ? 'rgba(204,255,0,0.08)' : 'rgba(255,255,255,0.04)',
                      border: msg.role === 'user' ? '1px solid rgba(204,255,0,0.18)' : '1px solid rgba(255,255,255,0.07)',
                      padding: '10px 14px',
                      fontFamily: 'var(--font-data, monospace)', fontSize: '10px', lineHeight: 1.6,
                      color: msg.role === 'user' ? '#CCFF00' : 'rgba(255,255,255,0.75)',
                    }}>
                      {msg.role === 'cipher' ? (
                        msg.content.split('\n').map((l, j) => <BriefLine key={j} line={l} />)
                      ) : (
                        msg.content
                      )}
                    </div>
                    {/* Quick mark buttons for logged trades */}
                    {msg.role === 'cipher' && msg.trade_ids?.length > 0 && (
                      <div className="flex flex-col gap-1 mt-1.5" style={{ maxWidth: '90%' }}>
                        {msg.trade_ids.map(t => (
                          <div key={t.id} className="flex items-center gap-1.5 flex-wrap"
                            style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: '#CCFF00', letterSpacing: '0.10em', flexShrink: 0 }}>
                              {t.ticker} · {t.strategy_type}
                            </span>
                            {t._marked ? (
                              <span style={{
                                fontFamily: 'var(--font-data, monospace)', fontSize: '8px', letterSpacing: '0.10em',
                                color: t._marked === 'win' ? '#00E879' : t._marked === 'loss' ? '#FF2052' : 'rgba(255,255,255,0.35)',
                                padding: '1px 6px', border: `1px solid ${t._marked === 'win' ? 'rgba(0,232,121,0.30)' : t._marked === 'loss' ? 'rgba(255,32,82,0.30)' : 'rgba(255,255,255,0.10)'}`,
                              }}>
                                {t._marked.toUpperCase()} ✓
                              </span>
                            ) : (
                              <>
                                <button onClick={() => handleQuickMark(t.id, 'win')}
                                  style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', letterSpacing: '0.10em', cursor: 'pointer', padding: '1px 7px', background: 'rgba(0,232,121,0.08)', border: '1px solid rgba(0,232,121,0.25)', color: '#00E879' }}>
                                  ✓ WIN
                                </button>
                                <button onClick={() => handleQuickMark(t.id, 'loss')}
                                  style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', letterSpacing: '0.10em', cursor: 'pointer', padding: '1px 7px', background: 'rgba(255,32,82,0.08)', border: '1px solid rgba(255,32,82,0.25)', color: '#FF2052' }}>
                                  ✗ LOSS
                                </button>
                                <button onClick={() => handleQuickMark(t.id, 'cancelled')}
                                  style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', letterSpacing: '0.10em', cursor: 'pointer', padding: '1px 7px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.35)' }}>
                                  ✕ SKIP
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {askLoading && (
                  <div style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em' }}
                    className="animate-pulse">
                    CIPHER thinking...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Pending positions reminder */}
              {pendingPositions.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto"
                  style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,184,0,0.03)' }}>
                  <span style={{
                    fontFamily: 'var(--font-data, monospace)', fontSize: '7px',
                    letterSpacing: '0.14em', color: 'rgba(255,184,0,0.50)',
                    textTransform: 'uppercase', flexShrink: 0,
                  }}>
                    OPEN:
                  </span>
                  {pendingPositions.slice(0, 6).map(p => (
                    <span key={p.id} style={{
                      fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                      letterSpacing: '0.08em', color: '#FFB800',
                      background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.20)',
                      padding: '2px 8px', flexShrink: 0, whiteSpace: 'nowrap', cursor: 'default',
                    }} title={p.instrument_description}>
                      {p.ticker} · {p.strategy_type}
                    </span>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="px-4 pb-4 pt-3 flex gap-2 items-end" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk() } }}
                  placeholder="Ask about your signals..."
                  rows={2}
                  style={{
                    flex: 1, resize: 'none', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.80)',
                    padding: '8px 11px', fontFamily: 'var(--font-data, monospace)', fontSize: '10px',
                    lineHeight: 1.5, outline: 'none',
                  }}
                />
                {/* Voice input */}
                <button
                  onClick={listening ? stopListening : startListening}
                  title={listening ? 'Stop listening' : 'Voice input'}
                  style={{
                    padding: '9px 10px', border: listening ? '1px solid rgba(204,255,0,0.30)' : '1px solid rgba(255,255,255,0.09)',
                    background: listening ? 'rgba(204,255,0,0.10)' : 'rgba(255,255,255,0.03)',
                    color: listening ? '#CCFF00' : 'rgba(255,255,255,0.35)', cursor: 'pointer', flexShrink: 0,
                  }}>
                  {listening ? <Mic size={13} className="animate-pulse" /> : <MicOff size={13} />}
                </button>
                <button
                  onClick={() => handleAsk()}
                  disabled={!query.trim() || askLoading}
                  style={{
                    padding: '9px 12px', cursor: !query.trim() || askLoading ? 'not-allowed' : 'pointer',
                    background: query.trim() ? 'rgba(204,255,0,0.12)' : 'rgba(255,255,255,0.03)',
                    border: query.trim() ? '1px solid rgba(204,255,0,0.25)' : '1px solid rgba(255,255,255,0.07)',
                    color: query.trim() ? '#CCFF00' : 'rgba(255,255,255,0.20)', flexShrink: 0,
                  }}>
                  <Send size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {onboardingOpen && (
          <ApexOnboarding
            open={onboardingOpen}
            onClose={() => setOnboardingOpen(false)}
            onComplete={onOnboardingComplete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
