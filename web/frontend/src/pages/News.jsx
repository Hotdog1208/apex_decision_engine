import { useState, useEffect } from 'react'
import { Newspaper } from 'lucide-react'
import { api } from '../api'

export default function News() {
  const [items, setItems] = useState([])

  useEffect(() => {
    api.getNews().then((r) => setItems(r.items || [])).catch(() => setItems([]))
  }, [])

  const sentimentColor = (s) => (s >= 60 ? 'text-apex-profit' : s <= 40 ? 'text-apex-loss' : 'text-slate-400')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Newspaper size={28} className="text-apex-accent" />
        Market News
      </h1>
      <p className="text-slate-400 text-sm">Aggregated financial news with sentiment. Sources: Reuters, CNBC, Bloomberg (mock).</p>
      <div className="space-y-4">
        {items.map((n) => (
          <article key={n.id} className="rounded-lg border border-slate-700/50 bg-apex-dark/50 p-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="text-slate-500 text-xs uppercase">{n.category}</span>
                <h2 className="text-white font-medium mt-1">{n.headline}</h2>
                <p className="text-slate-400 text-sm mt-2">{n.summary}</p>
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  <span>{n.source}</span>
                  <span>{n.timestamp}</span>
                  {n.symbols?.length > 0 && <span>Related: {n.symbols.join(', ')}</span>}
                </div>
              </div>
              <div className={`font-mono font-medium ${sentimentColor(n.sentiment)}`}>
                Sentiment {n.sentiment}/100
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
