import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  motion, useScroll, useTransform, useSpring,
  useInView, animate, AnimatePresence,
} from 'framer-motion'
import {
  ArrowRight, Terminal, Brain, TrendingUp, Shield,
  BarChart3, Activity, ChevronRight, CheckCircle2,
  Globe, Lock, Newspaper, Bot,
} from 'lucide-react'
import { PulseBeams } from '../components/ui/pulse-beams'
import RadialShader from '../components/ui/radial-shader'
import LabShader from '../components/ui/lab-shader'

// ─── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, suffix = '', prefix = '', decimal = false }) {
  const ref = useRef(null)
  const [val, setVal] = useState(0)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  useEffect(() => {
    if (!inView) return
    const ctrl = animate(0, to, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: v => setVal(decimal ? Math.round(v * 10) / 10 : Math.round(v)),
    })
    return () => ctrl.stop()
  }, [inView, to, decimal])
  return <span ref={ref}>{prefix}{decimal ? val.toFixed(1) : val}{suffix}</span>
}

// ─── Scanlines ─────────────────────────────────────────────────────────────────
function Scanlines() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5]"
      style={{
        background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)',
        mixBlendMode: 'overlay',
      }}
    />
  )
}

// ─── HUD corner brackets ───────────────────────────────────────────────────────
function HudCorners({ color = '#CCFF00', size = 18, thickness = 1.5 }) {
  const s = { width: size, height: size, position: 'absolute' }
  const b = `${thickness}px solid ${color}`
  return (
    <>
      <span style={{ ...s, top: 0, left: 0,  borderTop: b, borderLeft: b }}  />
      <span style={{ ...s, top: 0, right: 0, borderTop: b, borderRight: b }} />
      <span style={{ ...s, bottom: 0, left: 0,  borderBottom: b, borderLeft: b }}  />
      <span style={{ ...s, bottom: 0, right: 0, borderBottom: b, borderRight: b }} />
    </>
  )
}

// ─── Financial matrix rain ─────────────────────────────────────────────────────
function MatrixRain({ opacity = 0.55 }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    let id
    const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$%↑↓+-·×.'
    const SZ = 11, CW = 13
    let cols, drops, speeds, hue

    const init = () => {
      c.width = c.offsetWidth; c.height = c.offsetHeight
      cols  = Math.floor(c.width / CW) + 1
      drops = Array.from({ length: cols }, () => Math.random() * -(c.height / SZ))
      speeds = Array.from({ length: cols }, () => 0.14 + Math.random() * 0.42)
      hue   = Array.from({ length: cols }, () => Math.random() > 0.32 ? 'lime' : 'cyan')
    }
    const rnd = () => CHARS[Math.floor(Math.random() * CHARS.length)]
    const draw = () => {
      ctx.fillStyle = 'rgba(3,5,8,0.042)'
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.font = `${SZ}px "Share Tech Mono",monospace`
      ctx.textAlign = 'center'
      for (let i = 0; i < cols; i++) {
        const y = drops[i] * SZ
        if (y < 0) { drops[i] += speeds[i]; continue }
        const head = Math.random() > 0.93
        ctx.fillStyle = head ? '#fff'
          : hue[i] === 'lime'
            ? `rgba(204,255,0,${0.05 + Math.random() * 0.32})`
            : `rgba(0,212,255,${0.05 + Math.random() * 0.32})`
        ctx.fillText(rnd(), i * CW + CW / 2, y)
        drops[i] += speeds[i]
        if (drops[i] * SZ > c.height && Math.random() > 0.975) {
          drops[i] = -Math.floor(Math.random() * 18)
          hue[i] = Math.random() > 0.32 ? 'lime' : 'cyan'
        }
      }
      id = requestAnimationFrame(draw)
    }
    init()
    window.addEventListener('resize', init)
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', init) }
  }, [])
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — HERO
// ─────────────────────────────────────────────────────────────────────────────
const HERO_BEAMS = [
  {
    path: 'M180 390H40C34.48 390 30 385.52 30 380V280',
    gradientConfig: {
      initial: { x1:'0%', x2:'0%', y1:'80%', y2:'100%' },
      animate: { x1:['0%','0%','200%'], x2:['0%','0%','180%'], y1:['80%','0%','0%'], y2:['100%','20%','20%'] },
      transition: { duration: 2.4, repeat: Infinity, ease: 'linear', delay: 0 },
    },
    connectionPoints: [{ cx: 30, cy: 280, r: 5 }, { cx: 180, cy: 390, r: 5 }],
  },
  {
    path: 'M480 390H620C625.52 390 630 385.52 630 380V280',
    gradientConfig: {
      initial: { x1:'100%', x2:'100%', y1:'80%', y2:'100%' },
      animate: { x1:['100%','100%','-100%'], x2:['100%','100%','-80%'], y1:['80%','0%','0%'], y2:['100%','20%','20%'] },
      transition: { duration: 2.4, repeat: Infinity, ease: 'linear', delay: 0.8 },
    },
    connectionPoints: [{ cx: 630, cy: 280, r: 5 }, { cx: 480, cy: 390, r: 5 }],
  },
  {
    path: 'M330 80V30C330 24.48 334.48 20 340 20H380',
    gradientConfig: {
      initial: { x1:'-40%', x2:'-10%', y1:'0%', y2:'20%' },
      animate: { x1:['40%','0%','0%'], x2:['10%','0%','0%'], y1:['0%','0%','180%'], y2:['20%','20%','200%'] },
      transition: { duration: 2.2, repeat: Infinity, ease: 'linear', delay: 1.4 },
    },
    connectionPoints: [{ cx: 386, cy: 20, r: 5 }, { cx: 330, cy: 80, r: 5 }],
  },
]

