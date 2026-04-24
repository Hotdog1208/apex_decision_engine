import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import {
  BarChart3, Zap, Shield, TrendingUp, Brain, Activity,
  ArrowRight, ChevronRight, Circle,
} from 'lucide-react'
import GlitchText from '../components/GlitchText'
import PageWrapper from '../components/PageWrapper'

// ── Ambient noise texture ──────────────────────────────────
function NoiseLayer() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-[0.12] mix-blend-screen z-0 overflow-hidden">
      <div
        className="absolute inset-0 w-[200%] h-[200%] -top-[50%] -left-[50%]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          animation: 'noiseAnim 0.25s infinite linear'
        }}
      />
      <style>{`
        @keyframes noiseAnim {
          0% { transform: translate(0,0) }
          20% { transform: translate(-5%,-5%) }
          40% { transform: translate(-10%,5%) }
          60% { transform: translate(5%,-10%) }
          80% { transform: translate(-5%,10%) }
          100% { transform: translate(0,0) }
        }
      `}</style>
    </div>
  )
}

// ── Mock signal card for hero ──────────────────────────────
function MockSignalCard({ symbol, verdict, confidence, reasoning, delay = 0 }) {
  const colors = {
    STRONG_BUY:   { stripe: '#00E879', badge: '#00E879', bg: 'rgba(0,232,121,0.04)' },
    BUY:          { stripe: '#52F7A2', badge: '#52F7A2', bg: 'transparent' },
    WATCH:        { stripe: '#FFB800', badge: '#FFB800', bg: 'transparent' },
    AVOID:        { stripe: '#FF7043', badge: '#FF7043', bg: 'transparent' },
    STRONG_AVOID: { stripe: '#FF2052', badge: '#FF2052', bg: 'rgba(255,32,82,0.04)' },
  }
  const c = colors[verdict] || colors.WATCH

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: c.bg,
        borderTop:    '1px solid rgba(255,255,255,0.06)',
        borderRight:  '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        borderLeft:   `3px solid ${c.stripe}`,
        padding: '12px 13px',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '14px', fontWeight: 900, color: '#fff' }}>
            {symbol}
          </span>
          <span style={{
            fontFamily: 'var(--font-data, monospace)', fontSize: '7px', fontWeight: 800,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: c.badge, border: `1px solid ${c.badge}44`, padding: '1px 5px',
          }}>
            {verdict.replace('_', ' ')}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '14px', fontWeight: 800, color: c.badge }}>
          {confidence}<span style={{ fontSize: '8px', opacity: 0.65 }}>%</span>
        </span>
      </div>
      <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)', marginBottom: '8px' }}>
        <div style={{ height: '100%', width: `${confidence}%`, background: c.badge, boxShadow: `0 0 6px ${c.badge}55` }} />
      </div>
      <p style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '10px', color: 'rgba(255,255,255,0.48)', lineHeight: 1.5 }}>
        {reasoning}
      </p>
    </motion.div>
  )
}

// ── Signal stack pipeline diagram ─────────────────────────
function SignalPipeline() {
  const layers = [
    { label: 'Technical Indicators', detail: 'RSI · MACD · Bollinger · EMA · Volume', color: 'var(--accent-cyan)', icon: BarChart3 },
    { label: 'Options Flow (UOA)',    detail: 'Unusual options activity detection',    color: '#9D6FFF',             icon: Activity },
    { label: 'Volume Analysis',       detail: 'Relative volume · price-volume divergence', color: 'var(--accent-primary)', icon: TrendingUp },
    { label: 'News Sentiment',        detail: 'Real-time headline + earnings scoring', color: '#FFB800',             icon: Zap },
    { label: 'Claude AI Synthesis',   detail: 'Directional verdict + confidence + reasoning', color: 'var(--color-profit)', icon: Brain },
  ]

  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div className="absolute left-[18px] top-6 bottom-6 w-[1px]" style={{ background: 'rgba(255,255,255,0.06)' }} />

      <div className="space-y-3">
        {layers.map((layer, i) => {
          const Icon = layer.icon
          return (
            <motion.div
              key={layer.label}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start gap-4 relative"
            >
              {/* Node */}
              <div
                className="shrink-0 w-9 h-9 flex items-center justify-center z-10"
                style={{ background: 'var(--bg-deep)', border: `1px solid ${layer.color}44` }}
              >
                <Icon size={14} style={{ color: layer.color }} />
              </div>
              <div className="pt-1.5 pb-1">
                <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#fff', marginBottom: '2px' }}>
                  {layer.label}
                </p>
                <p style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '11px', color: 'rgba(255,255,255,0.40)', lineHeight: 1.4 }}>
                  {layer.detail}
                </p>
              </div>
              {i < layers.length - 1 && (
                <div className="absolute left-[18px] top-[38px] w-[1px] h-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Output verdict */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="mt-5 ml-[52px] flex items-center gap-3 px-4 py-3"
        style={{ background: 'rgba(0,232,121,0.06)', border: '1px solid rgba(0,232,121,0.18)', borderLeft: '3px solid var(--color-profit)' }}
      >
        <ArrowRight size={13} style={{ color: 'var(--color-profit)' }} />
        <div>
          <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-profit)', display: 'block' }}>
            Output verdict
          </span>
          <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '11px', color: 'rgba(255,255,255,0.72)', fontWeight: 600 }}>
            STRONG_BUY · BUY · WATCH · AVOID · STRONG_AVOID
          </span>
        </div>
      </motion.div>
    </div>
  )
}

