export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
      <main className="flex w-full max-w-3xl flex-col items-center px-8 py-16">
        <div className="mb-2 text-sm font-medium uppercase tracking-widest text-blue-400">
          Crowdsourced Robotics Training
        </div>
        <h1 className="mb-4 text-center text-5xl font-bold leading-tight tracking-tight">
          Train Robots with
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Human Motion Data
          </span>
        </h1>
        <p className="mb-12 max-w-lg text-center text-lg text-zinc-400">
          Businesses post tasks. Users record themselves performing those tasks.
          Pose detection captures every movement. Robots learn from real humans.
        </p>

        <div className="grid w-full max-w-2xl gap-6 md:grid-cols-2">
          {/* Customer Card */}
          <a
            href="/userUpload"
            className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-8 transition hover:border-blue-500/50 hover:bg-zinc-900/80"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20 text-2xl">
              🎥
            </div>
            <h2 className="mb-2 text-xl font-semibold group-hover:text-blue-400">
              I&apos;m a Contributor
            </h2>
            <p className="text-sm text-zinc-400">
              Record yourself performing tasks. Our AI tracks your body movements
              in real-time. Get paid for your contributions.
            </p>
            <div className="mt-4 text-sm font-medium text-blue-400 group-hover:text-blue-300">
              Start Contributing →
            </div>
          </a>

          {/* Business Card */}
          <a
            href="/business"
            className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-8 transition hover:border-purple-500/50 hover:bg-zinc-900/80"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600/20 text-2xl">
              🏢
            </div>
            <h2 className="mb-2 text-xl font-semibold group-hover:text-purple-400">
              I&apos;m a Business
            </h2>
            <p className="text-sm text-zinc-400">
              Create tasks with specific requirements. Collect video and pose data
              from hundreds of contributors. Download training datasets.
            </p>
            <div className="mt-4 text-sm font-medium text-purple-400 group-hover:text-purple-300">
              Open Dashboard →
            </div>
          </a>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-2xl font-bold text-white">17</div>
            <div className="text-xs text-zinc-500">Keypoints Tracked</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">3D</div>
            <div className="text-xs text-zinc-500">Skeleton Preview</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">JSON</div>
            <div className="text-xs text-zinc-500">Export Format</div>
          </div>
        </div>
      </main>
    </div>
  );
}
