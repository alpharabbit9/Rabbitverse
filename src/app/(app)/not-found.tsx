import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="text-6xl">🐇</div>
      <div className="max-w-sm space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="text-sm text-fg-secondary">
          Rabbit looked everywhere but couldn&apos;t find that page.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-xl border border-border bg-card-solid px-6 py-2.5 text-sm font-medium transition-colors hover:border-border-strong hover:bg-card-hover"
      >
        Back to overview
      </Link>
    </div>
  );
}