// ── Tier card ─────────────────────────────────────────────
function TierCard({ name, price, color, features, cta, delay = 0 }) {
  const isApex = name === 'APEX'
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background:  isApex ? `rgba(204,255,0,0.04)` : 'rgba(7,9,15,0.85)',
        border:      `1px solid ${isApex ? 'rgba(204,255,0,0.20)' : 'rgba(255,255,255,0.07)'}`,
        borderTop:   `2px solid ${color}`,
        padding:     '24px',
        position:    'relative',
      }}
    >
      {isApex && (
        <div style={{
          position: 'absolute', top: '-1px', right: '16px',
          fontFamily: 'var(--font-data, monospace)', fontSize: '7px', fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          background: color, color: '#000', padding: '2px 8px',
        }}>
          Best Value
        </div>
      )}
      <div className="mb-4">
        <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color }}>{name}</span>
        <div className="flex items-baseline gap-1 mt-1">
          <span style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '28px', fontWeight: 900, color: '#fff' }}>{price}</span>
          {price !== 'Free' && <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>/mo</span>}
        </div>
      </div>
      <div className="space-y-2 mb-5">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2">
            <Circle size={4} fill={color} style={{ color, marginTop: '5px', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '12px', color: 'rgba(255,255,255,0.58)', lineHeight: 1.45 }}>{f}</span>
          </div>
        ))}
      </div>
      <Link
        to="/signup"
        className="block text-center py-2.5 transition-all"
        style={{
          fontFamily: 'var(--font-data, monospace)', fontSize: '9px', fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          background: isApex ? color : 'transparent',
          color: isApex ? '#000' : color,
          border: isApex ? 'none' : `1px solid ${color}55`,
        }}
      >
        {cta}
      </Link>
    </motion.div>
  )
}

