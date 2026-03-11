import { useEffect, useRef } from 'react'
import { ExternalLink } from 'lucide-react'

/**
 * TradingView Screener widget — script-based embed (same idea as TradingView chart).
 * Full screener with fundamentals, technicals, and sorting.
 */
const TV_SCREENER_URL = 'https://www.tradingview.com/screener/'

const WIDGET_CONFIG = {
  width: '100%',
  height: '100%',
  defaultColumn: 'overview',
  defaultScreen: 'most_capitalized',
  showToolbar: true,
  locale: 'en',
  market: 'america',  // US stocks (not forex); use "america" for stocks
  colorTheme: 'dark',
}

export default function EmbedTradingViewScreener({ height = 640, className = '' }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    const wrapper = containerRef.current
    const scriptSrc = document.createElement('script')
    scriptSrc.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js'
    scriptSrc.async = true
    const scriptConfig = document.createElement('script')
    scriptConfig.type = 'text/javascript'
    scriptConfig.textContent = JSON.stringify(WIDGET_CONFIG)
    wrapper.appendChild(scriptSrc)
    wrapper.appendChild(scriptConfig)
    return () => {
      scriptSrc.remove()
      scriptConfig.remove()
    }
  }, [])

  return (
    <div className={`rounded-xl overflow-hidden border border-white/10 bg-black/40 ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
        <span className="text-white/70 text-sm font-medium">TradingView Screener</span>
        <a
          href={TV_SCREENER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-apex-accent hover:text-apex-accent/80 text-sm"
        >
          Open in new tab <ExternalLink size={14} />
        </a>
      </div>
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{ height: `${height}px`, width: '100%' }}
      >
        <div className="tradingview-widget-container__widget" style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  )
}
