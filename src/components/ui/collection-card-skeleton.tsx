import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/loading'

export const CollectionCardSkeleton = () => (
  <Card className="cursor-pointer transition-all duration-300 border-2 border-transparent">
    <CardContent className="p-6">
      <div className="text-center">
        {/* Icon skeleton */}
        <div className="flex justify-center mb-4">
          <Skeleton height={60} width={60} className="rounded-lg" />
        </div>

        {/* Title skeleton */}
        <Skeleton height={32} width="70%" className="mx-auto mb-2" />

        {/* Description skeleton */}
        <Skeleton height={16} width="90%" className="mx-auto mb-4" />

        {/* Word count skeleton */}
        <Skeleton height={14} width="40%" className="mx-auto mb-4" />

        {/* Button skeleton */}
        <Skeleton height={36} width={140} className="mx-auto rounded-full" />
      </div>
    </CardContent>
  </Card>
)

export const DifficultyCardSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton height={28} width={28} className="rounded" />
            <Skeleton height={28} width="60%" />
          </div>
          <Skeleton height={16} width="80%" className="mb-2" />
        </div>
        <Skeleton height={24} width={60} className="rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton height={14} width="30%" />
          <Skeleton height={14} width="20%" />
        </div>
        <Skeleton height={4} width="100%" className="rounded-full" />
      </div>
    </CardContent>
  </Card>
)