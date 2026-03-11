import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Grid3X3, BarChart3 } from 'lucide-react'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'
import PageHeader from '../components/PageHeader'
import Card, { CardBody } from '../components/Card'
import SkeletonLoader from '../components/SkeletonLoader'
import EmbedFinvizMap from '../components/EmbedFinvizMap'

function color(change) {
  if (change >= 8) return 'rgba(34, 197, 94, 0.95)'
  if (change >= 4) return 'rgba(34, 197, 94, 0.7)'
  if (change >= 0) return 'rgba(34, 197, 94, 0.4)'
  if (change >= -4) return 'rgba(239, 68, 68, 0.4)'
  if (change >= -8) return 'rgba(239, 68, 68, 0.7)'
  return 'rgba(239, 68, 68, 0.95)'
}

export default function Heatmap() {
  const [heatmapMode, setHeatmapMode] = useState('finviz') // 'builtin' | 'finviz'
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getHeatmap()
      .then((r) => setData(r.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [])

  const bySector = useMemo(() => {
    const map = {}
    for (const d of data) {
      const sec = d.sector || 'Other'
      if (!map[sec]) map[sec] = []
      map[sec].push(d)
    }
    for (const arr of Object.values(map)) {
      arr.sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0))
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
  }, [data])

  return (
    <PageWrapper>
      <div className="space-y-8">
        <PageHeader
          title="Sector & Symbol Heatmap"
          subtitle="Finviz market map embedded—or use our built-in sector heatmap on your data."
          icon={Grid3X3}
        />

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setHeatmapMode('finviz')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                heatmapMode === 'finviz' ? 'bg-apex-accent text-black' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Finviz Map
            </button>
            <button
              type="button"
              onClick={() => setHeatmapMode('builtin')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                heatmapMode === 'builtin' ? 'bg-apex-accent text-black' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <BarChart3 size={16} /> Built-in
            </button>
          </div>
        </div>

        {heatmapMode === 'finviz' && <EmbedFinvizMap height={700} />}

        {heatmapMode === 'builtin' && (
        <>
        {loading ? (
          <SkeletonLoader height={400} className="rounded-xl" />
        ) : (
          <>
            <div className="flex gap-4 items-center flex-wrap text-sm">
              <span className="text-white/50">Legend:</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.7)' }} /> Strong up</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.4)' }} /> Up</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.4)' }} /> Down</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.7)' }} /> Strong down</span>
            </div>
            <div className="space-y-6">
              {bySector.map(([sector, symbols]) => (
                <Card key={sector} animate hover>
                  <CardBody>
                    <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider border-b border-white/10 pb-2">{sector}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {symbols.map((d, i) => (
                        <Link key={d.symbol} to={`/charts?symbol=${d.symbol}`}>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.02, duration: 0.3 }}
                            whileHover={{ scale: 1.05, zIndex: 10 }}
                            className="rounded-xl p-4 text-white text-center border border-white/10 hover:border-apex-accent/40 transition-colors"
                            style={{ backgroundColor: color(d.change_pct ?? 0) }}
                          >
                            <div className="font-data font-bold text-lg">{d.symbol}</div>
                            <div className="text-sm opacity-95 font-data">{(d.change_pct ?? 0).toFixed(1)}%</div>
                            <div className="text-xs opacity-80 mt-0.5">${(d.price ?? 0).toFixed(2)}</div>
                          </motion.div>
                        </Link>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </>
        )}
        </>
        )}
      </div>
    </PageWrapper>
  )
}
