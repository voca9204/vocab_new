#!/usr/bin/env tsx
import * as admin from 'firebase-admin'
import * as fs from 'fs'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'vocabulary-app-new',
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  })
}

const db = admin.firestore()

interface ParsedWord {
  number: number
  word: string
  partOfSpeech: string
  koreanTranslation: string
  definition?: string
  example?: string
  difficulty?: string
}

// Improved parsing function
async function parseMarkdownFile(filePath: string): Promise<ParsedWord[]> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const words: ParsedWord[] = []
  
  for (const line of lines) {
    // Pattern 1: 1. **word** (part) - translation
    const pattern1 = line.match(/^(\d+)\.\s+\*\*([^*]+)\*\*\s+\(([^)]+)\)\s+-\s+(.+)$/)
    if (pattern1) {
      words.push({
        number: parseInt(pattern1[1]),
        word: pattern1[2].trim(),
        partOfSpeech: pattern1[3].trim(),
        koreanTranslation: pattern1[4].trim(),
      })
      continue
    }
    
    // Pattern 2: 1. **word** - translation  
    const pattern2 = line.match(/^(\d+)\.\s+\*\*([^*]+)\*\*\s+-\s+(.+)$/)
    if (pattern2) {
      words.push({
        number: parseInt(pattern2[1]),
        word: pattern2[2].trim(),
        partOfSpeech: 'noun', // Default to noun
        koreanTranslation: pattern2[3].trim(),
      })
      continue
    }
    
    // Pattern 3: 1. word - translation (no bold)
    const pattern3 = line.match(/^(\d+)\.\s+([a-zA-Z\s]+?)\s+-\s+(.+)$/)
    if (pattern3) {
      const wordText = pattern3[2].trim()
      // Skip if it looks like a section header (contains common non-word patterns)
      if (wordText.includes('**') || wordText.length > 30) {
        continue
      }
      
      words.push({
        number: parseInt(pattern3[1]),
        word: wordText,
        partOfSpeech: 'noun', // Default to noun
        koreanTranslation: pattern3[3].trim(),
      })
      continue
    }
  }
  
  return words
}

async function createWordsV3Collection() {
  console.log('🚀 Starting SAT Vocabulary II import (improved)...\n')
  
  const filePath = '/Users/sinclair/Downloads/compass_artifact_wf-518344d4-c632-4674-a512-022d43c8ed48_text_markdown.md'
  
  // Parse the markdown file
  const parsedWords = await parseMarkdownFile(filePath)
  console.log(`📝 Parsed ${parsedWords.length} words from the file\n`)
  
  if (parsedWords.length === 0) {
    console.log('❌ No words found to import')
    return
  }
  
  // Show first few parsed words for verification
  console.log('📋 First 5 parsed words:')
  parsedWords.slice(0, 5).forEach(word => {
    console.log(`  ${word.number}. ${word.word} (${word.partOfSpeech}) - ${word.koreanTranslation}`)
  })
  console.log('')
  
  // Find existing collection or create new one
  const existingCollectionQuery = await db.collection('vocabulary_collections')
    .where('name', '==', 'SAT Vocabulary II')
    .get()
  
  let collectionId: string
  
  if (!existingCollectionQuery.empty) {
    console.log('⚠️  Found existing SAT Vocabulary II collection, will update it')
    collectionId = existingCollectionQuery.docs[0].id
  } else {
    console.log('📁 Creating new SAT Vocabulary II collection')
    collectionId = `sat_vocabulary_ii_${Date.now()}`
  }
  
  const batch = db.batch()
  const wordIds: string[] = []
  let importedCount = 0
  
  // Convert parsed words to WordV3 format
  for (const parsedWord of parsedWords) {
    // Clean the word for use as document ID (remove slashes, special characters)
    const cleanWord = parsedWord.word.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[\/\\]/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
    const wordId = `sat2_${cleanWord}_${uuidv4().substring(0, 8)}`
    
    const wordV3 = {
      id: wordId,
      word: parsedWord.word,
      meaning: parsedWord.definition || parsedWord.koreanTranslation, // Use Korean as meaning if no English definition
      korean: parsedWord.koreanTranslation,
      partOfSpeech: parsedWord.partOfSpeech,
      level: 'intermediate' as const,
      examples: parsedWord.example ? [parsedWord.example] : [],
      synonyms: [],
      antonyms: [],
      frequency: 5, // Default frequency
      source: 'SAT Vocabulary II',
      category: ['SAT', 'Academic', 'Essential'],
      collectionIds: [collectionId],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      isActive: true,
      qualityScore: 80, // Good quality score
      metadata: {
        originalNumber: parsedWord.number,
        importedFrom: 'compass_artifact_wf-518344d4',
        importDate: new Date().toISOString(),
      }
    }
    
    batch.set(db.collection('words_v3').doc(wordId), wordV3)
    wordIds.push(wordId)
    importedCount++
  }
  
  // Create or update the vocabulary collection
  const collectionData = {
    name: 'SAT Vocabulary II',
    description: '1000개 SAT 필수 어휘 - College Board 공식 분석 기반',
    isOfficial: true,
    wordIds: wordIds,
    wordCount: importedCount,
    category: 'SAT',
    difficulty: 'intermediate',
    tags: ['SAT', 'Academic', 'Essential', 'College-Board'],
    createdBy: 'admin',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    isPublic: true,
    metadata: {
      source: 'compass_artifact_wf-518344d4',
      totalWords: importedCount,
      importDate: new Date().toISOString(),
    }
  }
  
  batch.set(db.collection('vocabulary_collections').doc(collectionId), collectionData)
  
  // Commit the batch
  console.log(`📤 Importing ${importedCount} words to Firestore...`)
  await batch.commit()
  
  console.log('\n✅ Import completed successfully!')
  console.log(`📊 Collection: ${collectionId}`)
  console.log(`📚 Words imported: ${importedCount}`)
  console.log(`🆔 Word IDs generated: ${wordIds.length}`)
  
  // Verify the import
  const verifyDoc = await db.collection('vocabulary_collections').doc(collectionId).get()
  if (verifyDoc.exists) {
    const data = verifyDoc.data()
    console.log(`\n🔍 Verification:`)
    console.log(`  - Collection exists: ✅`)
    console.log(`  - Word count in collection: ${data?.wordCount}`)
    console.log(`  - Word IDs array length: ${data?.wordIds?.length}`)
  }
}

createWordsV3Collection()
  .then(() => {
    console.log('\n🎉 SAT Vocabulary II import process completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error)
    process.exit(1)
  })
