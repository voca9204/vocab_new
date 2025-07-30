import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorFallbackProps {
  error: Error
  resetError: () => void
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-semibold mb-2">오류가 발생했습니다</h2>
        <p className="text-gray-600 mb-4">
          타이핑 연습 중 문제가 발생했습니다. 다시 시도해주세요.
        </p>
        <details className="mb-4 text-left">
          <summary className="cursor-pointer text-sm text-gray-500">
            기술적 세부사항
          </summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
            {error.message}
          </pre>
        </details>
        <Button onClick={resetError} className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          다시 시도
        </Button>
      </CardContent>
    </Card>
  )
}