/**
 * Landing Page — Notes & Edges
 * Route: /
 *
 * NOTE: app/page.tsx takes routing priority over app/(marketing)/page.tsx.
 * The (marketing) route group is used for future sub-pages (/pricing, /blog, etc.)
 * The landing page lives here with its own scroll container.
 */

import { Navbar } from '@/components/marketing/Navbar';
import { HeroSection } from '@/components/marketing/HeroSection';
import { ThreeMoments } from '@/components/marketing/ThreeMoments';
import { SocialProof } from '@/components/marketing/SocialProof';
import { FeatureHighlights } from '@/components/marketing/FeatureHighlights';
import { EmotionalCTA } from '@/components/marketing/EmotionalCTA';
import { PricingSection } from '@/components/marketing/PricingSection';
import { Footer } from '@/components/marketing/Footer';

export default function LandingPage() {
  return (
    <div id="marketing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-[#0A0A0F]">
      <Navbar />
      <main>
        <HeroSection />
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="h-px bg-[#2A2A3F]" />
        </div>
        <ThreeMoments />
        <SocialProof />
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="h-px bg-[#2A2A3F]" />
        </div>
        <FeatureHighlights />
        <EmotionalCTA />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
