'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: 'https://us.i.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage',
    });
  }, []);

  return (
    <Suspense>
      <PageviewTracker>{children}</PageviewTracker>
    </Suspense>
  );
}

function PageviewTracker({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      posthog.capture('$pageview', { $current_url: window.location.href });
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
