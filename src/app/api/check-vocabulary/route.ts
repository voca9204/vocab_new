import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const checkType = searchParams.get('type') || 'collection'
    const db = getAdminFirestore()
    
    if (checkType === 'collection') {
      // 모든 vocabulary_collections 확인
      const allCollections = await db
        .collection('vocabulary_collections')
        .get()
      
      const collections = allCollections.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
      }))
      
      return NextResponse.json({
        success: true,
        collections,
        totalCount: collections.length
      })
    }
    
    if (checkType === 'suneung') {
      // 수능 공식 단어장 확인
      const collectionSnapshot = await db
        .collection('vocabulary_collections')
        .where('name', '==', '수능 공식 단어장')
        .where('type', '==', 'official')
        .get()
      
      if (collectionSnapshot.empty) {
        return NextResponse.json({
          success: false,
          message: '수능 공식 단어장을 찾을 수 없습니다.'
        })
      }
      
      const collection_data = collectionSnapshot.docs[0].data()
      const collectionId = collectionSnapshot.docs[0].id
      
      return NextResponse.json({
        success: true,
        collection: {
          id: collectionId,
          name: collection_data.name,
          description: collection_data.description,
          wordCount: collection_data.words?.length || 0,
          vocabularyType: collection_data.vocabularyType,
          userId: collection_data.userId,
          createdAt: collection_data.createdAt?.toDate?.() || collection_data.createdAt,
          updatedAt: collection_data.updatedAt?.toDate?.() || collection_data.updatedAt,
          words: collection_data.words?.slice(0, 5) || [] // 처음 5개 word ID만
        }
      })
    }
    
    if (checkType === 'words') {
      // 최근 추가된 단어들 확인
      const wordsSnapshot = await db
        .collection('words')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()
      
      const recentWords = wordsSnapshot.docs.map(doc => ({
        id: doc.id,
        word: doc.data().word,
        definitions: doc.data().definitions,
        source: doc.data().source,
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
      }))
      
      return NextResponse.json({
        success: true,
        recentWords,
        totalCount: recentWords.length
      })
    }
    
    if (checkType === 'suneung') {
      // 수능 단어장의 실제 단어들 확인
      const collectionSnapshot = await db
        .collection('vocabulary_collections')
        .where('name', '==', '수능 공식 단어장')
        .get()
      
      if (collectionSnapshot.empty) {
        return NextResponse.json({
          success: false,
          message: '수능 공식 단어장을 찾을 수 없습니다.'
        })
      }
      
      const collectionData = collectionSnapshot.docs[0].data()
      const wordIds = collectionData.words || []
      
      if (wordIds.length === 0) {
        return NextResponse.json({
          success: true,
          message: '단어장에 저장된 단어가 없습니다.',
          wordCount: 0
        })
      }
      
      // 처음 5개 단어의 실제 데이터 가져오기
      const sampleWordIds = wordIds.slice(0, 5)
      const wordPromises = sampleWordIds.map(async (wordId: string) => {
        try {
          const wordDoc = await db.collection('words').doc(wordId).get()
          if (wordDoc.exists) {
            const wordData = wordDoc.data()
            return {
              id: wordId,
              word: wordData?.word,
              definitions: wordData?.definitions?.[0]?.text || '정의 없음',
              source: wordData?.source
            }
          }
        } catch (error) {
          console.error(`Error fetching word ${wordId}:`, error)
        }
        return null
      })
      
      const sampleWords = (await Promise.all(wordPromises)).filter(Boolean)
      
      return NextResponse.json({
        success: true,
        collection: {
          name: collectionData.name,
          totalWordCount: wordIds.length,
          vocabularyType: collectionData.vocabularyType,
          createdAt: collectionData.createdAt?.toDate?.() || collectionData.createdAt,
          updatedAt: collectionData.updatedAt?.toDate?.() || collectionData.updatedAt
        },
        sampleWords
      })
    }
    
    return NextResponse.json({
      success: false,
      message: '잘못된 확인 타입입니다. type=collection|words|suneung 을 사용하세요.'
    })
    
  } catch (error) {
    console.error('Vocabulary check error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}