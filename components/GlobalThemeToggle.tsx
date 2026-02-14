'use client';

import ThemeToggle from '@/components/ThemeToggle';

/** Fixed top-right theme button - visible on every page */
export default function GlobalThemeToggle() {
  return (
    <div
      className="fixed right-4 top-4 z-[9999] flex items-center justify-center"
      style={{ position: 'fixed', top: '1rem', right: '1rem' }}
    >
      <ThemeToggle />
    </div>
  );
}
