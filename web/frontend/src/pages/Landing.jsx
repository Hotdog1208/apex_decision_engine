import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { BarChart3, MessageCircle, Bell, TrendingUp, Shield, Zap } from 'lucide-react'
import MagneticButton from '../components/MagneticButton'
import GlitchText from '../components/GlitchText'

function StaticNoiseVideo() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-screen overflow-hidden z-0">
      <div
        className="absolute inset-0 w-[200%] h-[200%] -top-[50%] -left-[50%]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          animation: 'noise-anim 0.2s infinite linear'
        }}
      />
      <style>{`
        @keyframes noise-anim {
          0% { transform: translate(0,0) }
          10% { transform: translate(-5%,-5%) }
          20% { transform: translate(-10%,5%) }
          30% { transform: translate(5%,-10%) }
          40% { transform: translate(-5%,15%) }
          50% { transform: translate(-10%,5%) }
          60% { transform: translate(15%,0) }
          70% { transform: translate(0,15%) }
          80% { transform: translate(3%,35%) }
          90% { transform: translate(-10%,10%) }
          100% { transform: translate(0,0) }
        }
      `}</style>
    </div>
  )
}

function GridShatterLayer() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="absolute top-[10%] left-[20%] w-[1px] h-[80%] bg-apex-pink/20 rotate-12" />
      <div className="absolute top-[30%] right-[15%] w-[80%] h-[1px] bg-apex-cyan/20 -rotate-6" />
      <div className="absolute bottom-[20%] left-[-10%] w-[120%] h-[2px] bg-apex-accent/10 rotate-3" />
      {/* Intense pulsing orb */}
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-apex-pink/10 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[5000ms]" />
      <div className="absolute top-[60%] left-[30%] w-[600px] h-[600px] bg-apex-cyan/10 rounded-full blur-[100px] mix-blend-screen animate-pulse duration-[7000ms]" />
    </div>
  )
}

