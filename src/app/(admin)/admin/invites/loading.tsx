import { PanelSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-1 h-4 w-80" />
      </div>
      <PanelSkeleton h={210} />
      <PanelSkeleton h={320} />
    </div>
  );
}
