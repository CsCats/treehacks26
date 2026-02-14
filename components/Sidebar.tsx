'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

const homeItem = {
  href: '/',
  label: 'Home',
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
};

const contributorItem = {
  href: '/userUpload',
  label: 'Contribute',
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
};

const contributionsItem = {
  href: '/contributions',
  label: 'My History',
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
};

const earningsItem = {
  href: '/earnings',
  label: 'Earnings',
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
};

const businessItem = {
  href: '/business',
  label: 'Dashboard',
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
};

const billingItem = {
  href: '/billing',
  label: 'Billing',
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
};

const developerItem = {
  href: '/developer',
  label: 'API',
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();

  // Hide sidebar when not authenticated or on auth pages
  if (pathname === '/login' || pathname === '/signup' || (!loading && !user)) {
    return null;
  }

  // Build nav items based on role
  const navItems = [homeItem];
  if (!profile) {
    navItems.push(contributorItem, businessItem);
  } else if (profile.role === 'contributor') {
    navItems.push(contributorItem, contributionsItem, earningsItem);
  } else if (profile.role === 'business') {
    navItems.push(businessItem, billingItem, developerItem);
  }

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-16 flex-col items-center border-r border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl transition-all duration-300 hover:w-48 group/sidebar">
      {/* Logo */}
      <div className="flex h-16 w-full items-center justify-center border-b border-zinc-800/40">
        <Link href="/" className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white">
            R
          </div>
          <span className="whitespace-nowrap text-sm font-semibold text-white opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100">
            RoboData
          </span>
        </Link>
      </div>

      {/* Nav Items */}
      <nav className="mt-4 flex w-full flex-1 flex-col gap-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200
                ${isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
                }
              `}
            >
              {isActive && (
                <div className="absolute -left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />
              )}
              <div className="shrink-0">{item.icon}</div>
              <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section — auth */}
      <div className="mb-4 w-full px-2">
        {loading ? (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-zinc-800" />
          </div>
        ) : user && profile ? (
          <div className="space-y-1">
            {/* User info */}
            <div className="flex items-center gap-3 rounded-lg px-3 py-2 overflow-hidden">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                profile.role === 'business' ? 'bg-purple-600' : 'bg-blue-600'
              }`}>
                {(profile.displayName || profile.email)[0].toUpperCase()}
              </div>
              <div className="min-w-0 opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100">
                <div className="truncate text-sm font-medium text-white">
                  {profile.displayName || 'User'}
                </div>
                <div className="truncate text-xs text-zinc-500">
                  {profile.role === 'business' ? 'Business' : 'Contributor'}
                </div>
              </div>
            </div>
            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-zinc-500 transition hover:bg-zinc-800/50 hover:text-red-400"
            >
              <div className="shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100">
                Sign Out
              </span>
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-zinc-500 transition hover:bg-zinc-800/50 hover:text-zinc-300"
          >
            <div className="shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </div>
            <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100">
              Sign In
            </span>
          </Link>
        )}
      </div>
    </aside>
  );
}
