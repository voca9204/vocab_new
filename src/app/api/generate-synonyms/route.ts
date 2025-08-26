import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { LRUCache } from 'lru-cache'

// LRU 캐시 설정 (최대 500개 항목, 30분 TTL)
const synonymCache = new LRUCache<string, string[]>({
  max: 500,
  ttl: 1000 * 60 * 30, // 30분
})

export async function POST(request: NextRequest) {
  console.log('[API] generate-synonyms endpoint called')
  
  try {
    const body = await request.json()
    console.log('[API] Request body:', body)
    const { word, definition } = body

    if (!word) {
      console.error('[API] Word is missing in request')
      return NextResponse.json({ error: 'Word is required' }, { status: 400 })
    }

    // 캐시 키 생성 (단어만 사용 - 영어 유사어는 정의와 무관)
    const cacheKey = word.toLowerCase()
    
    // 캐시 확인
    const cached = synonymCache.get(cacheKey)
    if (cached) {
      console.log(`Using cached synonyms for: ${word}`)
      return NextResponse.json({ synonyms: cached })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.log('OpenAI API key not configured, returning mock synonyms')
      // Return mock synonyms for testing
      const mockSynonyms: { [key: string]: string[] } = {
        'abandon': ['forsake', 'desert', 'leave', 'relinquish'],
        'abase': ['humiliate', 'degrade', 'demean', 'humble'],
        'abate': ['diminish', 'reduce', 'lessen', 'decrease'],
        'default': ['similar', 'alike', 'related', 'comparable']
      }
      const synonyms = mockSynonyms[word.toLowerCase()] || mockSynonyms['default']
      // Mock 데이터도 캐시에 저장
      synonymCache.set(cacheKey, synonyms)
      return NextResponse.json({ synonyms })
    }

    const openai = new OpenAI({ apiKey })

    const prompt = `Generate 3-5 English synonyms for the English word "${word}". 
    Return only the synonyms as a JSON array of English words, no explanations.
    Important: Return ONLY English words, not translations in other languages.
    Example: ["synonym1", "synonym2", "synonym3"]`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a vocabulary expert that provides accurate English synonyms for English words. Return only a JSON array of English synonym strings. Never return translations in other languages.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    })

    const response = completion.choices[0]?.message?.content || '[]'
    console.log(`[generate-synonyms] Raw AI response for "${word}":`, response)
    
    try {
      // Handle different response formats
      let synonyms
      
      // Try to parse as JSON
      try {
        synonyms = JSON.parse(response)
      } catch {
        // If not valid JSON, try to extract from string format
        // Handle cases like: "perfect, complete, accomplished"
        if (typeof response === 'string' && response.includes(',')) {
          synonyms = response.split(',').map(s => s.trim())
        } else if (typeof response === 'string') {
          // Single word response
          synonyms = [response.trim()]
        }
      }
      
      console.log(`[generate-synonyms] Parsed synonyms for "${word}":`, synonyms)
      
      // Ensure synonyms is an array
      if (!Array.isArray(synonyms)) {
        if (typeof synonyms === 'string') {
          synonyms = [synonyms]
        } else {
          synonyms = []
        }
      }
      
      if (synonyms.length > 0) {
        const limitedSynonyms = synonyms.slice(0, 5)
        // 결과를 캐시에 저장
        synonymCache.set(cacheKey, limitedSynonyms)
        console.log(`[generate-synonyms] Generated and cached ${limitedSynonyms.length} synonyms for "${word}":`, limitedSynonyms)
        return NextResponse.json({ synonyms: limitedSynonyms })
      }
    } catch (parseError) {
      console.error('Error parsing synonyms:', parseError)
    }

    return NextResponse.json({ synonyms: [] })
  } catch (error) {
    console.error('[API] Error generating synonyms:', error)
    // 더 자세한 에러 정보 로깅
    if (error instanceof Error) {
      console.error('[API] Error details:', error.message, error.stack)
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate synonyms',
      message: error instanceof Error ? error.message : 'Unknown error',
      synonyms: [] 
    }, { status: 500 })
  }
}

// OPTIONS 메서드 처리 (CORS)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}