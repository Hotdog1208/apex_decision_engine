import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 text-slate-300 text-sm">
      <h1 className="text-2xl font-bold text-white">Terms of Service</h1>
      <p className="text-slate-500">Last updated: 2025</p>
      <section>
        <h2 className="text-lg font-semibold text-white mt-6">1. Acceptance</h2>
        <p>By using Apex Decision Engine you agree to these terms and our Privacy Policy.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-white mt-6">2. Nature of service</h2>
        <p>ADE is an intelligence and analysis platform only. We do not execute trades, hold funds, or act as a broker. You are solely responsible for your trading decisions and execution on your chosen broker.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-white mt-6">3. No financial advice</h2>
        <p>Content and tools are for informational and educational purposes only and do not constitute financial, investment, or trading advice. You should consult qualified professionals before making financial decisions.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-white mt-6">4. Account and use</h2>
        <p>You must provide accurate information and keep your credentials secure. You may not misuse the service, attempt unauthorized access, or resell data.</p>
      </section>
      <Link to="/" className="inline-block text-apex-accent hover:underline mt-6">Back to Home</Link>
    </div>
  )
}
