import LegalLayout, { Section, P, UL, LI, Highlight, LegalLink } from '../components/LegalLayout'

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" badge="Legal" updated="April 2026">

      <Section title="1. Acceptance of Terms">
        <P>By creating an account on or otherwise accessing Apex Decision Engine ("ADE," "we," "our," or "the Service"), you agree to be bound by these Terms of Service and our <LegalLink to="/privacy">Privacy Policy</LegalLink>. If you do not agree, do not use the Service.</P>
        <P>These Terms apply to all users regardless of subscription tier (Free, EDGE, ALPHA, or APEX).</P>
      </Section>

      <Section title="2. Nature of Service">
        <P>Apex Decision Engine is a market intelligence and analysis platform. ADE provides:</P>
        <UL>
          <LI>Quantitative signal generation using algorithmic models (PRISM signal engine)</LI>
          <LI>AI-assisted analysis via large language models (Anthropic Claude)</LI>
          <LI>A personal AI market agent for APEX subscribers (CIPHER)</LI>
          <LI>Unusual Options Activity (UOA) monitoring and market data tools</LI>
          <LI>Educational resources, track record data, and analytics</LI>
        </UL>
        <P><strong style={{ color: 'rgba(255,255,255,0.85)' }}>ADE is not a broker-dealer, investment adviser, financial planner, or registered commodity trading adviser.</strong> We do not execute trades, hold funds, manage portfolios, or have custody of any assets. Nothing on this platform constitutes financial, investment, tax, or legal advice.</P>
      </Section>

      <Section title="3. No Financial Advice">
        <P>All content, signals, scores, analysis, CIPHER agent briefs, PRISM recommendations, and other outputs produced by ADE are for <strong style={{ color: 'rgba(255,255,255,0.85)' }}>informational and educational purposes only</strong>. They do not constitute and should not be construed as financial advice, investment recommendations, or solicitations to buy or sell any security.</P>
        <P>You acknowledge that:</P>
        <UL>
          <LI>Trading and investing involve substantial risk of loss, including the possibility of losing more than your initial investment</LI>
          <LI>Past signal accuracy does not guarantee future results</LI>
          <LI>AI-generated analysis (PRISM, CIPHER) can be incomplete, delayed, or incorrect</LI>
          <LI>You should consult a qualified financial professional before making any investment decision</LI>
        </UL>
      </Section>

      <Section title="4. Subscription Plans and Billing">
        <P>ADE offers the following subscription tiers:</P>
        <UL>
          <LI><Highlight>FREE</Highlight> — limited access, no AI signals</LI>
          <LI><Highlight>EDGE</Highlight> — AI signals for up to 10 symbols</LI>
          <LI><Highlight>ALPHA</Highlight> — AI signals + PRISM chat assistant</LI>
          <LI><Highlight>APEX</Highlight> — full access including CIPHER personal agent</LI>
        </UL>
        <P>Paid subscriptions are billed monthly via Stripe. By subscribing, you authorize us to charge your payment method on a recurring basis until you cancel. Prices are listed on the <LegalLink to="/pricing">Pricing page</LegalLink>. We reserve the right to change pricing with 30 days' notice to active subscribers.</P>
        <P>Subscriptions may be cancelled at any time through the Stripe Customer Portal accessible from your Account page. Cancellation takes effect at the end of the current billing period — no partial-month refunds are issued except where required by applicable law.</P>
        <P>We reserve the right to suspend or terminate accounts for non-payment, abuse, or violation of these Terms.</P>
      </Section>

      <Section title="5. Account and Security">
        <P>You are responsible for maintaining the confidentiality of your account credentials, including your password and any two-factor authentication (2FA) codes. You agree to notify us immediately of any unauthorized access.</P>
        <P>You must provide accurate, current, and complete information when creating an account and keep it updated. Accounts may not be shared, transferred, or sold.</P>
      </Section>

      <Section title="6. Acceptable Use">
        <P>You agree not to:</P>
        <UL>
          <LI>Use ADE for any unlawful purpose or in violation of any regulations</LI>
          <LI>Attempt to access, reverse-engineer, or extract data beyond your tier's permitted limits</LI>
          <LI>Resell, redistribute, or commercially exploit ADE's signals, data, or outputs</LI>
          <LI>Use automated scripts, bots, or scrapers to access the platform</LI>
          <LI>Circumvent rate limits, access controls, or tier restrictions</LI>
          <LI>Introduce malware or interfere with the integrity of the Service</LI>
        </UL>
        <P>Violation of these restrictions may result in immediate account termination without refund.</P>
      </Section>

      <Section title="7. AI and Algorithmic Output">
        <P>ADE's signals, scores, and agent outputs are generated using quantitative models and large language models (Anthropic Claude). These systems:</P>
        <UL>
          <LI>May produce inaccurate, outdated, or incomplete results</LI>
          <LI>Are trained on historical data and cannot predict the future</LI>
          <LI>Are not reviewed by human analysts before delivery</LI>
          <LI>Should be treated as one analytical input — not a standalone basis for trading decisions</LI>
        </UL>
        <P>CIPHER (the APEX agent) and PRISM are marketing names for AI systems; they are not human advisors, employees, or registered professionals.</P>
      </Section>

      <Section title="8. Intellectual Property">
        <P>All platform content, software, models, branding, and documentation are the property of Apex Decision Engine and its licensors. You are granted a limited, non-exclusive, non-transferable license to use the Service for its intended purpose during your active subscription.</P>
        <P>Market data displayed on the platform may be subject to third-party terms (Yahoo Finance, Finnhub). You agree to comply with those terms where applicable.</P>
      </Section>

      <Section title="9. Disclaimer of Warranties">
        <P>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT SIGNALS WILL BE ACCURATE OR PROFITABLE.</P>
      </Section>

      <Section title="10. Limitation of Liability">
        <P>TO THE MAXIMUM EXTENT PERMITTED BY LAW, ADE'S TOTAL LIABILITY FOR ANY CLAIMS ARISING UNDER THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU PAID TO ADE IN THE 12 MONTHS PRECEDING THE CLAIM. IN NO EVENT SHALL ADE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO TRADING LOSSES, LOSS OF PROFITS, OR LOSS OF DATA.</P>
      </Section>

      <Section title="11. Indemnification">
        <P>You agree to indemnify and hold harmless ADE, its affiliates, and its employees from any claims, damages, or expenses (including legal fees) arising from your use of the Service, your trading decisions, or your violation of these Terms.</P>
      </Section>

      <Section title="12. Governing Law and Disputes">
        <P>These Terms are governed by the laws of the United States. Any disputes shall be resolved through binding arbitration, except where prohibited by law. You waive any right to a jury trial or class action.</P>
      </Section>

      <Section title="13. Changes to Terms">
        <P>We may update these Terms at any time. Material changes will be communicated by email to registered users at least 14 days before taking effect. Continued use of the Service after the effective date constitutes acceptance of the revised Terms.</P>
      </Section>

      <Section title="14. Contact">
        <P>For questions about these Terms, contact us at <Highlight>support@apexdecisionengine.com</Highlight>.</P>
      </Section>

    </LegalLayout>
  )
}
