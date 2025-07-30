import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { 
  collection, 
  getDocs, 
  doc,
  setDoc,
  writeBatch,
  Timestamp,
  deleteDoc,
  query,
  where,
  limit
} from 'firebase/firestore'
import { WordService } from '@/lib/vocabulary-v2/word-service'
import { VocabularyService } from '@/lib/vocabulary-v2/vocabulary-service'
import { VocabularyWordService } from '@/lib/vocabulary-v2/vocabulary-word-service'

// 서비스 인스턴스
const wordService = new WordService()
const vocabularyService = new VocabularyService()
const vocabularyWordService = new VocabularyWordService()

export async function POST(request: Request) {
  try {
    console.log('Migration API called')
    const body = await request.json()
    console.log('Request body:', body)
    const { action } = body
    
    switch (action) {
      case 'check':
        console.log('Executing check action')
        return await checkCollections()
      case 'migrate':
        console.log('Executing migrate action')
        return await migrateCollections()
      case 'cleanup':
        console.log('Executing cleanup action')
        return await cleanupOldCollections()
      default:
        console.log('Invalid action:', action)
        return NextResponse.json({ error: 'Invalid action', action }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Migration error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error.message,
        stack: error.stack 
      }, 
      { status: 500 }
    )
  }
}

// 1. 현재 컬렉션 상태 확인
async function checkCollections() {
  const stats = {
    oldCollections: {
      vocabulary: 0,
      extracted_vocabulary: 0,
      veterans_vocabulary: 0
    },
    newCollections: {
      words: 0,
      vocabularies: 0,
      vocabulary_words: 0,
      user_vocabularies: 0,
      user_words: 0
    }
  }
  
  // 구 컬렉션 확인
  const vocabSnapshot = await getDocs(collection(db, 'vocabulary'))
  stats.oldCollections.vocabulary = vocabSnapshot.size
  
  const extractedSnapshot = await getDocs(collection(db, 'extracted_vocabulary'))
  stats.oldCollections.extracted_vocabulary = extractedSnapshot.size
  
  const veteransSnapshot = await getDocs(collection(db, 'veterans_vocabulary'))
  stats.oldCollections.veterans_vocabulary = veteransSnapshot.size
  
  // 새 컬렉션 확인
  const wordsSnapshot = await getDocs(collection(db, 'words'))
  stats.newCollections.words = wordsSnapshot.size
  
  const vocabulariesSnapshot = await getDocs(collection(db, 'vocabularies'))
  stats.newCollections.vocabularies = vocabulariesSnapshot.size
  
  const vocabularyWordsSnapshot = await getDocs(collection(db, 'vocabulary_words'))
  stats.newCollections.vocabulary_words = vocabularyWordsSnapshot.size
  
  const userVocabulariesSnapshot = await getDocs(collection(db, 'user_vocabularies'))
  stats.newCollections.user_vocabularies = userVocabulariesSnapshot.size
  
  const userWordsSnapshot = await getDocs(collection(db, 'user_words'))
  stats.newCollections.user_words = userWordsSnapshot.size
  
  return NextResponse.json({ 
    success: true, 
    stats,
    message: 'Collection status checked'
  })
}