function HeroSection() {
  return (
    <section
      className="relative overflow-hidden flex flex-col items-center justify-center"
      style={{ minHeight: '100vh', background: 'var(--bg-void)' }}
    >
      {/* Matrix rain */}
      <MatrixRain opacity={0.52} />

      {/* Scanlines */}
      <Scanlines />

      {/* Central radial glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% 50%, rgba(204,255,0,0.04) 0%, rgba(0,212,255,0.02) 40%, transparent 70%)',
        }}
      />

      {/* Corner accent lines */}
      <div aria-hidden className="absolute top-0 left-0 w-48 h-px" style={{ background: 'linear-gradient(90deg, rgba(204,255,0,0.5) 0%, transparent 100%)' }} />
      <div aria-hidden className="absolute top-0 left-0 w-px h-48" style={{ background: 'linear-gradient(180deg, rgba(204,255,0,0.5) 0%, transparent 100%)' }} />
      <div aria-hidden className="absolute top-0 right-0 w-48 h-px" style={{ background: 'linear-gradient(270deg, rgba(0,212,255,0.4) 0%, transparent 100%)' }} />
      <div aria-hidden className="absolute top-0 right-0 w-px h-48" style={{ background: 'linear-gradient(180deg, rgba(0,212,255,0.4) 0%, transparent 100%)' }} />

      {/* PulseBeams — decorative bottom */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl opacity-60 pointer-events-none">
        <PulseBeams
          beams={HERO_BEAMS}
          width={660}
          height={420}
          baseColor="rgba(255,255,255,0.05)"
          accentColor="rgba(255,255,255,0.12)"
          gradientColors={{ start: '#00D4FF', middle: '#9D6FFF', end: '#CCFF00' }}
        />
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="relative z-20 max-w-5xl mx-auto px-6 py-20 flex flex-col items-center text-center">

        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2.5 mb-10"
          style={{
            background: 'rgba(204,255,0,0.06)',
            border: '1px solid rgba(204,255,0,0.22)',
            borderRadius: 2,
            padding: '6px 16px',
          }}
        >
          <span
            style={{
              width: 6, height: 6, borderRadius: '50%', background: '#CCFF00',
              boxShadow: '0 0 8px #CCFF00',
              animation: 'dataPulse 2s ease-in-out infinite',
              display: 'block',
            }}
          />
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, letterSpacing: '0.20em', color: '#CCFF00' }}>
            LIVE — APEX DECISION ENGINE v2.0
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display font-black"
          style={{
            fontSize: 'clamp(3.4rem, 9vw, 9.5rem)',
            lineHeight: 0.88,
            letterSpacing: '-0.03em',
            marginBottom: '1.4rem',
          }}
        >
          <span style={{ display: 'block', color: '#fff' }}>FIVE LAYERS</span>
          <span style={{ display: 'block', color: 'rgba(255,255,255,0.18)', WebkitTextStroke: '1px rgba(255,255,255,0.22)' }}>
            OF MARKET
          </span>
          <span
            style={{
              display: 'block',
              background: 'linear-gradient(135deg, #CCFF00 0%, #00D4FF 55%, #9D6FFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            INTELLIGENCE.
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 'clamp(0.8rem, 1.4vw, 1rem)',
            color: 'rgba(255,255,255,0.42)',
            letterSpacing: '0.09em',
            maxWidth: 540,
            lineHeight: 1.8,
            marginBottom: '2.8rem',
          }}
        >
          Technical indicators · Options flow · Volume analysis<br />
          Sentiment · AI synthesis — one decisive signal.
        </motion.p>

        {/* CTA row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.44 }}
          className="flex flex-col sm:flex-row gap-4 items-center"
        >
          <Link
            to="/signup"
            className="group relative flex items-center gap-2.5 cursor-pointer"
            style={{
              background: '#CCFF00',
              color: '#000',
              borderRadius: 2,
              padding: '14px 32px',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: '0.12em',
              transition: 'box-shadow 0.2s, transform 0.15s',
              boxShadow: '0 0 0 rgba(204,255,0,0)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 0 32px rgba(204,255,0,0.45)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 0 0 rgba(204,255,0,0)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            START FREE
            <ArrowRight size={14} />
          </Link>

          <Link
            to="/dashboard"
            className="group flex items-center gap-2.5 cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.65)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 2,
              padding: '13px 28px',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.12em',
              transition: 'all 0.2s',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(0,212,255,0.35)'
              e.currentTarget.style.color = '#00D4FF'
              e.currentTarget.style.background = 'rgba(0,212,255,0.06)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            }}
          >
            <Terminal size={13} />
            LIVE DEMO
          </Link>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="flex items-center gap-10 mt-20 flex-wrap justify-center"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 28 }}
        >
          {[
            { value: '85.2', suffix: '%', label: 'SIGNAL ACCURACY', color: '#CCFF00' },
            { value: '47',   suffix: 'K',  label: 'SIGNALS LOGGED',  color: '#00D4FF' },
            { value: '5',    suffix: '',   label: 'INTEL LAYERS',    color: '#9D6FFF' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1.5">
              <span
                className="font-display font-black"
                style={{ fontSize: '2.2rem', lineHeight: 1, color: s.color, textShadow: `0 0 24px ${s.color}66` }}
              >
                {s.value}{s.suffix}
              </span>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.18em' }}>
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll caret */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.45, 0.45], y: [0, 0, 7, 0] }}
        transition={{ opacity: { delay: 2, duration: 1 }, y: { duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 2 } }}
      >
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.28)' }}>
          SCROLL
        </span>
        <div style={{ width: 1, height: 36, background: 'linear-gradient(180deg, rgba(204,255,0,0.5) 0%, transparent 100%)' }} />
      </motion.div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — PROOF STRIP
