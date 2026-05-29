'use client';

import { Suspense, useEffect } from 'react';  
import { usePathname, useSearchParams } from 'next/navigation';  
import posthog from 'posthog-js';  
import { PostHogProvider as PHProvider } from 'posthog-js/react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {  
  useEffect(() => {  
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {  
      api_host: 'https://us.i.posthog.com',  
      defaults: '2026-01-30',  
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

  useEffect(() => {  
    if (pathname) {  
      posthog.capture('$pageview', { $current_url: window.location.href });  
    }  
  }, [pathname, searchParams]);

  return <>{children}</>;  
}  