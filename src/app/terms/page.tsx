'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

const LAST_UPDATED = 'May 26, 2026';

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-[14px]" style={{ color: '#9C95B5' }}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="flex flex-col gap-10">

          <Section>
            <p style={{ color: '#5A5272' }}>
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of Notes & Edges (&quot;Service&quot;), operated by Notes & Edges (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
            </p>
          </Section>

          <Section title="1. Eligibility">
            <p style={{ color: '#5A5272' }}>
              You must be at least 13 years old to use the Service. If you are under 18, you represent that your parent or legal guardian has reviewed and agreed to these Terms on your behalf. By using the Service, you represent that you meet these requirements and that all information you provide is accurate.
            </p>
          </Section>

          <Section title="2. Your Account">
            <p style={{ color: '#5A5272' }}>
              You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately through the app if you suspect unauthorised access. We are not liable for losses resulting from unauthorised use of your account that occurs before you notify us.
            </p>
            <p className="mt-3" style={{ color: '#5A5272' }}>
              You may not create accounts using automated methods, share your account with others, or impersonate another person or entity.
            </p>
          </Section>

          <Section title="3. Your Content">
            <p style={{ color: '#5A5272' }}>
              You retain full ownership of the notes and text you submit to the Service (&quot;User Content&quot;). By submitting User Content, you grant Notes & Edges a limited, non-exclusive, royalty-free licence to store, process, and display your content solely as necessary to provide the Service to you.
            </p>
            <p className="mt-3" style={{ color: '#5A5272' }}>
              You are solely responsible for your User Content. You represent and warrant that you have all rights necessary to submit it, and that it does not violate any applicable law or any third party&apos;s rights.
            </p>
          </Section>

          <Section title="4. Acceptable Use">
            <p style={{ color: '#5A5272' }}>You agree not to use the Service to:</p>
            <ul className="flex flex-col gap-2 list-none pl-0 mt-3">
              {[
                'Upload content that is unlawful, harmful, defamatory, obscene, or that infringes any intellectual property rights.',
                'Attempt to gain unauthorised access to any part of the Service or its underlying infrastructure.',
                'Use automated tools to scrape, crawl, or systematically extract data from the Service.',
                'Interfere with or disrupt the integrity or performance of the Service or its related systems.',
                'Circumvent any usage limits, rate limits, or security measures.',
                'Use the Service for any commercial purpose not expressly permitted by us.',
                'Submit content that contains malware, viruses, or other malicious code.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] leading-relaxed" style={{ color: '#5A5272' }}>
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#7B6EC4', opacity: 0.5 }} />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3" style={{ color: '#5A5272' }}>
              We reserve the right to suspend or terminate accounts that violate these rules, with or without prior notice.
            </p>
          </Section>

          <Section title="5. AI-Generated Content">
            <p style={{ color: '#5A5272' }}>
              The knowledge graphs, summaries, and connections generated by the Service are produced using AI and may contain errors, omissions, or inaccuracies. Notes & Edges does not warrant the accuracy, completeness, or reliability of any AI-generated output. You should independently verify any information before relying on it for important decisions.
            </p>
            <p className="mt-3" style={{ color: '#5A5272' }}>
              AI-generated content produced from your notes does not constitute professional advice of any kind (medical, legal, financial, or otherwise).
            </p>
          </Section>

          <Section title="6. Intellectual Property">
            <p style={{ color: '#5A5272' }}>
              The Service, including its software, design, trademarks, and all content created by Notes & Edges (excluding User Content), is owned by Notes & Edges and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works of any part of the Service without our prior written consent.
            </p>
          </Section>

          <Section title="7. Free Tier &amp; Future Pricing">
            <p style={{ color: '#5A5272' }}>
              The Service is currently offered free of charge. We reserve the right to introduce paid plans in the future. We will provide at least 30 days&apos; notice before any charges apply to existing free accounts, and you will always have the option to export your data before any billing begins.
            </p>
          </Section>

          <Section title="8. Disclaimer of Warranties">
            <p style={{ color: '#5A5272' }}>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
            </p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p style={{ color: '#5A5272' }}>
              TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, NOTES & EDGES AND ITS OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, REVENUE, PROFITS, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="mt-3" style={{ color: '#5A5272' }}>
              OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING UNDER THESE TERMS SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM OR (B) $50 USD.
            </p>
          </Section>

          <Section title="10. Indemnification">
            <p style={{ color: '#5A5272' }}>
              You agree to indemnify, defend, and hold harmless Notes & Edges and its officers, employees, and agents from any claims, liabilities, damages, and expenses (including reasonable legal fees) arising from your use of the Service, your User Content, or your violation of these Terms.
            </p>
          </Section>

          <Section title="11. Termination">
            <p style={{ color: '#5A5272' }}>
              You may delete your account at any time from within the app settings. We may suspend or terminate your access immediately if you breach these Terms. Upon termination, your right to use the Service ceases. Sections 3, 6, 8, 9, 10, and 13 survive termination.
            </p>
          </Section>

          <Section title="12. Changes to These Terms">
            <p style={{ color: '#5A5272' }}>
              We may revise these Terms at any time. For material changes, we will notify you via email or an in-app notice at least 14 days before the new Terms take effect. If you continue to use the Service after the effective date, you accept the revised Terms. If you do not agree, you must stop using the Service before the effective date.
            </p>
          </Section>

          <Section title="13. Governing Law">
            <p style={{ color: '#5A5272' }}>
              These Terms are governed by the laws of the State of Delaware, United States, without regard to its conflict of law principles. Any dispute arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in Delaware.
            </p>
          </Section>

          <Section title="14. Contact">
            <p style={{ color: '#5A5272' }}>
              Questions about these Terms? Email us at{' '}
              <a href="mailto:notes.edges.support@gmail.com" style={{ color: '#7B6EC4' }}>
                notes.edges.support@gmail.com
              </a>{' '}
              or reach us via the feedback option in the app settings.
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
          <Link href="/privacy" className="text-[12px] transition-colors" style={{ color: '#9C95B5' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#5A5272'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#9C95B5'; }}>
            Privacy Policy
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
