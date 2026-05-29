'use client';

import { Suspense, useEffect } from 'react';  
import { usePathname, useSearchParams } from 'next/navigation';  
import posthog from 'posthog-js';  
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {  
  useEffect(() => {  
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {  
      api_host: 'https://us.i.posthog.com',  
      defaults: '2026-01-30',  
      capture_pageview: false,  // we handle this manually below  
      capture_pageleave: true,  
    });  
  }, []);

  return (  
    <PHProvider client={posthog}>  
      <Suspense>  
        <PageviewTracker>{children}</PageviewTracker>  
      </Suspense>  
    </PHProvider>  
  );  
}

function PageviewTracker({ children }: { children: React.ReactNode }) {  
  const pathname = usePathname();  
  const searchParams = useSearchParams();  
  const ph = usePostHog(); // waits until PostHog is ready

  useEffect(() => {  
    if (pathname && ph) {  
      let url = window.origin + pathname;  
      if (searchParams.toString()) {  
        url += `?${searchParams.toString()}`;  
      }  
      ph.capture('$pageview', { $current_url: url });  
    }  
  }, [pathname, searchParams, ph]);

  return <>{children}</>;  
}  