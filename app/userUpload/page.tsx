'use client';

import dynamic from 'next/dynamic';

const UserUploadClient = dynamic(() => import('@/components/UserUploadClient'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
      <div className="text-zinc-500">Loading...</div>
    </div>
  ),
});

export default function UserUploadPage() {
  return <UserUploadClient />;
}
