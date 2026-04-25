import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useSpring, useInView, animate } from 'framer-motion'
import {
  BarChart3, Zap, Shield, TrendingUp, Brain, Activity,
  ArrowRight, ChevronRight, Circle, Lock, Globe,
  CheckCircle, AlertTriangle, Terminal,
} from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import HeroFuturistic from '../components/HeroFuturistic'

// ─── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, suffix = '', prefix = '' }) {
  const ref = useRef(null)
  const [val, setVal] = useState(0)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  useEffect(() => {
    if (!inView) return
    const ctrl = animate(0, to, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: v => setVal(Math.round(v * 10) / 10),
    })
    return () => ctrl.stop()
  }, [inView, to])

  return (
    <span ref={ref}>
      {prefix}{typeof to === 'number' && to % 1 !== 0 ? val.toFixed(1) : Math.round(val)}{suffix}
    </span>
  )
}

// ─── Mock browser showcase ─────────────────────────────────────────────────────
function MockBrowserShowcase() {
  const sectionRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] })

  const rotateX   = useTransform(scrollYProgress, [0, 0.4], [22, 0])
  const scale     = useTransform(scrollYProgress, [0, 0.4], [0.88, 1])
  const y         = useTransform(scrollYProgress, [0, 0.5], [60, 0])
  const opacity   = useTransform(scrollYProgress, [0, 0.15], [0, 1])
  const glowOp    = useTransform(scrollYProgress, [0.1, 0.5], [0, 0.7])

  const springRotX  = useSpring(rotateX,  { stiffness: 80, damping: 22 })
  const springScale = useSpring(scale,    { stiffness: 80, damping: 22 })

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-32" style={{ background: 'var(--bg-void)' }}>
      {/* section label */}
      <div className="max-w-[1440px] mx-auto px-6 mb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent-cyan)', display: 'block', marginBottom: 14 }}>
            Platform Preview
          </span>
          <h2 className="font-display font-black tracking-tighter" style={{ fontSize: 'clamp(2.2rem,4.5vw,4rem)', color: '#fff', lineHeight: 0.95, marginBottom: 16 }}>
            The terminal, on your screen.<br />
            <span style={{ color: 'var(--accent-primary)' }}>Every signal, one view.</span>
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'rgba(255,255,255,0.42)', maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
            Five intelligence layers rendered into a single, decisive interface. Nothing to interpret — just act.
          </p>
        </motion.div>
      </div>

      {/* 3-D browser frame */}
      <motion.div
        style={{ perspective: '1200px', opacity, y }}
        className="max-w-[1100px] mx-auto px-6"
      >
        <motion.div
          style={{
            rotateX: springRotX,
            scale: springScale,
            transformOrigin: 'center top',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* glow under frame */}
          <motion.div
            style={{ opacity: glowOp }}
            className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-3/4 h-24 pointer-events-none"
            aria-hidden
          >
            <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse, rgba(204,255,0,0.18) 0%, transparent 70%)', filter: 'blur(24px)' }} />
          </motion.div>

          {/* chrome bar */}
          <div style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.10)', borderBottom: 'none', borderRadius: '8px 8px 0 0', padding: '0 14px', height: 42, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="flex gap-1.5">
              {['#FF5F57','#FEBC2E','#28C840'].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.85 }} />
              ))}
            </div>
            <div style={{ flex: 1, marginLeft: 8, maxWidth: 340, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, height: 24, display: 'flex', alignItems: 'center', paddingLeft: 10, gap: 6 }}>
              <Lock size={9} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.03em' }}>app.apexengine.io/dashboard</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Circle size={6} fill="var(--color-profit)" style={{ color: 'var(--color-profit)' }} className="animate-pulse" />
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em' }}>LIVE</span>
            </div>
          </div>

          {/* mock dashboard content */}
          <div style={{ background: '#07090F', border: '1px solid rgba(255,255,255,0.10)', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden', minHeight: 420 }}>
            {/* dashboard nav bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#07090F' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '0.12em' }}>APEX</span>
              {['Signal Hub','Charts','Track Record','AI Chat'].map(n => (
                <span key={n} style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: n === 'Signal Hub' ? '#fff' : 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', borderBottom: n === 'Signal Hub' ? '1px solid var(--accent-primary)' : 'none', paddingBottom: 2 }}>
                  {n}
                </span>
              ))}
              <div className="ml-auto flex items-center gap-2" style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'var(--color-profit)', border: '1px solid rgba(0,232,121,0.22)', padding: '3px 8px' }}>
                <span className="animate-pulse inline-block w-1.5 h-1.5 rounded-full bg-current" /> MARKET OPEN
              </div>
            </div>

            {/* signal cards grid */}
            <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { sym: 'NVDA', price: '$875.20', chg: '+3.4%', verdict: 'STRONG BUY', conf: 84, color: '#00E879', tags: ['UOA ↑','RSI 62','Vol 2.8×'] },
                { sym: 'META', price: '$492.10', chg: '+1.7%', verdict: 'BUY',        conf: 71, color: '#52F7A2', tags: ['Breakout','Sent ↑'] },
                { sym: 'AAPL', price: '$189.44', chg: '-0.3%', verdict: 'WATCH',      conf: 51, color: '#FFB800', tags: ['Consolidating'] },
              ].map(({ sym, price, chg, verdict, conf, color, tags }) => (
                <div key={sym} style={{ background: 'rgba(0,0,0,0.45)', border: `1px solid rgba(255,255,255,0.06)`, borderLeft: `2px solid ${color}`, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{sym}</div>
                      <div style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{price}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 900, color }}>{conf}%</div>
                      <div style={{ fontFamily: 'var(--font-data)', fontSize: 7, color, border: `1px solid ${color}33`, padding: '1px 5px', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{verdict}</div>
                    </div>
                  </div>
                  <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${conf}%`, background: `linear-gradient(90deg, ${color}55, ${color})` }} />
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {tags.map(t => (
                      <span key={t} style={{ fontFamily: 'var(--font-data)', fontSize: 7, color: 'rgba(255,255,255,0.30)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', letterSpacing: '0.08em' }}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* bottom strip */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 16 }}>
              {[
                { label: 'Signals Today', val: '12', color: 'var(--accent-primary)' },
                { label: 'Buy Bias',      val: '67%', color: 'var(--color-profit)'  },
                { label: 'Regime',        val: 'BULL', color: 'var(--accent-cyan)'  },
                { label: 'Avg Conf',      val: '74%', color: 'rgba(255,255,255,0.5)' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 900, color, lineHeight: 1 }}>{val}</div>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: 7, color: 'rgba(255,255,255,0.25)', marginTop: 3, letterSpacing: '0.10em', textTransform: 'uppercase' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

// ─── Proof strip with animated counters ───────────────────────────────────────
function ProofStrip() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="relative border-b overflow-hidden"
      style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(7,9,15,0.80)' }}
    >
      <div className="py-6 px-6 max-w-[1440px] mx-auto">
        <div className="flex flex-wrap items-center justify-around gap-8">
          {[
            { label: 'Signal Layers',  to: 5,    suffix: '',    color: 'var(--accent-primary)'    },
            { label: 'Backtest Acc',   to: 84,   suffix: '%',   color: 'var(--color-profit)'      },
            { label: 'Asset Classes',  to: 3,    suffix: '',    color: 'var(--accent-cyan)'       },
            { label: 'Verdict Window', to: 1.5,  suffix: '–3d', color: 'rgba(255,255,255,0.65)'  },
            { label: 'Signals Logged', to: 2400, suffix: '+',   color: 'var(--accent-violet)'    },
          ].map(({ label, to, suffix, color }) => (
            <div key={label} className="text-center">
              <div className="flex items-baseline gap-0.5 justify-center" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 900, color, lineHeight: 1 }}>
                <Counter to={to} suffix={suffix} />
              </div>
              <p style={{ fontFamily: 'var(--font-data)', fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginTop: 5 }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

// ─── Sticky signal pipeline ────────────────────────────────────────────────────
const PIPELINE_LAYERS = [
  {
    num: '01',
    label: 'Technical Indicators',
    detail: 'RSI, MACD, Bollinger Bands, EMA cross, relative volume. Classic signals — computed fresh every session.',
    color: 'var(--accent-cyan)',
    icon: BarChart3,
    stat: { val: '12+', label: 'Indicators' },
  },
  {
    num: '02',
    label: 'Options Flow (UOA)',
    detail: 'Unusual options activity scanner flags institutional-size positioning before the underlying moves. Directional and magnitude scored.',
    color: '#9D6FFF',
    icon: Activity,
    stat: { val: 'Real-time', label: 'Flow data' },
  },
  {
    num: '03',
    label: 'Volume Analysis',
    detail: 'Relative volume vs 20-day average. Price-volume divergence detection. Breakout volume confirmation.',
    color: 'var(--accent-primary)',
    icon: TrendingUp,
    stat: { val: '20d', label: 'Baseline' },
  },
  {
    num: '04',
    label: 'News Sentiment',
    detail: 'Headline scoring, earnings event detection, macro catalyst flagging. Weighted by recency and source credibility.',
    color: '#FFB800',
    icon: Globe,
    stat: { val: 'Live', label: 'Headlines' },
  },
  {
    num: '05',
    label: 'AI Synthesis',
    detail: 'All four layers fused by a stack of AI models into a directional verdict with confidence score, bull case, bear case, and full reasoning chain.',
    color: 'var(--color-profit)',
    icon: Brain,
    stat: { val: '1 verdict', label: 'Per signal' },
  },
]

function StickyPipeline() {
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] })
  const [active, setActive] = useState(0)

  useEffect(() => {
    return scrollYProgress.on('change', v => {
      setActive(Math.min(Math.floor(v * PIPELINE_LAYERS.length), PIPELINE_LAYERS.length - 1))
    })
  }, [scrollYProgress])

  const layer = PIPELINE_LAYERS[active]

  return (
    <section ref={containerRef} style={{ height: `${PIPELINE_LAYERS.length * 100}vh` }} className="relative">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden" style={{ background: 'var(--bg-deep)' }}>
        {/* Background grid */}
        <div className="absolute inset-0 terminal-grid opacity-20 pointer-events-none" />

        <div className="max-w-[1440px] mx-auto px-6 w-full grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: text panel */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-12"
            >
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent-cyan)', display: 'block', marginBottom: 14 }}>
                Signal Architecture
              </span>
              <h2 className="font-display font-black tracking-tighter leading-none" style={{ fontSize: 'clamp(2.4rem,4.5vw,4rem)', color: '#fff' }}>
                Five layers.<br />
                <span style={{ color: 'var(--accent-primary)' }}>One verdict.</span>
              </h2>
            </motion.div>

            {/* Layer tabs */}
            <div className="space-y-1.5">
              {PIPELINE_LAYERS.map((l, i) => {
                const Icon = l.icon
                const isActive = i === active
                return (
                  <motion.div
                    key={l.label}
                    animate={{
                      background: isActive ? `${l.color}0D` : 'rgba(0,0,0,0)',
                      borderColor: isActive ? `${l.color}44` : 'rgba(255,255,255,0.05)',
                    }}
                    transition={{ duration: 0.25 }}
                    style={{ border: '1px solid', borderLeft: `3px solid ${isActive ? l.color : 'transparent'}`, padding: '10px 14px', cursor: 'default' }}
                    className="flex items-center gap-4"
                  >
                    <div style={{ width: 30, height: 30, border: `1px solid ${l.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isActive ? `${l.color}10` : 'transparent' }}>
                      <Icon size={13} style={{ color: isActive ? l.color : 'rgba(255,255,255,0.35)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: isActive ? '#fff' : 'rgba(255,255,255,0.40)' }}>
                        <span style={{ color: isActive ? l.color : 'rgba(255,255,255,0.18)', marginRight: 8 }}>{l.num}</span>
                        {l.label}
                      </div>
                    </div>
                    {isActive && (
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 900, color: l.color, flexShrink: 0 }}>
                        {l.stat.val}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {/* Progress indicator */}
            <div className="mt-6 flex items-center gap-1.5">
              {PIPELINE_LAYERS.map((_, i) => (
                <div key={i} style={{ height: 2, flex: 1, background: i <= active ? layer.color : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }} />
              ))}
            </div>
          </div>

          {/* Right: detail card */}
          <div className="hidden lg:block">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: 'rgba(7,9,15,0.90)', border: `1px solid ${layer.color}28`, borderLeft: `3px solid ${layer.color}`, padding: '32px 36px' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div style={{ width: 40, height: 40, border: `1px solid ${layer.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${layer.color}0D` }}>
                  {(() => { const Icon = layer.icon; return <Icon size={18} style={{ color: layer.color }} /> })()}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: layer.color, letterSpacing: '0.20em', textTransform: 'uppercase', fontWeight: 700 }}>Layer {layer.num}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginTop: 2 }}>{layer.label}</div>
                </div>
              </div>

              <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'rgba(255,255,255,0.58)', lineHeight: 1.7, marginBottom: 24 }}>
                {layer.detail}
              </p>

              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ padding: '14px 20px', background: `${layer.color}08`, border: `1px solid ${layer.color}22`, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, color: layer.color, lineHeight: 1 }}>{layer.stat.val}</div>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.28)', marginTop: 4, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{layer.stat.label}</div>
                </div>
                {active === PIPELINE_LAYERS.length - 1 && (
                  <div style={{ padding: '14px 20px', background: 'rgba(0,232,121,0.06)', border: '1px solid rgba(0,232,121,0.22)', flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-data)', fontSize: 8, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-profit)', marginBottom: 6 }}>Output verdict</div>
                    <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>STRONG BUY · BUY · WATCH · AVOID · STRONG AVOID</div>
                  </div>
                )}
              </div>

              {/* scan line decoration */}
              <div style={{ marginTop: 24, height: 1, background: `linear-gradient(90deg, ${layer.color}55, transparent)`, opacity: 0.5 }} />
            </motion.div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style={{ opacity: active === 0 ? 0.5 : 0, transition: 'opacity 0.4s' }}>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 7, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Scroll to explore</span>
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.25)', transform: 'rotate(90deg)' }} />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ─── Bento features grid ───────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Brain,
    color: 'var(--accent-violet)',
    title: 'AI Signal Engine',
    desc: 'Five layers of analysis fused by a stack of AI models into one structured verdict. Confidence-scored with full reasoning.',
    span: 'lg:col-span-2',
    accent: true,
  },
  {
    icon: Activity,
    color: 'var(--accent-cyan)',
    title: 'Options Flow (UOA)',
    desc: 'Unusual options activity detection flags institutional positioning before the move.',
    span: 'lg:col-span-1',
  },
  {
    icon: BarChart3,
    color: 'var(--accent-primary)',
    title: 'Professional Charts',
    desc: 'TradingView-grade charting with signal overlays. Watch price move against your signal conviction.',
    span: 'lg:col-span-1',
  },
  {
    icon: TrendingUp,
    color: 'var(--color-profit)',
    title: 'Track Record',
    desc: 'Every signal logged. Accuracy tracked publicly. No cherry-picking — when ADE is wrong, you see it.',
    span: 'lg:col-span-1',
  },
  {
    icon: Shield,
    color: 'var(--color-warning)',
    title: 'Regime Detection',
    desc: 'Market regime (BULL / BEAR / HIGH_VOL) factored into every signal. Conflicts flagged explicitly.',
    span: 'lg:col-span-1',
  },
  {
    icon: Zap,
    color: 'var(--accent-primary)',
    title: 'Morning Brief Agent',
    desc: 'Automated pre-market digest delivered before the open. APEX tier only.',
    span: 'lg:col-span-2',
  },
]

