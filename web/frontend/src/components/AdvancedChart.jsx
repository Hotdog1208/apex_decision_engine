import { useEffect, useRef, useCallback } from 'react'
import { createChart, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts'

function toChartTime(unixSeconds) {
  const d = new Date(unixSeconds * 1000)
  return d.toISOString().slice(0, 10) // yyyy-MM-dd
}

function computeSMA(data, period) {
  const out = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue
    let sum = 0
    for (let j = 0; j < period; j++) sum += data[i - j].close
    out.push({ time: data[i].time, value: sum / period })
  }
  return out
}

function computeEMA(data, period) {
  const k = 2 / (period + 1)
  const out = []
  let ema = data[0]?.close
  for (let i = 0; i < data.length; i++) {
    if (i === 0) ema = data[0].close
    else ema = data[i].close * k + ema * (1 - k)
    out.push({ time: data[i].time, value: ema })
  }
  return out
}

const CHART_OPTIONS = {
  layout: {
    background: { type: 'solid', color: 'transparent' },
    textColor: 'rgba(255,255,255,0.7)',
    fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
    fontSize: 11,
  },
  grid: {
    vertLines: { color: 'rgba(255,255,255,0.06)' },
    horzLines: { color: 'rgba(255,255,255,0.06)' },
  },
  crosshair: {
    mode: 1,
    vertLine: {
      color: 'rgba(204,255,0,0.5)',
      width: 1,
      style: 2,
      labelBackgroundColor: '#CCFF00',
      labelTextColor: '#0a0a0a',
    },
    horzLine: {
      color: 'rgba(204,255,0,0.5)',
      width: 1,
      style: 2,
      labelBackgroundColor: '#CCFF00',
      labelTextColor: '#0a0a0a',
    },
  },
  rightPriceScale: {
    borderColor: 'rgba(255,255,255,0.1)',
    scaleMargins: { top: 0.1, bottom: 0.2 },
    tickLength: 4,
  },
  timeScale: {
    borderColor: 'rgba(255,255,255,0.1)',
    timeVisible: true,
    secondsVisible: false,
  },
}

export default function AdvancedChart({
  data = [],
  chartType = 'candle',
  showSma = true,
  showEma = true,
  showVolume = true,
  smaPeriod = 20,
  emaPeriod = 9,
  height = 400,
  className = '',
}) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)

  const buildChart = useCallback(() => {
    if (!containerRef.current || !data.length) return

    const candleData = data
      .map((d) => {
        const open = Number(d.open) || Number(d.close) || 0
        const close = Number(d.close) || open
        const high = Number(d.high) || Math.max(open, close)
        const low = Number(d.low) || Math.min(open, close)
        const time = typeof d.time === 'number' ? toChartTime(d.time) : (d.time || '')
        if (!time) return null
        return { ...d, time, open, high, low, close }
      })
      .filter(Boolean)

    if (!candleData.length) return

    const width = Math.max(containerRef.current.clientWidth || 600, 100)
    const chart = createChart(containerRef.current, {
      ...CHART_OPTIONS,
      width,
      height,
    })
    chartRef.current = chart

    // Main series: candlestick or line (lightweight-charts v5 API)
    if (chartType === 'candle') {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      })
      candleSeries.setData(candleData)
    } else {
      const lineSeries = chart.addSeries(LineSeries, {
        color: '#CCFF00',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        lastValueVisible: true,
        priceLineVisible: true,
      })
      lineSeries.setData(candleData.map((d) => ({ time: d.time, value: d.close })))
    }

    // Volume histogram (overlay at bottom)
    if (showVolume && candleData.some((d) => d.volume != null && Number(d.volume) > 0)) {
      const volSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceScaleId: 'volume',
      })
      volSeries.priceScale().applyOptions({ scaleMargins: { top: 0.75, bottom: 0 }, borderVisible: false })
      volSeries.setData(
        candleData.map((d) => ({
          time: d.time,
          value: Number(d.volume) || 0,
          color: (d.close >= (d.open || d.close) ? '#22c55e' : '#ef4444'),
        }))
      )
    }

    // Indicators
    if (showSma && candleData.length >= smaPeriod) {
      const smaData = computeSMA(candleData, smaPeriod)
      const smaSeries = chart.addSeries(LineSeries, {
        color: 'rgba(59, 130, 246, 0.9)',
        lineWidth: 1,
        title: `SMA ${smaPeriod}`,
      })
      smaSeries.setData(smaData)
    }
    if (showEma && candleData.length >= emaPeriod) {
      const emaData = computeEMA(candleData, emaPeriod)
      const emaSeries = chart.addSeries(LineSeries, {
        color: 'rgba(168, 85, 247, 0.9)',
        lineWidth: 1,
        title: `EMA ${emaPeriod}`,
      })
      emaSeries.setData(emaData)
    }

    chart.timeScale().fitContent()

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        const w = Math.max(containerRef.current.clientWidth || 100, 100)
        chartRef.current.applyOptions({ width: w })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [data, chartType, showSma, showEma, showVolume, smaPeriod, emaPeriod, height])

  useEffect(() => {
    buildChart()
    return () => {
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [buildChart])

  return (
    <div className={className} style={{ position: 'relative', width: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: `${height}px` }} />
    </div>
  )
}
