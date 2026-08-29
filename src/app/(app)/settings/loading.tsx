import { Skeleton, PanelSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-1 h-4 w-52" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelSkeleton h={180} />
        <PanelSkeleton h={120} />
        <PanelSkeleton h={160} />
        <PanelSkeleton h={160} />
        <PanelSkeleton h={200} className="lg:col-span-2" />
        <PanelSkeleton h={120} />
        <PanelSkeleton h={140} />
      </div>
    </div>
  );
}
