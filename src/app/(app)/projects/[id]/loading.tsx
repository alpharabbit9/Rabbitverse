import { Skeleton, PanelSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-[180px] rounded-2xl" />
      <PanelSkeleton h={200} />
      <PanelSkeleton h={220} />
      <PanelSkeleton h={180} />
    </div>
  );
}
