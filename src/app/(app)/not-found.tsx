import { ButtonLink } from "@/components/ui/button";

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
      <ButtonLink href="/" size="lg" faceClassName="px-6">
        Back to overview
      </ButtonLink>
    </div>
  );
}
