import { Link } from 'react-router-dom'

const QA = [
  { q: 'Does ADE execute trades?', a: 'No. ADE is intelligence only. You execute on your own broker (E*TRADE, etc.).' },
  { q: 'How do I enable the AI assistant?', a: 'Set OPENAI_API_KEY in your environment and restart the backend. See Settings.' },
  { q: 'Where does market data come from?', a: 'By default, mock JSON files. Optional E*TRADE (or other) API can provide live data.' },
  { q: 'How are confidence scores calculated?', a: 'Weighted composite of structure, volatility, liquidity, risk/reward, and strategy fit. Weights are configurable.' },
  { q: 'Can I export my data?', a: 'Yes. Use Export in Settings or GET /export/trades for trade data.' },
]

export default function FAQ() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">FAQ</h1>
      <div className="space-y-4">
        {QA.map(({ q, a }) => (
          <div key={q} className="rounded-lg border border-slate-700/50 p-4">
            <h2 className="text-white font-medium">{q}</h2>
            <p className="text-slate-400 text-sm mt-1">{a}</p>
          </div>
        ))}
      </div>
      <Link to="/" className="inline-block text-apex-accent hover:underline mt-6">Back to Home</Link>
    </div>
  )
}