// ─────────────────────────────────────────────────────────────────────────────
const PROOF_STATS = [
  { to: 85.2,  suffix: '%',  label: 'Signal Accuracy',    decimal: true,  color: '#CCFF00' },
  { to: 47000, suffix: '+',  label: 'Signals Generated',  decimal: false, color: '#00D4FF' },
  { to: 5,     suffix: '',   label: 'Intelligence Layers', decimal: false, color: '#9D6FFF' },
  { to: 99.8,  suffix: '%',  label: 'Platform Uptime',    decimal: true,  color: '#00E879' },
  { to: 3,     suffix: 's',  label: 'Avg Response Time',  decimal: false, color: '#FFB800' },
]

function StatsStrip() {
  return (
    <section
      style={{
        background: 'var(--bg-deep)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-4">
          {PROOF_STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex flex-col items-center gap-2 text-center relative"
            >
              {i < PROOF_STATS.length - 1 && (
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 hidden md:block"
                  style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.06)' }}
                />
              )}
              <span
                className="font-display font-black"
                style={{ fontSize: '2.8rem', lineHeight: 1, color: s.color, textShadow: `0 0 20px ${s.color}44` }}
              >
                <Counter to={s.to} suffix={s.suffix} decimal={s.decimal} />
              </span>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.16em' }}>
                {s.label.toUpperCase()}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — INTELLIGENCE LAYERS
// ─────────────────────────────────────────────────────────────────────────────
const LAYERS = [
  {
    id: '01', label: 'Technical Analysis',
    icon: BarChart3, color: '#00D4FF',
    desc: 'RSI, MACD, Bollinger Bands, EMA crossovers, volume divergence — 40+ indicators.',
  },
  {
    id: '02', label: 'Options Flow / UOA',
    icon: Activity, color: '#9D6FFF',
    desc: 'Unusual options activity detection. Dark pool prints. Sweep orders flagged in real time.',
  },
  {
    id: '03', label: 'Volume Analysis',
    icon: TrendingUp, color: '#CCFF00',
    desc: 'VWAP deviation, accumulation/distribution, institutional block detection.',
  },
  {
    id: '04', label: 'News Sentiment',
    icon: Newspaper, color: '#FFB800',
    desc: 'Real-time NLP scoring across 2000+ sources. Earnings, macro events, SEC filings.',
  },
  {
    id: '05', label: 'AI Synthesis',
    icon: Brain, color: '#00E879',
    desc: 'Claude AI fuses all four layers into one verdict: STRONG BUY → STRONG AVOID.',
  },
]

// SVG paths: each outer node → center (430, 265)
const INTEL_BEAMS = [
  // TL → center
  {
    path: 'M95,140 C260,140 310,265 430,265',
    gradientConfig: {
      initial: { x1:'0%', x2:'50%', y1:'0%', y2:'100%' },
      animate: { x1:['0%','100%','100%'], x2:['50%','150%','150%'], y1:['0%','0%','100%'], y2:['100%','100%','200%'] },
      transition: { duration: 2.2, repeat: Infinity, ease: 'linear', delay: 0 },
    },
    connectionPoints: [{ cx: 95, cy: 140, r: 6 }, { cx: 430, cy: 265, r: 10 }],
  },
  // TR → center
  {
    path: 'M765,140 C600,140 550,265 430,265',
    gradientConfig: {
      initial: { x1:'100%', x2:'50%', y1:'0%', y2:'100%' },
      animate: { x1:['100%','0%','0%'], x2:['50%','-50%','-50%'], y1:['0%','0%','100%'], y2:['100%','100%','200%'] },
      transition: { duration: 2.2, repeat: Infinity, ease: 'linear', delay: 0.5 },
    },
    connectionPoints: [{ cx: 765, cy: 140, r: 6 }, { cx: 430, cy: 265, r: 10 }],
  },
  // BL → center
  {
    path: 'M95,390 C260,390 310,265 430,265',
    gradientConfig: {
      initial: { x1:'0%', x2:'50%', y1:'100%', y2:'0%' },
      animate: { x1:['0%','100%','100%'], x2:['50%','150%','150%'], y1:['100%','100%','0%'], y2:['0%','0%','-100%'] },
      transition: { duration: 2.2, repeat: Infinity, ease: 'linear', delay: 1.0 },
    },
    connectionPoints: [{ cx: 95, cy: 390, r: 6 }, { cx: 430, cy: 265, r: 10 }],
  },
  // BR → center
  {
    path: 'M765,390 C600,390 550,265 430,265',
    gradientConfig: {
      initial: { x1:'100%', x2:'50%', y1:'100%', y2:'0%' },
      animate: { x1:['100%','0%','0%'], x2:['50%','-50%','-50%'], y1:['100%','100%','0%'], y2:['0%','0%','-100%'] },
      transition: { duration: 2.2, repeat: Infinity, ease: 'linear', delay: 1.5 },
    },
    connectionPoints: [{ cx: 765, cy: 390, r: 6 }, { cx: 430, cy: 265, r: 10 }],
  },
  // Top → center
  {
    path: 'M430,50 L430,265',
    gradientConfig: {
      initial: { x1:'50%', x2:'50%', y1:'0%', y2:'100%' },
      animate: { x1:'50%', x2:'50%', y1:['0%','100%','200%'], y2:['100%','200%','300%'] },
      transition: { duration: 2.0, repeat: Infinity, ease: 'linear', delay: 2.0 },
    },
    connectionPoints: [{ cx: 430, cy: 50, r: 6 }, { cx: 430, cy: 265, r: 10 }],
  },
]

function IntelligenceSection() {
  return (
    <section
      className="relative overflow-hidden py-28 md:py-40"
      style={{ background: 'var(--bg-void)' }}
    >
      {/* Background dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ fontFamily: 'var(--font-data)', fontSize: 10, letterSpacing: '0.22em', color: '#CCFF00', display: 'block', marginBottom: 16 }}
          >
            HOW APEX THINKS
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-black tracking-tighter"
            style={{ fontSize: 'clamp(2.4rem, 5vw, 5rem)', lineHeight: 0.92, color: '#fff', marginBottom: 20 }}
          >
            Five AI layers.<br />
            <span style={{ color: 'rgba(255,255,255,0.22)', WebkitTextStroke: '1px rgba(255,255,255,0.20)' }}>
              One verdict.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'rgba(255,255,255,0.38)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}
          >
            No single indicator is reliable. APEX fuses five independent intelligence
            streams into a consensus signal — then tells you exactly what to do.
          </motion.p>
        </div>

        {/* PulseBeams — decorative centerpiece with AI synthesis node */}
        <div className="relative mb-16 flex justify-center">
          <div className="w-full max-w-3xl">
            <PulseBeams
              beams={INTEL_BEAMS}
              width={860}
              height={530}
              baseColor="rgba(255,255,255,0.05)"
              accentColor="rgba(255,255,255,0.12)"
              gradientColors={{ start: '#00D4FF', middle: '#9D6FFF', end: '#CCFF00' }}
              className="w-full"
            >
              {/* Center AI synthesis node */}
              <div
                className="relative flex flex-col items-center justify-center"
                style={{
                  width: 130, height: 130,
                  border: '1px solid rgba(0,232,121,0.28)',
                  borderRadius: 2,
                  background: 'rgba(0,232,121,0.05)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                }}
              >
                <HudCorners color="#00E879" size={12} thickness={1.5} />
                <Brain size={26} color="#00E879" strokeWidth={1.5} />
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, letterSpacing: '0.16em', color: '#00E879', marginTop: 10, textAlign: 'center' }}>
                  AI SYNTHESIS
                </span>
                <span
                  style={{
                    width: 5, height: 5, borderRadius: '50%', background: '#00E879',
                    boxShadow: '0 0 8px #00E879', position: 'absolute', top: 8, right: 8,
                    animation: 'dataPulse 2s ease-in-out infinite',
                  }}
                />
              </div>
            </PulseBeams>
          </div>
        </div>

        {/* Five layer cards — responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {LAYERS.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="relative flex flex-col gap-3 p-5 cursor-default"
              style={{
                background: `${l.color}07`,
                border: `1px solid ${l.color}20`,
                borderRadius: 2,
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${l.color}40`
                e.currentTarget.style.boxShadow = `0 0 24px ${l.color}10`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = `${l.color}20`
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <HudCorners color={l.color} size={8} thickness={1} />
              <div className="flex items-center gap-2">
                <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${l.color}10`, border: `1px solid ${l.color}20`, borderRadius: 2, flexShrink: 0 }}>
                  <l.icon size={15} color={l.color} strokeWidth={1.5} />
                </div>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: l.color, letterSpacing: '0.14em' }}>
                  LAYER {l.id}
                </span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                {l.label}
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(255,255,255,0.40)', lineHeight: 1.6 }}>
                {l.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — LAB SHADER DIVIDER
// ─────────────────────────────────────────────────────────────────────────────
function ShaderDivider() {
  return (
    <div className="relative w-full overflow-hidden" style={{ height: 340, background: '#000' }}>
      <div className="absolute inset-0" style={{ opacity: 0.55 }}>
        <LabShader />
      </div>
      {/* Gradient masks to blend edges */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, var(--bg-void) 0%, transparent 20%, transparent 80%, var(--bg-void) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, var(--bg-void) 0%, transparent 15%, transparent 85%, var(--bg-void) 100%)' }} />

      {/* Center text overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-6">
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          style={{ fontFamily: 'var(--font-data)', fontSize: 10, letterSpacing: '0.24em', color: 'rgba(255,255,255,0.38)', marginBottom: 12, display: 'block' }}
        >
          INTELLIGENCE INFRASTRUCTURE
        </motion.span>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="font-display font-black"
          style={{ fontSize: 'clamp(1.6rem, 3.5vw, 3rem)', color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em', maxWidth: 600 }}
        >
          Real-time. Every market. <span style={{ color: '#CCFF00' }}>Every second.</span>
        </motion.p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — PLATFORM PREVIEW
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_SIGNALS = [
  { ticker: 'NVDA', verdict: 'STRONG BUY', confidence: 94, color: '#00E879', change: '+4.2%' },
  { ticker: 'TSLA', verdict: 'BUY',        confidence: 78, color: '#52F7A2', change: '+1.8%' },
  { ticker: 'SPY',  verdict: 'WATCH',      confidence: 61, color: '#FFB800', change: '-0.3%' },
  { ticker: 'AMZN', verdict: 'BUY',        confidence: 82, color: '#52F7A2', change: '+2.1%' },
  { ticker: 'META', verdict: 'STRONG BUY', confidence: 91, color: '#00E879', change: '+3.6%' },
]

function PlatformPreview() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const rotateX = useSpring(useTransform(scrollYProgress, [0, 0.4], [20, 0]), { stiffness: 80, damping: 22 })
  const scale   = useSpring(useTransform(scrollYProgress, [0, 0.4], [0.88, 1]), { stiffness: 80, damping: 22 })
  const opacity = useTransform(scrollYProgress, [0, 0.18], [0, 1])

  return (
    <section ref={ref} className="relative overflow-hidden py-32" style={{ background: 'var(--bg-void)' }}>
      {/* Glow layer */}
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,212,255,0.04) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ fontFamily: 'var(--font-data)', fontSize: 10, letterSpacing: '0.22em', color: '#00D4FF', display: 'block', marginBottom: 14 }}
          >
            PLATFORM PREVIEW
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-display font-black tracking-tighter"
            style={{ fontSize: 'clamp(2.2rem, 4.5vw, 4.5rem)', color: '#fff', lineHeight: 0.92, marginBottom: 16 }}
          >
            The terminal, on your screen.<br />
            <span style={{ color: 'var(--accent-primary)' }}>Every signal. One view.</span>
          </motion.h2>
        </div>

        {/* 3-D browser frame */}
        <motion.div style={{ perspective: '1200px', opacity }} className="mx-auto max-w-5xl">
          <motion.div style={{ rotateX, scale, transformOrigin: 'center top', transformStyle: 'preserve-3d' }}>
            {/* Glow under frame */}
            <motion.div
              style={{ opacity: useTransform(scrollYProgress, [0.1, 0.5], [0, 1]) }}
              className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 pointer-events-none"
              aria-hidden
            >
              <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse, rgba(0,212,255,0.18) 0%, transparent 70%)', filter: 'blur(20px)' }} />
            </motion.div>

            {/* Chrome bar */}
            <div style={{
              background: '#0D1117',
              border: '1px solid rgba(255,255,255,0.09)',
              borderBottom: 'none',
              borderRadius: '6px 6px 0 0',
              padding: '0 14px',
              height: 40,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <div className="flex gap-1.5">
                {['#FF5F57','#FEBC2E','#28C840'].map(c => (
                  <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.8 }} />
                ))}
              </div>
              <div style={{ flex: 1, maxWidth: 340, margin: '0 auto', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Lock size={9} style={{ opacity: 0.35 }} />
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.05em' }}>apex-engine.com/dashboard</span>
              </div>
            </div>

            {/* Dashboard body */}
            <div style={{
              background: '#07090F',
              border: '1px solid rgba(255,255,255,0.08)',
              borderTop: 'none',
              borderRadius: '0 0 6px 6px',
              overflow: 'hidden',
              minHeight: 420,
            }}>
              {/* Inner nav */}
              <div style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 800, color: '#CCFF00', letterSpacing: '0.08em' }}>APEX</span>
                <div className="flex gap-4 ml-4">
                  {['SIGNALS','CHARTS','TRACK RECORD','CIPHER'].map(t => (
                    <span key={t} style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: t === 'SIGNALS' ? '#00D4FF' : 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', cursor: 'default' }}>{t}</span>
                  ))}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00E879', boxShadow: '0 0 6px #00E879', display: 'block' }} />
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>MARKET OPEN</span>
                </div>
              </div>

              {/* Signal list */}
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {MOCK_SIGNALS.map((sig, i) => (
                  <motion.div
                    key={sig.ticker}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '10px 14px',
                      background: `${sig.color}06`,
                      border: `1px solid ${sig.color}18`,
                      borderLeft: `2px solid ${sig.color}`,
                      borderRadius: 2,
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 800, color: '#fff', minWidth: 52 }}>{sig.ticker}</span>
                    <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: sig.color, letterSpacing: '0.1em', minWidth: 100 }}>{sig.verdict}</span>
                    <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${sig.confidence}%`, background: sig.color, borderRadius: 2, opacity: 0.7 }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'rgba(255,255,255,0.45)', minWidth: 36 }}>{sig.confidence}%</span>
                    <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: sig.color, minWidth: 48, textAlign: 'right' }}>{sig.change}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — BENTO FEATURES
// ─────────────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Brain,
    title: 'AI Signal Engine',
    desc: 'Claude AI synthesizes all market data into a single STRONG BUY → STRONG AVOID verdict with full reasoning.',
    color: '#00E879',
    size: 'large',
  },
  {
    icon: Activity,
    title: 'Options Flow / UOA',
    desc: 'Detect unusual options activity the moment it happens. Sweeps, blocks, dark pool prints.',
    color: '#9D6FFF',
    size: 'normal',
  },
  {
    icon: BarChart3,
    title: 'Advanced Charting',
    desc: '50+ overlays. TradingView-grade charts. Pattern recognition built in.',
    color: '#00D4FF',
    size: 'normal',
  },
  {
    icon: Shield,
    title: 'Track Record',
    desc: 'Every signal logged, every outcome tracked. Full transparency on accuracy.',
    color: '#CCFF00',
    size: 'normal',
  },
  {
    icon: Globe,
    title: 'Market Regime',
    desc: 'Macro context engine. Knows when to be aggressive vs defensive.',
    color: '#FFB800',
    size: 'normal',
  },
  {
    icon: Bot,
    title: 'CIPHER Agent',
    desc: 'Your personal AI analyst. Ask anything. Get institutional-grade answers.',
    color: '#00D4FF',
    size: 'normal',
  },
]

function BentoFeatures() {
  return (
    <section className="relative py-28 md:py-40" style={{ background: 'var(--bg-deep)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ fontFamily: 'var(--font-data)', fontSize: 10, letterSpacing: '0.22em', color: '#CCFF00', display: 'block', marginBottom: 14 }}
          >
            PLATFORM FEATURES
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-display font-black tracking-tighter"
            style={{ fontSize: 'clamp(2.2rem, 4.5vw, 4.5rem)', color: '#fff', lineHeight: 0.92 }}
          >
            Everything you need.<br />
            <span style={{ color: 'rgba(255,255,255,0.20)', WebkitTextStroke: '1px rgba(255,255,255,0.20)' }}>
              Nothing you don't.
            </span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className={`group relative p-6 cursor-pointer ${i === 0 ? 'lg:col-span-2' : ''}`}
              style={{
                background: `${f.color}06`,
                border: `1px solid ${f.color}18`,
                borderRadius: 3,
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${f.color}40`
                e.currentTarget.style.background = `${f.color}0D`
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 8px 40px ${f.color}12`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = `${f.color}18`
                e.currentTarget.style.background = `${f.color}06`
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <HudCorners color={f.color} size={10} thickness={1} />
              <div className="flex items-start gap-4">
                <div
                  style={{
                    width: 42, height: 42, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${f.color}12`,
                    border: `1px solid ${f.color}28`,
                    borderRadius: 2,
                  }}
                >
                  <f.icon size={20} color={f.color} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8, letterSpacing: '0.04em' }}>
                    {f.title}
                  </h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.42)', lineHeight: 1.6 }}>
                    {f.desc}
                  </p>
                </div>
              </div>
              {i === 0 && (
                <div className="mt-6 flex items-center gap-2" style={{ color: f.color }}>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, letterSpacing: '0.14em' }}>EXPLORE ENGINE</span>
                  <ChevronRight size={12} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — PRICING
