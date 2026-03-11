import { useMemo } from 'react'

/**
 * TradingView Advanced Chart widget — full TradingView experience (drawings, indicators, timeframes).
 * Symbol: NASDAQ:AAPL, NYSE:MSFT, etc. Interval: D, W, 1, 60, etc.
 */
const TV_INTERVAL_MAP = {
  '1d': 'D',
  '1wk': 'W',
  '1mo': '1M',
}

export default function TradingViewChart({ symbol = 'AAPL', interval = '1d', height = 500, className = '' }) {
  const exchange = useMemo(() => {
    const s = (symbol || 'AAPL').toUpperCase()
    if (['SPY', 'QQQ', 'IWM', 'DIA'].includes(s)) return 'AMEX'
    if (['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'META', 'AMZN', 'NVDA', 'TSLA', 'AMD', 'INTC'].includes(s)) return 'NASDAQ'
    return 'NYSE'
  }, [symbol])

  const tvSymbol = `${exchange}:${(symbol || 'AAPL').toUpperCase()}`
  const tvInterval = TV_INTERVAL_MAP[interval] || 'D'

  const embedUrl = useMemo(() => {
    const params = new URLSearchParams({
      frameElementId: 'tradingview_chart',
      symbol: tvSymbol,
      interval: tvInterval,
      hide_side_toolbar: '0',
      symbol_edit: '1',
      save_image: '1',
      toolbar_bg: '0a0a0a',
      theme: 'dark',
      style: '1',
      timezone: 'America/New_York',
      withdateranges: '1',
      show_popup_button: '1',
      allow_symbol_change: '1',
      studies_overrides: '{}',
      overrides: '{}',
      enabled_features: '["study_templates", "left_toolbar", "header_compare", "compare_symbol", "border_around_chart"]',
      disabled_features: '[]',
      locale: 'en',
      utm_source: 'apex',
      utm_medium: 'widget',
      utm_campaign: 'chart',
    })
    return `https://www.tradingview.com/widgetembed/?${params.toString()}`
  }, [tvSymbol, tvInterval])

  return (
    <div className={`rounded-xl overflow-hidden border border-white/10 bg-black/40 ${className}`} style={{ minHeight: height }}>
      <iframe
        title={`TradingView ${symbol}`}
        src={embedUrl}
        style={{ width: '100%', height: `${height}px`, border: 0 }}
        allowFullScreen
      />
    </div>
  )
}
