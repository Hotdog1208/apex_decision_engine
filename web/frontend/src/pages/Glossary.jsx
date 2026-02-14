import { Link } from 'react-router-dom'

const TERMS = [
  { term: 'IV Rank', def: 'Where current implied volatility sits within its 52-week range. 0 = at low, 100 = at high.' },
  { term: 'IV Percentile', def: 'Percentage of days in the past year when IV was lower than today.' },
  { term: 'Delta', def: 'Sensitivity of option price to $1 move in underlying. Call delta 0.5 ≈ 50% chance ITM at expiry.' },
  { term: 'Theta', def: 'Time decay; how much option loses per day.' },
  { term: 'Vega', def: 'Sensitivity to 1% change in implied volatility.' },
  { term: 'R:R (Risk/Reward)', def: 'Ratio of potential profit to potential loss on a trade.' },
  { term: 'Sharpe Ratio', def: 'Risk-adjusted return; excess return per unit of volatility.' },
  { term: 'Max Drawdown', def: 'Largest peak-to-trough decline in portfolio value.' },
  { term: 'Breakout', def: 'Price moving above resistance or below support with conviction.' },
  { term: 'Mean Reversion', def: 'Expectation that price will revert toward an average after an extreme move.' },
]

export default function Glossary() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Glossary</h1>
      <p className="text-slate-400 text-sm">Trading and options terms explained.</p>
      <div className="space-y-4">
        {TERMS.map(({ term, def: d }) => (
          <div key={term} className="rounded-lg border border-slate-700/50 p-4">
            <h2 className="text-apex-accent font-medium">{term}</h2>
            <p className="text-slate-300 text-sm mt-1">{d}</p>
          </div>
        ))}
      </div>
      <Link to="/" className="inline-block text-apex-accent hover:underline mt-6">Back to Home</Link>
    </div>
  )
}
