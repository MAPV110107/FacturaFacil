
"use client";

// This file is now unused as the content has been moved to src/app/print-preview-formats/page.tsx
// It can be deleted or kept as a placeholder if needed for other root-level, non-redirected content in the future.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // This page should ideally not be reached if the redirect from '/' to '/dashboard' is active.
    // However, if it is reached, redirect to dashboard as a fallback.
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <p>Redirigiendo al Dashboard...</p>
    </div>
  );
}
