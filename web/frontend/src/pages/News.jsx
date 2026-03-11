import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Newspaper, FileText, ExternalLink, TrendingDown, Minus, TrendingUp, Radio, AlertTriangle } from 'lucide-react'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'
import SkeletonLoader from '../components/SkeletonLoader'
import EmbedFinvizNews from '../components/EmbedFinvizNews'
import GlitchText from '../components/GlitchText'

// Background static specifically for the news page
function DataStaticBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] opacity-10 mix-blend-screen overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0JyBoZWlnaHQ9JzQnPjxyZWN0IHdpZHRoPSc0JyBoZWlnaHQ9JzQnIGZpbGw9JyNmZmYnIGZpbGwtb3BhY2l0eT0nMScvPjwvc3ZnPg==')] opacity-20" />
      <div className="absolute top-0 right-[10%] w-[1px] h-full bg-apex-pink/50 blur-[2px]" />
      <div className="absolute top-0 right-[10%] w-[1px] h-full bg-apex-pink" />
      <div className="absolute top-[30%] left-[-10%] w-[120%] h-[1px] bg-apex-cyan/20 rotate-12" />
    </div>
  )
}

export default function News() {
  const [newsMode, setNewsMode] = useState('apex') // 'apex' | 'finviz'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getNews()
      .then((r) => setItems(r.items || []))
      .catch((e) => {
        setError(e.message)
        setItems([])
      })
      .finally(() => setLoading(false))
  }, [])

  /** Scale: 0 = will crash, 50 = won't be affected, 100 = all-time high */
  const directionLabel = (d) => (d <= 35 ? 'CRITICAL DROP' : d >= 65 ? 'SURGE DETECTED' : "STABLE VECTOR")
  const directionIcon = (d) => (d <= 35 ? TrendingDown : d >= 65 ? TrendingUp : Minus)
  const directionColor = (d) => (d <= 35 ? 'text-apex-loss drop-shadow-[0_0_8px_rgba(255,0,85,0.8)]' : d >= 65 ? 'text-apex-profit drop-shadow-[0_0_8px_rgba(0,255,136,0.8)]' : 'text-apex-warning drop-shadow-[0_0_8px_rgba(255,234,0,0.8)]')
  const directionBg = (d) => (d <= 35 ? 'bg-apex-loss/10 border-apex-loss/50' : d >= 65 ? 'bg-apex-profit/10 border-apex-profit/50' : 'bg-apex-warning/10 border-apex-warning/50')

  const formatTime = (ts) => {
    if (!ts) return ''
    try {
      const d = new Date(ts)
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ts
    }
  }

  return (
    <PageWrapper className="min-h-screen pb-32">
      <DataStaticBackground />

      <div className="space-y-8 relative z-10 pt-8">
        {/* Editorial Cyberpunk Header */}
        <div className="mb-16 relative border-b-4 border-white pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="relative">
              <div className="absolute -left-8 top-0 bottom-0 w-2 bg-apex-pink animate-pulse" />
              <div className="flex items-center gap-3 mb-4 text-apex-pink">
                <Radio size={20} className="animate-spin-slow" />
                <span className="text-sm font-data uppercase tracking-[0.5em] font-bold">Global Intelligence Feed</span>
              </div>
              <GlitchText as="h1" text="THE WIRE" className="text-6xl md:text-[7rem] leading-[0.8] font-display font-black text-transparent tracking-tighter mix-blend-screen" style={{ WebkitTextStroke: '2px white' }} />
              <h1 className="absolute top-[48px] md:top-[60px] left-1 text-6xl md:text-[7rem] leading-[0.8] font-display font-black text-apex-pink mix-blend-screen opacity-50 blur-[2px] pointer-events-none tracking-tighter">THE WIRE</h1>
            </div>

            {/* Mode toggles heavily styled */}
            <div className="flex gap-0 border-2 border-white/20 p-1 bg-black/50 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setNewsMode('apex')}
                className={`relative px-6 py-3 font-data text-xs uppercase tracking-widest font-black transition-all ${newsMode === 'apex'
                    ? 'bg-apex-pink text-black'
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                  }`}
              >
                {newsMode === 'apex' && <div className="absolute inset-0 bg-white/30 animate-pulse pointer-events-none" />}
                <span className="relative z-10 flex items-center gap-2 text-center">
                  <Newspaper size={14} /> SYS.NEWS
                </span>
              </button>
              <button
                type="button"
                onClick={() => setNewsMode('finviz')}
                className={`relative px-6 py-3 font-data text-xs uppercase tracking-widest font-black transition-all ${newsMode === 'finviz'
                    ? 'bg-apex-pink text-black'
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                  }`}
              >
                {newsMode === 'finviz' && <div className="absolute inset-0 bg-white/30 animate-pulse pointer-events-none" />}
                <span className="relative z-10 text-center">FINVIZ.EXT</span>
              </button>
            </div>
          </div>

          <div className="absolute -bottom-3 left-0 bg-black px-4 text-apex-pink font-data text-[10px] uppercase tracking-[0.4em]">
            Real-time Sentiment Analysis // AI-Processed // Proceed with Caution
          </div>
        </div>

        <AnimatePresence mode="wait">
          {newsMode === 'finviz' && (
            <motion.div key="finviz" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="cyber-panel p-2 bg-black/50 border border-apex-pink/50 shadow-[0_0_50px_rgba(255,0,85,0.15)] relative">
              <div className="absolute top-0 right-0 p-2 font-data text-[10px] text-apex-pink/50 uppercase tracking-[0.3em] pointer-events-none">External Frame Override</div>
              <EmbedFinvizNews height={800} />
            </motion.div>
          )}

          {newsMode === 'apex' && (
            <motion.div key="apex" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">

              {/* Overengineered direction legend */}
              <div className="border border-white/20 bg-black/80 p-6 flex flex-col md:flex-row items-start md:items-center gap-8 relative overflow-hidden">
                <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />
                <div className="relative z-10 font-data text-xs text-white/40 uppercase tracking-[0.3em] flex items-center gap-2">
                  <AlertTriangle size={14} className="text-apex-warning animate-pulse" />
                  Sentiment Legend
                </div>

                <div className="relative z-10 flex flex-wrap gap-6 border-l border-white/10 pl-6">
                  {[
                    { val: '0', label: 'CRASH', color: 'apex-loss' },
                    { val: '50', label: 'STABLE', color: 'apex-warning' },
                    { val: '100', label: 'SURGE', color: 'apex-profit' }
                  ].map(l => (
                    <div key={l.val} className="flex items-center gap-3 group cursor-help">
                      <div className={`w-12 h-12 flex items-center justify-center border-2 border-${l.color}/50 bg-${l.color}/10 text-${l.color} font-display font-black text-xl group-hover:bg-${l.color} group-hover:text-black transition-all shadow-[0_0_15px_var(--color-${l.color.split('-')[1]})]`}>
                        {l.val}
                      </div>
                      <span className="text-white/60 font-data text-[10px] uppercase tracking-widest">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-6 bg-apex-loss/20 border-l-[6px] border-apex-loss text-white font-data text-sm flex items-start gap-4 shadow-[0_0_30px_rgba(255,0,85,0.3)]">
                  <AlertTriangle size={24} className="text-apex-loss shrink-0 animate-pulse" />
                  <div>
                    <h4 className="text-apex-loss font-black uppercase tracking-widest mb-1">Stream Error Sequence</h4>
                    <p className="opacity-80 break-all">{error}</p>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonLoader key={i} height={350} className="rounded-none border border-white/10" />
                  ))}
                </div>
              ) : items.length === 0 && !error ? (
                <div className="cyber-panel p-24 text-center bg-black/40 border border-white/10 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPjxyZWN0IHdpZHRoPSc4JyBoZWlnaHQ9JzgnIGZpbGw9JyNmZmZmZmYnIGZpbGwtb3BhY2l0eT0nMC4wMicvPjwvc3ZnPg==')] pointer-events-none" />
                  <FileText size={64} className="text-white/10 mx-auto mb-6" />
                  <GlitchText as="h3" text="NO TRANSMISSIONS" className="text-3xl font-display font-black text-white/50 tracking-tighter" />
                  <p className="font-data text-xs text-white/30 uppercase tracking-[0.2em] mt-4">The wire is silent. Check connection.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Magazine style layout: Feature first item massively, then grid the rest */}
                  {items.map((n, i) => {
                    const direction = n.direction ?? (n.sentiment <= 35 ? 0 : n.sentiment >= 65 ? 100 : 50)
                    const Icon = directionIcon(direction)
                    const isUltraFeatured = i === 0
                    const isSecondaryFeatured = i === 1 || i === 2
                    const hasImage = n.image && n.image.startsWith('http')

                    // Col span logic for masonry-ish layout
                    const colSpan = isUltraFeatured ? 'lg:col-span-12' : isSecondaryFeatured ? 'lg:col-span-6' : 'lg:col-span-4'

                    return (
                      <motion.article
                        key={n.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`cyber-panel bg-black border border-white/10 overflow-hidden group hover:border-apex-pink/50 transition-colors ${colSpan} flex flex-col`}
                      >
                        <a
                          href={n.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col h-full relative"
                        >
                          {/* Top accent bar matching sentiment */}
                          <div className={`absolute top-0 inset-x-0 h-1 z-20 ${direction <= 35 ? 'bg-apex-loss' : direction >= 65 ? 'bg-apex-profit' : 'bg-apex-warning'}`} />

                          {hasImage && (
                            <div className={`relative w-full bg-white/5 overflow-hidden ${isUltraFeatured ? 'h-[400px]' : isSecondaryFeatured ? 'h-[250px]' : 'h-[200px]'}`}>
                              <img
                                src={n.image}
                                alt=""
                                className="w-full h-full object-cover opacity-60 mix-blend-screen group-hover:scale-110 group-hover:opacity-100 transition-all duration-700 filter grayscale group-hover:grayscale-0"
                                loading="lazy"
                                onError={(e) => { e.target.style.display = 'none' }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none" />

                              {/* Overlay tags on image */}
                              <div className="absolute top-4 left-4 z-10 flex gap-2">
                                <span className="px-3 py-1 bg-apex-pink text-black font-data text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(255,0,60,0.5)]">
                                  {n.category}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="p-6 flex-1 flex flex-col flex-grow relative z-10">
                            {!hasImage && (
                              <div className="flex items-center gap-2 flex-wrap mb-4">
                                <span className="px-3 py-1 border border-apex-pink/50 text-apex-pink font-data text-[10px] uppercase font-bold tracking-widest bg-apex-pink/10">
                                  {n.category}
                                </span>
                              </div>
                            )}

                            <h2 className={`font-display font-black text-white leading-[1.1] tracking-tight group-hover:text-apex-pink transition-colors mb-4 ${isUltraFeatured ? 'text-4xl md:text-5xl' : isSecondaryFeatured ? 'text-2xl md:text-3xl' : 'text-xl'}`}>
                              {n.headline}
                            </h2>

                            {isUltraFeatured && (
                              <p className="text-white/70 font-body text-lg mb-6 leading-relaxed border-l-2 border-apex-pink/30 pl-4">
                                {n.summary}
                              </p>
                            )}

                            {!isUltraFeatured && (
                              <p className="text-white/50 text-sm mb-6 line-clamp-3">
                                {n.summary}
                              </p>
                            )}

                            {/* Footer metadata area pushes to bottom */}
                            <div className="mt-auto pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className={`flex items-center justify-center w-12 h-12 border ${directionBg(direction)} rounded-none`}>
                                  <span className={`font-display font-black text-xl ${directionColor(direction)}`}>{direction}</span>
                                </div>
                                <div>
                                  <p className="text-[10px] font-data uppercase tracking-[0.2em] text-white/40 mb-1">{directionLabel(direction)}</p>
                                  <p className="text-xs text-white/60 font-medium">{formatTime(n.timestamp)} // {n.source}</p>
                                </div>
                              </div>

                              <div className="text-apex-pink opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all font-data text-[10px] uppercase font-bold flex items-center gap-2">
                                Read <ExternalLink size={14} />
                              </div>
                            </div>

                            {/* Cyberpunk decoration */}
                            <div className="absolute bottom-2 right-2 font-data text-[8px] text-white/10 pointer-events-none">
                              SEQ_{i.toString().padStart(4, '0')}
                            </div>
                          </div>
                        </a>
                      </motion.article>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  )
}
