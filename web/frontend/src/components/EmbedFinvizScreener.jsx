import { useMemo } from 'react'
import { ExternalLink, AlertCircle } from 'lucide-react'

/**
 * Finviz Stock Screener — Finviz blocks iframe embedding, so we show a launch card instead.
 */
const FINVIZ_SCREENER_URL = 'https://finviz.com/screener.ashx'

export default function EmbedFinvizScreener({ height = 640, className = '' }) {
  const embedUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('v', '111') // overview view
    return `${FINVIZ_SCREENER_URL}?${params.toString()}`
  }, [])

  return (
    <div className={`rounded-xl overflow-hidden border border-white/10 bg-black/40 ${className}`}>
      <div className="flex flex-col items-center justify-center gap-4 p-8 md:p-12" style={{ minHeight: height }}>
        <div className="flex items-center gap-3 text-apex-warning">
          <AlertCircle size={24} />
          <span className="text-sm font-medium">Finviz doesn&apos;t allow embedding</span>
        </div>
        <p className="text-white/60 text-center text-sm max-w-md">
          Open Finviz Screener in a new tab to use their full stock screener with filters, technicals, and fundamentals.
        </p>
        <a
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-apex-accent text-black font-semibold hover:opacity-90 transition-opacity"
        >
          Open Finviz Screener <ExternalLink size={18} />
        </a>
      </div>
    </div>
  )
}
