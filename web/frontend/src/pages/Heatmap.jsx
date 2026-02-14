import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'

export default function Heatmap() {
  const [data, setData] = useState([])

  useEffect(() => {
    api.getHeatmap().then((r) => setData(r.data || [])).catch(() => setData([]))
  }, [])

  const color = (change) => {
    if (change >= 5) return 'rgba(0, 255, 136, 0.8)'
    if (change >= 0) return 'rgba(0, 255, 136, 0.4)'
    if (change >= -5) return 'rgba(255, 51, 102, 0.4)'
    return 'rgba(255, 51, 102, 0.8)'
  }

  return (
    <PageWrapper>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Sector / Symbol Heatmap</h1>
          <p className="text-white/50 text-sm mt-1">Performance by symbol (color = 20d return %).</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {data.map((d, i) => (
            <motion.div
              key={d.symbol}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02, duration: 0.3 }}
              whileHover={{ scale: 1.05, zIndex: 10 }}
              className="rounded-xl p-4 text-white text-center border border-white/5"
              style={{ backgroundColor: color(d.change_pct ?? 0) }}
            >
              <div className="font-data font-bold text-lg">{d.symbol}</div>
              <div className="text-sm opacity-90 font-data">{(d.change_pct ?? 0).toFixed(1)}%</div>
              <div className="text-xs opacity-75 mt-0.5">{d.sector}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
