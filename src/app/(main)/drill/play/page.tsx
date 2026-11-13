import { Suspense } from 'react';

import DrillPlay from '@/components/DrillPlay';

// The drill id lives in the query string (static site, no dynamic routes).
// useSearchParams needs a Suspense boundary when prerendering.
export default function DrillPlayPage() {
  return (
    <Suspense>
      <DrillPlay />
    </Suspense>
  );
}
