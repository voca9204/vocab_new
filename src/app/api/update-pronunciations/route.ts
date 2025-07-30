import { NextResponse } from 'next/server'
import { WordService } from '@/lib/vocabulary-v2/word-service'

const wordService = new WordService()

// Dictionary API로 발음 정보 가져오기
async function fetchPronunciation(word: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    )
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    const phonetic = data[0]?.phonetic || 
                    data[0]?.phonetics?.[0]?.text ||
                    data[0]?.phonetics?.find((p: any) => p.text)?.text
                    
    return phonetic || null
  } catch (error) {
    console.error(`Error fetching pronunciation for ${word}:`, error)
    return null
  }
}

// GET: 발음 통계 조회
export async function GET(request: Request) {
  try {
    console.log('Checking pronunciation stats...')
    
    // 모든 단어 가져오기
    const allWords = await wordService.searchWords('', { limit: 2000 })
    const wordsWithPronunciation = allWords.filter(w => w.pronunciation)
    const wordsWithoutPronunciation = allWords.filter(w => !w.pronunciation)
    
    const stats = {
      total: allWords.length,
      withPronunciation: wordsWithPronunciation.length,
      withoutPronunciation: wordsWithoutPronunciation.length,
      percentage: allWords.length > 0 
        ? Math.round((wordsWithPronunciation.length / allWords.length) * 100)
        : 0
    }
    
    console.log('Pronunciation stats:', stats)
    
    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Error checking pronunciation stats:', error)
    return NextResponse.json(
      { error: 'Failed to check pronunciation stats', details: error.message },
      { status: 500 }
    )
  }
}

// POST: 발음 정보 업데이트
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { limit = 50 } = body
    
    console.log(`Starting pronunciation update for up to ${limit} words`)
    
    // 발음이 없는 단어들 찾기
    const allWords = await wordService.searchWords('', { limit: 2000 })
    const wordsWithoutPronunciation = allWords.filter(w => !w.pronunciation)
    
    console.log(`Found ${wordsWithoutPronunciation.length} words without pronunciation`)
    
    // 제한된 수만큼 처리
    const wordsToProcess = wordsWithoutPronunciation.slice(0, limit)
    let updatedCount = 0
    const errors: string[] = []
    
    // 순차적으로 처리 (rate limit 방지)
    for (let i = 0; i < wordsToProcess.length; i++) {
      const word = wordsToProcess[i]
      
      // API 호출 사이에 지연 추가
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      try {
        const pronunciation = await fetchPronunciation(word.word)
        
        if (pronunciation) {
          await wordService.updateWord(word.id, { pronunciation })
          updatedCount++
          console.log(`✅ Updated pronunciation for "${word.word}": ${pronunciation}`)
        } else {
          console.log(`❌ No pronunciation found for "${word.word}"`)
        }
      } catch (error) {
        console.error(`Error updating ${word.word}:`, error)
        errors.push(word.word)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Pronunciation update completed',
      updated: updatedCount,
      processed: wordsToProcess.length,
      remaining: Math.max(0, wordsWithoutPronunciation.length - limit),
      errors
    })
  } catch (error: any) {
    console.error('Pronunciation update error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Pronunciation update failed', 
        message: error.message 
      }, 
      { status: 500 }
    )
  }
}