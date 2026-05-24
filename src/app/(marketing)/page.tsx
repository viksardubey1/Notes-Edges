/**
 * NOTE: This file is intentionally superseded by app/page.tsx.
 *
 * Next.js gives routing priority to app/page.tsx over app/(marketing)/page.tsx
 * for the / route. The actual landing page is in app/page.tsx.
 *
 * The (marketing) route group exists for future sub-pages only:
 *   app/(marketing)/pricing/page.tsx → /pricing
 *   app/(marketing)/blog/page.tsx    → /blog
 *
 * This file must export a valid default to satisfy TypeScript, but it is
 * never rendered in practice.
 */

export default function MarketingRootStub() {
  return null;
}
