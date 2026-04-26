import LegalLayout, { Section, P, Highlight } from '../components/LegalLayout'

const GROUPS = [
  {
    category: 'Options Greeks',
    terms: [
      { term: 'Delta', def: 'Rate of change of option price relative to a $1 move in the underlying. Call delta ranges from 0 to 1; put delta from -1 to 0. A 0.50 delta call moves ~$0.50 per $1 move in the stock.' },
      { term: 'Gamma', def: 'Rate of change of delta per $1 move in the underlying. High gamma means delta changes rapidly — important near expiration or at-the-money.' },
      { term: 'Theta', def: 'Daily time decay — how much value an option loses per day, all else equal. Theta works against buyers and in favor of sellers.' },
      { term: 'Vega', def: 'Sensitivity of option price to a 1% change in implied volatility. Long options have positive vega (benefit from IV expansion).' },
      { term: 'Rho', def: 'Sensitivity to interest rate changes. Generally minor for short-dated options; more relevant for LEAPs.' },
    ],
  },
  {
    category: 'Volatility',
    terms: [
      { term: 'Implied Volatility (IV)', def: 'The market\'s forward-looking estimate of volatility, backed out from option prices. High IV means options are expensive; low IV means they\'re cheap.' },
      { term: 'IV Rank (IVR)', def: 'Where current IV sits within its 52-week range. IVR of 80 means current IV is higher than 80% of readings over the past year. Used to identify elevated or suppressed vol environments.' },
      { term: 'IV Percentile (IVP)', def: 'Percentage of days in the past year when IV was lower than today. Similar to IVR but percentile-based — less sensitive to outliers.' },
      { term: 'Historical Volatility (HV)', def: 'Realized annualized volatility of price returns over a lookback window (typically 20, 30, or 60 days). Comparing HV to IV reveals whether options are rich or cheap.' },
      { term: 'VIX', def: 'CBOE Volatility Index — the market\'s 30-day implied volatility expectation on the S&P 500. Often called the "fear gauge." Spikes during market stress.' },
    ],
  },
  {
    category: 'Signal & Scoring',
    terms: [
      { term: 'Confluence Score', def: 'ADE\'s composite signal strength metric (0–100). Combines multi-timeframe agreement, momentum, volume, and market regime factors. Higher scores indicate stronger alignment across signals.' },
      { term: 'Verdict', def: 'PRISM\'s directional output: BUY (bullish), AVOID (bearish/risky), or WATCH (neutral/unclear). Based on confluence score and AI analysis.' },
      { term: 'Primary Timeframe', def: 'The timeframe with the strongest signal contribution: Scalp (intraday), Swing (days–weeks), or Long (weeks–months).' },
      { term: 'Lead Signal', def: 'The dominant technical or quantitative factor driving the current verdict (e.g., breakout, momentum, mean reversion).' },
    ],
  },
  {
    category: 'Options Strategies',
    terms: [
      { term: 'Long Call', def: 'Buying a call option. Bullish directional bet. Max loss = premium paid. Max gain = theoretically unlimited. Profits if underlying rises above the strike + premium.' },
      { term: 'Long Put', def: 'Buying a put option. Bearish directional bet. Max loss = premium paid. Profits if underlying falls below strike − premium.' },
      { term: 'Credit Spread', def: 'Selling a closer-to-the-money option and buying a further out-of-the-money option to cap risk. Collect premium; max profit is the credit received.' },
      { term: 'Iron Condor', def: 'Selling an OTM call spread + OTM put spread on the same underlying. Profits in low-volatility, range-bound environments. Max profit = total credit; max loss = width of spread − credit.' },
      { term: 'Straddle', def: 'Buying a call and put at the same strike and expiration. Profits from large moves in either direction. Effective when a large catalyst is expected but direction is uncertain.' },
    ],
  },
  {
    category: 'Market Structure',
    terms: [
      { term: 'Support', def: 'A price level where buying interest has historically emerged, causing price to bounce. A break below support is often bearish.' },
      { term: 'Resistance', def: 'A price level where selling pressure has historically emerged, capping upside. A break above resistance is often bullish.' },
      { term: 'Breakout', def: 'Price moving decisively above resistance (bullish) or below support (bearish), typically on elevated volume.' },
      { term: 'Mean Reversion', def: 'The tendency of price to revert toward a historical average or equilibrium after an extreme move. Opposite of momentum.' },
      { term: 'Market Regime', def: 'The current macro environment — trending/bullish, trending/bearish, or range-bound. ADE\'s regime detection informs signal weights.' },
    ],
  },
  {
    category: 'Risk & Performance',
    terms: [
      { term: 'Risk/Reward (R:R)', def: 'Ratio of potential profit to potential loss. An R:R of 2:1 means you risk $1 to make $2. Generally, higher R:R requirements filter lower-quality setups.' },
      { term: 'Max Drawdown', def: 'The largest peak-to-trough decline in portfolio or strategy value over a period. Measures downside risk severity.' },
      { term: 'Sharpe Ratio', def: 'Risk-adjusted return: excess return (above risk-free rate) divided by standard deviation. Higher is better. A Sharpe of >1.0 is generally considered good.' },
      { term: 'Win Rate', def: 'Percentage of trades that are profitable. High win rate alone is not sufficient — must be considered alongside R:R. A 40% win rate can be profitable with a 3:1 R:R.' },
      { term: 'Expected Value (EV)', def: 'Statistical expectation of profit per trade: (win rate × avg win) − (loss rate × avg loss). Positive EV is required for long-term profitability.' },
    ],
  },
  {
    category: 'Unusual Options Activity (UOA)',
    terms: [
      { term: 'Open Interest (OI)', def: 'Total number of outstanding option contracts for a given strike/expiration. Increasing OI with volume indicates new positions being opened.' },
      { term: 'Volume/OI Ratio', def: 'Options volume relative to open interest. A ratio > 1.0 means more contracts traded today than currently exist — often indicates unusual activity.' },
      { term: 'Sweep', def: 'A large options order routed across multiple exchanges simultaneously to fill quickly — often interpreted as urgency by an institutional buyer.' },
      { term: 'Block Trade', def: 'A single large options transaction, typically 100+ contracts, executed at once. May indicate institutional hedging or directional positioning.' },
    ],
  },
]

export default function Glossary() {
  return (
    <LegalLayout title="Glossary" badge="Reference" updated="April 2026">
      <P style={{ color: 'rgba(255,255,255,0.42)', fontSize: '12px', marginBottom: '32px' }}>
        Key trading, options, and platform terminology used throughout Apex Decision Engine.
      </P>

      {GROUPS.map(({ category, terms }) => (
        <Section key={category} title={category}>
          {terms.map(({ term, def }) => (
            <div
              key={term}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr',
                gap: '12px',
                marginBottom: '10px',
                alignItems: 'start',
              }}
            >
              <Highlight>{term}</Highlight>
              <span style={{
                fontFamily: 'var(--font-body, Inter, sans-serif)',
                fontSize: '12px', lineHeight: 1.65,
                color: 'rgba(255,255,255,0.52)',
              }}>
                {def}
              </span>
            </div>
          ))}
        </Section>
      ))}
    </LegalLayout>
  )
}
