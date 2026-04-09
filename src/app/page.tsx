'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    router.push(isLoggedIn ? '/dashboard' : '/login');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <p className="text-[var(--muted-foreground)]">이동 중...</p>
    </div>
  );
}
