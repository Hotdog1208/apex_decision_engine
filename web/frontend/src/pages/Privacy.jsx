import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 text-slate-300 text-sm">
      <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
      <p className="text-slate-500">Last updated: 2025</p>
      <section>
        <h2 className="text-lg font-semibold text-white mt-6">1. Information we collect</h2>
        <p>We collect account information (email, hashed password), usage data (pages visited, features used), and any data you provide (watchlists, alert preferences). We do not store payment or brokerage credentials in plain text.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-white mt-6">2. How we use it</h2>
        <p>To operate the service, personalize your experience, send alerts you requested, and improve the product. We do not sell your data to third parties.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-white mt-6">3. Data retention</h2>
        <p>Account and preference data is retained while your account is active. You may request export or deletion of your data.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-white mt-6">4. Your rights (GDPR/CCPA)</h2>
        <p>You may request access, correction, export, or deletion of your personal data. Contact us via the support email.</p>
      </section>
      <Link to="/" className="inline-block text-apex-accent hover:underline mt-6">Back to Home</Link>
    </div>
  )
}
