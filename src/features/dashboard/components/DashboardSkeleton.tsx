import { Card, CardContent } from '@/components/common/Card';
import { Skeleton, SkeletonText } from '@/components/common/Skeleton';

/** Placeholder shaped like the dashboard, so the layout doesn't jump when data arrives. */
export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="grid gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-[118px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardContent className="grid gap-4">
              <Skeleton className="h-5 w-40" />
              <SkeletonText lines={4} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
