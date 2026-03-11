import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart2, CandlestickChart, LineChart as LineIcon, TrendingUp, Tv, BarChart3 } from 'lucide-react'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'
import PageHeader from '../components/PageHeader'
import Card, { CardHeader, CardBody } from '../components/Card'
import AdvancedChart from '../components/AdvancedChart'
import TradingViewChart from '../components/TradingViewChart'

const SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA', 'JPM', 'XOM', 'SPY', 'QQQ']
const PERIODS = [
  { value: '5d', label: '5D' },
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
]
const INTERVALS = [
  { value: '1d', label: '1D' },
  { value: '1wk', label: '1W' },
]

export default function Charts() {
  const [searchParams] = useSearchParams()
  const urlSymbol = searchParams.get('symbol')?.toUpperCase() || ''
  const [symbol, setSymbol] = useState(urlSymbol || 'AAPL')
  const symbolList = [...new Set([symbol, ...SYMBOLS])]
  const [period, setPeriod] = useState('3mo')
  const [interval, setInterval] = useState('1d')
  const [chartType, setChartType] = useState('candle')
  const [chartMode, setChartMode] = useState('tradingview') // 'tradingview' | 'builtin'
  const [showSma, setShowSma] = useState(true)
  const [showEma, setShowEma] = useState(true)
  const [showVolume, setShowVolume] = useState(true)
  const [smaPeriod, setSmaPeriod] = useState(20)
  const [emaPeriod, setEmaPeriod] = useState(9)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadChart = useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .getChart(symbol, period, interval)
      .then((res) => {
        setData(res.series || [])
      })
      .catch((e) => {
        setError(e.message)
        setData([])
      })
      .finally(() => setLoading(false))
  }, [symbol, period, interval])

  useEffect(() => {
    if (urlSymbol && urlSymbol !== symbol) setSymbol(urlSymbol)
  }, [urlSymbol])
  useEffect(() => {
    loadChart()
  }, [loadChart])

  return (
    <PageWrapper>
      <div className="space-y-6">
        <PageHeader
          title="Charts"
          subtitle="TradingView-grade charts: drawings, 100+ indicators, multiple timeframes. Switch to Built-in for SMA/EMA/Volume on your data."
          icon={BarChart2}
        />
        {error && (
          <div className="p-4 rounded-xl bg-apex-loss/20 text-apex-loss border border-apex-loss/30 text-sm">
            {error}
          </div>
        )}

        <Card animate hover>
          <CardHeader
            title={`${symbol} — ${period} / ${interval}`}
            subtitle="TradingView: full tools & indicators. Built-in: SMA, EMA, volume on live data."
          />
          <CardBody>
            {/* Chart mode + Toolbar */}
            <div className="flex flex-wrap gap-3 items-center mb-4">
              <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
                <button
                  onClick={() => setChartMode('tradingview')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    chartMode === 'tradingview' ? 'bg-apex-accent text-black' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  title="Full TradingView: drawings, indicators, timeframes"
                >
                  <Tv size={18} /> TradingView
                </button>
                <button
                  onClick={() => setChartMode('builtin')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    chartMode === 'builtin' ? 'bg-apex-accent text-black' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  title="Built-in chart with SMA, EMA, volume"
                >
                  <BarChart3 size={18} /> Built-in
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {symbolList.map((s) => (
                  <motion.button
                    key={s}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSymbol(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      s === symbol ? 'bg-apex-accent text-black' : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
              <div className="flex gap-2 border-l border-white/20 pl-3">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      period === p.value ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {INTERVALS.map((i) => (
                  <button
                    key={i.value}
                    onClick={() => setInterval(i.value)}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      interval === i.value ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
              {chartMode === 'builtin' && (
                <>
                  <div className="flex gap-1 border-l border-white/20 pl-3">
                    <button
                      onClick={() => setChartType('candle')}
                      className={`p-2 rounded ${chartType === 'candle' ? 'bg-apex-accent/20 text-apex-accent' : 'text-white/50 hover:text-white'}`}
                      title="Candlesticks"
                    >
                      <CandlestickChart size={18} />
                    </button>
                    <button
                      onClick={() => setChartType('line')}
                      className={`p-2 rounded ${chartType === 'line' ? 'bg-apex-accent/20 text-apex-accent' : 'text-white/50 hover:text-white'}`}
                      title="Line"
                    >
                      <LineIcon size={18} />
                    </button>
                  </div>
                  <div className="flex gap-2 border-l border-white/20 pl-3 items-center text-xs text-white/60">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={showVolume} onChange={(e) => setShowVolume(e.target.checked)} className="rounded" />
                      Vol
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={showSma} onChange={(e) => setShowSma(e.target.checked)} className="rounded" />
                      <TrendingUp size={14} /> SMA
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={50}
                      value={smaPeriod}
                      onChange={(e) => setSmaPeriod(Number(e.target.value) || 20)}
                      className="w-12 rounded bg-white/10 border border-white/20 px-1 py-0.5 text-white text-center text-xs"
                    />
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={showEma} onChange={(e) => setShowEma(e.target.checked)} className="rounded" />
                      EMA
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={50}
                      value={emaPeriod}
                      onChange={(e) => setEmaPeriod(Number(e.target.value) || 9)}
                      className="w-12 rounded bg-white/10 border border-white/20 px-1 py-0.5 text-white text-center text-xs"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="min-h-[420px]">
              {chartMode === 'tradingview' ? (
                <TradingViewChart symbol={symbol} interval={interval} height={520} />
              ) : loading ? (
                <div className="h-[420px] flex items-center justify-center text-white/50">Loading chart data...</div>
              ) : data.length === 0 ? (
                <div className="h-[420px] flex items-center justify-center text-white/40">No data. Try another symbol or period.</div>
              ) : (
                <AdvancedChart
                  data={data}
                  chartType={chartType}
                  showSma={showSma}
                  showEma={showEma}
                  showVolume={showVolume}
                  smaPeriod={smaPeriod}
                  emaPeriod={emaPeriod}
                  height={480}
                />
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  )
}
