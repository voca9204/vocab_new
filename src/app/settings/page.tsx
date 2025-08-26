'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { useCollectionV2 } from '@/contexts/collection-context-v2'
import { Button } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Upload,
  BookOpen,
  Check,
  FileText,
  Trash2,
  ChevronLeft,
  Volume2,
  RefreshCw,
  Sparkles,
  DollarSign,
  ExternalLink,
  Target,
  Type,
  X
} from 'lucide-react'
import { vocabularyService } from '@/lib/api'
import { UserSettingsService } from '@/lib/settings/user-settings-service'

const settingsService = new UserSettingsService()

export default function SettingsPage() {
  const { user, loading: authLoading, isAdmin } = useAuth()
  const router = useRouter()
  const { 
    collections,
    selectedCollections,
    selectCollection,
    unselectCollection,
    refreshCollections,
    refreshWords,
    userSettings,
    updateUserSettings,
    collectionLoading,
    getStats
  } = useCollectionV2()
  
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
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [updatingTextSize, setUpdatingTextSize] = useState(false)
  const [displayOptions, setDisplayOptions] = useState({
    showSynonyms: true,
    showAntonyms: false,
    showEtymology: true,
    showExamples: true
  })
  const [updatingDisplayOptions, setUpdatingDisplayOptions] = useState(false)
  const [totalWordCount, setTotalWordCount] = useState<{
    total: number
    collections: Record<string, number>
  } | null>(null)

  const loading = authLoading || collectionLoading

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && userSettings) {
      // Load user settings into local state
      setDailyGoal(userSettings.dailyGoal || 30)
      setTextSize(userSettings.textSize || 'medium')
      setDisplayOptions(userSettings.displayOptions || {
        showSynonyms: true,
        showAntonyms: false,
        showEtymology: true,
        showExamples: true
      })
      
      // Load other stats
      checkPronunciationStats()
      checkExampleStats()
      checkOpenAIUsage()
      if (isAdmin) {
        loadTotalWordCount()
      }
    }
  }, [user, userSettings, isAdmin])

  const checkPronunciationStats = async () => {
    if (!user) return
    
    try {
      const { words } = await vocabularyService.getAll(undefined, 2000, user.uid)
      const withPronunciation = words.filter(word => word.pronunciation && word.pronunciation.trim() !== '').length
      const withoutPronunciation = words.length - withPronunciation
      const percentage = words.length > 0 ? Math.round((withPronunciation / words.length) * 100) : 0
      
      setPronunciationStats({
        total: words.length,
        withPronunciation,
        withoutPronunciation,
        percentage
      })
    } catch (error) {
      console.error('Error checking pronunciation stats:', error)
    }
  }

  const checkExampleStats = async () => {
    if (!user) return
    
    try {
      const { words } = await vocabularyService.getAll(undefined, 2000, user.uid)
      const withExamples = words.filter(word => word.examples && word.examples.length > 0).length
      const withoutExamples = words.length - withExamples
      const percentage = words.length > 0 ? Math.round((withExamples / words.length) * 100) : 0
      
      setExampleStats({
        total: words.length,
        withExamples,
        withoutExamples,
        percentage
      })
    } catch (error) {
      console.error('Error checking example stats:', error)
    }
  }

  const checkOpenAIUsage = async () => {
    try {
      const response = await fetch('/api/openai-usage')
      if (response.ok) {
        const usage = await response.json()
        setOpenAIUsage(usage)
      }
    } catch (error) {
      console.error('Error checking OpenAI usage:', error)
    }
  }

  const loadTotalWordCount = async () => {
    try {
      const response = await fetch('/api/vocabulary-total-count')
      if (response.ok) {
        const data = await response.json()
        setTotalWordCount({
          total: data.totalCount || 0,
          collections: data.collectionCounts || {}
        })
      }
    } catch (error) {
      console.error('Error loading total word count:', error)
    }
  }

  // Collection selection handlers
  const handleToggleCollection = async (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId)
    if (!collection) return
    
    if (collection.isSelected) {
      await unselectCollection(collectionId)
    } else {
      await selectCollection(collectionId)
    }
    
    // Refresh words after selection change
    await refreshWords()
  }

  const handleUpdateDailyGoal = async () => {
    if (!user) return
    
    setUpdatingDailyGoal(true)
    try {
      await updateUserSettings({ dailyGoal })
      alert('일일 목표가 업데이트되었습니다.')
    } catch (error) {
      console.error('Error updating daily goal:', error)
      alert('일일 목표 업데이트에 실패했습니다.')
    } finally {
      setUpdatingDailyGoal(false)
    }
  }

  const handleUpdateTextSize = async (size: 'small' | 'medium' | 'large') => {
    if (!user) return
    
    setUpdatingTextSize(true)
    setTextSize(size)
    
    try {
      await updateUserSettings({ textSize: size })
    } catch (error) {
      console.error('Error updating text size:', error)
      alert('텍스트 크기 변경에 실패했습니다.')
    } finally {
      setUpdatingTextSize(false)
    }
  }

  const handleUpdateDisplayOptions = async (option: keyof typeof displayOptions) => {
    if (!user) return
    
    setUpdatingDisplayOptions(true)
    const newOptions = {
      ...displayOptions,
      [option]: !displayOptions[option]
    }
    setDisplayOptions(newOptions)
    
    try {
      await updateUserSettings({ displayOptions: newOptions })
    } catch (error) {
      console.error('Error updating display options:', error)
      alert('표시 옵션 변경에 실패했습니다.')
    } finally {
      setUpdatingDisplayOptions(false)
    }
  }

  const updateAllPronunciations = async () => {
    if (!user) return
    
    setUpdatingPronunciations(true)
    try {
      const response = await fetch('/api/update-pronunciations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update pronunciations')
      }
      
      const result = await response.json()
      alert(`${result.updated}개 단어의 발음 정보가 업데이트되었습니다.`)
      
      // Refresh stats
      await checkPronunciationStats()
      await refreshWords()
    } catch (error) {
      console.error('Error updating pronunciations:', error)
      alert('발음 정보 업데이트에 실패했습니다.')
    } finally {
      setUpdatingPronunciations(false)
    }
  }

  const generateAllExamples = async () => {
    if (!user) return
    
    setGeneratingExamples(true)
    try {
      const response = await fetch('/api/generate-all-examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate examples')
      }
      
      const result = await response.json()
      alert(`${result.generated}개 단어의 예문이 생성되었습니다.`)
      
      // Refresh stats
      await checkExampleStats()
      await refreshWords()
    } catch (error) {
      console.error('Error generating examples:', error)
      alert('예문 생성에 실패했습니다.')
    } finally {
      setGeneratingExamples(false)
    }
  }

  const deleteAllUserData = async () => {
    if (!user) return
    
    if (!confirm('정말로 모든 학습 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }
    
    setDeletingData(true)
    try {
      const response = await fetch('/api/delete-user-data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete user data')
      }
      
      alert('모든 학습 데이터가 삭제되었습니다.')
      await refreshWords()
    } catch (error) {
      console.error('Error deleting user data:', error)
      alert('데이터 삭제에 실패했습니다.')
    } finally {
      setDeletingData(false)
    }
  }

  // Get stats
  const stats = getStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">설정을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        뒤로 가기
      </Button>
      
      <h1 className="text-3xl font-bold mb-8">설정</h1>
      
      {/* 단어장 선택 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            단어장 선택
          </CardTitle>
          <CardDescription>학습할 단어장을 선택하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* 공식 단어장 */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">공식 단어장</h3>
              {collections.filter(c => c.type === 'official').map(collection => (
                <div key={collection.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleCollection(collection.id)}
                      className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                        collection.isSelected 
                          ? 'bg-blue-600 border-blue-600' 
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {collection.isSelected && <Check className="h-3 w-3 text-white" />}
                    </button>
                    <div>
                      <span className="font-medium">{collection.displayName || collection.name}</span>
                      <span className="text-sm text-gray-500 ml-2">({collection.wordCount}개)</span>
                      {collection.category && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {collection.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 개인 단어장 */}
            {collections.filter(c => c.type === 'personal').length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">개인 단어장</h3>
                {collections.filter(c => c.type === 'personal').map(collection => (
                  <div key={collection.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleCollection(collection.id)}
                        className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                          collection.isSelected 
                            ? 'bg-blue-600 border-blue-600' 
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        {collection.isSelected && <Check className="h-3 w-3 text-white" />}
                      </button>
                      <div>
                        <span className="font-medium">{collection.name}</span>
                        <span className="text-sm text-gray-500 ml-2">({collection.wordCount}개)</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 선택 통계 */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              선택된 단어장: {stats.selectedCollections}개, 
              총 단어: {stats.totalWords}개
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 학습 설정 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            학습 설정
          </CardTitle>
          <CardDescription>일일 학습 목표를 설정하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="w-20 px-3 py-2 border rounded-lg"
              min="1"
              max="100"
            />
            <span className="text-gray-600">개/일</span>
            <Button
              onClick={handleUpdateDailyGoal}
              disabled={updatingDailyGoal}
              size="sm"
            >
              {updatingDailyGoal ? '저장 중...' : '저장'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 표시 설정 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            표시 설정
          </CardTitle>
          <CardDescription>단어 카드 표시 옵션을 설정하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 텍스트 크기 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">텍스트 크기</label>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <Button
                  key={size}
                  variant={textSize === size ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleUpdateTextSize(size)}
                  disabled={updatingTextSize}
                >
                  {size === 'small' ? '작게' : size === 'medium' ? '보통' : '크게'}
                </Button>
              ))}
            </div>
          </div>

          {/* 표시 옵션 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">표시 항목</label>
            <div className="space-y-2">
              {Object.entries({
                showSynonyms: '유사어',
                showAntonyms: '반의어',
                showEtymology: '어원',
                showExamples: '예문'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={displayOptions[key as keyof typeof displayOptions]}
                    onChange={() => handleUpdateDisplayOptions(key as keyof typeof displayOptions)}
                    disabled={updatingDisplayOptions}
                    className="rounded"
                  />
                  <span className="text-sm">{label} 표시</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 데이터 관리 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            데이터 관리
          </CardTitle>
          <CardDescription>단어 데이터를 개선하고 관리하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 발음 정보 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-gray-600" />
                <span className="font-medium">발음 정보</span>
              </div>
              <span className="text-sm text-gray-600">
                {pronunciationStats.withPronunciation} / {pronunciationStats.total} 
                ({pronunciationStats.percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${pronunciationStats.percentage}%` }}
              />
            </div>
            <Button
              onClick={updateAllPronunciations}
              disabled={updatingPronunciations || pronunciationStats.withoutPronunciation === 0}
              size="sm"
              variant="outline"
            >
              {updatingPronunciations ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  업데이트 중...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  없는 발음 정보 추가 ({pronunciationStats.withoutPronunciation}개)
                </>
              )}
            </Button>
          </div>

          {/* 예문 정보 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="font-medium">예문 정보</span>
              </div>
              <span className="text-sm text-gray-600">
                {exampleStats.withExamples} / {exampleStats.total} 
                ({exampleStats.percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${exampleStats.percentage}%` }}
              />
            </div>
            <Button
              onClick={generateAllExamples}
              disabled={generatingExamples || exampleStats.withoutExamples === 0}
              size="sm"
              variant="outline"
            >
              {generatingExamples ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI 예문 생성 ({exampleStats.withoutExamples}개)
                </>
              )}
            </Button>
          </div>

          {/* OpenAI 사용량 */}
          {openAIUsage && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">OpenAI API 사용량</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>총 요청: {openAIUsage.totalRequests}회</p>
                <p>예상 비용: ${openAIUsage.estimatedCost?.toFixed(2)}</p>
                <p>마지막 요청: {openAIUsage.lastUsed ? new Date(openAIUsage.lastUsed).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 관리자 전용 */}
      {isAdmin && totalWordCount && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>관리자 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>총 단어 수: {totalWordCount.total}개</p>
              <div className="text-sm text-gray-600">
                {totalWordCount.collections && Object.entries(totalWordCount.collections).map(([name, count]) => (
                  <p key={name}>- {name}: {count}개</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 위험 구역 */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            위험 구역
          </CardTitle>
          <CardDescription>이 작업들은 되돌릴 수 없습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={deleteAllUserData}
            disabled={deletingData}
          >
            {deletingData ? '삭제 중...' : '모든 학습 데이터 삭제'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}