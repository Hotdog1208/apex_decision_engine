import LegalLayout, { Section, P, UL, LI, Highlight, LegalLink } from '../components/LegalLayout'

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" badge="Legal" updated="April 2026">

      <Section title="1. Introduction">
        <P>Apex Decision Engine ("ADE," "we," "our") is committed to protecting your privacy. This Privacy Policy describes how we collect, use, store, and share information when you use the Service. By creating an account or using ADE, you agree to this policy.</P>
      </Section>

      <Section title="2. Information We Collect">
        <P><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Account information:</strong> email address, display name, hashed password (via Supabase Auth), and subscription tier.</P>
        <P><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Usage data:</strong> pages visited, features used, signals requested, watchlists and alert preferences you create, and event logs used for product analytics.</P>
        <P><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Payment data:</strong> Stripe processes all payment transactions. ADE never stores full card numbers or CVVs. We retain Stripe customer IDs and subscription status to manage your tier.</P>
        <P><strong style={{ color: 'rgba(255,255,255,0.85)' }}>AI interaction data:</strong> queries sent to CIPHER or PRISM, along with generated responses, may be stored temporarily for session continuity and product improvement. We do not sell this data.</P>
        <P><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Technical data:</strong> IP address, browser type, device type, and error logs for security and debugging purposes.</P>
      </Section>

      <Section title="3. How We Use Your Data">
        <UL>
          <LI>To authenticate you and enforce your subscription tier's access limits</LI>
          <LI>To generate and deliver AI signals, PRISM analysis, and CIPHER briefs relevant to your watchlist</LI>
          <LI>To process billing and manage your subscription via Stripe</LI>
          <LI>To send price alerts, signal notifications, and service-related emails you have opted into</LI>
          <LI>To analyze aggregated usage patterns and improve platform features</LI>
          <LI>To detect abuse, enforce our Terms of Service, and protect the security of the platform</LI>
        </UL>
        <P>We do not sell, rent, or trade your personal data to third parties for marketing purposes.</P>
      </Section>

      <Section title="4. Third-Party Services">
        <P>ADE integrates with the following third-party services that may process your data under their own policies:</P>
        <UL>
          <LI><Highlight>Supabase</Highlight> — authentication and database hosting (EU/US regions)</LI>
          <LI><Highlight>Stripe</Highlight> — payment processing and subscription management</LI>
          <LI><Highlight>Anthropic Claude</Highlight> — AI signal generation and CIPHER agent responses</LI>
          <LI><Highlight>Yahoo Finance / Finnhub</Highlight> — market data feeds (symbol queries only, no personal data shared)</LI>
          <LI><Highlight>Render</Highlight> — cloud infrastructure hosting the backend API</LI>
        </UL>
        <P>We encourage you to review the privacy policies of these services. We only share the minimum data necessary for each service to function.</P>
      </Section>

      <Section title="5. Data Retention">
        <P>Account data is retained while your account is active and for up to 90 days after deletion to allow recovery. Signal logs and accuracy records are retained indefinitely for aggregate statistical purposes but are anonymized after account deletion.</P>
        <P>You may request export or deletion of your personal data at any time. See Section 7.</P>
      </Section>

      <Section title="6. Cookies and Local Storage">
        <P>ADE uses browser local storage and session tokens (JWT) to maintain your login session. We do not use third-party tracking cookies or advertising cookies. You may clear local storage at any time through your browser settings, which will log you out.</P>
      </Section>

      <Section title="7. Your Rights (GDPR / CCPA)">
        <P>Depending on your jurisdiction, you may have the right to:</P>
        <UL>
          <LI><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Access</strong> — request a copy of the personal data we hold about you</LI>
          <LI><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Correction</strong> — request correction of inaccurate or incomplete data</LI>
          <LI><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Deletion</strong> — request deletion of your account and associated personal data</LI>
          <LI><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Portability</strong> — request your data in a structured, machine-readable format</LI>
          <LI><strong style={{ color: 'rgba(255,255,255,0.75)' }}>Opt-out</strong> — opt out of non-essential communications at any time</LI>
        </UL>
        <P>To exercise any of these rights, contact us at <Highlight>support@apexdecisionengine.com</Highlight>. We will respond within 30 days.</P>
      </Section>

      <Section title="8. Data Security">
        <P>We implement industry-standard security measures including HTTPS for all data in transit, bcrypt/Supabase-managed password hashing, and row-level security policies on our database. However, no internet transmission is 100% secure. You are responsible for keeping your account credentials confidential.</P>
      </Section>

      <Section title="9. Children's Privacy">
        <P>ADE is not directed to individuals under the age of 18. We do not knowingly collect personal data from minors. If you believe a minor has provided us with personal data, contact us immediately.</P>
      </Section>

      <Section title="10. Changes to This Policy">
        <P>We may update this Privacy Policy from time to time. Material changes will be communicated by email to registered users before the effective date. Continued use of the Service constitutes acceptance of the revised policy.</P>
      </Section>

      <Section title="11. Contact">
        <P>For privacy questions or requests, email us at <Highlight>support@apexdecisionengine.com</Highlight>. See also our <LegalLink to="/terms">Terms of Service</LegalLink>.</P>
      </Section>

    </LegalLayout>
  )
}
