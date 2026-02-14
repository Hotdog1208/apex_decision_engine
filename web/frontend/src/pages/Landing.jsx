import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { BarChart3, MessageCircle, Bell, TrendingUp, Shield, Zap } from 'lucide-react'
import MagneticButton from '../components/MagneticButton'

const easing = [0.16, 1, 0.3, 1]

function AnimatedGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20">
      <AnimatedGrid />
      <div className="z-10 text-center px-4 max-w-5xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easing }}
          className="text-[clamp(4rem,15vw,10rem)] font-display font-bold leading-[0.9] tracking-tighter text-white"
          style={{ letterSpacing: '-0.04em' }}
        >
          APEX
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-xl md:text-2xl text-white/60 mt-6 max-w-2xl mx-auto"
        >
          Trading Intelligence. Redefined.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-12 flex flex-wrap gap-4 justify-center"
        >
          <Link to="/dashboard">
            <MagneticButton>Get Started</MagneticButton>
          </Link>
          <Link to="/chat">
            <MagneticButton variant="secondary">Try the Assistant</MagneticButton>
          </Link>
        </motion.div>
      </div>
      {/* Subtle gradient orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-apex-accent/5 blur-3xl pointer-events-none" />
    </section>
  )
}

function FeatureBlock({ feature, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 80 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 80 }}
      transition={{ duration: 0.7, ease: easing }}
      whileHover={{ y: -4, borderColor: 'rgba(204,255,0,0.3)' }}
      className="rounded-2xl border border-white/10 p-8 bg-white/5 transition-colors duration-300"
    >
      <div className="text-apex-accent mb-4">{feature.icon}</div>
      <h3 className="text-xl font-display font-semibold text-white mb-2">{feature.title}</h3>
      <p className="text-white/60 text-sm leading-relaxed">{feature.desc}</p>
    </motion.div>
  )
}

const FEATURES = [
  {
    title: 'AI Trading Assistant',
    desc: 'Ask about any trade, get technical and options analysis, run ADE scans. Confidence-scored answers, not financial advice.',
    icon: <MessageCircle size={40} />,
  },
  {
    title: 'Decision Engine',
    desc: 'Multi-asset signals, regime detection, and scored trade ideas. Stocks, options, futures—one framework.',
    icon: <BarChart3 size={40} />,
  },
  {
    title: 'Alerts & Scanning',
    desc: 'Breakouts, reversals, unusual flow. Configure what you care about; we notify when it happens.',
    icon: <Bell size={40} />,
  },
  {
    title: 'Analytics & Performance',
    desc: 'PnL, Sharpe, drawdown, win rate. Track hypothetical or logged trades and calibrate over time.',
    icon: <TrendingUp size={40} />,
  },
  {
    title: 'Risk & Limits',
    desc: 'Position and portfolio limits, volatility-adjusted sizing. Intelligence with guardrails.',
    icon: <Shield size={40} />,
  },
  {
    title: 'Your broker, your execution',
    desc: 'Optional E*TRADE (or other) data for live quotes and chains. You place orders where you already trade.',
    icon: <Zap size={40} />,
  },
]

export default function Landing() {
  const { scrollYProgress } = useScroll()
  const navOpacity = useTransform(scrollYProgress, [0, 0.1], [0.8, 1])

  return (
    <div className="min-h-screen bg-apex-darker">
      <motion.nav
        style={{ opacity: navOpacity }}
        className="border-b border-white/10 bg-apex-darker/90 backdrop-blur-xl sticky top-0 z-50"
      >
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          <span className="text-xl font-display font-bold text-apex-accent tracking-tight">APEX</span>
          <Link to="/dashboard">
            <MagneticButton>Open App</MagneticButton>
          </Link>
        </div>
      </motion.nav>

      <HeroSection />

      <section className="max-w-6xl mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-24"
        >
          <p className="text-white/70 text-center text-sm">
            <strong className="text-white">ADE does not execute trades.</strong> We analyze markets, score ideas, and recommend—you execute on your broker. No custody, no order routing.
          </p>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-display font-bold text-white text-center mb-16 tracking-tight"
        >
          What you get
        </motion.h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <FeatureBlock key={f.title} feature={f} index={i} />
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-24 border-t border-white/10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl font-display font-bold text-white mb-4 tracking-tight">Ready to trade smarter?</h2>
          <p className="text-white/60 mb-8">Open the app and run your first analysis.</p>
          <Link to="/dashboard">
            <MagneticButton>Open Dashboard</MagneticButton>
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-white/10 mt-24">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-white/40 text-sm">Apex Decision Engine — Intelligence only. Not a broker.</span>
          <div className="flex flex-wrap gap-6 text-sm">
            <Link to="/dashboard" className="text-white/50 hover:text-apex-accent transition-colors">App</Link>
            <Link to="/login" className="text-white/50 hover:text-apex-accent transition-colors">Sign in</Link>
            <Link to="/signup" className="text-white/50 hover:text-apex-accent transition-colors">Sign up</Link>
            <Link to="/chat" className="text-white/50 hover:text-apex-accent transition-colors">Chat</Link>
            <Link to="/settings" className="text-white/50 hover:text-apex-accent transition-colors">Settings</Link>
            <Link to="/privacy" className="text-white/50 hover:text-apex-accent transition-colors">Privacy</Link>
            <Link to="/terms" className="text-white/50 hover:text-apex-accent transition-colors">Terms</Link>
            <Link to="/risk-disclosure" className="text-white/50 hover:text-apex-accent transition-colors">Risk Disclosure</Link>
            <Link to="/disclaimer" className="text-white/50 hover:text-apex-accent transition-colors">Disclaimer</Link>
            <Link to="/glossary" className="text-white/50 hover:text-apex-accent transition-colors">Glossary</Link>
            <Link to="/faq" className="text-white/50 hover:text-apex-accent transition-colors">FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
