'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const hasSidebar = !isAuthPage && !loading && !!user;

  return (
    <main className={hasSidebar ? 'pl-16' : ''}>
      {children}
    </main>
  );
}
