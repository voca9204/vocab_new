import { Card, CardContent } from '@/components/ui/card'

export function LoadingSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="w-48 h-8 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="w-12 h-8 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main typing card skeleton */}
      <Card className="mb-6">
        <CardContent className="p-8">
          <div className="text-center mb-8 space-y-4">
            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse mx-auto" />
            <div className="w-64 h-8 bg-gray-200 rounded animate-pulse mx-auto" />
            <div className="flex justify-center gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-12 h-6 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
            
            {/* Hint area skeleton */}
            <div className="mt-6 p-6 bg-gray-100 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="w-40 h-12 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
              <div className="w-32 h-4 bg-gray-200 rounded animate-pulse mx-auto" />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="w-full h-16 bg-gray-200 rounded animate-pulse" />
            <div className="w-full h-12 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}