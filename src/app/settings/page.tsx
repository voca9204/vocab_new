'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Settings,
  Upload,
  BookOpen,
  Check,
  FileText,
  Trash2,
  ChevronLeft,
  Volume2,
  RefreshCw,
  MessageSquare,
  Sparkles,
  DollarSign,
  ExternalLink,
  Target
} from 'lucide-react'
import { vocabularyService } from '@/lib/api'
import { UserSettingsService } from '@/lib/settings/user-settings-service'

interface VocabularySource {
  filename: string
  count: number
  selected: boolean
}

const settingsService = new UserSettingsService()

export default function SettingsPage() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [sources, setSources] = useState<VocabularySource[]>([])
  const [loadingSources, setLoadingSources] = useState(true)
  const [pronunciationStats, setPronunciationStats] = useState({
    total: 0,
    withPronunciation: 0,
    withoutPronunciation: 0,
    percentage: 0
  })
  const [updatingPronunciations, setUpdatingPronunciations] = useState(false)
  const [exampleStats, setExampleStats] = useState({
    total: 0,
    withExamples: 0,
    withoutExamples: 0,
    percentage: 0
  })
  const [generatingExamples, setGeneratingExamples] = useState(false)
  const [openAIUsage, setOpenAIUsage] = useState<any>(null)
  const [dailyGoal, setDailyGoal] = useState(30)
  const [updatingDailyGoal, setUpdatingDailyGoal] = useState(false)
  const [deletingData, setDeletingData] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadSources()
      loadUserSettings()
      checkPronunciationStats()
      checkExampleStats()
      checkOpenAIUsage()
    }
  }, [user])

  const loadSources = async () => {
    if (!user) return

    try {
      console.log('Loading vocabulary sources using new vocabulary service')
      
      // 새 호환성 레이어를 사용하여 사용자 선택 단어장의 단어 가져오기
      const { words } = await vocabularyService.getAll(undefined, 2000, user.uid)
      
      console.log(`Loaded ${words.length} words for settings`)
      
      // 현재는 모든 단어가 V.ZIP 3K에서 왔으므로 하나의 소스로 표시
      const sourceMap = new Map<string, number>()
      sourceMap.set('V.ZIP 3K 단어장', words.length)
      
      // Firestore에서 사용자 설정 가져오기
      const userSettings = await settingsService.getUserSettings(user.uid)
      const selectedSources = userSettings?.selectedVocabularies || []
      
      const sourceList = Array.from(sourceMap.entries())
        .map(([filename, count]) => ({ 
          filename, 
          count,
          selected: selectedSources.length === 0 ? true : // 빈 배열 = 전체 선택
                   selectedSources.includes('__none__') ? false : // '__none__' = 전체 해제
                   selectedSources.includes(filename) // 개별 선택
        }))
        .sort((a, b) => b.count - a.count)
      
      setSources(sourceList)
    } catch (error) {
      console.error('Error loading sources:', error)
    } finally {
      setLoadingSources(false)
    }
  }

  const toggleSource = async (filename: string) => {
    const updatedSources = sources.map(source => 
      source.filename === filename 
        ? { ...source, selected: !source.selected }
        : source
    )
    setSources(updatedSources)
    
    // Firestore에 저장
    const selectedFilenames = updatedSources
      .filter(s => s.selected)
      .map(s => s.filename)
    
    if (user) {
      // 아무것도 선택되지 않았으면 '__none__'으로 명시적 표시
      if (selectedFilenames.length === 0) {
        await settingsService.updateSelectedVocabularies(user.uid, ['__none__'])
      } else {
        await settingsService.updateSelectedVocabularies(user.uid, selectedFilenames)
      }
    }
  }

  const selectAll = async () => {
    const updatedSources = sources.map(source => ({ ...source, selected: true }))
    setSources(updatedSources)
    
    // 전체 선택은 빈 배열로 저장
    if (user) {
      await settingsService.updateSelectedVocabularies(user.uid, [])
    }
  }

  const deselectAll = async () => {
    const updatedSources = sources.map(source => ({ ...source, selected: false }))
    setSources(updatedSources)
    
    // 모든 파일명을 저장하여 아무것도 선택하지 않음을 표시
    const allFilenames = sources.map(s => s.filename)
    if (user) {
      await settingsService.updateSelectedVocabularies(user.uid, ['__none__'])
    }
  }

  const checkPronunciationStats = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/update-pronunciations?userId=${user.uid}`)
      if (response.ok) {
        const data = await response.json()
        setPronunciationStats(data)
      }
    } catch (error) {
      console.error('Error checking pronunciation stats:', error)
    }
  }

  const updatePronunciations = async () => {
    if (!user || updatingPronunciations) return

    setUpdatingPronunciations(true)
    
    try {
      const response = await fetch('/api/update-pronunciations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.uid,
          limit: 50 // 한 번에 50개씩 처리
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`${result.updated}개 단어의 발음 정보를 업데이트했습니다.`)
        
        // 통계 다시 로드
        await checkPronunciationStats()
      } else {
        const error = await response.json()
        alert(`오류가 발생했습니다: ${error.message}`)
      }
    } catch (error) {
      console.error('Error updating pronunciations:', error)
      alert('발음 정보 업데이트 중 오류가 발생했습니다.')
    } finally {
      setUpdatingPronunciations(false)
    }
  }

  const checkExampleStats = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/generate-examples?userId=${user.uid}`)
      if (response.ok) {
        const data = await response.json()
        setExampleStats(data)
      }
    } catch (error) {
      console.error('Error checking example stats:', error)
    }
  }

  const generateExamples = async () => {
    if (!user || generatingExamples) return

    // API 키 확인은 서버 사이드에서 처리됨
    // 클라이언트에서는 직접 확인 불가

    setGeneratingExamples(true)
    
    try {
      const response = await fetch('/api/generate-examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.uid,
          limit: 50 // 한 번에 50개씩 처리
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`${result.updated}개 단어의 예문을 생성했습니다.`)
        
        // 통계 다시 로드
        await checkExampleStats()
      } else {
        const error = await response.json()
        alert(`오류가 발생했습니다: ${error.message}`)
      }
    } catch (error) {
      console.error('Error generating examples:', error)
      alert('예문 생성 중 오류가 발생했습니다.')
    } finally {
      setGeneratingExamples(false)
    }
  }

  const checkOpenAIUsage = async () => {
    try {
      const response = await fetch('/api/openai-usage')
      if (response.ok) {
        const data = await response.json()
        setOpenAIUsage(data)
      }
    } catch (error) {
      console.error('Error checking OpenAI usage:', error)
    }
  }

  const loadUserSettings = async () => {
    if (!user) return

    try {
      const settings = await settingsService.getUserSettings(user.uid)
      if (settings?.dailyGoal) {
        setDailyGoal(settings.dailyGoal)
      }
    } catch (error) {
      console.error('Error loading user settings:', error)
    }
  }

  const updateDailyGoal = async (newGoal: number) => {
    if (!user || updatingDailyGoal) return

    setUpdatingDailyGoal(true)
    try {
      await settingsService.updateDailyGoal(user.uid, newGoal)
      setDailyGoal(newGoal)
      alert(`일일 학습 목표가 ${newGoal}개로 변경되었습니다.`)
    } catch (error) {
      console.error('Error updating daily goal:', error)
      alert('일일 목표 변경 중 오류가 발생했습니다.')
    } finally {
      setUpdatingDailyGoal(false)
    }
  }

  const deleteUserData = async () => {
    if (!user || deletingData) return

    // 이중 확인
    const confirmMessage = `🚨 학습 데이터 삭제 확인

다음 데이터가 영구적으로 삭제됩니다:
• 학습한 단어들의 진도 기록 (정답률, 숙련도 등)
• 북마크한 단어들
• 개인 메모 및 노트
• 학습 통계 및 히스토리
• 복습 일정 및 스트릭 기록

⚠️ 이 작업은 되돌릴 수 없습니다!
⚠️ 마스터 단어 데이터는 삭제되지 않으므로 다시 학습 가능합니다.

정말로 삭제하시려면 아래에 "DELETE"를 정확히 입력하세요:`

    const userInput = prompt(confirmMessage)
    
    if (userInput !== 'DELETE') {
      if (userInput !== null) { // null이 아니면 사용자가 취소하지 않고 잘못 입력한 것
        alert('입력이 정확하지 않습니다. 삭제가 취소되었습니다.')
      }
      return
    }

    setDeletingData(true)

    try {
      const response = await fetch('/api/delete-user-data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      })

      const result = await response.json()

      if (result.success) {
        alert(`✅ ${result.message}
        
삭제된 데이터:
• 학습 기록: ${result.deleted.userWords}개
• 단어장 구독: ${result.deleted.userVocabularies}개

새롭게 시작하실 수 있습니다!`)
        
        // 페이지 새로고침하여 UI 업데이트
        window.location.reload()
      } else {
        alert(`❌ 오류: ${result.message}`)
      }
    } catch (error) {
      console.error('Error deleting user data:', error)
      alert('데이터 삭제 중 오류가 발생했습니다.')
    } finally {
      setDeletingData(false)
    }
  }

  if (loading || loadingSources) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const selectedCount = sources.filter(s => s.selected).length
  const totalWords = sources
    .filter(s => s.selected)
    .reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/dashboard')}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            돌아가기
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">설정</h1>
            <p className="text-gray-600">단어장 관리 및 학습 설정</p>
          </div>
        </div>
      </div>

      {/* PDF 업로드 섹션 - 관리자만 표시 */}
      {isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              PDF 단어장 업로드
            </CardTitle>
            <CardDescription>
              새로운 단어장 PDF를 업로드하여 학습 콘텐츠를 추가하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/pdf-extract')}>
              PDF 업로드하기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 일일 학습 목표 설정 섹션 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            일일 학습 목표
          </CardTitle>
          <CardDescription>
            하루에 학습할 단어 개수를 설정하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">현재 목표:</p>
              <p className="text-2xl font-bold text-blue-600">{dailyGoal}개</p>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 30, 50].map((goal) => (
                <Button
                  key={goal}
                  variant={dailyGoal === goal ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateDailyGoal(goal)}
                  disabled={updatingDailyGoal}
                >
                  {goal}개
                </Button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                className="flex-1"
                disabled={updatingDailyGoal}
              />
              <Button
                size="sm"
                onClick={() => updateDailyGoal(dailyGoal)}
                disabled={updatingDailyGoal}
              >
                설정
              </Button>
            </div>
            
            <p className="text-xs text-gray-500">
              추천: 초급자 10-20개, 중급자 20-30개, 고급자 30-50개
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 단어장 선택 섹션 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                학습할 단어장 선택
              </CardTitle>
              <CardDescription>
                학습하고 싶은 단어장을 선택하세요 (복수 선택 가능)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={selectAll}>
                전체 선택
              </Button>
              <Button size="sm" variant="outline" onClick={deselectAll}>
                전체 해제
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>업로드된 단어장이 없습니다</p>
              <Button 
                className="mt-4"
                onClick={() => router.push('/pdf-extract')}
              >
                첫 단어장 업로드하기
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {sources.map((source, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                    source.selected 
                      ? 'bg-blue-50 border-blue-300' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => toggleSource(source.filename)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      source.selected 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'border-gray-300'
                    }`}>
                      {source.selected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div>
                      <p className="font-medium">{source.filename}</p>
                      <p className="text-sm text-gray-600">{source.count}개 단어</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {sources.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                선택된 단어장: <span className="font-medium">{selectedCount}개</span>
              </p>
              <p className="text-sm text-gray-600">
                총 학습 단어: <span className="font-medium">{totalWords}개</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 발음 정보 업데이트 섹션 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            발음 정보 관리
          </CardTitle>
          <CardDescription>
            단어들의 발음 정보를 자동으로 업데이트합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">전체 단어</p>
                  <p className="font-semibold">{pronunciationStats.total}개</p>
                </div>
                <div>
                  <p className="text-gray-600">발음 정보 있음</p>
                  <p className="font-semibold text-green-600">
                    {pronunciationStats.withPronunciation}개 ({pronunciationStats.percentage}%)
                  </p>
                </div>
              </div>
              {pronunciationStats.withoutPronunciation > 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  {pronunciationStats.withoutPronunciation}개 단어의 발음 정보가 없습니다
                </p>
              )}
            </div>
            
            <Button
              onClick={updatePronunciations}
              disabled={updatingPronunciations || pronunciationStats.withoutPronunciation === 0}
              className="w-full"
            >
              {updatingPronunciations ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  업데이트 중...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  발음 정보 업데이트
                </>
              )}
            </Button>
            
            {pronunciationStats.withoutPronunciation === 0 && (
              <p className="text-sm text-green-600 text-center">
                ✓ 모든 단어에 발음 정보가 있습니다
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI 예문 생성 섹션 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI 예문 생성
          </CardTitle>
          <CardDescription>
            OpenAI를 사용하여 단어별 예문을 자동으로 생성합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">전체 단어</p>
                  <p className="font-semibold">{exampleStats.total}개</p>
                </div>
                <div>
                  <p className="text-gray-600">예문 있음</p>
                  <p className="font-semibold text-green-600">
                    {exampleStats.withExamples}개 ({exampleStats.percentage}%)
                  </p>
                </div>
              </div>
              {exampleStats.withoutExamples > 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  {exampleStats.withoutExamples}개 단어에 예문이 없습니다
                </p>
              )}
            </div>
            
            {openAIUsage && openAIUsage.costs && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm flex-1">
                    <p className="font-medium text-blue-800 mb-2">OpenAI 사용 요금 정보</p>
                    <div className="space-y-1 text-blue-700">
                      <p>• 예문 생성: 단어당 약 ${openAIUsage.costs.perExample}</p>
                      <p>• 어원 생성: 단어당 약 ${openAIUsage.costs.perEtymology}</p>
                      <p>• 사용 모델: {openAIUsage.costs.model}</p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <a
                        href={openAIUsage.dashboardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        실제 사용량 확인하기
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <Button
              onClick={generateExamples}
              disabled={generatingExamples || exampleStats.withoutExamples === 0}
              className="w-full"
            >
              {generatingExamples ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                  예문 생성 중... (최대 10개)
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI 예문 생성하기
                </>
              )}
            </Button>
            
            {exampleStats.withoutExamples === 0 && (
              <p className="text-sm text-green-600 text-center">
                ✓ 모든 단어에 예문이 있습니다
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 데이터 관리 섹션 (선택사항) */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            데이터 관리
          </CardTitle>
          <CardDescription>
            주의: 이 작업은 되돌릴 수 없습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-sm text-red-800">
                <p className="font-medium mb-2">🚨 데이터 삭제 안내</p>
                <div className="space-y-2 text-red-700">
                  <div>
                    <p className="font-medium">삭제되는 데이터:</p>
                    <ul className="space-y-1 ml-2">
                      <li>• 개인 학습 기록 (정답률, 숙련도, 진도)</li>
                      <li>• 북마크한 단어들</li>
                      <li>• 개인 메모 및 노트</li>
                      <li>• 학습 통계 및 히스토리</li>
                      <li>• 복습 일정 및 스트릭 기록</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">유지되는 데이터:</p>
                    <ul className="space-y-1 ml-2">
                      <li>• 마스터 단어 데이터 (삭제 후 재학습 가능)</li>
                      <li>• 계정 정보</li>
                    </ul>
                  </div>
                  <div className="mt-2 pt-2 border-t border-red-200">
                    <p className="font-medium">삭제 시 "DELETE" 입력이 필요합니다</p>
                  </div>
                </div>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full text-red-600 hover:bg-red-50 border-red-300"
              onClick={deleteUserData}
              disabled={deletingData}
            >
              {deletingData ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  삭제 중...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  내 학습 데이터 삭제
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}