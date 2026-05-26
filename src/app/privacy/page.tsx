'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

const LAST_UPDATED = 'May 25, 2025';

export default function PrivacyPage() {
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ background: '#F5F3FB' }}>
      {/* Nav */}
      <header className="h-14 flex items-center px-8 border-b" style={{ borderColor: 'rgba(123,110,196,0.12)', background: 'rgba(255,255,255,0.80)' }}>
        <Link href="/" aria-label="Notes & Edges home">
          <Logo size={28} fontSize={14} />
        </Link>
      </header>

      <main className="max-w-[720px] mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <p className="text-[11px] font-medium tracking-[0.10em] uppercase mb-3" style={{ color: '#7B6EC4' }}>Legal</p>
          <h1 className="font-[family-name:var(--font-fraunces)] text-[42px] leading-tight mb-4" style={{ color: '#251E3D' }}>
            Privacy Policy
          </h1>
          <p className="text-[14px]" style={{ color: '#9C95B5' }}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose-container flex flex-col gap-10">

          <Section>
            <p style={{ color: '#5A5272' }}>
              Notes & Edges (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your privacy. This policy explains what information we collect when you use our service, how we use it, and the choices you have. By using Notes & Edges, you agree to the practices described here.
            </p>
          </Section>

          <Section title="1. Information We Collect">
            <SubSection title="Account information">
              When you create an account we collect your email address and, if you sign in via a third-party provider (e.g. Google), your name and profile picture as shared by that provider. We do not store your password in plain text — passwords are hashed using industry-standard algorithms.
            </SubSection>
            <SubSection title="Note content">
              The text you paste or upload to generate a knowledge graph is stored on our servers so we can display your graph on future visits. We treat your notes as private by default — they are not shared with other users.
            </SubSection>
            <SubSection title="Usage data">
              We collect anonymous logs of feature interactions (e.g. graph views, node clicks, session duration) to understand how the product is used and to improve it. This data is not linked to your identity in analytics dashboards.
            </SubSection>
            <SubSection title="Device &amp; technical information">
              We automatically receive your browser type, operating system, IP address, and referring URL when you access the service. IP addresses are used for security purposes (rate limiting, abuse detection) and are not sold or shared with advertisers.
            </SubSection>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul className="flex flex-col gap-2 list-none pl-0">
              {[
                'Generate and display your knowledge graphs.',
                'Authenticate you and keep your account secure.',
                'Send transactional emails (account confirmation, password reset). We do not send marketing email without your explicit opt-in.',
                'Detect and prevent fraud, abuse, and violations of our Terms of Service.',
                'Analyse aggregate, anonymised usage patterns to improve the product.',
                'Comply with legal obligations.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] leading-relaxed" style={{ color: '#5A5272' }}>
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#7B6EC4', opacity: 0.5 }} />
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="3. AI Processing">
            <p style={{ color: '#5A5272' }}>
              To generate your knowledge graph, your note content is sent to a third-party AI provider (currently Anthropic). This transmission is encrypted in transit. We do not permit our AI providers to use your note content to train their own models, and our agreements with them restrict use of your data to processing your requests only.
            </p>
            <p className="mt-3" style={{ color: '#5A5272' }}>
              You should not paste content that is confidential, classified, or subject to non-disclosure obligations unless you are comfortable with it being transmitted to an AI processing service.
            </p>
          </Section>

          <Section title="4. Data Sharing">
            <p style={{ color: '#5A5272' }}>
              We do not sell your personal data. We share information only in the following limited circumstances:
            </p>
            <ul className="flex flex-col gap-2 list-none pl-0 mt-3">
              {[
                'Service providers — Supabase (database and authentication), Vercel (hosting), and Anthropic (AI processing). Each is bound by data processing agreements.',
                'Legal requirements — if required by law, court order, or to protect the rights, property, or safety of Notes & Edges or its users.',
                'Business transfers — in the event of a merger, acquisition, or sale of assets, your data may transfer to the successor entity, subject to the same privacy commitments.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] leading-relaxed" style={{ color: '#5A5272' }}>
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#7B6EC4', opacity: 0.5 }} />
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="5. Data Retention">
            <p style={{ color: '#5A5272' }}>
              We retain your account data and note content for as long as your account is active. If you delete your account, we will delete your personal data and note content within 30 days, except where we are required to retain it for legal or compliance purposes.
            </p>
          </Section>

          <Section title="6. Security">
            <p style={{ color: '#5A5272' }}>
              We use TLS encryption for all data in transit and AES-256 encryption for data at rest. Access to production databases is restricted to authorised personnel and protected by multi-factor authentication. Despite these measures, no system is completely secure — please use a strong, unique password and notify us immediately if you suspect unauthorised access to your account.
            </p>
          </Section>

          <Section title="7. Your Rights">
            <p style={{ color: '#5A5272' }}>
              Depending on where you are located, you may have the right to access, correct, export, or delete the personal data we hold about you. You can:
            </p>
            <ul className="flex flex-col gap-2 list-none pl-0 mt-3">
              {[
                'Export your graph data from within the app.',
                'Request deletion of your account and all associated data through the app settings.',
                'Object to or restrict certain processing.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] leading-relaxed" style={{ color: '#5A5272' }}>
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#7B6EC4', opacity: 0.5 }} />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3" style={{ color: '#5A5272' }}>
              We will respond to verified requests within 30 days.
            </p>
          </Section>

          <Section title="8. Cookies">
            <p style={{ color: '#5A5272' }}>
              We use only essential cookies required to keep you signed in and maintain a secure session. We do not use tracking cookies or third-party advertising cookies.
            </p>
          </Section>

          <Section title="9. Children">
            <p style={{ color: '#5A5272' }}>
              Notes & Edges is not directed to children under the age of 13. If you believe a child under 13 has provided us with personal data, please reach out and we will delete it promptly.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p style={{ color: '#5A5272' }}>
              We may update this policy from time to time. When we do, we will revise the &quot;Last updated&quot; date at the top and, for material changes, notify you via email or an in-app notice at least 14 days before the change takes effect. Continued use of the service after the effective date constitutes your acceptance of the updated policy.
            </p>
          </Section>

          <Section title="11. Contact">
            <p style={{ color: '#5A5272' }}>
              Questions or concerns about this policy? You can reach us through the app.
            </p>
          </Section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t flex items-center gap-6" style={{ borderColor: 'rgba(123,110,196,0.12)' }}>
          <Link href="/" className="text-[12px] transition-colors" style={{ color: '#9C95B5' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#5A5272'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9C95B5'; }}>
            ← Home
          </Link>
          <Link href="/terms" className="text-[12px] transition-colors" style={{ color: '#9C95B5' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#5A5272'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9C95B5'; }}>
            Terms of Service
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      {title && (
        <h2 className="text-[18px] font-semibold" style={{ color: '#251E3D' }}>{title}</h2>
      )}
      {children}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <h3 className="text-[14px] font-semibold" style={{ color: '#251E3D' }}>{title}</h3>
      <p className="text-[14px] leading-relaxed" style={{ color: '#5A5272' }}>{children}</p>
    </div>
  );
}
