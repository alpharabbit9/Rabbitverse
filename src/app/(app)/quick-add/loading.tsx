import { Skeleton, PanelSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-1 h-4 w-60" />
      </div>
      <PanelSkeleton h={170} />
      <div className="grid gap-4 sm:grid-cols-2">
        <PanelSkeleton h={150} />
        <PanelSkeleton h={150} />
        <PanelSkeleton h={150} />
        <PanelSkeleton h={150} />
      </div>
    </div>
  );
}
