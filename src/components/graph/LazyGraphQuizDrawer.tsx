'use client';

import dynamic from 'next/dynamic';

const GraphQuizDrawer = dynamic(
  () => import('./GraphQuizDrawer').then((m) => m.GraphQuizDrawer),
  { ssr: false },
);

export function LazyGraphQuizDrawer() {
  return <GraphQuizDrawer />;
}
