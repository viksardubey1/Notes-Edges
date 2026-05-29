/**
 * Landing Page — Notes & Edges
 * Route: /
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Navbar } from '@/components/marketing/Navbar';
import { HeroSection } from '@/components/marketing/HeroSection';
import { DemoSection } from '@/components/marketing/DemoSection';
import { ThreeMoments } from '@/components/marketing/ThreeMoments';
import { FeatureHighlights } from '@/components/marketing/FeatureHighlights';
import { EmotionalCTA } from '@/components/marketing/EmotionalCTA';
import { Footer } from '@/components/marketing/Footer';

export default async function LandingPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    },
  );
  const { data: { session } } = await supabase.auth.getSession();
  if (session) redirect('/home');
  return (
    <div id="marketing-scroll" className="h-full overflow-y-auto overflow-x-hidden" style={{ background: '#F5F3FB' }}>
      <Navbar />
      <main>
        <HeroSection />
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="h-px" style={{ background: 'rgba(123,110,196,0.12)' }} />
        </div>
        <DemoSection />
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="h-px" style={{ background: 'rgba(123,110,196,0.12)' }} />
        </div>
        <ThreeMoments />
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="h-px" style={{ background: 'rgba(123,110,196,0.12)' }} />
        </div>
        <FeatureHighlights />
        <EmotionalCTA />
      </main>
      <Footer />
    </div>
  );
}
