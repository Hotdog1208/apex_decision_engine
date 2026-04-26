import LegalLayout, { Section, P, UL, LI, Highlight, LegalLink } from '../components/LegalLayout'

const QA = [
  {
    section: 'About ADE',
    items: [
      {
        q: 'What is Apex Decision Engine?',
        a: 'ADE is a market intelligence and analysis platform. It generates AI-powered trading signals (PRISM), provides unusual options activity monitoring, and — for APEX subscribers — a personal AI market agent called CIPHER. It is not a broker and does not execute trades.',
      },
      {
        q: 'Is ADE financial advice?',
        a: 'No. All signals, scores, and analysis are for informational and educational purposes only. Nothing on ADE constitutes investment advice or a recommendation to buy or sell any security. See our Disclaimer and Risk Disclosure.',
      },
      {
        q: 'What subscription tiers are available?',
        a: 'FREE (limited access), EDGE (AI signals for up to 10 symbols), ALPHA (AI signals + PRISM chat assistant), and APEX (full access including the CIPHER personal agent). Pricing is available on the Pricing page.',
      },
    ],
  },
  {
    section: 'Signals & PRISM',
    items: [
      {
        q: 'How are PRISM signals generated?',
        a: 'PRISM uses a multi-timeframe confluence scoring model that analyzes price action, volume, momentum indicators, and market regime data. The final verdict (BUY / AVOID / WATCH) and confidence score are produced by Anthropic Claude based on this quantitative input.',
      },
      {
        q: 'How accurate are the signals?',
        a: 'Historical accuracy is tracked on the Track Record page and reflects actual signal outcomes evaluated against 1-day and 3-day price changes. These figures are historical and do not guarantee future performance.',
      },
      {
        q: 'How often are signals refreshed?',
        a: 'Signals are cached for 15 minutes per symbol. You can force a refresh using the refresh button on the signal card. Signals are generated on-demand — ADE does not pre-generate or push signals.',
      },
      {
        q: 'What does UOA mean?',
        a: 'Unusual Options Activity — large or atypical options flows detected relative to open interest and average daily volume. UOA can indicate institutional positioning, hedging, or speculative bets. It should be interpreted with caution, not followed blindly.',
      },
    ],
  },
  {
    section: 'CIPHER Agent',
    items: [
      {
        q: 'What is CIPHER?',
        a: 'CIPHER is your personal AI market agent, available on the APEX tier. It generates a daily pre-market briefing tailored to your watchlist and preferences, and answers market questions in a conversational format powered by Anthropic Claude.',
      },
      {
        q: 'How do I set up CIPHER?',
        a: 'After upgrading to APEX, go to the Agent page and complete the preferences onboarding. Set your risk profile, trading style, and watchlist symbols. CIPHER will generate your first brief automatically.',
      },
      {
        q: 'Is CIPHER a licensed financial advisor?',
        a: 'No. CIPHER is an AI system — a marketing name for an Anthropic Claude-powered assistant. It is not a human advisor, not a registered investment adviser, and its output is not financial advice.',
      },
    ],
  },
  {
    section: 'Billing & Account',
    items: [
      {
        q: 'How does billing work?',
        a: 'Subscriptions are billed monthly via Stripe. You can upgrade, downgrade, or cancel at any time through the Stripe Customer Portal accessible from your Account page. Cancellations take effect at the end of the current billing period.',
      },
      {
        q: 'Are refunds available?',
        a: 'We do not issue partial-month refunds except where required by applicable law. If you have a billing issue, contact support@apexdecisionengine.com.',
      },
      {
        q: 'Can I share my account?',
        a: 'No. Accounts may not be shared, transferred, or sold. Each subscription is for individual use only. Sharing accounts may result in termination.',
      },
      {
        q: 'How do I cancel my subscription?',
        a: 'Go to Account → Manage Billing → Customer Portal (Stripe). Cancel your subscription there. Access continues until the end of the current billing period.',
      },
    ],
  },
  {
    section: 'Technical',
    items: [
      {
        q: 'Where does market data come from?',
        a: 'Live quotes and chart data are sourced from Yahoo Finance (via yfinance) and Finnhub. Data may be delayed by several minutes. ADE is not responsible for data accuracy or completeness.',
      },
      {
        q: 'Can I export my signal history?',
        a: 'Trade and signal data export is available via Account settings. Signal accuracy history is stored in Supabase and accessible through the Track Record page.',
      },
      {
        q: 'What happens if the backend is down?',
        a: 'ADE displays error states when the API is unreachable. Signal generation, CIPHER, and real-time data require the backend to be running. Static pages (legal, pricing, landing) remain accessible.',
      },
    ],
  },
]

export default function FAQ() {
  return (
    <LegalLayout title="FAQ" badge="Support" updated="April 2026">
      {QA.map(({ section, items }) => (
        <Section key={section} title={section}>
          {items.map(({ q, a }) => (
            <div
              key={q}
              style={{
                marginBottom: '16px',
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{
                fontFamily: 'var(--font-body, Inter, sans-serif)',
                fontSize: '12px', fontWeight: 600,
                color: 'rgba(255,255,255,0.82)',
                marginBottom: '6px',
              }}>
                {q}
              </div>
              <div style={{
                fontFamily: 'var(--font-body, Inter, sans-serif)',
                fontSize: '12px', lineHeight: 1.7,
                color: 'rgba(255,255,255,0.52)',
              }}>
                {a}
              </div>
            </div>
          ))}
        </Section>
      ))}

      <Section title="Still have questions?">
        <P>Contact us at <Highlight>support@apexdecisionengine.com</Highlight> or review our <LegalLink to="/terms">Terms of Service</LegalLink>, <LegalLink to="/privacy">Privacy Policy</LegalLink>, and <LegalLink to="/risk-disclosure">Risk Disclosure</LegalLink>.</P>
      </Section>
    </LegalLayout>
  )
}
