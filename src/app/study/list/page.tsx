'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button, Input } from '@/components/ui'
import { Card } from '@/components/ui/card'
import { 
  Search, 
  Filter, 
  ChevronLeft,
  BookOpen,
  Check,
  X,
  Volume2,
  Sparkles
} from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore'
import type { ExtractedVocabulary } from '@/types/extracted-vocabulary'
import { getSelectedSources, filterWordsBySelectedSources } from '@/lib/settings/get-selected-sources'
import { createVocabularyQuery } from '@/lib/vocabulary/vocabulary-query-utils'
import { WordDetailModal } from '@/components/vocabulary/word-detail-modal'
import { useWordDetailModal } from '@/hooks/use-word-detail-modal'

export default function VocabularyListPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [words, setWords] = useState<ExtractedVocabulary[]>([])
  const [filteredWords, setFilteredWords] = useState<ExtractedVocabulary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'studied' | 'not-studied' | 'mastered'>('all')
  const {
    selectedWord,
    openModal,
    closeModal,
    generateExamples,
    generateEtymology,
    fetchPronunciation,
    generatingExamples,
    generatingEtymology,
    fetchingPronunciation,
    speakWord
  } = useWordDetailModal()

  useEffect(() => {
    if (user) {
      loadWords()
    }
  }, [user])

  useEffect(() => {
    filterWords()
  }, [searchTerm, filterType, words])

  const loadWords = async () => {
    if (!user) return

    try {
      console.log('Loading words for user:', user.uid)
      
      // 사용자의 단어와 관리자가 업로드한 단어 모두 가져오기
      const q = createVocabularyQuery('extracted_vocabulary', user.uid)
      
      const snapshot = await getDocs(q)
      console.log('Found documents:', snapshot.size)
      
      if (snapshot.empty) {
        console.log('No documents found for user:', user.uid)
        setWords([])
        setFilteredWords([])
        setLoading(false)
        return
      }
      
      let wordsData = snapshot.docs.map(doc => {
        console.log('Document data:', doc.id, doc.data())
        return {
          ...doc.data(),
          id: doc.id,
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          source: {
            ...doc.data().source,
            uploadedAt: doc.data().source?.uploadedAt?.toDate() || new Date()
          }
        }
      }) as ExtractedVocabulary[]
      
      // Firestore에서 선택된 단어장 가져오기
      const selectedSources = await getSelectedSources(user.uid)
      
      // 선택된 단어장으로 필터링
      wordsData = filterWordsBySelectedSources(wordsData, selectedSources)
      
      // 번호순으로 정렬 (번호가 없는 단어는 뒤로)
      wordsData.sort((a, b) => {
        if (a.number && b.number) {
          return a.number - b.number
        }
        if (a.number && !b.number) return -1
        if (!a.number && b.number) return 1
        return a.word.localeCompare(b.word)
      })
      
      console.log('Processed words:', wordsData.length)
      setWords(wordsData)
      setFilteredWords(wordsData)
    } catch (error) {
      console.error('Error loading words:', error)
      console.error('Error details:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterWords = () => {
    let filtered = words

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(word => 
        word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (word.etymology && word.etymology.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // 학습 상태 필터링
    switch (filterType) {
      case 'studied':
        filtered = filtered.filter(w => w.studyStatus.studied)
        break
      case 'not-studied':
        filtered = filtered.filter(w => !w.studyStatus.studied)
        break
      case 'mastered':
        filtered = filtered.filter(w => w.studyStatus.masteryLevel >= 80)
        break
    }

    setFilteredWords(filtered)
  }

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 3) return 'text-green-600'
    if (difficulty <= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPartOfSpeechColor = (pos: string) => {
    switch (pos) {
      case 'n.': return 'bg-blue-100 text-blue-800'
      case 'v.': return 'bg-green-100 text-green-800'
      case 'adj.': return 'bg-purple-100 text-purple-800'
      case 'adv.': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }


  if (!user) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p>로그인이 필요합니다.</p>
        <Button onClick={() => router.push('/login')} className="mt-4">
          로그인하기
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/study')}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            돌아가기
          </Button>
          <h1 className="text-2xl font-bold">단어 목록</h1>
        </div>
        <div className="text-sm text-gray-600">
          총 {filteredWords.length}개 단어
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="단어 또는 뜻 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            전체
          </Button>
          <Button
            variant={filterType === 'not-studied' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('not-studied')}
          >
            미학습
          </Button>
          <Button
            variant={filterType === 'studied' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('studied')}
          >
            학습완료
          </Button>
          <Button
            variant={filterType === 'mastered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('mastered')}
          >
            마스터
          </Button>
        </div>
      </div>

      {/* 단어 목록 */}
      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWords.map((word) => (
            <Card 
              key={word.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openModal(word)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {word.number && (
                    <span className="text-sm text-gray-500">#{word.number}</span>
                  )}
                  <h3 className="font-bold text-lg">{word.word}</h3>
                  {word.partOfSpeech.map(pos => (
                    <span 
                      key={pos}
                      className={`text-xs px-2 py-1 rounded ${getPartOfSpeechColor(pos)}`}
                    >
                      {pos}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {word.studyStatus.studied && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                  <span className={`text-sm font-medium ${getDifficultyColor(word.difficulty || 5)}`}>
                    Lv.{word.difficulty}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-700 mb-1">{word.definition}</p>
              
              {word.etymology && (
                <p className="text-xs text-gray-500 line-clamp-2">
                  {word.etymology}
                </p>
              )}
              
              {word.studyStatus.masteryLevel > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>숙련도</span>
                    <span>{word.studyStatus.masteryLevel}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${word.studyStatus.masteryLevel}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 단어 상세 모달 */}
      <WordDetailModal
        open={!!selectedWord}
        onClose={closeModal}
        word={selectedWord}
        onPlayPronunciation={speakWord}
        onGenerateExamples={generateExamples}
        onGenerateEtymology={generateEtymology}
        onFetchPronunciation={fetchPronunciation}
        generatingExamples={generatingExamples}
        generatingEtymology={generatingEtymology}
        fetchingPronunciation={fetchingPronunciation}
      />
    </div>
  )
}