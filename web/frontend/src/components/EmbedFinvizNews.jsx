import { ExternalLink, AlertCircle } from 'lucide-react'

/**
 * Finviz News — Finviz blocks iframe embedding, so we show a launch card instead.
 */
const FINVIZ_NEWS_URL = 'https://finviz.com/news.ashx'

export default function EmbedFinvizNews({ height = 640, className = '' }) {
  return (
    <div className={`rounded-xl overflow-hidden border border-white/10 bg-black/40 ${className}`}>
      <div className="flex flex-col items-center justify-center gap-4 p-8 md:p-12" style={{ minHeight: height }}>
        <div className="flex items-center gap-3 text-apex-warning">
          <AlertCircle size={24} />
          <span className="text-sm font-medium">Finviz doesn&apos;t allow embedding</span>
        </div>
        <p className="text-white/60 text-center text-sm max-w-md">
          Open Finviz News in a new tab to use their full news feed and market coverage.
        </p>
        <a
          href={FINVIZ_NEWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-apex-accent text-black font-semibold hover:opacity-90 transition-opacity"
        >
          Open Finviz News <ExternalLink size={18} />
        </a>
      </div>
    </div>
  )
}
