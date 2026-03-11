import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, BarChart3, Tv, Filter, Zap } from 'lucide-react'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'
import Card, { CardBody } from '../components/Card'
import EmbedFinvizScreener from '../components/EmbedFinvizScreener'
import EmbedTradingViewScreener from '../components/EmbedTradingViewScreener'
import GlitchText from '../components/GlitchText'
import MagneticButton from '../components/MagneticButton'

export default function Screener() {
  const [screenerMode, setScreenerMode] = useState('finviz') // 'builtin' | 'finviz' | 'tradingview'
  const [results, setResults] = useState([])
  const [sectors, setSectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    min_price: 0,
    max_price: 10000,
    min_volume: 0,
    sectors: '',
    min_rsi: 0,
    max_rsi: 100,
  })

  const [sortKey, setSortKey] = useState('score')
  const [sortDir, setSortDir] = useState('desc')

  const sortedResults = useMemo(() => {
    const key = sortKey
    const dir = sortDir === 'asc' ? 1 : -1
    return [...results].sort((a, b) => {
      let va = a[key]
      let vb = b[key]
      if (key === 'returns_20d' || key === 'price' || key === 'volume' || key === 'rsi_approx' || key === 'score') {
        va = Number(va) || 0
        vb = Number(vb) || 0
        return dir * (va - vb)
      }
      return dir * String(va || '').localeCompare(String(vb || ''))
    })
  }, [results, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const run = () => {
    setLoading(true)
    setError(null)
    const params = { ...filters }
    if (!params.min_rsi) params.min_rsi = 0
    if (!params.max_rsi || params.max_rsi > 100) params.max_rsi = 100
    api
      .screener(params)
      .then((r) => setResults(r.results || []))
      .catch((e) => {
        setError(e.message)
        setResults([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    run()
  }, [])

  useEffect(() => {
    api.getMarketSnapshot().then((s) => {
      const stocks = s?.stocks || []
      const sec = [...new Set(stocks.map((x) => x.sector).filter(Boolean))].sort()
      setSectors(sec)
    }).catch(() => { })
  }, [])

  return (
    <PageWrapper className="min-h-screen pb-32">
      {/* Background decorations specific to Screener */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[20%] -left-40 w-96 h-96 bg-apex-cyan/5 rounded-full blur-[100px]" />
        <div className="absolute top-[60%] -right-40 w-96 h-96 bg-apex-pink/5 rounded-full blur-[100px]" />

        {/* Abstract tabular lines in background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 49px, var(--accent-primary) 49px, var(--accent-primary) 50px)`,
          backgroundSize: '100% 50px'
        }} />
      </div>

      <div className="space-y-8 relative z-10 pt-8">
        {/* Extreme PageHeader Replacement */}
        <div className="mb-12 relative flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-[3px] border-white/10 pb-6">
          <div className="absolute -left-4 bottom-0 w-2 h-12 bg-apex-cyan" />
          <div>
            <div className="flex items-center gap-3 mb-2 text-apex-cyan/70">
              <Filter size={18} className="animate-pulse" />
              <span className="text-xs font-data uppercase tracking-[0.4em]">Target Acquisition System</span>
            </div>
            <GlitchText as="h1" text="SCREENER" className="text-5xl md:text-7xl font-display font-black text-white tracking-tighter mix-blend-difference" />
            <p className="max-w-xl text-white/50 text-sm font-data uppercase tracking-widest mt-4 leading-relaxed border-l border-apex-cyan/30 pl-4">
              Multi-source market scanners active. Isolate high-probability vectors.
            </p>
          </div>

          <div className="flex gap-2">
            {[
              { id: 'finviz', label: 'Finviz', icon: Tv },
              { id: 'tradingview', label: 'TradingView', icon: Tv },
              { id: 'builtin', label: 'System Core', icon: BarChart3 }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setScreenerMode(mode.id)}
                className={`relative px-4 py-3 font-data text-xs uppercase tracking-widest font-bold transition-all overflow-hidden cyber-panel ${screenerMode === mode.id
                    ? 'bg-apex-accent text-black border-apex-accent shadow-[0_0_20px_rgba(204,255,0,0.3)]'
                    : 'bg-black/50 text-white/50 border-white/10 hover:text-white hover:border-white/30'
                  }`}
              >
                {screenerMode === mode.id && <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />}
                <span className="relative z-10 flex items-center gap-2">
                  <mode.icon size={14} />
                  {mode.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-apex-loss/10 border-l-[4px] border-apex-loss text-apex-loss font-data text-sm flex items-center gap-3 shadow-[0_0_20px_rgba(255,0,85,0.2)]">
            <div className="w-2 h-2 rounded-full bg-current animate-ping" />
            CRITICAL ERROR: {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {screenerMode === 'finviz' && (
            <motion.div key="finviz" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="cyber-panel p-2 bg-black/50 border border-apex-cyan/30 shadow-[0_0_40px_rgba(0,240,255,0.1)]">
              <EmbedFinvizScreener height={800} />
            </motion.div>
          )}

          {screenerMode === 'tradingview' && (
            <motion.div key="tradingview" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="cyber-panel p-2 bg-black/50 border border-apex-pink/30 shadow-[0_0_40px_rgba(255,0,85,0.1)]">
              <EmbedTradingViewScreener height={800} />
            </motion.div>
          )}

          {screenerMode === 'builtin' && (
            <motion.div key="builtin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

              {/* Filter Control Panel */}
              <div className="cyber-panel p-6 bg-black/60 border border-apex-accent/20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPjxyZWN0IHdpZHRoPSc4JyBoZWlnaHQ9JzgnIGZpbGw9JyNjY2ZmMDAnIGZpbGwtb3BhY2l0eT0nMC4wNScvPjwvc3ZnPg==')] pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-0 right-0 p-2 font-data text-[10px] text-apex-accent/50 uppercase tracking-[0.3em]">Params.Input</div>

                <div className="flex flex-wrap gap-x-6 gap-y-4 items-end relative z-10">
                  <div className="group/input">
                    <label className="block text-apex-accent/70 text-[10px] uppercase font-data tracking-widest mb-1 group-hover/input:text-apex-accent transition-colors">Min Price // USD</label>
                    <input
                      type="number"
                      value={filters.min_price}
                      onChange={(e) => setFilters({ ...filters, min_price: Number(e.target.value) || 0 })}
                      className="bg-black/50 border-b-2 border-white/20 focus:border-apex-accent px-0 py-2 text-white font-data text-lg w-24 outline-none transition-colors"
                    />
                  </div>
                  <div className="group/input">
                    <label className="block text-apex-accent/70 text-[10px] uppercase font-data tracking-widest mb-1 group-hover/input:text-apex-accent transition-colors">Max Price // USD</label>
                    <input
                      type="number"
                      value={filters.max_price}
                      onChange={(e) => setFilters({ ...filters, max_price: Number(e.target.value) || 10000 })}
                      className="bg-black/50 border-b-2 border-white/20 focus:border-apex-accent px-0 py-2 text-white font-data text-lg w-28 outline-none transition-colors"
                    />
                  </div>
                  <div className="group/input">
                    <label className="block text-apex-accent/70 text-[10px] uppercase font-data tracking-widest mb-1 group-hover/input:text-apex-accent transition-colors">Vol Floor</label>
                    <input
                      type="number"
                      value={filters.min_volume}
                      onChange={(e) => setFilters({ ...filters, min_volume: Number(e.target.value) || 0 })}
                      className="bg-black/50 border-b-2 border-white/20 focus:border-apex-accent px-0 py-2 text-white font-data text-lg w-32 outline-none transition-colors"
                    />
                  </div>
                  <div className="group/input">
                    <label className="block text-apex-accent/70 text-[10px] uppercase font-data tracking-widest mb-1 group-hover/input:text-apex-accent transition-colors">RSI &gt;</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={filters.min_rsi}
                      onChange={(e) => setFilters({ ...filters, min_rsi: Number(e.target.value) || 0 })}
                      className="bg-black/50 border-b-2 border-white/20 focus:border-apex-accent px-0 py-2 text-white font-data text-lg w-16 outline-none text-center transition-colors"
                    />
                  </div>
                  <div className="group/input">
                    <label className="block text-apex-accent/70 text-[10px] uppercase font-data tracking-widest mb-1 group-hover/input:text-apex-accent transition-colors">RSI &lt;</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={filters.max_rsi}
                      onChange={(e) => setFilters({ ...filters, max_rsi: Number(e.target.value) || 100 })}
                      className="bg-black/50 border-b-2 border-white/20 focus:border-apex-accent px-0 py-2 text-white font-data text-lg w-16 outline-none text-center transition-colors"
                    />
                  </div>
                  <div className="group/input flex-1 min-w-[200px]">
                    <label className="block text-apex-accent/70 text-[10px] uppercase font-data tracking-widest mb-1 group-hover/input:text-apex-accent transition-colors">Sector Class</label>
                    <select
                      value={filters.sectors}
                      onChange={(e) => setFilters({ ...filters, sectors: e.target.value })}
                      className="bg-black/50 border-b-2 border-white/20 focus:border-apex-accent px-0 py-2 text-white font-data text-lg w-full outline-none transition-colors appearance-none"
                    >
                      <option value="">[ ALL CLASSIFICATIONS ]</option>
                      {sectors.map((s) => (
                        <option key={s} value={s}>{s.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <MagneticButton
                    onClick={run}
                    disabled={loading}
                    className="!px-8 !py-4 ml-auto"
                  >
                    <span className="flex items-center gap-3 font-data uppercase tracking-widest text-xs font-bold">
                      {loading ? <Zap className="animate-pulse" size={16} /> : <Search size={16} />}
                      {loading ? 'Scanning...' : 'Execute Scan'}
                    </span>
                  </MagneticButton>
                </div>
              </div>

              {/* Data Table Container */}
              <div className="cyber-panel border border-white/10 bg-black/80 relative shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                {/* Decorative border elements */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-apex-accent/50 pointer-events-none" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-apex-accent/50 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-apex-accent/50 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-apex-accent/50 pointer-events-none" />

                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="h-[600px] flex flex-col items-center justify-center border-t border-white/5 relative overflow-hidden">
                      <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />
                      <div className="w-16 h-16 border-4 border-apex-accent border-t-transparent rounded-full animate-spin mb-4" />
                      <div className="font-data text-apex-accent text-xs uppercase tracking-[0.5em] animate-pulse">Running Vectors</div>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-white/40 text-[10px] font-data uppercase tracking-[0.2em] relative">
                          <th className="py-4 px-6 border-r border-white/5">
                            <button type="button" onClick={() => toggleSort('symbol')} className="flex items-center gap-2 hover:text-white transition-colors w-full">
                              TICKER {sortKey === 'symbol' && <span className="text-apex-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                            </button>
                          </th>
                          <th className="py-4 px-6 border-r border-white/5">
                            <button type="button" onClick={() => toggleSort('price')} className="flex items-center gap-2 hover:text-white transition-colors w-full">
                              PRICE {sortKey === 'price' && <span className="text-apex-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                            </button>
                          </th>
                          <th className="py-4 px-6 border-r border-white/5">
                            <button type="button" onClick={() => toggleSort('volume')} className="flex items-center gap-2 hover:text-white transition-colors w-full">
                              VOL {sortKey === 'volume' && <span className="text-apex-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                            </button>
                          </th>
                          <th className="py-4 px-6 border-r border-white/5">CLASS</th>
                          <th className="py-4 px-6 border-r border-white/5">
                            <button type="button" onClick={() => toggleSort('returns_20d')} className="flex items-center gap-2 hover:text-white transition-colors w-full">
                              Δ 20d {sortKey === 'returns_20d' && <span className="text-apex-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                            </button>
                          </th>
                          <th className="py-4 px-6 border-r border-white/5">
                            <button type="button" onClick={() => toggleSort('rsi_approx')} className="flex items-center gap-2 hover:text-white transition-colors w-full relative group">
                              RSI {sortKey === 'rsi_approx' && <span className="text-apex-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                            </button>
                          </th>
                          <th className="py-4 px-6 border-r border-white/5 bg-apex-accent/5">
                            <button type="button" onClick={() => toggleSort('score')} className="flex items-center gap-2 hover:text-apex-accent transition-colors w-full text-apex-accent/80 font-bold">
                              SYS.SCORE {sortKey === 'score' && <span className="text-apex-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                            </button>
                          </th>
                          <th className="py-4 px-6 w-24">ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedResults.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-24 text-center">
                              <GlitchText as="div" text="NO TARGETS FOUND" className="text-white/20 font-display font-black text-4xl uppercase tracking-tighter" />
                              <p className="text-white/40 font-data text-xs mt-4 uppercase tracking-[0.2em]">Adjust scan parameters to widen search vector.</p>
                            </td>
                          </tr>
                        ) : (
                          sortedResults.map((r, i) => (
                            <motion.tr
                              key={r.symbol}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05, duration: 0.3 }}
                              className="border-b border-white/5 hover:bg-white/5 transition-colors group relative"
                            >
                              <td className="py-4 px-6 border-r border-white/5">
                                <span className="font-display font-bold text-lg text-white group-hover:text-apex-cyan transition-colors drop-shadow-[0_0_8px_rgba(0,240,255,0)] group-hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">{r.symbol}</span>
                              </td>
                              <td className="py-4 px-6 border-r border-white/5 font-data text-white/90">
                                ${r.price?.toFixed(2)}
                              </td>
                              <td className="py-4 px-6 border-r border-white/5 font-data text-white/60">
                                {((r.volume || 0) / 1e6).toFixed(2)}M
                              </td>
                              <td className="py-4 px-6 border-r border-white/5 font-data text-[10px] uppercase text-white/50 tracking-wider">
                                {r.sector}
                              </td>
                              <td className={`py-4 px-6 border-r border-white/5 font-data font-bold ${(r.returns_20d || 0) >= 0 ? 'text-apex-profit drop-shadow-[0_0_8px_rgba(0,255,136,0.3)]' : 'text-apex-loss drop-shadow-[0_0_8px_rgba(255,0,85,0.3)]'}`}>
                                {((r.returns_20d || 0) * 100).toFixed(1)}%
                              </td>
                              <td className="py-4 px-6 border-r border-white/5 font-data">
                                <span className={`px-2 py-1 bg-black/50 border ${r.rsi_approx > 70 ? 'border-apex-loss text-apex-loss' : r.rsi_approx < 30 ? 'border-apex-profit text-apex-profit' : 'border-white/20 text-white/60'}`}>
                                  {r.rsi_approx != null ? r.rsi_approx.toFixed(0) : '—'}
                                </span>
                              </td>
                              <td className="py-4 px-6 border-r border-white/5 bg-apex-accent/5 font-display font-black text-xl text-apex-accent drop-shadow-[0_0_10px_rgba(204,255,0,0)] group-hover:drop-shadow-[0_0_10px_rgba(204,255,0,0.6)] transition-all">
                                {r.score != null ? r.score.toFixed(0) : '—'}
                              </td>
                              <td className="py-4 px-6 group-hover:bg-apex-cyan/10 transition-colors">
                                <Link to={`/charts?symbol=${r.symbol}`} className="flex items-center justify-center w-8 h-8 rounded border border-apex-cyan/50 text-apex-cyan hover:bg-apex-cyan hover:text-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] transition-all mx-auto">
                                  <ExternalLink size={14} />
                                </Link>
                              </td>

                              {/* Hover outline */}
                              <td className="absolute inset-0 pointer-events-none border border-transparent group-hover:border-apex-cyan/30 z-10" />
                            </motion.tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  )
}