// 2. 마이그레이션 실행
async function migrateCollections() {
  const results = {
    wordsCreated: 0,
    vocabularyCreated: false,
    mappingsCreated: 0,
    errors: []
  }
  
  try {
    // 2.1. extracted_vocabulary에서 단어들 가져오기
    const extractedSnapshot = await getDocs(collection(db, 'extracted_vocabulary'))
    console.log(`Found ${extractedSnapshot.size} words in extracted_vocabulary`)
    
    if (extractedSnapshot.empty) {
      return NextResponse.json({ 
        success: true, 
        message: 'No data to migrate',
        results 
      })
    }
    
    // 2.2. Veterans SAT 3000 단어장 생성
    let vocabularyId = ''
    
    // 인덱스 문제 회피를 위해 전체 단어장을 가져와서 필터링
    try {
      console.log('Checking for existing Veterans SAT 3000 vocabulary...')
      const allVocabSnapshot = await getDocs(collection(db, 'vocabularies'))
      console.log(`Found ${allVocabSnapshot.size} vocabularies in total`)
      
      const existingVocab = allVocabSnapshot.docs.find(doc => {
        const data = doc.data()
        return data.name === 'Veterans SAT 3000'
      })
      
      if (existingVocab) {
        vocabularyId = existingVocab.id
        console.log('Using existing vocabulary:', vocabularyId)
      } else {
        console.log('No existing Veterans SAT 3000 vocabulary found, will create new one')
      }
    } catch (err) {
      console.log('Error checking vocabularies:', err)
      console.log('Will create new vocabulary')
    }
    
    if (!vocabularyId) {
      const newVocab = await vocabularyService.createVocabulary({
        name: 'Veterans SAT 3000',
        description: 'SAT 고급 어휘 3000개 - V.ZIP 3K PDF에서 추출',
        type: 'system',
        ownerType: 'system',
        ownerId: 'system',
        isPublic: true,
        isOfficial: true,
        language: 'en',
        targetLevel: 'SAT',
        category: 'SAT',
        level: 'advanced',
        tags: ['SAT', 'Veterans', '3000', 'vocabulary'],
        source: {
          type: 'pdf',
          filename: 'V.ZIP 3K.pdf',
          uploadedBy: 'admin'
        }
      })
      vocabularyId = newVocab.id
      results.vocabularyCreated = true
      console.log('Created new vocabulary:', vocabularyId)
    }
    
    // 2.3. 단어들을 words 컬렉션으로 마이그레이션
    const batch = writeBatch(db)
    let batchCount = 0
    const wordIdMap = new Map()
    
    for (const docSnap of extractedSnapshot.docs) {
      const data = docSnap.data()
      
      // words 컬렉션에 이미 있는지 확인
      let existingWord = null
      try {
        existingWord = await wordService.findWordByText(data.word)
      } catch (err) {
        console.log(`Error checking existing word "${data.word}":`, err)
      }
      
      let wordId = ''
      if (existingWord) {
        wordId = existingWord.id
        console.log(`Word "${data.word}" already exists with id: ${wordId}`)
      } else {
        // 새 단어 생성
        const wordRef = doc(collection(db, 'words'))
        wordId = wordRef.id
        
        const newWordData = {
          id: wordId,
          word: data.word,
          pronunciation: data.pronunciation || null,
          partOfSpeech: data.partOfSpeech || [],
          definitions: [{
            definition: data.definition || '',
            examples: data.examples || [],
            source: 'pdf' as const,
            language: 'ko' as const,
            id: doc(collection(db, 'temp')).id,
            createdAt: Timestamp.now()
          }],
          etymology: data.etymology || '',
          realEtymology: data.realEtymology || null,
          synonyms: data.synonyms || [],
          antonyms: data.antonyms || [],
          difficulty: data.difficulty || 5,
          frequency: data.frequency || 5,
          isSAT: data.isSAT !== undefined ? data.isSAT : true,
          createdBy: data.userId || 'system',
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: Timestamp.now(),
          aiGenerated: {
            etymology: false,
            examples: false
          }
        }
        
        batch.set(wordRef, newWordData)
        batchCount++
        results.wordsCreated++
        
        // 배치가 500개가 되면 커밋
        if (batchCount >= 500) {
          await batch.commit()
          console.log(`Committed batch of ${batchCount} words`)
          batchCount = 0
        }
      }
      
      wordIdMap.set(docSnap.id, wordId)
    }
    
    // 남은 배치 커밋
    if (batchCount > 0) {
      await batch.commit()
      console.log(`Committed final batch of ${batchCount} words`)
    }
    
    // 2.4. vocabulary_words에 매핑 생성
    let order = 1
    for (const [oldId, newWordId] of wordIdMap) {
      try {
        await vocabularyWordService.addWordToVocabulary(
          vocabularyId,
          newWordId,
          'system',
          {
            order: order++,
            tags: ['SAT', 'Veterans']
          }
        )
        results.mappingsCreated++
      } catch (error) {
        console.error(`Error mapping word ${newWordId}:`, error)
        results.errors.push(`Failed to map word ${newWordId}`)
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Migration completed successfully',
      results 
    })
  } catch (error) {
    console.error('Migration failed:', error)
    results.errors.push(error.message)
    return NextResponse.json({ 
      success: false, 
      message: 'Migration failed',
      results,
      error: error.message 
    }, { status: 500 })
  }
}

// 3. 구 컬렉션 정리 (백업 후 실행 권장)
async function cleanupOldCollections() {
  const results = {
    deletedCounts: {
      vocabulary: 0,
      extracted_vocabulary: 0,
      veterans_vocabulary: 0
    },
    errors: []
  }
  
  try {
    // 각 컬렉션의 문서 삭제
    const collections = ['vocabulary', 'extracted_vocabulary', 'veterans_vocabulary']
    
    for (const collectionName of collections) {
      const snapshot = await getDocs(collection(db, collectionName))
      let totalDeleted = 0
      
      // 500개씩 배치로 삭제
      while (totalDeleted < snapshot.size) {
        const batch = writeBatch(db)
        let batchCount = 0
        
        for (let i = totalDeleted; i < snapshot.size && batchCount < 500; i++) {
          batch.delete(snapshot.docs[i].ref)
          batchCount++
        }
        
        if (batchCount > 0) {
          await batch.commit()
          totalDeleted += batchCount
          results.deletedCounts[collectionName] = totalDeleted
        }
      }
      
      console.log(`Deleted ${results.deletedCounts[collectionName]} documents from ${collectionName}`)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Old collections cleaned up',
      results 
    })
  } catch (error) {
    console.error('Cleanup failed:', error)
    results.errors.push(error.message)
    return NextResponse.json({ 
      success: false, 
      message: 'Cleanup failed',
      results,
      error: error.message 
    }, { status: 500 })
  }
}