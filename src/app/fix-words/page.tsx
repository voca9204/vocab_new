'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, AlertTriangle, Check, X } from 'lucide-react'

interface ProblematicWord {
  id: string
  word: string
  definitions: any[]
  issues: string[]
}

export default function FixWordsPage() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [problematicWords, setProblematicWords] = useState<ProblematicWord[]>([])
  const [loadingWords, setLoadingWords] = useState(true)
  const [fixingWord, setFixingWord] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && isAdmin) {
      loadProblematicWords()
    }
  }, [user, isAdmin])

  const loadProblematicWords = async () => {
    try {
      const response = await fetch('/api/fix-definitions')
      if (response.ok) {
        const data = await response.json()
        setProblematicWords(data.problematicWords || [])
      }
    } catch (error) {
      console.error('Error loading problematic words:', error)
    } finally {
      setLoadingWords(false)
    }
  }

  const fixDefinition = async (wordId: string, definitionIndex: number, currentDef: any) => {
    const definitionText = currentDef.definition || currentDef.text || ''
    
    // 영어 단어들을 제거하여 한글 정의만 남기기
    const koreanDefinition = definitionText
      .split(/\s+/)
      .filter((word: string) => {
        // 영어 단어가 아닌 것들만 유지 (한글, 특수문자, 숫자 등)
        return !/^[a-zA-Z]+$/.test(word) || word.length <= 2
      })
      .join(' ')
      .trim()
    
    if (!koreanDefinition) {
      alert('정의에서 한글 부분을 찾을 수 없습니다.')
      return
    }

    const confirmed = confirm(`정의를 다음과 같이 수정하시겠습니까?\n\n기존: ${definitionText}\n\n수정: ${koreanDefinition}`)
    if (!confirmed) return

    setFixingWord(wordId)
    
    try {
      const response = await fetch('/api/fix-definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordId,
          definitionIndex,
          newDefinition: koreanDefinition
        })
      })

      if (response.ok) {
        alert('정의가 수정되었습니다!')
        loadProblematicWords() // 목록 새로고침
      } else {
        const error = await response.json()
        alert(`오류: ${error.error}`)
      }
    } catch (error) {
      console.error('Error fixing definition:', error)
      alert('정의 수정 중 오류가 발생했습니다.')
    } finally {
      setFixingWord(null)
    }
  }

  if (!user || loading) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>관리자만 접근할 수 있습니다.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">
          대시보드로 돌아가기
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push('/settings')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          설정으로 돌아가기
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">단어 정의 수정</h1>
          <p className="text-gray-600">문제가 있는 단어 정의들을 수정합니다</p>
        </div>
      </div>

      {loadingWords ? (
        <div className="text-center py-8">
          <p>문제가 있는 단어들을 확인하는 중...</p>
        </div>
      ) : problematicWords.length === 0 ? (
        <div className="text-center py-8">
          <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <p className="text-lg font-medium">모든 단어 정의가 정상입니다!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                <strong>{problematicWords.length}개</strong>의 단어에서 정의 문제를 발견했습니다.
              </p>
            </div>
          </div>

          {problematicWords.map((word) => (
            <Card key={word.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg font-bold">{word.word}</span>
                  <span className="text-sm text-gray-500">ID: {word.id}</span>
                </CardTitle>
                <CardDescription>
                  문제: {word.issues.join(', ')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {word.definitions.map((def, index) => {
                  const definitionText = def.definition || def.text || ''
                  const hasIssues = definitionText.split(/\s+/).some((w: string) => 
                    /^[a-zA-Z]+$/.test(w) && w.length > 3 && w !== word.word
                  )

                  if (!hasIssues) return null

                  return (
                    <div key={index} className="border border-red-200 rounded-lg p-4 mb-4">
                      <p className="font-medium mb-2">정의 {index + 1}:</p>
                      <p className="text-gray-700 mb-3 bg-red-50 p-2 rounded">
                        {definitionText}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fixDefinition(word.id, index, def)}
                        disabled={fixingWord === word.id}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {fixingWord === word.id ? '수정 중...' : '자동 수정'}
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}