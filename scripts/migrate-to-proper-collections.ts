/**
 * Migration Script: Reorganize Database Structure
 * 
 * This script properly organizes the vocabulary database:
 * 1. words collection = master pool of all words (no categorization)
 * 2. vocabulary_collections = official wordbooks that reference word IDs
 * 3. Creates SAT and 수능 official collections from existing words
 */

import * as admin from 'firebase-admin'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  
  if (!privateKey || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PROJECT_ID) {
    console.error('❌ Missing Firebase Admin credentials in .env.local')
    process.exit(1)
  }

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: privateKey,
    })
  })
}

const db = getFirestore()

interface Word {
  id?: string
  word: string
  source?: {
    type: string
    origin?: string
  }
  [key: string]: any
}

interface VocabularyCollection {
  id: string
  name: string
  displayName: string
  category: 'SAT' | 'TOEFL' | 'TOEIC' | '수능' | 'GRE' | 'IELTS' | '기본'
  description: string
  words: string[]
  wordCount: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  isOfficial: boolean
  uploadedBy: string
  version: string
  tags: string[]
  source: {
    type: 'pdf' | 'manual' | 'import'
    filename?: string
    publisher?: string
  }
  createdAt: Timestamp
  updatedAt: Timestamp
}

async function createOfficialCollections() {
  console.log('🚀 Starting database migration...\n')
  
  try {
    // Step 1: Fetch all words from the master DB
    console.log('📚 Fetching all words from master database...')
    const wordsSnapshot = await db.collection('words').get()
    const allWords: Word[] = []
    
    wordsSnapshot.forEach(doc => {
      allWords.push({ id: doc.id, ...doc.data() } as Word)
    })
    
    console.log(`✅ Found ${allWords.length} total words in master DB`)
    
    // Step 2: Categorize words by source
    const satWords = allWords.filter(w => w.source?.type === 'veterans_pdf')
    const suneungWords = allWords.filter(w => w.source?.type === 'pdf')
    const aiWords = allWords.filter(w => w.source?.type === 'ai_generated')
    
    console.log(`\n📊 Word Distribution:`)
    console.log(`   - SAT words (veterans_pdf): ${satWords.length}`)
    console.log(`   - 수능 words (pdf): ${suneungWords.length}`)
    console.log(`   - AI generated words: ${aiWords.length}`)
    
    // Step 3: Check for existing official collections
    console.log('\n🔍 Checking for existing official collections...')
    
    const collectionsRef = db.collection('vocabulary_collections')
    
    // Check for SAT collection
    let satCollectionId: string | null = null
    const satQuery = await collectionsRef
      .where('category', '==', 'SAT')
      .where('isOfficial', '==', true)
      .limit(1)
      .get()
    
    if (!satQuery.empty) {
      satCollectionId = satQuery.docs[0].id
      console.log(`   ✓ SAT collection exists (ID: ${satCollectionId})`)
    }
    
    // Check for 수능 collection
    let suneungCollectionId: string | null = null
    const suneungQuery = await collectionsRef
      .where('category', '==', '수능')
      .where('isOfficial', '==', true)
      .limit(1)
      .get()
    
    if (!suneungQuery.empty) {
      suneungCollectionId = suneungQuery.docs[0].id
      console.log(`   ✓ 수능 collection exists (ID: ${suneungCollectionId})`)
    }
    
    // Step 4: Create or update SAT official collection
    if (satWords.length > 0) {
      const satWordIds = satWords.map(w => w.id!).filter(id => id)
      
      const satCollectionData: Partial<VocabularyCollection> = {
        name: 'SAT 공식 단어장',
        displayName: 'SAT Vocabulary',
        category: 'SAT',
        description: 'College Board SAT 시험 대비 필수 영단어 (V.ZIP 3K)',
        words: satWordIds,
        wordCount: satWordIds.length,
        difficulty: 'advanced',
        isOfficial: true,
        uploadedBy: 'admin',
        version: '1.0.0',
        tags: ['SAT', '시험대비', '필수', 'V.ZIP', '3000'],
        source: {
          type: 'pdf',
          filename: 'V.ZIP 3K.pdf',
          publisher: 'V.ZIP'
        },
        updatedAt: Timestamp.now()
      }
      
      if (satCollectionId) {
        // Update existing
        await collectionsRef.doc(satCollectionId).update(satCollectionData)
        console.log(`\n✅ Updated SAT collection with ${satWordIds.length} words`)
      } else {
        // Create new
        const newSatCollection = await collectionsRef.add({
          ...satCollectionData,
          createdAt: Timestamp.now()
        } as VocabularyCollection)
        console.log(`\n✅ Created SAT collection (ID: ${newSatCollection.id}) with ${satWordIds.length} words`)
      }
    }
    
    // Step 5: Create or update 수능 official collection
    if (suneungWords.length > 0) {
      const suneungWordIds = suneungWords.map(w => w.id!).filter(id => id)
      
      const suneungCollectionData: Partial<VocabularyCollection> = {
        name: '수능 공식 단어장',
        displayName: '대학수학능력시험 영단어',
        category: '수능',
        description: '2025학년도 대학수학능력시험 대비 필수 영단어',
        words: suneungWordIds,
        wordCount: suneungWordIds.length,
        difficulty: 'intermediate',
        isOfficial: true,
        uploadedBy: 'admin',
        version: '1.0.0',
        tags: ['수능', '시험대비', '필수', '2025', 'KSAT'],
        source: {
          type: 'pdf',
          filename: '25년 수능 영단어 모음.pdf',
          publisher: '교육부'
        },
        updatedAt: Timestamp.now()
      }
      
      if (suneungCollectionId) {
        // Update existing
        await collectionsRef.doc(suneungCollectionId).update(suneungCollectionData)
        console.log(`✅ Updated 수능 collection with ${suneungWordIds.length} words`)
      } else {
        // Create new
        const newSuneungCollection = await collectionsRef.add({
          ...suneungCollectionData,
          createdAt: Timestamp.now()
        } as VocabularyCollection)
        console.log(`✅ Created 수능 collection (ID: ${newSuneungCollection.id}) with ${suneungWordIds.length} words`)
      }
    }
    
    // Step 6: Create other official collections (empty for now)
    const otherCollections = [
      {
        name: 'TOEFL 공식 단어장',
        displayName: 'TOEFL iBT Vocabulary',
        category: 'TOEFL' as const,
        description: 'ETS TOEFL iBT 시험 대비 필수 영단어',
        difficulty: 'advanced' as const,
        tags: ['TOEFL', 'iBT', 'ETS', '시험대비'],
        publisher: 'ETS'
      },
      {
        name: 'TOEIC 공식 단어장',
        displayName: 'TOEIC Vocabulary',
        category: 'TOEIC' as const,
        description: 'ETS TOEIC 시험 대비 비즈니스 영단어',
        difficulty: 'intermediate' as const,
        tags: ['TOEIC', '비즈니스', 'ETS', '시험대비'],
        publisher: 'ETS'
      },
      {
        name: 'GRE 공식 단어장',
        displayName: 'GRE Vocabulary',
        category: 'GRE' as const,
        description: 'ETS GRE 대학원 입학시험 대비 고급 영단어',
        difficulty: 'advanced' as const,
        tags: ['GRE', '대학원', 'ETS', '고급'],
        publisher: 'ETS'
      },
      {
        name: 'IELTS 공식 단어장',
        displayName: 'IELTS Vocabulary',
        category: 'IELTS' as const,
        description: 'British Council IELTS 시험 대비 영단어',
        difficulty: 'intermediate' as const,
        tags: ['IELTS', 'British Council', '시험대비'],
        publisher: 'British Council'
      },
      {
        name: '기본 영단어',
        displayName: 'Basic English Vocabulary',
        category: '기본' as const,
        description: '영어 학습 입문자를 위한 기초 필수 영단어',
        difficulty: 'beginner' as const,
        tags: ['기초', '입문', '필수'],
        publisher: 'Admin'
      }
    ]
    
    console.log('\n📝 Creating other official collections (empty)...')
    
    for (const collectionInfo of otherCollections) {
      // Check if already exists
      const existingQuery = await collectionsRef
        .where('category', '==', collectionInfo.category)
        .where('isOfficial', '==', true)
        .limit(1)
        .get()
      
      if (existingQuery.empty) {
        const newCollection = await collectionsRef.add({
          ...collectionInfo,
          words: [],
          wordCount: 0,
          isOfficial: true,
          uploadedBy: 'admin',
          version: '1.0.0',
          source: {
            type: 'manual' as const,
            publisher: collectionInfo.publisher
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        } as VocabularyCollection)
        
        console.log(`   ✓ Created ${collectionInfo.category} collection (ID: ${newCollection.id})`)
      } else {
        console.log(`   - ${collectionInfo.category} collection already exists`)
      }
    }
    
    console.log('\n✨ Migration completed successfully!')
    console.log('\n📋 Summary:')
    console.log('   - words collection: Master pool of all words (no categorization)')
    console.log('   - vocabulary_collections: Official wordbooks referencing word IDs')
    console.log('   - SAT and 수능 collections now properly reference words from master DB')
    console.log('   - AI generated words remain in master DB without specific collection')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
createOfficialCollections()
  .then(() => {
    console.log('\n👋 Exiting...')
    process.exit(0)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })