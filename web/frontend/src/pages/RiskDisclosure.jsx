import { Link } from 'react-router-dom'

export default function RiskDisclosure() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 text-slate-300 text-sm">
      <h1 className="text-2xl font-bold text-white">Risk Disclosure</h1>
      <p className="text-slate-500">Trading and investing involve significant risk.</p>
      <section>
        <h2 className="text-lg font-semibold text-white mt-6">Market risk</h2>
        <p>Prices can move against you. You may lose some or all of your capital. Past performance does not guarantee future results.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-white mt-6">Leverage and derivatives</h2>
        <p>Options and futures can lead to losses exceeding your initial investment. Use only capital you can afford to lose.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-white mt-6">ADE is not a broker</h2>
        <p>We do not execute trades or hold funds. Execution risk is between you and your broker. Ensure you understand your broker’s terms and margin requirements.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-white mt-6">No guarantee</h2>
        <p>Signals, scores, and recommendations are not guarantees of profit. Use ADE as one input among many and always apply your own risk management.</p>
      </section>
      <Link to="/" className="inline-block text-apex-accent hover:underline mt-6">Back to Home</Link>
    </div>
  )
}
