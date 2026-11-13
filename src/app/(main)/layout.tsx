'use client';

import AuthGate from '@/components/AuthGate';
import Rail from '@/components/Rail';

export default function MainLayout({ children }: LayoutProps<'/'>) {
  return (
    <AuthGate>
      <div className="md:flex">
        <Rail />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AuthGate>
  );
}