// ─────────────────────────────────────────────────────────────────────────────
const TIERS = [
  {
    name: 'FREE',
    price: '$0',
    period: '/mo',
    color: 'rgba(255,255,255,0.40)',
    borderColor: 'rgba(255,255,255,0.08)',
    bgColor: 'rgba(255,255,255,0.02)',
    features: ['5 signals/day', '1 asset class', 'Basic indicators', 'Community access'],
    cta: 'Get Started',
    ctaTo: '/signup',
    featured: false,
  },
  {
    name: 'EDGE',
    price: '$29',
    period: '/mo',
    color: 'rgba(255,255,255,0.65)',
    borderColor: 'rgba(255,255,255,0.14)',
    bgColor: 'rgba(255,255,255,0.04)',
    features: ['50 signals/day', '3 asset classes', 'All indicators', 'Options flow data', 'Email alerts'],
    cta: 'Start Edge',
    ctaTo: '/signup',
    featured: false,
  },
  {
    name: 'ALPHA',
    price: '$79',
    period: '/mo',
    color: '#00D4FF',
    borderColor: 'rgba(0,212,255,0.28)',
    bgColor: 'rgba(0,212,255,0.04)',
    features: ['Unlimited signals', 'All asset classes', 'PRISM multi-timeframe', 'Real-time UOA alerts', 'Morning brief', 'Priority support'],
    cta: 'Go Alpha',
    ctaTo: '/signup',
    featured: true,
    badge: 'MOST POPULAR',
  },
  {
    name: 'APEX',
    price: '$149',
    period: '/mo',
    color: '#CCFF00',
    borderColor: 'rgba(204,255,0,0.28)',
    bgColor: 'rgba(204,255,0,0.04)',
    features: ['Everything in ALPHA', 'CIPHER AI agent', 'Portfolio analysis', 'Custom screeners', 'API access', 'Dedicated analyst'],
    cta: 'Go APEX',
    ctaTo: '/signup',
    featured: false,
  },
]

