import { Skeleton } from "@/components/ui/skeleton";

export function PanelSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
  );
}
