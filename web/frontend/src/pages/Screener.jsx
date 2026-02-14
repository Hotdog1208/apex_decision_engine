import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { api } from '../api'

export default function Screener() {
  const [results, setResults] = useState([])
  const [filters, setFilters] = useState({ min_price: 0, max_price: 1000, min_volume: 0, sectors: '' })

  const run = () => {
    const params = {}
    if (filters.min_price > 0) params.min_price = filters.min_price
    if (filters.max_price < 10000) params.max_price = filters.max_price
    if (filters.min_volume > 0) params.min_volume = filters.min_volume
    if (filters.sectors) params.sectors = filters.sectors
    api.screener(params).then((r) => setResults(r.results || [])).catch(() => setResults([]))
  }

  useEffect(() => {
    run()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Search size={28} className="text-apex-accent" />
        Stock Screener
      </h1>
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-slate-400 text-xs mb-1">Min Price</label>
          <input
            type="number"
            value={filters.min_price}
            onChange={(e) => setFilters({ ...filters, min_price: Number(e.target.value) || 0 })}
            className="rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white w-24"
          />
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1">Max Price</label>
          <input
            type="number"
            value={filters.max_price}
            onChange={(e) => setFilters({ ...filters, max_price: Number(e.target.value) || 10000 })}
            className="rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white w-24"
          />
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1">Min Volume</label>
          <input
            type="number"
            value={filters.min_volume}
            onChange={(e) => setFilters({ ...filters, min_volume: Number(e.target.value) || 0 })}
            className="rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white w-28"
          />
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1">Sectors (comma)</label>
          <input
            type="text"
            value={filters.sectors}
            onChange={(e) => setFilters({ ...filters, sectors: e.target.value })}
            placeholder="Technology, Energy"
            className="rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white w-40"
          />
        </div>
        <button onClick={run} className="px-4 py-2 rounded-lg bg-apex-accent text-white text-sm">
          Run
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-left">
              <th className="py-2 px-2">Symbol</th>
              <th className="py-2 px-2">Price</th>
              <th className="py-2 px-2">Volume</th>
              <th className="py-2 px-2">Sector</th>
              <th className="py-2 px-2">Return 20d</th>
              <th className="py-2 px-2">Score</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.symbol} className="border-b border-slate-700/50">
                <td className="py-2 px-2 font-mono text-white">{r.symbol}</td>
                <td className="py-2 px-2 text-slate-300">{r.price?.toFixed(2)}</td>
                <td className="py-2 px-2 text-slate-300">{(r.volume / 1e6)?.toFixed(2)}M</td>
                <td className="py-2 px-2 text-slate-300">{r.sector}</td>
                <td className={`py-2 px-2 ${(r.returns_20d || 0) >= 0 ? 'text-apex-profit' : 'text-apex-loss'}`}>
                  {((r.returns_20d || 0) * 100).toFixed(1)}%
                </td>
                <td className="py-2 px-2 text-white">{r.score?.toFixed(0) ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
