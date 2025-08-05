import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'
import type { Word } from '@/types/vocabulary-v2'
import { FieldValue } from 'firebase-admin/firestore'

interface SaveDynamicRequest {
  word: Partial<Word> & { word: string }
  userId: string
  saveToCollection?: boolean  // 개인 컬렉션에도 저장할지
  relationshipId?: string  // 관계 ID (업데이트용)
}

export async function POST(request: NextRequest) {
  try {
    const { word: wordData, userId, saveToCollection = true, relationshipId } = await request.json() as SaveDynamicRequest
    
    if (!wordData.word || !userId) {
      return NextResponse.json(
        { success: false, message: 'Word data and userId are required' },
        { status: 400 }
      )
    }
    
    const db = getAdminFirestore()
    
    // 1. words 컬렉션에 저장
    const newWord = {
      ...wordData,
      word: wordData.word.toLowerCase(),
      normalizedWord: wordData.word.toLowerCase().replace(/[^a-z]/g, ''),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      source: wordData.source || {
        type: 'ai_generated',
        origin: 'user_discovery',
        addedAt: new Date(),
        uploadedBy: userId
      }
    }
    
    const wordRef = await db.collection('words').add(newWord)
    const savedWordId = wordRef.id
    
    // 2. 관계 업데이트 (있는 경우)
    if (relationshipId) {
      await db.collection('word_relationships').doc(relationshipId).update({
        relatedWordId: savedWordId,  // 실제 단어 ID로 업데이트
        updatedAt: new Date()
      })
    }
    
    // 3. 사용자의 "발견한 단어" 컬렉션에 추가
    if (saveToCollection) {
      // 사용자의 발견 컬렉션 찾기 또는 생성
      const collectionsQuery = await db.collection('vocabulary_collections')
        .where('userId', '==', userId)
        .where('collectionType', '==', 'discovered')
        .limit(1)
        .get()
      
      let collectionId: string
      
      if (collectionsQuery.empty) {
        // 컬렉션이 없으면 생성
        const newCollection = {
          name: '내가 발견한 단어',
          description: '학습 중 발견하고 추가한 새로운 단어들',
          collectionType: 'discovered',
          userId: userId,
          isPublic: false,
          wordCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        const collectionRef = await db.collection('vocabulary_collections').add(newCollection)
        collectionId = collectionRef.id
      } else {
        collectionId = collectionsQuery.docs[0].id
      }
      
      // 단어를 컬렉션에 추가
      const wordInCollection = {
        wordId: savedWordId,
        word: newWord.word,
        addedAt: new Date(),
        addedBy: userId,
        difficulty: newWord.difficulty,
        partOfSpeech: newWord.partOfSpeech
      }
      
      await db.collection('vocabulary_collections')
        .doc(collectionId)
        .collection('words')
        .doc(savedWordId)
        .set(wordInCollection)
      
      // 컬렉션의 단어 수 업데이트
      await db.collection('vocabulary_collections').doc(collectionId).update({
        wordCount: FieldValue.increment(1),
        updatedAt: new Date()
      })
      
      // 사용자 단어장 구독 확인/생성
      const userVocabQuery = await db.collection('user_vocabularies')
        .where('userId', '==', userId)
        .where('vocabularyId', '==', collectionId)
        .limit(1)
        .get()
      
      if (userVocabQuery.empty) {
        await db.collection('user_vocabularies').add({
          userId: userId,
          vocabularyId: collectionId,
          vocabularyName: '내가 발견한 단어',
          isActive: true,
          subscribedAt: new Date()
        })
      }
    }
    
    // 4. 다중 정의 변형 저장 (선택사항)
    if (wordData.definitions && wordData.definitions.length > 0) {
      const definitionPromises = wordData.definitions.map(async (def) => {
        const variant = {
          wordId: savedWordId,
          wordText: newWord.word,
          definition: def.definition || def.text || '',
          language: def.language || 'ko',
          source: {
            type: 'ai' as const,
            name: 'GPT-4',
            credibility: 0.85
          },
          votes: {
            up: 0,
            down: 0,
            voters: []
          },
          isPreferred: true,  // AI 생성은 기본적으로 선호
          createdAt: new Date(),
          createdBy: userId
        }
        
        return db.collection('definition_variants').add(variant)
      })
      
      await Promise.all(definitionPromises)
    }
    
    return NextResponse.json({
      success: true,
      wordId: savedWordId,
      message: 'Word saved successfully',
      savedToCollection: saveToCollection
    })
    
  } catch (error) {
    console.error('Error saving dynamic word:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to save word',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}