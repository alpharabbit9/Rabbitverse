import { CardSkeleton, PanelSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-1 h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <CardSkeleton key={i} className="h-[86px]" />
        ))}
      </div>
      <Skeleton className="h-[46px] rounded-2xl" />
      <PanelSkeleton h={420} />
    </div>
  );
}
