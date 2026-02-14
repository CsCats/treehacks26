'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/AuthContext';
import ContributionGraph from '@/components/ContributionGraph';
import { motion } from 'framer-motion';

// Lazy-load the 3D background so it doesn't block initial paint
const ConstellationBackground = dynamic(
  () => import('@/components/ConstellationBackground'),
  { ssr: false }
);

// --- Animation variants ---
const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: 0.3 + i * 0.1, duration: 0.5, ease },
  }),
};

const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(96,165,250,0.15)',
      '0 0 40px rgba(129,140,248,0.25)',
      '0 0 20px rgba(96,165,250,0.15)',
    ],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
  },
};

// --- Stat counter with typing effect ---
function AnimatedStat({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      custom={delay}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="relative"
    >
      <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        {value}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
    </motion.div>
  );
}

export default function Home() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center gap-2 text-zinc-500"
        >
          <div className="h-2 w-2 rounded-full bg-blue-400" />
          <div className="h-2 w-2 rounded-full bg-purple-400" />
          <div className="h-2 w-2 rounded-full bg-cyan-400" />
        </motion.div>
      </div>
    );
  }

  // --- SIGNED IN: role-appropriate dashboard ---
  if (user && profile) {
    return (
      <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-background p-8 text-foreground">
        {/* 3D constellation wallpaper - adapts to light/dark theme */}
        <ConstellationBackground />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_20%,var(--background)_70%,var(--background)_100%)]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-3xl pt-8"
        >
          <h1 className="mb-1 text-3xl font-bold">
            Welcome back, {profile.displayName || 'there'}
          </h1>
          <p className="mb-8 text-zinc-500 dark:text-zinc-400">
            {profile.role === 'business'
              ? 'Manage your tasks and review submissions.'
              : 'Record motion data and contribute to robotics training.'}
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {profile.role === 'contributor' && (
              <>
                <motion.div custom={0} variants={scaleIn} initial="hidden" animate="visible">
                  <Link
                    href="/userUpload"
                    className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 transition hover:border-blue-500/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/80"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                    </div>
                    <h2 className="mb-2 text-xl font-semibold text-zinc-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                      Start Contributing
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Record yourself performing tasks. Our AI tracks your body movements in real-time.
                    </p>
                    <div className="mt-4 text-sm font-medium text-blue-400 group-hover:text-blue-300">
                      Open Camera →
                    </div>
                  </Link>
                </motion.div>

                <motion.div custom={1} variants={scaleIn} initial="hidden" animate="visible">
                  <Link
                    href="/contributions"
                    className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 transition hover:border-emerald-500/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/80"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                    <h2 className="mb-2 text-xl font-semibold text-zinc-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                      View Past Contributions
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Track the approval status of your submitted training data.
                    </p>
                    <div className="mt-4 text-sm font-medium text-emerald-400 group-hover:text-emerald-300">
                      View History →
                    </div>
                  </Link>
                </motion.div>
              </>
            )}

            {profile.role === 'contributor' && (
                <motion.div custom={2} variants={scaleIn} initial="hidden" animate="visible">
                <Link
                  href="/earnings"
                  className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 transition hover:border-yellow-500/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/80"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-600/20">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <h2 className="mb-2 text-xl font-semibold text-zinc-900 group-hover:text-yellow-600 dark:text-white dark:group-hover:text-yellow-400">
                    Earnings
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    View your balance and payout history from approved submissions.
                  </p>
                  <div className="mt-4 text-sm font-medium text-yellow-400 group-hover:text-yellow-300">
                    View Earnings →
                  </div>
                </Link>
              </motion.div>
            )}

            {profile.role === 'contributor' && (
              <motion.div
                custom={3}
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                className="md:col-span-2"
              >
                <ContributionGraph />
              </motion.div>
            )}

            {profile.role === 'business' && (
              <>
                <motion.div custom={0} variants={scaleIn} initial="hidden" animate="visible">
                  <Link
                    href="/business"
                    className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 transition hover:border-purple-500/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/80"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600/20">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                    </div>
                    <h2 className="mb-2 text-xl font-semibold text-zinc-900 group-hover:text-purple-600 dark:text-white dark:group-hover:text-purple-400">
                      Open Dashboard
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Create tasks, review submissions, and download training datasets.
                    </p>
                    <div className="mt-4 text-sm font-medium text-purple-400 group-hover:text-purple-300">
                      Go to Dashboard →
                    </div>
                  </Link>
                </motion.div>

                <motion.div custom={1} variants={scaleIn} initial="hidden" animate="visible">
                  <Link
                    href="/billing"
                    className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 transition hover:border-yellow-500/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/80"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-600/20">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                    </div>
                    <h2 className="mb-2 text-xl font-semibold text-zinc-900 group-hover:text-yellow-600 dark:text-white dark:group-hover:text-yellow-400">
                      Billing
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Add funds to your account and view transaction history.
                    </p>
                    <div className="mt-4 text-sm font-medium text-yellow-400 group-hover:text-yellow-300">
                      Manage Billing →
                    </div>
                  </Link>
                </motion.div>

                <motion.div custom={2} variants={scaleIn} initial="hidden" animate="visible">
                  <Link
                    href="/stats"
                    className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 transition hover:border-emerald-500/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/80"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    </div>
                    <h2 className="mb-2 text-xl font-semibold text-zinc-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                      Stats
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      View top contributors, earnings leaderboards, and task analytics.
                    </p>
                    <div className="mt-4 text-sm font-medium text-emerald-400 group-hover:text-emerald-300">
                      View Stats →
                    </div>
                  </Link>
                </motion.div>

                <motion.div custom={3} variants={scaleIn} initial="hidden" animate="visible">
                  <Link
                    href="/developer"
                    className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 transition hover:border-cyan-500/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/80"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-600/20">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                    </div>
                    <h2 className="mb-2 text-xl font-semibold text-zinc-900 group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400">
                      Developer Integration
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Create API endpoints to programmatically access your training data.
                    </p>
                    <div className="mt-4 text-sm font-medium text-cyan-400 group-hover:text-cyan-300">
                      Manage APIs →
                    </div>
                  </Link>
                </motion.div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  //  NOT SIGNED IN — ANIMATED LANDING PAGE
  // ═══════════════════════════════════════════════════
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background text-foreground">
      {/* Constellation wallpaper - adapts to light/dark theme */}
      <ConstellationBackground />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_20%,var(--background)_70%,var(--background)_100%)]" />

      {/* Top glow accent */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[600px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />

      <main className="relative z-10 flex w-full max-w-4xl flex-col items-center px-8 py-16">
        {/* Badge */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 backdrop-blur-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-xs font-medium tracking-wider text-blue-300">
            CROWDSOURCED ROBOTICS TRAINING
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-6 text-center text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl md:text-7xl"
        >
          Train Robots with
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Human Motion
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-10 max-w-xl text-center text-lg leading-relaxed text-zinc-500 dark:text-zinc-400"
        >
          Businesses post tasks. Users record themselves performing them.
          AI captures every movement in real-time.{' '}
          <span className="text-zinc-600 dark:text-zinc-300">Robots learn from real humans.</span>
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex gap-4"
        >
          <motion.div {...glowPulse} className="rounded-xl">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3.5 text-sm font-semibold text-white transition hover:from-blue-400 hover:to-purple-500 hover:shadow-lg hover:shadow-blue-500/25"
            >
              Get Started
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </motion.div>
          <Link
            href="/login"
            className="rounded-xl border border-zinc-300 bg-white px-8 py-3.5 text-sm font-semibold text-zinc-900 backdrop-blur-sm transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-white dark:hover:border-zinc-500 dark:hover:bg-zinc-800/80"
          >
            Log In
          </Link>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-20 grid grid-cols-3 gap-12 text-center"
        >
          <AnimatedStat value="17" label="Keypoints Tracked" delay={5} />
          <AnimatedStat value="3D" label="Skeleton Preview" delay={6} />
          <AnimatedStat value="JSON" label="Export Format" delay={7} />
        </motion.div>

        {/* How-it-works strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-20 grid w-full grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {[
            {
              step: '01',
              title: 'Business Posts Task',
              desc: 'Define what movement data you need — folding laundry, cooking, assembly, etc.',
              color: 'text-purple-400',
              border: 'border-purple-500/20',
              glow: 'bg-purple-500/5',
            },
            {
              step: '02',
              title: 'User Records Motion',
              desc: 'Contributors perform the task on camera. Pose detection runs in real-time.',
              color: 'text-blue-400',
              border: 'border-blue-500/20',
              glow: 'bg-blue-500/5',
            },
            {
              step: '03',
              title: 'Robot Learns',
              desc: 'Download structured pose data. Train your model with thousands of real examples.',
              color: 'text-emerald-400',
              border: 'border-emerald-500/20',
              glow: 'bg-emerald-500/5',
            },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 + i * 0.15, duration: 0.5 }}
              className={`relative overflow-hidden rounded-2xl border ${item.border} ${item.glow} p-6 backdrop-blur-sm`}
            >
              <div className={`mb-2 text-xs font-bold ${item.color}`}>
                STEP {item.step}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">{item.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--background)] to-transparent" />
    </div>
  );
}
