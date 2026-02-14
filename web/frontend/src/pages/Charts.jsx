import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../api'

const SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'JPM', 'XOM']

export default function Charts() {
  const [symbol, setSymbol] = useState('AAPL')
  const [data, setData] = useState([])

  useEffect(() => {
    api.getPortfolio().catch(() => ({}))
    const snapshot = { price_history: {} }
    try {
      fetch('/api/portfolio').then(() => {})
    } catch (_) {}
    const prices = [
      172, 174, 176, 178, 181, 182, 180, 183, 185, 184, 185.5, 186, 184.5, 185, 187, 186.5, 188, 189, 187.5, 190,
    ]
    if (symbol === 'MSFT') setData(prices.map((p, i) => ({ day: i + 1, price: 398 + i * 2 + (i % 3) })))
    else if (symbol === 'NVDA') setData(prices.map((p, i) => ({ day: i + 1, price: 720 + i * 10 + (i % 5) * 5 })))
    else setData(prices.map((p, i) => ({ day: i + 1, price: p })))
  }, [symbol])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Charts</h1>
      <p className="text-slate-400 text-sm">Price view (mock). Integrate TradingView Lightweight Charts for full technicals.</p>
      <div className="flex gap-2 mb-4">
        {SYMBOLS.map((s) => (
          <button
            key={s}
            onClick={() => setSymbol(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${s === symbol ? 'bg-apex-accent text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="bg-apex-dark rounded-lg border border-slate-700/50 p-4 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
            <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
