'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { resolved } = useTheme();

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const hasSidebar = !isAuthPage && !loading && !!user;

  const bgStyle = hasSidebar
    ? resolved === 'dark'
      ? {
          background:
            'radial-gradient(ellipse 120% 80% at 50% 0%, rgba(24,24,27,0.6) 0%, transparent 50%), #09090b',
        }
      : {
          background:
            'radial-gradient(ellipse 120% 80% at 50% 0%, rgba(244,244,245,0.7) 0%, transparent 50%), #fafafa',
        }
    : undefined;

  return (
    <main className={`relative min-h-screen ${hasSidebar ? 'pl-16' : ''}`} style={bgStyle}>
      {/* Theme toggle: top-right of main content, always visible */}
      <div className="absolute right-4 top-4 z-[100]">
        <ThemeToggle />
      </div>
      {children}
    </main>
  );
}
