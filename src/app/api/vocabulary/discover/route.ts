import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'
import OpenAI from 'openai'

interface DiscoverRequest {
  word: string
  context?: string  // 단어가 발견된 문맥
  sourceWordId?: string  // 유사어를 클릭한 경우 원본 단어 ID
  userId: string
}

export async function POST(request: NextRequest) {
  try {
    const { word, context, sourceWordId, userId } = await request.json() as DiscoverRequest
    
    if (!word || !userId) {
      return NextResponse.json(
        { success: false, message: 'Word and userId are required' },
        { status: 400 }
      )
    }
    
    const db = getAdminFirestore()
    
    // 1. 이미 존재하는 단어인지 확인 (모든 컬렉션에서 검색)
    const normalizedWord = word.toLowerCase().replace(/[^a-z]/g, '')
    const collections = ['words', 'ai_generated_words', 'photo_vocabulary_words']
    
    let existingWord = null
    let existingWordsQuery = null
    
    // 모든 컬렉션에서 검색
    for (const collectionName of collections) {
      // 먼저 정확한 단어로 검색
      existingWordsQuery = await db.collection(collectionName)
        .where('word', '==', word.toLowerCase())
        .limit(1)
        .get()
      
      if (!existingWordsQuery.empty) {
        existingWord = existingWordsQuery.docs[0]
        break
      }
      
      // 정확한 매칭이 없으면 normalizedWord로 검색
      existingWordsQuery = await db.collection(collectionName)
        .where('normalizedWord', '==', normalizedWord)
        .limit(1)
        .get()
      
      if (!existingWordsQuery.empty) {
        existingWord = existingWordsQuery.docs[0]
        break
      }
    }
    
    if (existingWord) {
      const wordData = existingWord.data()
      const collectionName = existingWord.ref.parent.id
      
      console.log(`[discover] Found existing word in collection: ${collectionName}, ID: ${existingWord.id}`)
      
      // Firestore Timestamp 처리
      const processedWordData = {
        id: existingWord.id,
        ...wordData,
        createdAt: wordData.createdAt?.toDate ? wordData.createdAt.toDate() : wordData.createdAt,
        updatedAt: wordData.updatedAt?.toDate ? wordData.updatedAt.toDate() : wordData.updatedAt,
      }
      
      // 정의 내의 날짜도 변환
      if (processedWordData.definitions && Array.isArray(processedWordData.definitions)) {
        processedWordData.definitions = processedWordData.definitions.map((def: any) => ({
          ...def,
          createdAt: def.createdAt?.toDate ? def.createdAt.toDate() : def.createdAt
        }))
      }
      
      // source 내의 날짜도 변환
      if (processedWordData.source?.addedAt?.toDate) {
        processedWordData.source.addedAt = processedWordData.source.addedAt.toDate()
      }
      
      // aiGenerated 내의 날짜도 변환
      if (processedWordData.aiGenerated?.generatedAt?.toDate) {
        processedWordData.aiGenerated.generatedAt = processedWordData.aiGenerated.generatedAt.toDate()
      }
      
      console.log('Found existing word:', processedWordData.word)
      
      return NextResponse.json({
        success: true,
        exists: true,
        word: processedWordData,
        message: 'Word already exists in database'
      })
    }
    
    // 2. OpenAI를 사용하여 새 단어 정의 생성
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }
    
    const openai = new OpenAI({ apiKey })
    
    const prompt = `You are a vocabulary expert helping students learn new words.
    
Generate comprehensive information for the word "${word}"${context ? ` found in context: "${context}"` : ''}.

Please provide the following in JSON format:
{
  "partOfSpeech": ["array of parts of speech, e.g., n., v., adj."],
  "definitions": [
    {
      "definition": "Korean definition",
      "examples": ["2-3 example sentences in English"],
      "language": "ko"
    }
  ],
  "englishDefinition": "English definition",
  "etymology": "Word origin and etymology",
  "synonyms": ["list of synonyms"],
  "antonyms": ["list of antonyms"],
  "difficulty": 1-10 (SAT difficulty level),
  "frequency": 1-10 (usage frequency),
  "isSAT": boolean (is it a common SAT word?),
  "pronunciation": "IPA pronunciation"
}`
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a vocabulary expert. Generate accurate, educational vocabulary information.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    })
    
    const content = completion.choices[0]?.message?.content
    
    if (!content) {
      return NextResponse.json(
        { success: false, message: 'Failed to generate word information' },
        { status: 500 }
      )
    }
    
    try {
      // Parse AI response
      const wordInfo = JSON.parse(content)
      
      // 3. 원본 단어와의 관계 생성 (있는 경우)
      let relationshipId = null
      if (sourceWordId) {
        const relationship = {
          wordId: sourceWordId,
          relatedWordId: word.toLowerCase(),  // 임시로 단어 텍스트 사용
          relationshipType: 'synonym' as const,
          strength: 0.8,
          bidirectional: true,
          source: 'user' as const,
          createdAt: new Date(),
          createdBy: userId
        }
        
        const relationshipRef = await db.collection('word_relationships').add(relationship)
        relationshipId = relationshipRef.id
      }
      
      // 4. AI가 생성한 단어를 ai_generated_words 컬렉션에 자동 저장
      const now = new Date()
      const wordToSave = {
        word: word.toLowerCase(),
        normalizedWord: word.toLowerCase().replace(/[^a-z]/g, ''),
        pronunciation: wordInfo.pronunciation,
        partOfSpeech: wordInfo.partOfSpeech,
        definitions: wordInfo.definitions.map((def: any, idx: number) => ({
          id: `def-${idx}`,
          definition: def.definition,
          examples: def.examples || [],
          source: 'ai' as const,
          language: def.language || 'ko',
          createdAt: now
        })),
        etymology: wordInfo.englishDefinition,
        realEtymology: wordInfo.etymology,
        synonyms: wordInfo.synonyms || [],
        antonyms: wordInfo.antonyms || [],
        difficulty: wordInfo.difficulty || 5,
        frequency: wordInfo.frequency || 5,
        isSAT: wordInfo.isSAT || false,
        source: {
          type: 'ai_generated' as const,
          origin: 'discovery',
          addedAt: now,
          metadata: {
            ...(context && { context }),
            ...(sourceWordId && { sourceWordId }),
            model: 'gpt-4',
            requestedBy: userId
          }
        },
        aiGenerated: {
          examples: true,
          etymology: true,
          generatedAt: now
        },
        createdAt: now,
        updatedAt: now
      }
      
      // AI 생성 단어를 ai_generated_words 컬렉션에 저장
      const docRef = await db.collection('ai_generated_words').add(wordToSave)
      console.log('AI generated word saved to ai_generated_words:', word)
      
      // 5. 저장된 단어 반환
      const savedWord = {
        id: docRef.id,
        ...wordToSave,
        relationshipId
      }
      
      return NextResponse.json({
        success: true,
        exists: false,
        word: savedWord,
        confidence: 0.85,  // AI 생성 신뢰도
        message: 'New word discovered, defined, and saved to master database'
      })
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      return NextResponse.json(
        { success: false, message: 'Failed to parse AI response' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Error in discover word:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to discover word',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}