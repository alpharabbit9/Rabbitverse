import { Skeleton, PanelSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 sm:space-y-7">
      <div className="space-y-1">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="mt-1 h-4 w-48" />
      </div>
      <PanelSkeleton h={140} />
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <PanelSkeleton className="lg:col-span-2" />
        <PanelSkeleton />
      </div>
      <PanelSkeleton h={180} />
    </div>
  );
}
