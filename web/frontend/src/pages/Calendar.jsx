import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar as CalIcon, ExternalLink, TrendingDown, Minus, TrendingUp } from 'lucide-react'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'
import PageHeader from '../components/PageHeader'
import SkeletonLoader from '../components/SkeletonLoader'

export default function Calendar() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [impactFilter, setImpactFilter] = useState('all')

  useEffect(() => {
    api
      .getCalendar()
      .then((r) => setItems(r.items || []))
      .catch((e) => {
        setError(e.message)
        setItems([])
      })
      .finally(() => setLoading(false))
  }, [])

  /** Scale: 0 = will crash, 50 = won't be affected, 100 = all-time high */
  const directionLabel = (d) => (d <= 35 ? 'Will crash' : d >= 65 ? 'All-time high' : "Won't be affected")
  const directionIcon = (d) => (d <= 35 ? TrendingDown : d >= 65 ? TrendingUp : Minus)
  const directionColor = (d) => (d <= 35 ? 'text-apex-loss' : d >= 65 ? 'text-apex-profit' : 'text-apex-warning')
  const directionBg = (d) => (d <= 35 ? 'bg-apex-loss/20 border-apex-loss/40' : d >= 65 ? 'bg-apex-profit/20 border-apex-profit/40' : 'bg-apex-warning/20 border-apex-warning/40')

  const impactBadge = (i) => {
    const c = i === 'high' ? 'bg-apex-loss/20 text-apex-loss border-apex-loss/40' : i === 'medium' ? 'bg-apex-warning/20 text-apex-warning border-apex-warning/40' : 'bg-white/10 text-white/60 border-white/20'
    return <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize border ${c}`}>{i}</span>
  }

  const filtered = impactFilter === 'all' ? items : items.filter((e) => (e.impact || '').toLowerCase() === impactFilter)

  return (
    <PageWrapper>
      <div className="space-y-6">
        <PageHeader
          title="Economic Calendar"
          subtitle="Outlook scale: 0 = will crash, 50 = won't be affected, 100 = all-time high. Links to full calendar."
          icon={CalIcon}
        />

        {/* Direction legend */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-wrap items-center gap-6"
        >
          <span className="text-white/60 text-sm font-medium">Outlook scale:</span>
          <div className="flex items-center gap-2">
            <span className="w-10 h-10 rounded-lg bg-apex-loss/20 border border-apex-loss/40 flex items-center justify-center font-data font-bold text-apex-loss text-sm">0</span>
            <span className="text-white/80 text-sm">Will crash</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-10 h-10 rounded-lg bg-apex-warning/20 border border-apex-warning/40 flex items-center justify-center font-data font-bold text-apex-warning text-sm">50</span>
            <span className="text-white/80 text-sm">Won&apos;t be affected</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-10 h-10 rounded-lg bg-apex-profit/20 border border-apex-profit/40 flex items-center justify-center font-data font-bold text-apex-profit text-sm">100</span>
            <span className="text-white/80 text-sm">All-time high</span>
          </div>
        </motion.div>

        {error && (
          <div className="p-4 rounded-xl bg-apex-loss/20 text-apex-loss border border-apex-loss/30 text-sm">{error}</div>
        )}
        <div className="flex gap-2 flex-wrap">
          <span className="text-white/50 text-sm">Impact:</span>
          {['all', 'high', 'medium', 'low'].map((f) => (
            <button
              key={f}
              onClick={() => setImpactFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                impactFilter === f ? 'bg-apex-accent text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {loading ? (
          <SkeletonLoader height={400} className="rounded-xl" />
        ) : (
          <div className="space-y-4">
            {filtered.map((e, i) => {
              const direction = e.direction ?? 50
              const Icon = directionIcon(direction)
              const hasImage = e.image && e.image.startsWith('http')
              const isHighlight = (e.impact || '').toLowerCase() === 'high'

              return (
                <motion.article
                  key={e.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`rounded-2xl border overflow-hidden transition-all hover:border-apex-accent/30 ${
                    isHighlight ? 'bg-gradient-to-br from-white/8 to-white/2 border-white/15' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <a
                    href={e.url || 'https://www.investing.com/economic-calendar/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col sm:flex-row gap-0 group"
                  >
                    {hasImage && (
                      <div className="sm:w-48 w-full h-36 shrink-0 bg-white/5">
                        <img
                          src={e.image}
                          alt=""
                          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                          loading="lazy"
                          onError={(ev) => { ev.target.style.display = 'none' }}
                        />
                      </div>
                    )}
                    <div className="flex-1 p-5 min-w-0 flex flex-wrap sm:flex-nowrap items-center gap-4">
                      <div className="font-data text-white/90 shrink-0 w-24">{e.date}</div>
                      <div className="font-data text-apex-accent/90 shrink-0 w-16">{e.time}</div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-semibold group-hover:text-apex-accent transition-colors">{e.event}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {impactBadge(e.impact)}
                          {e.forecast && <span className="text-white/60 text-sm">Forecast: {e.forecast}</span>}
                        </div>
                      </div>
                      <div className={`shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border ${directionBg(direction)}`}>
                        <span className={`font-data font-bold text-lg ${directionColor(direction)}`}>{direction}</span>
                        <span className={`text-xs font-medium flex items-center gap-1 ${directionColor(direction)}`}>
                          <Icon size={10} /> {directionLabel(direction)}
                        </span>
                      </div>
                      {e.url && (
                        <span className="shrink-0 text-apex-accent/80 text-sm flex items-center gap-1 group-hover:underline">
                          Calendar <ExternalLink size={14} />
                        </span>
                      )}
                    </div>
                  </a>
                </motion.article>
              )
            })}
            {filtered.length === 0 && (
              <p className="py-12 text-center text-white/40 rounded-xl border border-white/10 bg-white/5">No events match the filter.</p>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
