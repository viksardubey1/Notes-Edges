/**
 * Marketing Layout — Notes & Edges
 * Used by: / (Landing Page) and future /pricing, /blog routes.
 * Scroll container lives here so the navbar can detect scroll via IntersectionObserver.
 */

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="marketing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-[#0A0A0F]">
      {children}
    </div>
  );
}
