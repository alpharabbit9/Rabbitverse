import { Skeleton, PanelSkeleton, CardSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 sm:space-y-7">
      <div className="space-y-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-1 h-4 w-56" />
      </div>
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <PanelSkeleton h={160} />
        <PanelSkeleton h={160} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <PanelSkeleton className="lg:col-span-2" />
        <PanelSkeleton />
      </div>
      <PanelSkeleton h={180} />
    </div>
  );
}