function MarqueeBackground({ text, speed = 20, direction = 'left', className = '' }) {
  return (
    <div className={`overflow-hidden whitespace-nowrap pointer-events-none opacity-5 ${className}`}>
      <div className={`inline-block animate-marquee ${direction === 'right' ? 'animate-marquee-reverse' : ''}`} style={{ animationDuration: `${speed}s` }}>
        {Array(10).fill(text).map((t, i) => (
          <span key={i} className="mx-8">{t}</span>
        ))}
      </div>
      <style>{`
        @keyframes marquee-reverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-reverse {
          animation-name: marquee-reverse;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  )
}

function ParallaxTitle() {
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 1000], [0, 300])
  const y2 = useTransform(scrollY, [0, 1000], [0, -200])
  const y3 = useTransform(scrollY, [0, 1000], [0, 100])
  const rotate = useTransform(scrollY, [0, 1000], [0, 5])

  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 }
  const smoothY1 = useSpring(y1, springConfig)
  const smoothY2 = useSpring(y2, springConfig)
  const smoothY3 = useSpring(y3, springConfig)
  const smoothRotate = useSpring(rotate, springConfig)

  return (
    <div className="relative h-[80vh] flex items-center justify-center -mt-20 z-10 w-full overflow-hidden">
      <motion.div style={{ y: smoothY1, rotate: smoothRotate }} className="absolute text-[clamp(8rem,25vw,30rem)] font-display font-black text-apex-pink/40 blur-[4px] select-none -translate-x-[5%] -translate-y-[10%] mix-blend-screen">
        APEX
      </motion.div>
      <motion.div style={{ y: smoothY2 }} className="absolute text-[clamp(8rem,25vw,30rem)] font-display font-black text-apex-cyan/40 blur-[2px] select-none translate-x-[5%] translate-y-[15%] mix-blend-screen">
        APEX
      </motion.div>
      <motion.div style={{ y: smoothY3 }} className="absolute z-10 text-[clamp(8rem,25vw,30rem)] font-display font-black text-white select-none mix-blend-overlay glitch-layer" data-text="APEX">
        APEX
      </motion.div>

      {/* The true layered text that sits sharp on top */}
      <h1 className="z-20 text-[clamp(8rem,25vw,30rem)] font-display font-black text-transparent select-none" style={{ WebkitTextStroke: '2px var(--accent-primary)' }}>
        APEX
      </h1>

      <div className="absolute bottom-[15%] left-[5%] z-30 transform -rotate-90 origin-bottom-left text-xs font-data uppercase tracking-[0.5em] text-apex-cyan">
        Sys // Initialize V.9.4.0
      </div>
      <div className="absolute top-[20%] right-[5%] z-30 text-xs font-data uppercase tracking-[0.5em] text-apex-pink/50 writing-vertical-rl">
        Decentralized Decision Engine
      </div>
    </div>
  )
}

function HeroSection() {
  return (
    <section className="min-h-screen relative overflow-hidden pt-16 border-b border-white/5">
      <StaticNoiseVideo />
      <GridShatterLayer />

      <div className="absolute top-0 w-full pt-10 flex flex-col gap-4 z-0">
        <MarqueeBackground text="WELCOME TO THE VOID" speed={40} className="text-8xl font-black font-display text-white" />
        <MarqueeBackground text="SYSTEM OVERRIDE INITIATED" speed={30} direction="right" className="text-6xl font-black font-display text-transparent" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)' }} />
      </div>

      <ParallaxTitle />

      <div className="relative z-30 max-w-[1400px] mx-auto px-4 pb-24 grid md:grid-cols-2 gap-12 items-end">
        <div className="space-y-8">
          <GlitchText as="h2" text="The platform for traders." className="text-4xl md:text-6xl font-display font-bold text-white leading-[1.1] tracking-tighter mix-blend-difference" />
          <p className="text-lg md:text-xl font-data text-white/60 max-w-lg border-l-4 border-apex-accent pl-6 leading-relaxed bg-gradient-to-r from-apex-accent/10 to-transparent py-4">
            Signals, risk, and execution prep—one chaotic, overpowering place. <strong className="text-apex-accent font-bold">You are now jacked in.</strong>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-6 md:justify-end pb-8">
          <Link to="/dashboard" className="group">
            <div className="relative px-8 py-4 bg-apex-accent text-black font-data font-bold uppercase tracking-widest text-sm hover:bg-white transition-colors">
              <span className="relative z-10 flex items-center gap-3"><Zap size={18} className="group-hover:animate-pulse" /> Initialize</span>
              <div className="absolute inset-0 border border-apex-accent scale-105 group-hover:scale-110 group-hover:border-white transition-transform opacity-50" />
            </div>
          </Link>
          <Link to="/chat" className="group">
            <div className="relative px-8 py-4 border border-apex-cyan text-apex-cyan font-data font-bold uppercase tracking-widest text-sm hover:bg-apex-cyan hover:text-black transition-colors mix-blend-screen shadow-[inset_0_0_20px_rgba(0,240,255,0.1)] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)]">
              <span className="relative z-10">AI Assist</span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}

function FeatureBlock({ feature, index }) {
  // Shattered grid logic: alternate between different crazy rotations and positions
  const isEven = index % 2 === 0
  const transformClasses = isEven
    ? `md:translate-y-12 md:translate-x-[-10px] md:rotate-[-2deg]`
    : `md:-translate-y-8 md:translate-x-[20px] md:rotate-[3deg]`

  const hoverColor = isEven ? 'var(--accent-pink)' : 'var(--accent-cyan)'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 50 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, type: 'spring', bounce: 0.4, delay: index * 0.1 }}
      className={`relative group cyber-panel p-8 backdrop-blur-md overflow-hidden ${transformClasses}`}
    >
      {/* Glitch hover background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ mixBlendMode: 'overlay' }} />
      <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 animate-[glitch-anim_2s_infinite] pointer-events-none" style={{ color: hoverColor }} />

      <div className="relative z-10">
        <div className="text-apex-accent mb-6 transform group-hover:scale-125 transition-transform duration-500 group-hover:animate-pulse">
          {feature.icon}
        </div>
        <h3 className="text-2xl font-display font-bold text-white mb-4 tracking-tight" style={{ textShadow: `0 0 10px ${hoverColor}` }}>
          {feature.title}
        </h3>
        <p className="text-white/60 font-body text-sm leading-relaxed border-l border-white/10 pl-4 group-hover:border-current transition-colors" style={{ borderColor: 'inherit' }}>
          {feature.desc}
        </p>
      </div>

      <div className="absolute top-0 right-0 p-4 text-[10px] font-data text-white/20 select-none">
        0{index + 1}
      </div>
    </motion.div>
  )
}

const FEATURES = [
  {
    title: 'AI Intel Node',
    desc: 'Ask about any trade, get technical and options analysis. Confidence-scored answers, not financial advice. Pure data.',
    icon: <MessageCircle size={32} />,
  },
  {
    title: 'Decision Engine Core',
    desc: 'Multi-asset signals, regime detection, and scored trade ideas. Stocks, options, futures—one framework to rule the market.',
    icon: <BarChart3 size={32} />,
  },
  {
    title: 'Pulse Scanning',
    desc: 'Breakouts, reversals, unusual flow. Configure what you care about; we notify when it happens in milliseconds.',
    icon: <Bell size={32} />,
  },
  {
    title: 'Performance Matrix',
    desc: 'PnL, Sharpe, drawdown, win rate. Track hypothetical or logged trades and calibrate over time. No hiding from the numbers.',
    icon: <TrendingUp size={32} />,
  },
  {
    title: 'Risk Guardrails',
    desc: 'Position and portfolio limits, volatility-adjusted sizing. True intelligence operates within calculated parameters.',
    icon: <Shield size={32} />,
  },
  {
    title: 'Direct Execution Link',
    desc: 'Optional API links for live quotes and chains. You place orders where you already trade. We just give you the edge.',
    icon: <Zap size={32} />,
  },
]

export default function Landing() {
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.05], [0, 1])

  return (
    <div className="bg-transparent pb-32">
      <HeroSection />

      {/* Extreme Stats / value strip */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="w-full relative z-20 border-b border-t border-apex-accent/30 bg-black/80 backdrop-blur-2xl py-6 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0JyBoZWlnaHQ9JzQnPjxyZWN0IHdpZHRoPSc0JyBoZWlnaHQ9JzQnIGZpbGw9JyNjY2ZmMDAnIGZpbGwtb3BhY2l0eT0nMC4wNScvPjwvc3ZnPg==')] pointer-events-none mix-blend-screen" />
        <div className="max-w-[1400px] mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-left divide-x divide-apex-accent/20">
          <div className="pl-4">
            <h4 className="text-apex-accent font-data font-black text-3xl tracking-tighter shadow-apex-accent drop-shadow-[0_0_15px_rgba(204,255,0,0.5)]">Signals</h4>
            <p className="text-white/40 text-[10px] font-data uppercase tracking-widest mt-1">Scored ideas</p>
          </div>
          <div className="pl-8">
            <h4 className="text-apex-pink font-data font-black text-3xl tracking-tighter drop-shadow-[0_0_15px_rgba(255,0,60,0.5)]">Multi-asset</h4>
            <p className="text-white/40 text-[10px] font-data uppercase tracking-widest mt-1">Stocks, options</p>
          </div>
          <div className="pl-8 hidden md:block">
            <h4 className="text-apex-cyan font-data font-black text-3xl tracking-tighter drop-shadow-[0_0_15px_rgba(0,240,255,0.5)]">Risk-aware</h4>
            <p className="text-white/40 text-[10px] font-data uppercase tracking-widest mt-1">Limits & sizing</p>
          </div>
          <div className="pl-8 hidden md:block">
            <h4 className="text-white font-data font-black text-3xl tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">Your Broker</h4>
            <p className="text-white/40 text-[10px] font-data uppercase tracking-widest mt-1">You execute</p>
          </div>
        </div>
      </motion.section>

      <section className="max-w-[1400px] mx-auto px-4 pt-32 relative">
        {/* Background typographic noise for the features section */}
        <div className="absolute top-[20%] right-[-10%] text-[40vh] font-display font-black text-white/5 whitespace-nowrap -rotate-90 pointer-events-none user-select-none mix-blend-overlay">
          FEATURES
        </div>

        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="mb-24 cyber-panel p-8 max-w-3xl border-l-[4px] border-l-apex-loss bg-gradient-to-r from-apex-loss/10 to-transparent relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-apex-loss/20 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" />
          <h3 className="text-apex-loss font-data font-bold uppercase tracking-[0.2em] text-xs mb-3 flex items-center gap-2">
            <Shield size={14} /> Critical Warning
          </h3>
          <p className="text-white/80 text-sm md:text-base font-body leading-relaxed">
            <strong className="text-white font-bold">ADE does not execute trades.</strong> We analyze markets in real-time, score ideas, and output probability vectors—but you define the final execution protocol on your broker. No custody, no order routing. Pure analysis.
          </p>
        </motion.div>

        <div className="flex flex-col md:flex-row justify-between items-end mb-16 relative z-10">
          <GlitchText as="h2" text="System Capabilities" className="text-5xl md:text-7xl font-display font-black text-white tracking-tighter" />
          <div className="text-right font-data text-white/30 text-xs mt-4 md:mt-0 uppercase tracking-widest border-b border-white/20 pb-2">
            Modules loaded: 06 // Operational
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12 relative z-10">
          {FEATURES.map((f, i) => (
            <FeatureBlock key={f.title} feature={f} index={i} />
          ))}
        </div>
      </section>

      {/* Visual: charts in action - Over-engineered section */}
      <section className="relative mt-40 border-y border-white/10 overload-section overflow-hidden">
        <div className="absolute inset-0 bg-apex-cyan/5 mix-blend-color-dodge z-0 pointer-events-none" />
        <div className="max-w-[1400px] mx-auto px-4 py-32 relative z-10">
          <div className="relative aspect-auto md:aspect-[21/9] border-[1px] border-apex-cyan/50 bg-black overflow-hidden group shadow-[0_0_50px_rgba(0,240,255,0.1)]">

            {/* The fake "UI" layer inside the promo box */}
            <div className="absolute inset-x-0 top-0 h-8 border-b border-white/10 bg-white/5 flex items-center px-4 gap-2">
              <div className="w-2 h-2 rounded-full bg-apex-loss" />
              <div className="w-2 h-2 rounded-full bg-apex-warning" />
              <div className="w-2 h-2 rounded-full bg-apex-profit" />
              <div className="ml-4 font-data text-[10px] text-white/50 tracking-widest uppercase">Visual.Terminal.exe</div>
            </div>

            <img
              src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600"
              alt="Trading charts"
              className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale group-hover:grayscale-0 group-hover:scale-105 group-hover:opacity-50 transition-all duration-1000 mt-8"
              style={{ filter: 'contrast(1.2) sepia(0.5) hue-rotate(180deg)' }}
            />

            {/* Scanlines inside the promo box */}
            <div className="absolute inset-0 mt-8 scanlines pointer-events-none opacity-50" />

            <div className="absolute inset-0 mt-8 flex items-center justify-center p-8 text-center bg-gradient-to-t from-black via-black/50 to-transparent">
              <div className="max-w-xl backdrop-blur-md bg-black/40 border border-white/10 p-8 transform group-hover:-translate-y-2 transition-transform duration-500">
                <GlitchText as="h2" text="Terminal Grade" className="text-3xl md:text-5xl font-display font-black text-white mb-4 tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                <p className="text-white/80 font-body text-sm md:text-base mb-8 leading-relaxed shadow-black">
                  TradingView-grade charts, sentiment algorithms, news clustering, and economic anomalies visualized on a single dark fiber line.
                </p>
                <Link to="/charts">
                  <MagneticButton className="!bg-apex-cyan !text-black !border-transparent hover:!bg-white shadow-[0_0_20px_rgba(0,240,255,0.4)]">
                    <span className="flex items-center gap-3 font-data font-bold uppercase tracking-wider text-sm"><BarChart3 size={16} /> Access Terminal</span>
                  </MagneticButton>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[800px] mx-auto px-4 py-40 relative z-20 text-center">
        <div className="absolute -inset-40 bg-radial-gradient from-apex-accent/10 to-transparent blur-3xl pointer-events-none" />
        <h2 className="text-4xl md:text-7xl font-display font-black text-white mb-6 tracking-tighter">Enter the grid.</h2>
        <p className="text-white/60 font-body text-lg mb-12">System architecture primed. Awaiting user input.</p>
        <Link to="/dashboard">
          <div className="inline-block">
            <MagneticButton className="scale-125 !px-12 !py-6 !text-lg !bg-white !text-black hover:!bg-apex-accent shadow-[0_20px_50px_rgba(255,255,255,0.2)]">
              Initialize App
            </MagneticButton>
          </div>
        </Link>
      </section>

      <footer className="border-t border-white/5 relative bg-black pt-16 pb-8 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPjxyZWN0IHdpZHRoPSc4JyBoZWlnaHQ9JzgnIGZpbGw9JyNmZmZmZmYnIGZpbGwtb3BhY2l0eT0nMC4wMicvPjwvc3ZnPg==')] pointer-events-none" />
        <div className="max-w-[1400px] mx-auto px-4 grid md:grid-cols-3 gap-12 relative z-10">
          <div>
            <h3 className="text-2xl font-display font-black text-white tracking-tighter mb-4">APEX ENGINE</h3>
            <p className="text-white/40 text-xs font-data uppercase tracking-widest leading-loose">
              Intelligence only.<br />
              Not a broker.<br />
              SYS V.9.4.0
            </p>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-x-12 gap-y-6">
            <div className="flex flex-col gap-3">
              <span className="text-apex-accent font-data text-[10px] uppercase tracking-widest">Portal</span>
              <Link to="/dashboard" className="text-white/60 hover:text-white font-body text-sm transition-colors">App</Link>
              <Link to="/login" className="text-white/60 hover:text-white font-body text-sm transition-colors">Auth</Link>
              <Link to="/signup" className="text-white/60 hover:text-white font-body text-sm transition-colors">Init</Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-apex-cyan font-data text-[10px] uppercase tracking-widest">Modules</span>
              <Link to="/chat" className="text-white/60 hover:text-white font-body text-sm transition-colors">AI Assist</Link>
              <Link to="/charts" className="text-white/60 hover:text-white font-body text-sm transition-colors">Visuals</Link>
              <Link to="/settings" className="text-white/60 hover:text-white font-body text-sm transition-colors">System CFG</Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-apex-pink font-data text-[10px] uppercase tracking-widest">Legal.Doc</span>
              <Link to="/privacy" className="text-white/60 hover:text-white font-body text-sm transition-colors">Privacy Protocol</Link>
              <Link to="/terms" className="text-white/60 hover:text-white font-body text-sm transition-colors">Terms of Service</Link>
              <Link to="/risk-disclosure" className="text-white/60 hover:text-white font-body text-sm transition-colors">Risk Disclosure</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
