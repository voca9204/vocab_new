import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/loading'

export const QuizSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    {/* Header skeleton */}
    <div className="mb-6">
      <Skeleton height={32} width="20%" className="mx-auto mb-2" />
      <Skeleton height={16} width="15%" className="mx-auto" />
    </div>

    {/* Progress bar skeleton */}
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <Skeleton height={16} width={80} />
        <Skeleton height={16} width={60} />
      </div>
      <Skeleton height={8} width="100%" className="rounded-full" />
    </div>

    {/* Quiz card skeleton */}
    <Card className="max-w-2xl mx-auto mb-6">
      <CardContent className="p-8">
        {/* Question skeleton */}
        <div className="mb-8">
          <Skeleton height={24} width="15%" className="mb-4" />
          <Skeleton height={32} width="60%" className="mb-2" />
          <Skeleton height={20} width="40%" />
        </div>

        {/* Options skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={56} width="100%" className="rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Bottom controls skeleton */}
    <div className="flex justify-center gap-4">
      <Skeleton height={40} width={120} className="rounded-lg" />
      <Skeleton height={40} width={120} className="rounded-lg" />
    </div>
  </div>
)