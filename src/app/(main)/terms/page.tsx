import { Suspense } from 'react';

import TermsView from '@/components/TermsView';

// ?open=<id> opens a term, ?review=1 starts the daily review.
// useSearchParams needs a Suspense boundary when prerendering.
export default function TermsPage() {
  return (
    <Suspense>
      <TermsView />
    </Suspense>
  );
}
