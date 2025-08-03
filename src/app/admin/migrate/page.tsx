'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export default function MigratePage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (action: string) => {
    console.log('Starting action:', action)
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/migrate-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)
      
      if (!response.ok) {
        // 더 자세한 에러 메시지 표시
        const errorMessage = data.details || data.error || 'Operation failed'
        console.error('Server error details:', data)
        throw new Error(errorMessage)
      }

      setResults(data)
      console.log('Results set to state:', data)
    } catch (error) {
      console.error('Error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  console.log('Current results state:', results)

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">컬렉션 마이그레이션 관리</h1>

      <div className="grid gap-6">
        {/* 1. 상태 확인 */}
        <Card>
          <CardHeader>
            <CardTitle>1. 컬렉션 상태 확인</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              현재 데이터베이스의 구/신 컬렉션 상태를 확인합니다.
            </p>
            <Button 
              onClick={() => handleAction('check')}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  확인 중...
                </>
              ) : (
                '상태 확인'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 2. 마이그레이션 실행 */}
        <Card>
          <CardHeader>
            <CardTitle>2. 데이터 마이그레이션</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-2">
              extracted_vocabulary의 데이터를 새 구조로 마이그레이션합니다:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mb-4">
              <li>words 컬렉션으로 단어 복사</li>
              <li>Veterans SAT 3000 단어장 생성</li>
              <li>vocabulary_words에 매핑 생성</li>
            </ul>
            <Button 
              onClick={() => handleAction('migrate')}
              disabled={loading}
              variant="default"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  마이그레이션 중...
                </>
              ) : (
                '마이그레이션 실행'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 3. 구 컬렉션 정리 */}
        <Card>
          <CardHeader>
            <CardTitle>3. 구 컬렉션 정리</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold mb-1">경고: 이 작업은 되돌릴 수 없습니다!</p>
                  <p>구 컬렉션의 모든 데이터가 삭제됩니다. 백업을 먼저 수행하세요.</p>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => {
                if (confirm('정말로 구 컬렉션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                  handleAction('cleanup')
                }
              }}
              disabled={loading}
              variant="destructive"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  정리 중...
                </>
              ) : (
                '구 컬렉션 삭제'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 결과 표시 */}
        {results && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {results.success ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    작업 완료
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    작업 실패
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {results.message && (
                <p className="text-gray-700 mb-4">{results.message}</p>
              )}
              
              {/* 상태 확인 결과 */}
              {results.stats && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">구 컬렉션 (삭제 예정)</h4>
                    <div className="bg-red-50 p-3 rounded-lg space-y-1">
                      <p className="text-sm">vocabulary: {results.stats.oldCollections.vocabulary}개</p>
                      <p className="text-sm">extracted_vocabulary: {results.stats.oldCollections.extracted_vocabulary}개</p>
                      <p className="text-sm">veterans_vocabulary: {results.stats.oldCollections.veterans_vocabulary}개</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">새 컬렉션 (유지)</h4>
                    <div className="bg-green-50 p-3 rounded-lg space-y-1">
                      <p className="text-sm">words: {results.stats.newCollections.words}개</p>
                      <p className="text-sm">vocabularies: {results.stats.newCollections.vocabularies}개</p>
                      <p className="text-sm">vocabulary_words: {results.stats.newCollections.vocabulary_words}개</p>
                      <p className="text-sm">user_vocabularies: {results.stats.newCollections.user_vocabularies}개</p>
                      <p className="text-sm">user_words: {results.stats.newCollections.user_words}개</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 마이그레이션 결과 */}
              {results.results && (
                <div className="space-y-2">
                  <p className="text-sm">✅ 생성된 단어: {results.results.wordsCreated}개</p>
                  <p className="text-sm">✅ 단어장 생성: {results.results.vocabularyCreated ? '완료' : '기존 사용'}</p>
                  <p className="text-sm">✅ 매핑 생성: {results.results.mappingsCreated}개</p>
                  {results.results.errors && results.results.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-red-600">⚠️ 오류 발생:</p>
                      <ul className="list-disc list-inside text-sm text-red-600">
                        {results.results.errors.map((err: string, idx: number) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {/* 정리 결과 */}
              {results.results && results.results.deletedCounts && (
                <div className="space-y-2">
                  <p className="text-sm">🗑️ vocabulary: {results.results.deletedCounts.vocabulary}개 삭제</p>
                  <p className="text-sm">🗑️ extracted_vocabulary: {results.results.deletedCounts.extracted_vocabulary}개 삭제</p>
                  <p className="text-sm">🗑️ veterans_vocabulary: {results.results.deletedCounts.veterans_vocabulary}개 삭제</p>
                </div>
              )}
              
              {/* 원본 JSON (디버깅용) */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600">원본 데이터 보기</summary>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs mt-2">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}

        {/* 에러 표시 */}
        {error && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                오류 발생
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}