function PricingSection() {
  return (
    <section className="relative py-28 md:py-40" style={{ background: 'var(--bg-void)' }}>
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(204,255,0,0.03) 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ fontFamily: 'var(--font-data)', fontSize: 10, letterSpacing: '0.22em', color: '#CCFF00', display: 'block', marginBottom: 14 }}
          >
            PRICING
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-display font-black tracking-tighter"
            style={{ fontSize: 'clamp(2.2rem, 4.5vw, 4.5rem)', color: '#fff', lineHeight: 0.92 }}
          >
            Your edge level.
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TIERS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="relative flex flex-col"
              style={{
                background: t.bgColor,
                border: `1px solid ${t.borderColor}`,
                borderRadius: 3,
                padding: 24,
                ...(t.featured ? { boxShadow: `0 0 40px rgba(0,212,255,0.10)` } : {}),
              }}
            >
              {t.featured && (
                <div
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#00D4FF',
                    color: '#000',
                    fontFamily: 'var(--font-display)',
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    padding: '3px 12px',
                    borderRadius: 2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.badge}
                </div>
              )}

              <HudCorners color={t.color} size={10} thickness={1} />

              <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 800, color: t.color, letterSpacing: '0.14em', marginBottom: 16 }}>
                {t.name}
              </span>

              <div className="flex items-end gap-1 mb-6">
                <span className="font-display font-black" style={{ fontSize: '2.6rem', lineHeight: 1, color: '#fff' }}>{t.price}</span>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>{t.period}</span>
              </div>

              <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                {t.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircle2 size={13} color={t.color} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={t.ctaTo}
                className="flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  background: t.featured ? '#00D4FF' : 'transparent',
                  color: t.featured ? '#000' : t.color,
                  border: `1px solid ${t.borderColor}`,
                  borderRadius: 2,
                  padding: '11px 0',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  if (!t.featured) {
                    e.currentTarget.style.background = `${t.color}12`
                    e.currentTarget.style.borderColor = t.color
                  } else {
                    e.currentTarget.style.boxShadow = `0 0 20px rgba(0,212,255,0.35)`
                  }
                }}
                onMouseLeave={e => {
                  if (!t.featured) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = t.borderColor
                  } else {
                    e.currentTarget.style.boxShadow = 'none'
                  }
                }}
              >
                {t.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
          style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}
        >
          No contracts. Cancel anytime. 7-day free trial on all paid plans.
        </motion.p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — FINAL CTA (with RadialShader bg)