// ── Main Landing export ────────────────────────────────────
export default function Landing() {
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 600], [0, 120])
  const smoothHeroY = useSpring(heroY, { stiffness: 80, damping: 20 })

  return (
    <PageWrapper className="bg-transparent pb-0">

      {/* ════════════════════════════════════════
          HERO
      ════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <NoiseLayer />

        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px]"
            style={{ background: 'radial-gradient(ellipse, rgba(204,255,0,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          <div className="absolute bottom-0 right-0 w-[600px] h-[400px]"
            style={{ background: 'radial-gradient(ellipse, rgba(0,212,255,0.04) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        </div>

        {/* Terminal grid overlay */}
        <div className="absolute inset-0 terminal-grid opacity-50 z-0 pointer-events-none" />

        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-5 pt-24 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: Headline */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex items-center gap-2 mb-6"
              >
                <Circle size={5} fill="var(--color-profit)" style={{ color: 'var(--color-profit)' }} className="animate-pulse" />
                <span style={{
                  fontFamily: 'var(--font-data, monospace)', fontSize: '9px', fontWeight: 700,
                  letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--color-profit)',
                }}>
                  System Online
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              >
                <GlitchText
                  as="h1"
                  text="The only terminal"
                  className="font-display font-black text-white leading-[0.95] tracking-tighter"
                  style={{ fontSize: 'clamp(2.8rem, 6vw, 5.5rem)' }}
                />
                <h1 className="font-display font-black leading-[0.95] tracking-tighter" style={{ fontSize: 'clamp(2.8rem, 6vw, 5.5rem)', color: 'var(--accent-primary)' }}>
                  a trader needs.
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-6 max-w-lg"
                style={{
                  fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '16px',
                  lineHeight: 1.65, color: 'rgba(255,255,255,0.55)',
                  borderLeft: '3px solid var(--accent-primary)', paddingLeft: '16px',
                }}
              >
                Multi-layer signal intelligence. Technical indicators, options flow, volume, and news — synthesized by Claude AI into one decisive verdict.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-10 flex items-center gap-3 flex-wrap"
              >
                <Link
                  to="/dashboard"
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 font-bold transition-all hover:bg-white"
                  style={{
                    fontFamily: 'var(--font-data, monospace)', fontSize: '10px',
                    letterSpacing: '0.16em', textTransform: 'uppercase',
                    background: 'var(--accent-primary)', color: '#000',
                  }}
                >
                  <Zap size={14} />
                  Open Terminal
                  <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  to="/track-record"
                  className="inline-flex items-center gap-2 px-6 py-3.5 transition-all hover:border-white/30"
                  style={{
                    fontFamily: 'var(--font-data, monospace)', fontSize: '10px',
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.55)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  Track Record
                  <ArrowRight size={12} />
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="mt-8 flex items-center gap-6"
              >
                {[
                  { label: 'Assets', value: 'Stocks · Options · Futures' },
                  { label: 'Cadence', value: 'Daily · 1-3 Day Window' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', display: 'block' }}>
                      {label}
                    </span>
                    <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>
                      {value}
                    </span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: Live signal mock terminal */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ y: smoothHeroY }}
            >
              {/* Terminal chrome */}
              <div style={{
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(3,5,8,0.90)',
                overflow: 'hidden',
              }}>
                {/* Window bar */}
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-2 h-2" style={{ background: '#FF2052', borderRadius: 0 }} />
                  <div className="w-2 h-2" style={{ background: '#FFB800', borderRadius: 0 }} />
                  <div className="w-2 h-2" style={{ background: '#00E879', borderRadius: 0 }} />
                  <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', marginLeft: '8px' }}>
                    ADE // Signal Hub
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <Circle size={4} fill="var(--color-profit)" style={{ color: 'var(--color-profit)' }} className="animate-pulse" />
                    <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'var(--color-profit)', letterSpacing: '0.10em' }}>LIVE</span>
                  </div>
                </div>

                {/* Signal cards */}
                <div className="p-3 space-y-2">
                  <MockSignalCard
                    symbol="NVDA"
                    verdict="STRONG_BUY"
                    confidence={84}
                    reasoning="RSI at 62 with bullish MACD crossover. Unusual options activity at $950 calls. Vol ratio 2.8× — institutional accumulation pattern."
                    delay={0.35}
                  />
                  <MockSignalCard
                    symbol="AAPL"
                    verdict="WATCH"
                    confidence={51}
                    reasoning="Consolidating near 52w high. Mixed options sentiment. Awaiting earnings catalyst before directional conviction."
                    delay={0.45}
                  />
                  <MockSignalCard
                    symbol="META"
                    verdict="BUY"
                    confidence={71}
                    reasoning="Strong volume surge on breakout above key resistance. News sentiment positive post-earnings revision."
                    delay={0.55}
                  />
                </div>

                {/* Status bar */}
                <div className="px-4 py-2 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.08em' }}>
                    Powered by Claude AI · claude-sonnet-4
                  </span>
                  <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(204,255,0,0.45)', letterSpacing: '0.10em' }}>
                    3 signals · 1-3d window
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          PROOF STRIP
      ════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative border-b overflow-hidden"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(7,9,15,0.80)' }}
      >
        <div className="py-5 px-5 max-w-[1440px] mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-6">
            {[
              { label: 'Signal Layers',   value: '5',         unit: '',      color: 'var(--accent-primary)' },
              { label: 'AI Model',        value: 'Claude',    unit: 'Sonnet', color: 'var(--accent-violet)' },
              { label: 'Asset Classes',   value: '3',         unit: 'types', color: 'var(--accent-cyan)'   },
              { label: 'Verdict Window',  value: '1-3',       unit: 'days',  color: 'rgba(255,255,255,0.7)' },
              { label: 'Track Record',    value: 'Public',    unit: '',      color: 'var(--color-profit)' },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="text-center min-w-[80px]">
                <div className="flex items-baseline gap-1 justify-center">
                  <span style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '24px', fontWeight: 900, color, lineHeight: 1 }}>{value}</span>
                  {unit && <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.35)' }}>{unit}</span>}
                </div>
                <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginTop: '3px' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ════════════════════════════════════════
          SIGNAL STACK
      ════════════════════════════════════════ */}
      <section className="max-w-[1440px] mx-auto px-5 py-28">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
            >
              <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--accent-cyan)', display: 'block', marginBottom: '12px' }}>
                Signal Architecture
              </span>
              <h2 className="font-display font-black tracking-tighter leading-none" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.8rem)', color: '#fff', marginBottom: '16px' }}>
                Five layers.<br />
                <span style={{ color: 'var(--accent-primary)' }}>One verdict.</span>
              </h2>
              <p style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '15px', lineHeight: 1.65, color: 'rgba(255,255,255,0.50)', maxWidth: '420px' }}>
                ADE doesn't give you raw data to interpret. It runs a full multi-layer analysis and outputs a single directional conviction with a confidence score, bull case, bear case, and full reasoning chain.
              </p>
            </motion.div>
          </div>
          <div>
            <SignalPipeline />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FEATURES GRID
      ════════════════════════════════════════ */}
      <section className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-[1440px] mx-auto px-5 py-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="mb-16"
          >
            <h2 className="font-display font-black tracking-tighter" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: '#fff' }}>
              Everything you need.<br />
              <span style={{ color: 'rgba(255,255,255,0.30)' }}>Nothing you don't.</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {[
              {
                icon: Brain,
                color: 'var(--accent-violet)',
                title: 'AI Signal Engine',
                desc: 'Claude AI synthesizes technical, options, and sentiment data into a structured verdict. Confidence-scored, with bull/bear case and full reasoning.',
              },
              {
                icon: Activity,
                color: 'var(--accent-cyan)',
                title: 'Options Flow (UOA)',
                desc: 'Unusual options activity detection flags institutional positioning before the move. Integrated directly into signal scoring.',
              },
              {
                icon: BarChart3,
                color: 'var(--accent-primary)',
                title: 'Professional Charts',
                desc: 'TradingView-grade charting with signal overlays. Watch price move in real-time relative to your signal conviction.',
              },
              {
                icon: TrendingUp,
                color: 'var(--color-profit)',
                title: 'Track Record',
                desc: 'Every signal logged. Accuracy tracked publicly. No cherry-picking. When ADE is right, you see it. When it\'s wrong, you see that too.',
              },
              {
                icon: Shield,
                color: 'var(--color-warning)',
                title: 'Regime Detection',
                desc: 'Market regime (BULL/BEAR/HIGH_VOL) is detected and factored into every signal. Regime conflicts are flagged explicitly.',
              },
              {
                icon: Zap,
                color: 'var(--accent-primary)',
                title: 'Morning Brief Agent',
                desc: 'APEX tier gets an automated morning brief — a signal digest delivered before market open. No manual setup required.',
              },
            ].map((feat, i) => {
              const Icon = feat.icon
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.35, delay: (i % 3) * 0.07 }}
                  className="group"
                  style={{ background: 'var(--bg-deep)', padding: '28px' }}
                >
                  <div className="mb-5 w-9 h-9 flex items-center justify-center"
                    style={{ background: `${feat.color}15`, border: `1px solid ${feat.color}30` }}>
                    <Icon size={16} style={{ color: feat.color }} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', marginBottom: '8px' }}>
                    {feat.title}
                  </h3>
                  <p style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                    {feat.desc}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          NOT FINANCIAL ADVICE BANNER
      ════════════════════════════════════════ */}
      <section className="border-t border-b" style={{ borderColor: 'rgba(255,32,82,0.15)', background: 'rgba(255,32,82,0.03)' }}>
        <div className="max-w-[1440px] mx-auto px-5 py-5 flex items-start gap-3">
          <Shield size={14} style={{ color: 'var(--color-loss)', flexShrink: 0, marginTop: '1px' }} />
          <p style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: '800px' }}>
            <strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>ADE does not execute trades.</strong>{' '}
            We analyze markets and output probability-weighted signals — you define your own execution on your own broker. No order routing. No custody. Pure analysis.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          PRICING
      ════════════════════════════════════════ */}
      <section className="max-w-[1440px] mx-auto px-5 py-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mb-12"
        >
          <h2 className="font-display font-black tracking-tighter" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '#fff', marginBottom: '8px' }}>
            Four tiers. No fluff.
          </h2>
          <p style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '15px', color: 'rgba(255,255,255,0.40)' }}>
            Start free. Upgrade when you need more signal depth.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TierCard
            name="FREE"
            price="Free"
            color="rgba(255,255,255,0.35)"
            features={[
              'Signal preview only',
              'Verdict + confidence score',
              'No reasoning or indicators',
              'Public track record',
            ]}
            cta="Get Started"
            delay={0.05}
          />
          <TierCard
            name="EDGE"
            price="$29"
            color="rgba(255,255,255,0.55)"
            features={[
              'Full signal reasoning',
              'Bull/bear case breakdown',
              'Key indicator data',
              'Charts access',
              'Up to 10 watchlist symbols',
            ]}
            cta="Start Edge"
            delay={0.10}
          />
          <TierCard
            name="ALPHA"
            price="$59"
            color="var(--accent-cyan)"
            features={[
              'Everything in Edge',
              'Up to 20 watchlist symbols',
              'AI Chat — ask anything',
              'Options flow detail',
              'Priority signal refresh',
            ]}
            cta="Start Alpha"
            delay={0.15}
          />
          <TierCard
            name="APEX"
            price="$119"
            color="var(--accent-primary)"
            features={[
              'Everything in Alpha',
              'Automated morning brief agent',
              'Unlimited watchlist',
              'Earliest signal access',
              'Custom regime alerts',
            ]}
            cta="Go Apex"
            delay={0.20}
          />
        </div>
      </section>

      {/* ════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════ */}
      <section className="border-t relative overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 terminal-grid opacity-30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px]"
            style={{ background: 'radial-gradient(ellipse, rgba(204,255,0,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        </div>
        <div className="max-w-[1440px] mx-auto px-5 py-28 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="font-display font-black tracking-tighter" style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)', color: '#fff', marginBottom: '16px', lineHeight: '0.95' }}>
              Stop guessing.<br />
              <span style={{ color: 'var(--accent-primary)' }}>Start knowing.</span>
            </h2>
            <p style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '16px', color: 'rgba(255,255,255,0.42)', maxWidth: '440px', margin: '0 auto 36px', lineHeight: 1.6 }}>
              Five intelligence layers. One verdict. The edge you've been looking for.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-3 px-10 py-4 font-bold transition-all hover:bg-white group"
              style={{
                fontFamily: 'var(--font-data, monospace)', fontSize: '11px',
                letterSpacing: '0.16em', textTransform: 'uppercase',
                background: 'var(--accent-primary)', color: '#000',
              }}
            >
              <Zap size={15} />
              Open Terminal
              <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════ */}
      <footer className="border-t relative" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(3,5,8,0.95)' }}>
        <div className="max-w-[1440px] mx-auto px-5 py-12 grid md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <h3 style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '18px', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '-0.01em', marginBottom: '8px' }}>
              APEX ENGINE
            </h3>
            <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 2 }}>
              Intelligence only.<br />
              Not a broker.<br />
              Not advice.
            </p>
          </div>

          {[
            {
              heading: 'Platform',
              color: 'var(--accent-primary)',
              links: [
                { to: '/dashboard', label: 'Signal Hub' },
                { to: '/charts',    label: 'Charts' },
                { to: '/track-record', label: 'Track Record' },
              ],
            },
            {
              heading: 'Account',
              color: 'var(--accent-cyan)',
              links: [
                { to: '/login',  label: 'Login' },
                { to: '/signup', label: 'Join Free' },
                { to: '/chat',   label: 'AI Assistant' },
              ],
            },
            {
              heading: 'Legal',
              color: 'rgba(255,255,255,0.30)',
              links: [
                { to: '/risk-disclosure', label: 'Risk Disclosure' },
                { to: '/privacy',         label: 'Privacy' },
                { to: '/terms',           label: 'Terms' },
                { to: '/disclaimer',      label: 'Disclaimer' },
              ],
            },
          ].map(({ heading, color, links }) => (
            <div key={heading}>
              <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color, display: 'block', marginBottom: '12px' }}>
                {heading}
              </span>
              <div className="space-y-2.5">
                {links.map(({ to, label }) => (
                  <Link key={to} to={to}
                    style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '13px', color: 'rgba(255,255,255,0.40)', display: 'block', transition: 'color 0.15s' }}
                    className="hover:text-white/70"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t px-5 py-4 max-w-[1440px] mx-auto flex items-center justify-between gap-4 flex-wrap" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.20)', letterSpacing: '0.08em' }}>
            © 2025 Apex Decision Engine · For informational use only · Past performance ≠ future results
          </p>
          <div className="flex items-center gap-1.5">
            <Circle size={4} fill="var(--color-profit)" style={{ color: 'var(--color-profit)' }} className="animate-pulse" />
            <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.10em' }}>
              System Operational
            </span>
          </div>
        </div>
      </footer>
    </PageWrapper>
  )
}
