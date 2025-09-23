import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/loading'

export const FlashcardSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    {/* Title skeleton */}
    <div className="text-center mb-6">
      <Skeleton height={32} width="30%" className="mx-auto mb-2" />
      <Skeleton height={16} width="20%" className="mx-auto" />
    </div>

    {/* Flashcard skeleton */}
    <Card className="mb-6">
      <div className="p-12 min-h-[400px] flex flex-col items-center justify-center space-y-6">
        {/* Word skeleton */}
        <Skeleton height={48} width="50%" className="mb-4" />

        {/* Pronunciation skeleton */}
        <Skeleton height={20} width="30%" />

        {/* Definition area skeleton */}
        <div className="w-full max-w-2xl space-y-3 mt-8">
          <Skeleton height={24} width="100%" />
          <Skeleton height={24} width="90%" />
          <Skeleton height={24} width="95%" />
        </div>

        {/* Example sentence skeleton */}
        <div className="w-full max-w-2xl space-y-2 mt-6">
          <Skeleton height={16} width="15%" />
          <Skeleton height={20} width="100%" />
          <Skeleton height={20} width="85%" />
        </div>
      </div>
    </Card>

    {/* Navigation buttons skeleton */}
    <div className="flex justify-between items-center mb-6">
      <Skeleton height={40} width={120} className="rounded-lg" />
      <Skeleton height={40} width={120} className="rounded-lg" />
    </div>

    {/* Progress bar skeleton */}
    <div className="mb-6">
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <Skeleton height={16} width={100} />
        <Skeleton height={16} width={60} />
      </div>
      <Skeleton height={8} width="100%" className="rounded-full" />
    </div>

    {/* Control buttons skeleton */}
    <div className="flex justify-center gap-4">
      <Skeleton height={40} width={140} className="rounded-lg" />
      <Skeleton height={40} width={140} className="rounded-lg" />
      <Skeleton height={40} width={140} className="rounded-lg" />
    </div>
  </div>
)