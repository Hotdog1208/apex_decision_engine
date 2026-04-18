import { motion } from 'framer-motion'
import { Lock, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageWrapper from '../components/PageWrapper'

export default function ComingSoon() {
  return (
    <PageWrapper>
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-lg mx-auto"
        >
          {/* Decorative lock icon */}
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-8">
            <div className="absolute inset-0 border border-apex-accent/30 rotate-45" />
            <div className="absolute inset-2 border border-apex-cyan/20 rotate-45" />
            <Lock size={32} className="text-apex-accent relative z-10" />
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-black text-white tracking-tighter mb-4">
            Coming Soon
          </h1>

          <p className="text-white/50 font-data text-sm uppercase tracking-widest mb-2">
            Module Locked // Pending Deployment
          </p>

          <p className="text-white/40 font-body text-base leading-relaxed mb-10 max-w-md mx-auto">
            This feature is under development and will be available in a future release.
            Return to the signal hub to view active AI analysis.
          </p>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-3 px-8 py-4 bg-apex-accent text-black font-data font-bold uppercase tracking-widest text-xs hover:bg-white transition-all group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Back to Signal Hub
          </Link>

          {/* Decorative corner brackets */}
          <div className="mt-16 relative inline-block px-6 py-3 border border-white/5">
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-apex-cyan/30" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-apex-cyan/30" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-apex-cyan/30" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-apex-cyan/30" />
            <p className="text-white/20 font-data text-[10px] uppercase tracking-[0.3em]">
              ADE // MVP Phase 1
            </p>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  )
}