// ─────────────────────────────────────────────────────────────────────────────
function CtaSection() {
  return (
    <section
      className="relative overflow-hidden py-32 md:py-48"
      style={{ background: '#000' }}
    >
      {/* RadialShader background */}
      <div className="absolute inset-0" style={{ opacity: 0.35 }}>
        <RadialShader />
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #000 0%, transparent 20%, transparent 80%, #000 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #000 0%, transparent 20%, transparent 80%, #000 100%)' }} />

      <Scanlines />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          style={{ fontFamily: 'var(--font-data)', fontSize: 10, letterSpacing: '0.24em', color: '#CCFF00', display: 'block', marginBottom: 20 }}
        >
          YOUR EDGE STARTS HERE
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="font-display font-black tracking-tighter"
          style={{ fontSize: 'clamp(3rem, 7vw, 7rem)', lineHeight: 0.9, marginBottom: 24 }}
        >
          <span style={{ color: '#fff' }}>Stop guessing.</span><br />
          <span
            style={{
              background: 'linear-gradient(135deg, #CCFF00 0%, #00D4FF 55%, #9D6FFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Start knowing.
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'rgba(255,255,255,0.42)', maxWidth: 480, margin: '0 auto 2.5rem', lineHeight: 1.7 }}
        >
          Join thousands of traders who use APEX to cut through market noise.
          Your first signals are free — no credit card required.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/signup"
            className="flex items-center gap-2.5 cursor-pointer"
            style={{
              background: '#CCFF00',
              color: '#000',
              borderRadius: 2,
              padding: '16px 40px',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: '0.12em',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 40px rgba(204,255,0,0.50)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
          >
            GET STARTED FREE
            <ArrowRight size={15} />
          </Link>

          <Link
            to="/pricing"
            className="flex items-center gap-2 cursor-pointer"
            style={{
              background: 'transparent',
              color: 'rgba(255,255,255,0.50)',
              fontFamily: 'var(--font-data)',
              fontSize: 11,
              letterSpacing: '0.14em',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.50)' }}
          >
            SEE ALL PLANS
            <ChevronRight size={12} />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function Footer() {
  const COLS = [
    {
      label: 'Platform',
      links: [
        { to: '/dashboard', label: 'Signals' },
        { to: '/charts',    label: 'Charts' },
        { to: '/track-record', label: 'Track Record' },
        { to: '/agent',     label: 'CIPHER Agent' },
        { to: '/pricing',   label: 'Pricing' },
      ],
    },
    {
      label: 'Account',
      links: [
        { to: '/signup', label: 'Sign Up' },
        { to: '/login',  label: 'Login' },
        { to: '/account', label: 'Settings' },
      ],
    },
    {
      label: 'Legal',
      links: [
        { to: '/privacy',       label: 'Privacy Policy' },
        { to: '/terms',         label: 'Terms of Service' },
        { to: '/risk-disclosure', label: 'Risk Disclosure' },
        { to: '/disclaimer',    label: 'Disclaimer' },
      ],
    },
  ]

  return (
    <footer style={{ background: 'var(--bg-void)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '60px 0 40px' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-display font-black" style={{ fontSize: 18, color: '#CCFF00', letterSpacing: '0.06em' }}>APEX</span>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em', marginTop: 2 }}>DECISION ENGINE</span>
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.32)', lineHeight: 1.65, maxWidth: 220 }}>
              Five layers of market intelligence. One decisive signal. Built for traders who demand an edge.
            </p>
            <div className="flex items-center gap-2 mt-5">
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00E879', boxShadow: '0 0 6px #00E879', display: 'block', animation: 'dataPulse 2s ease-in-out infinite' }} />
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.14em' }}>SYSTEMS OPERATIONAL</span>
            </div>
          </div>

          {/* Nav columns */}
          {COLS.map(col => (
            <div key={col.label}>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, letterSpacing: '0.20em', color: 'rgba(255,255,255,0.28)', display: 'block', marginBottom: 14 }}>
                {col.label.toUpperCase()}
              </span>
              <ul className="flex flex-col gap-2.5">
                {col.links.map(l => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
        >
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.12em' }}>
            © 2025 APEX DECISION ENGINE. NOT FINANCIAL ADVICE.
          </span>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.10em' }}>
            v2.0.0 · POWERED BY CLAUDE AI
          </span>
        </div>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div style={{ background: 'var(--bg-void)', overflowX: 'hidden' }}>
      <HeroSection />
      <StatsStrip />
      <IntelligenceSection />
      <ShaderDivider />
      <PlatformPreview />
      <BentoFeatures />
      <PricingSection />
      <CtaSection />
      <Footer />
    </div>
  )
}
