export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
      <div className="flex flex-col items-center gap-4">
        <span className="rounded-full border border-black/10 px-4 py-1 text-xs font-medium uppercase tracking-widest text-black/60 dark:border-white/15 dark:text-white/60">
          Atelier
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          Aleonmange Atelier
        </h1>
        <p className="max-w-xl text-balance text-lg text-black/60 dark:text-white/60">
          Le projet est lancé. Cette base Next.js + Tailwind est prête — il ne
          reste plus qu&apos;à construire l&apos;application.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href="https://nextjs.org/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
        >
          Documentation Next.js
        </a>
        <a
          href="https://tailwindcss.com/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
        >
          Documentation Tailwind
        </a>
      </div>

      <p className="text-sm text-black/40 dark:text-white/40">
        Modifie{" "}
        <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono dark:bg-white/10">
          src/app/page.tsx
        </code>{" "}
        pour commencer.
      </p>
    </main>
  );
}