function BentoGrid() {
  return (
    <section className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'var(--bg-void)' }}>
      <div className="max-w-[1440px] mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mb-14"
        >
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent-primary)', display: 'block', marginBottom: 14 }}>
            Capabilities
          </span>
          <h2 className="font-display font-black tracking-tighter" style={{ fontSize: 'clamp(2rem,4vw,3.5rem)', color: '#fff' }}>
            Everything you need.<br />
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>Nothing you don't.</span>
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-3">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon
            return (
              <motion.div
                key={feat.title}
                className={`${feat.span || ''} group relative overflow-hidden`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: (i % 4) * 0.07, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ scale: 0.985, rotate: i % 2 === 0 ? '-0.4deg' : '0.4deg' }}
                style={{
                  background: feat.accent ? `linear-gradient(135deg, ${feat.color}08 0%, rgba(7,9,15,0.95) 60%)` : 'rgba(7,9,15,0.90)',
                  border: `1px solid ${feat.accent ? `${feat.color}25` : 'rgba(255,255,255,0.06)'}`,
                  padding: '28px 30px',
                  cursor: 'default',
                  transformOrigin: 'center center',
                  transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                {/* hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse 60% 60% at 50% 0%, ${feat.color}08 0%, transparent 70%)` }} />

                <div className="relative z-10">
                  <div className="mb-5 w-10 h-10 flex items-center justify-center"
                    style={{ background: `${feat.color}12`, border: `1px solid ${feat.color}28` }}>
                    <Icon size={17} style={{ color: feat.color }} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', marginBottom: 10 }}>
                    {feat.title}
                  </h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65 }}>
                    {feat.desc}
                  </p>
                </div>

                {/* bottom accent */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${feat.color}33 50%, transparent)`, opacity: 0, transition: 'opacity 0.3s' }} className="group-hover:opacity-100" />
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function TierCard({ name, price, color, features, cta, delay = 0 }) {
  const isApex = name === 'APEX'
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      style={{
        background:  isApex ? `rgba(204,255,0,0.04)` : 'rgba(7,9,15,0.85)',
        border:      `1px solid ${isApex ? 'rgba(204,255,0,0.22)' : 'rgba(255,255,255,0.07)'}`,
        borderTop:   `2px solid ${color}`,
        padding:     '26px',
        position:    'relative',
        transition:  'transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease',
        cursor:      'default',
      }}
    >
      {isApex && (
        <div style={{
          position: 'absolute', top: '-1px', right: '16px',
          fontFamily: 'var(--font-data)', fontSize: 7, fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          background: color, color: '#000', padding: '2px 8px',
        }}>
          Best Value
        </div>
      )}
      <div className="mb-5">
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color }}>{name}</span>
        <div className="flex items-baseline gap-1 mt-1.5">
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900, color: '#fff' }}>{price}</span>
          {price !== 'Free' && <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>/mo</span>}
        </div>
      </div>
      <div className="space-y-2.5 mb-6">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <CheckCircle size={11} style={{ color, marginTop: '2px', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{f}</span>
          </div>
        ))}
      </div>
      <Link
        to="/signup"
        className="block text-center py-3 transition-all hover:opacity-90"
        style={{
          fontFamily: 'var(--font-data)', fontSize: 9.5, fontWeight: 700,
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

// ─── Main Landing export ───────────────────────────────────────────────────────
export default function Landing() {
  return (
    <PageWrapper className="bg-transparent pb-0">

      {/* HERO */}
      <HeroFuturistic />

      {/* PROOF STRIP */}
      <ProofStrip />

      {/* MOCK BROWSER SHOWCASE */}
      <MockBrowserShowcase />

      {/* STICKY SIGNAL PIPELINE */}
      <StickyPipeline />

      {/* BENTO FEATURES */}
      <BentoGrid />

      {/* NOT FINANCIAL ADVICE BANNER */}
      <section className="border-t border-b" style={{ borderColor: 'rgba(255,32,82,0.15)', background: 'rgba(255,32,82,0.03)' }}>
        <div className="max-w-[1440px] mx-auto px-6 py-5 flex items-start gap-3">
          <AlertTriangle size={14} style={{ color: 'var(--color-loss)', flexShrink: 0, marginTop: '1px' }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 800 }}>
            <strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>ADE does not execute trades.</strong>{' '}
            We analyze markets and output probability-weighted signals — you define your own execution on your own broker. No order routing. No custody. Pure analysis.
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ background: 'var(--bg-deep)' }}>
        <div className="max-w-[1440px] mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="mb-14"
          >
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent-violet)', display: 'block', marginBottom: 14 }}>
              Pricing
            </span>
            <h2 className="font-display font-black tracking-tighter" style={{ fontSize: 'clamp(2rem,4vw,3.2rem)', color: '#fff', marginBottom: 8 }}>
              Four tiers. No fluff.
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'rgba(255,255,255,0.40)' }}>
              Start free. Upgrade when you need more signal depth.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <TierCard name="FREE"  price="Free"  color="rgba(255,255,255,0.35)" features={['Signal preview only','Verdict + confidence score','No reasoning or indicators','Public track record']}                                               cta="Get Started" delay={0.05} />
            <TierCard name="EDGE"  price="$29"   color="rgba(255,255,255,0.55)" features={['Full signal reasoning','Bull/bear case breakdown','Key indicator data','Charts access','Up to 10 watchlist symbols']}                           cta="Start Edge"  delay={0.10} />
            <TierCard name="ALPHA" price="$59"   color="var(--accent-cyan)"     features={['Everything in Edge','Up to 20 watchlist symbols','AI Chat — ask anything','Options flow detail','Priority signal refresh']}                      cta="Start Alpha" delay={0.15} />
            <TierCard name="APEX"  price="$119"  color="var(--accent-primary)"  features={['Everything in Alpha','Automated morning brief agent','Unlimited watchlist','Earliest signal access','Custom regime alerts']}                     cta="Go Apex"     delay={0.20} />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t relative overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'var(--bg-void)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 terminal-grid opacity-25" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px]"
            style={{ background: 'radial-gradient(ellipse, rgba(204,255,0,0.07) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        </div>
        <div className="max-w-[1440px] mx-auto px-6 py-32 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 mb-8" style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'var(--accent-primary)', border: '1px solid rgba(204,255,0,0.22)', padding: '5px 14px', letterSpacing: '0.20em', textTransform: 'uppercase' }}>
              <Terminal size={10} />
              Ready to launch
            </div>
            <h2 className="font-display font-black tracking-tighter" style={{ fontSize: 'clamp(2.8rem,6vw,5.5rem)', color: '#fff', marginBottom: 20, lineHeight: '0.92' }}>
              Stop guessing.<br />
              <span style={{ color: 'var(--accent-primary)', textShadow: '0 0 60px rgba(204,255,0,0.25)' }}>Start knowing.</span>
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'rgba(255,255,255,0.40)', maxWidth: 440, margin: '0 auto 40px', lineHeight: 1.65 }}>
              Five intelligence layers. One verdict. The edge you've been looking for.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-3 px-10 py-4 font-bold transition-all hover:bg-white group"
                style={{ fontFamily: 'var(--font-data)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', background: 'var(--accent-primary)', color: '#000' }}
              >
                <Zap size={14} />
                Open Terminal
                <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/track-record"
                className="inline-flex items-center gap-3 px-8 py-4 transition-all hover:border-white/40 group"
                style={{ fontFamily: 'var(--font-data)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.16)' }}
              >
                Track Record
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="mt-12 flex items-center justify-center gap-6 flex-wrap">
              {['No order execution','No custody','Analysis only','Cancel anytime'].map(t => (
                <div key={t} className="flex items-center gap-2" style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  <CheckCircle size={10} style={{ color: 'rgba(255,255,255,0.22)' }} />
                  {t}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t relative" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(3,5,8,0.98)' }}>
        <div className="max-w-[1440px] mx-auto px-6 py-14 grid md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '-0.01em', marginBottom: 10 }}>
              APEX ENGINE
            </h3>
            <p style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 2 }}>
              Intelligence only.<br />
              Not a broker.<br />
              Not advice.
            </p>
          </div>

          {[
            { heading: 'Platform', color: 'var(--accent-primary)', links: [{ to: '/dashboard', label: 'Signal Hub' }, { to: '/charts', label: 'Charts' }, { to: '/track-record', label: 'Track Record' }] },
            { heading: 'Account',  color: 'var(--accent-cyan)',    links: [{ to: '/login', label: 'Login' }, { to: '/signup', label: 'Join Free' }, { to: '/chat', label: 'AI Assistant' }] },
            { heading: 'Legal',    color: 'rgba(255,255,255,0.30)', links: [{ to: '/risk-disclosure', label: 'Risk Disclosure' }, { to: '/privacy', label: 'Privacy' }, { to: '/terms', label: 'Terms' }, { to: '/disclaimer', label: 'Disclaimer' }] },
          ].map(({ heading, color, links }) => (
            <div key={heading}>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color, display: 'block', marginBottom: 14 }}>
                {heading}
              </span>
              <div className="space-y-3">
                {links.map(({ to, label }) => (
                  <Link key={to} to={to}
                    style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.38)', display: 'block', transition: 'color 0.15s' }}
                    className="hover:text-white/65"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t px-6 py-4 max-w-[1440px] mx-auto flex items-center justify-between gap-4 flex-wrap" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <p style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.08em' }}>
            © 2025 Apex Decision Engine · For informational use only · Past performance ≠ future results
          </p>
          <div className="flex items-center gap-1.5">
            <Circle size={4} fill="var(--color-profit)" style={{ color: 'var(--color-profit)' }} className="animate-pulse" />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.10em' }}>
              System Operational
            </span>
          </div>
        </div>
      </footer>
    </PageWrapper>
  )
}
