import { useEffect, useRef } from 'react'
import { createChart, ColorType, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts'

export default function TradingChart({ data, chartType = 'candlestick', height = 400, loading }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const series = Array.isArray(data?.series) ? data.series : []

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255,255,255,0.7)',
      },
      grid: { vertLines: { color: 'rgba(255,255,255,0.06)' }, horzLines: { color: 'rgba(255,255,255,0.06)' } },
      width: containerRef.current.clientWidth,
      height,
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)' },
    })
    chartRef.current = chart
    const resize = () => chartRef.current?.applyOptions({ width: containerRef.current?.clientWidth })
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      chart.remove()
      chartRef.current = null
    }
  }, [height])

  useEffect(() => {
    if (!chartRef.current || !series.length) return
    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current)
      seriesRef.current = null
    }
    const chart = chartRef.current
    let s
    if (chartType === 'candlestick') {
      s = chart.addSeries(CandlestickSeries, { upColor: '#00FF88', downColor: '#FF3366' })
      s.setData(series.map((d) => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close })))
    } else {
      const lineData = series.map((d) => ({ time: d.time, value: d.close }))
      if (chartType === 'area') {
        s = chart.addSeries(AreaSeries, { lineColor: '#CCFF00', topColor: 'rgba(204,255,0,0.4)', bottomColor: 'rgba(204,255,0,0)' })
      } else {
        s = chart.addSeries(LineSeries, { color: '#CCFF00' })
      }
      s.setData(lineData)
    }
    seriesRef.current = s
    chart.timeScale().fitContent()
  }, [series, chartType])

  if (loading) return <div style={{ height }} className="flex items-center justify-center bg-white/5 rounded-lg"><span className="text-white/50">Loading…</span></div>
  if (!series.length) return <div style={{ height }} className="flex items-center justify-center bg-white/5 rounded-lg"><span className="text-white/50">No data</span></div>
  return <div ref={containerRef} style={{ height }} />
}
