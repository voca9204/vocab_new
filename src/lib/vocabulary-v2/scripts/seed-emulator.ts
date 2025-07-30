/**
 * Firebase Emulator용 시드 데이터 생성 스크립트
 * 개발 환경에서 테스트용 데이터를 생성합니다.
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { WordService } from '../word-service'
import { VocabularyService } from '../vocabulary-service'
import { VocabularyWordService } from '../vocabulary-word-service'
import { adminUserId } from '../../admin-config'

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

// Firebase 초기화
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

// 에뮬레이터 연결
connectFirestoreEmulator(db, 'localhost', 8181)
connectAuthEmulator(auth, 'http://localhost:9199')

const wordService = new WordService()
const vocabularyService = new VocabularyService()
const vocabularyWordService = new VocabularyWordService()

// 샘플 단어 데이터
const sampleWords = [
  {
    word: 'aberration',
    definitions: [{
      definition: '정상적인 것으로부터의 일탈',
      language: 'ko',
      source: 'V.ZIP',
      examples: ['The student\'s poor performance was an aberration from his usual excellence.']
    }],
    partOfSpeech: ['noun'],
    pronunciation: '/ˌæbəˈreɪʃən/',
    etymology: 'a departure from what is normal or expected',
    difficulty: 7,
    frequency: 3,
    isSAT: true
  },
  {
    word: 'abscond',
    definitions: [{
      definition: '몰래 도망치다',
      language: 'ko',
      source: 'V.ZIP',
      examples: ['The thief absconded with the jewels before the police arrived.']
    }],
    partOfSpeech: ['verb'],
    pronunciation: '/əbˈskɑnd/',
    etymology: 'to leave secretly and hurriedly',
    difficulty: 8,
    frequency: 2,
    isSAT: true
  },
  {
    word: 'acumen',
    definitions: [{
      definition: '통찰력, 명민함',
      language: 'ko',
      source: 'V.ZIP',
      examples: ['Her business acumen helped the company grow rapidly.']
    }],
    partOfSpeech: ['noun'],
    pronunciation: '/əˈkjumən/',
    etymology: 'keenness of mind; shrewd judgment',
    difficulty: 6,
    frequency: 4,
    isSAT: true
  }
]

async function seedEmulator() {
  console.log('🌱 Starting emulator seeding...')
  
  try {
    // 1. 시스템 단어장 생성
    console.log('📚 Creating system vocabulary...')
    const vocabulary = await vocabularyService.createVocabulary({
      name: 'V.ZIP 3K 단어장',
      description: 'V.ZIP 3K PDF에서 추출한 SAT 단어장',
      type: 'system',
      isPublic: true,
      createdBy: adminUserId,
      language: 'en',
      targetLevel: 'SAT',
      tags: ['SAT', 'V.ZIP', '3000'],
      metadata: {
        source: 'V.ZIP 3K.pdf',
        extractedDate: new Date().toISOString(),
        totalWords: sampleWords.length
      }
    })
    
    console.log(`✅ Created vocabulary: ${vocabulary.name} (${vocabulary.id})`)
    
    // 2. 단어 생성 및 단어장 연결
    console.log('📝 Creating words and linking to vocabulary...')
    for (const wordData of sampleWords) {
      // 단어 생성
      const word = await wordService.createOrUpdateWord({
        ...wordData,
        createdBy: adminUserId
      })
      
      console.log(`  ✅ Created word: ${word.word}`)
      
      // 단어장에 연결
      await vocabularyWordService.addWordToVocabulary(vocabulary.id, word.id, adminUserId)
    }
    
    console.log('\n🎉 Emulator seeding completed successfully!')
    console.log(`📊 Summary:`)
    console.log(`  - 1 vocabulary created`)
    console.log(`  - ${sampleWords.length} words created`)
    console.log(`  - All words linked to vocabulary`)
    
  } catch (error) {
    console.error('❌ Error seeding emulator:', error)
    process.exit(1)
  }
}

// 스크립트 실행
seedEmulator()