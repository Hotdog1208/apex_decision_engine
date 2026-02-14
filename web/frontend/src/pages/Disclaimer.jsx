import { Link } from 'react-router-dom'

export default function Disclaimer() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 text-slate-300 text-sm">
      <h1 className="text-2xl font-bold text-white">Disclaimer</h1>
      <p className="text-slate-500">Important notice about using Apex Decision Engine.</p>
      <section>
        <p>
          Apex Decision Engine (“ADE”) is an analysis and intelligence platform only. Nothing on this site or in the product constitutes financial, investment, tax, or legal advice. All content, signals, scores, and tools are for informational and educational purposes. You are solely responsible for your trading and investment decisions. See our <Link to="/risk-disclosure" className="text-apex-accent hover:underline">Risk Disclosure</Link> and <Link to="/terms" className="text-apex-accent hover:underline">Terms of Service</Link>.
        </p>
      </section>
      <Link to="/" className="inline-block text-apex-accent hover:underline mt-6">Back to Home</Link>
    </div>
  )
}
