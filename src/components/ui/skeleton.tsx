import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-xl bg-card-hover", className)} {...props} />;
}

export function CardSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-[120px]", className)} />;
}

export function PanelSkeleton({ className, h = 280 }: { className?: string; h?: number }) {
  return <Skeleton className={cn("rounded-2xl", className)} style={{ height: h }} />;
}

export function PageSkeleton({ cards = 4, panels = 2 }: { cards?: number; panels?: number }) {
  return (
    <div className="space-y-6 sm:space-y-7">
      <div className="space-y-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-1 h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: cards }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        {Array.from({ length: panels }, (_, i) => (
          <PanelSkeleton key={i} className={i === 0 ? "lg:col-span-2" : ""} />
        ))}
      </div>
      <PanelSkeleton h={180} />
    </div>
  );
}
