#!/usr/bin/env tsx
/**
 * Script to import SAT Vocabulary II (1000 words) from markdown file
 * Creates a new collection in vocabulary_collections and imports words to words_v3
 */

import * as admin from 'firebase-admin'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// Initialize Firebase Admin
const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT
let serviceAccount: any

if (serviceAccountJson) {
  // If full service account JSON is provided
  serviceAccount = JSON.parse(serviceAccountJson)
} else {
  // Use individual env vars
  serviceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'vocabulary-app-new',
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }
}

if (!serviceAccount.privateKey) {
  console.error('❌ Firebase Admin private key not found in environment variables')
  console.error('Please ensure FIREBASE_ADMIN_PRIVATE_KEY is set in .env.local')
  process.exit(1)
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  })
}

const db = admin.firestore()

// Types
interface ParsedWord {
  number: number
  word: string
  partOfSpeech: string
  koreanTranslation: string
  definition?: string
  example?: string
  difficulty?: string
  frequency?: string
  synonyms?: string[]
  antonyms?: string[]
}

interface WordV3 {
  id: string
  word: string
  meaning: string
  korean: string
  partOfSpeech: string
  level: 'beginner' | 'intermediate' | 'advanced'
  examples: string[]
  synonyms: string[]
  antonyms: string[]
  frequency: number
  source: string
  category: string[]
  collectionIds: string[]
  createdAt: admin.firestore.Timestamp
  updatedAt: admin.firestore.Timestamp
  isActive: boolean
  qualityScore: number
  metadata: {
    originalNumber?: number
    satDifficulty?: string
    satFrequency?: string
    importedFrom: string
    importDate: string
  }
}

// Parse the markdown file
async function parseMarkdownFile(filePath: string): Promise<ParsedWord[]> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const words: ParsedWord[] = []
  
  let currentWord: ParsedWord | null = null
  let inDefinition = false
  let inExample = false
  
  for (const line of lines) {
    // Match numbered entries like "1. **word** (part) - translation"
    const mainMatch = line.match(/^(\d+)\.\s+\*\*([^*]+)\*\*\s+\(([^)]+)\)\s+-\s+(.+)$/)
    if (mainMatch) {
      // Save previous word if exists
      if (currentWord) {
        words.push(currentWord)
      }
      
      currentWord = {
        number: parseInt(mainMatch[1]),
        word: mainMatch[2].trim(),
        partOfSpeech: mainMatch[3].trim(),
        koreanTranslation: mainMatch[4].trim(),
      }
      inDefinition = false
      inExample = false
      continue
    }
    
    // Match simple numbered entries like "56. austere - 엄격한, 금욕적인"
    const simpleMatch = line.match(/^(\d+)\.\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+-\s+(.+)$/)
    if (simpleMatch) {
      if (currentWord) {
        words.push(currentWord)
      }
      
      currentWord = {
        number: parseInt(simpleMatch[1]),
        word: simpleMatch[2].trim(),
        partOfSpeech: 'adjective', // Most are adjectives/verbs
        koreanTranslation: simpleMatch[3].trim(),
      }
      inDefinition = false
      inExample = false
      continue
    }
    
    // Parse additional details for current word
    if (currentWord && line.trim().startsWith('- ')) {
      const detailLine = line.trim().substring(2)
      
      if (detailLine.startsWith('정의:') || detailLine.startsWith('Definition:')) {
        currentWord.definition = detailLine.replace(/^(정의|Definition):\s*/, '').trim()
        inDefinition = true
        inExample = false
      } else if (detailLine.startsWith('예문:') || detailLine.startsWith('Example:')) {
        currentWord.example = detailLine.replace(/^(예문|Example):\s*/, '').trim()
        inDefinition = false
        inExample = true
      } else if (detailLine.startsWith('난이도:') || detailLine.startsWith('Difficulty:')) {
        currentWord.difficulty = detailLine.replace(/^(난이도|Difficulty):\s*/, '').trim()
      } else if (detailLine.startsWith('출제') || detailLine.includes('빈도')) {
        currentWord.frequency = detailLine.trim()
      } else if (detailLine.startsWith('동의어:') || detailLine.startsWith('Synonyms:')) {
        const synonymText = detailLine.replace(/^(동의어|Synonyms):\s*/, '').trim()
        currentWord.synonyms = synonymText.split(',').map(s => s.trim())
      } else if (detailLine.startsWith('반의어:') || detailLine.startsWith('Antonyms:')) {
        const antonymText = detailLine.replace(/^(반의어|Antonyms):\s*/, '').trim()
        currentWord.antonyms = antonymText.split(',').map(s => s.trim())
      }
    }
  }
  
  // Add the last word
  if (currentWord) {
    words.push(currentWord)
  }
  
  return words
}

// Convert difficulty to level
function getDifficultyLevel(difficulty?: string, number?: number): 'beginner' | 'intermediate' | 'advanced' {
  if (difficulty) {
    const lower = difficulty.toLowerCase()
    if (lower.includes('basic')) return 'beginner'
    if (lower.includes('intermediate')) return 'intermediate'
    if (lower.includes('advanced')) return 'advanced'
  }
  
  // Use number range as fallback
  if (number) {
    if (number <= 200) return 'beginner'
    if (number <= 600) return 'intermediate'
    return 'advanced'
  }
  
  return 'intermediate'
}

// Calculate quality score
function calculateQualityScore(word: ParsedWord): number {
  let score = 50 // Base score
  
  if (word.definition) score += 15
  if (word.example) score += 15
  if (word.synonyms && word.synonyms.length > 0) score += 10
  if (word.antonyms && word.antonyms.length > 0) score += 10
  
  // Bonus for lower numbers (more important words)
  if (word.number <= 50) score += 10
  else if (word.number <= 150) score += 5
  
  return Math.min(100, score)
}

// Convert parsed word to WordV3 format
function convertToWordV3(parsedWord: ParsedWord, collectionId: string): WordV3 {
  const wordId = `sat2_${parsedWord.word.toLowerCase().replace(/\s+/g, '_')}_${uuidv4().substring(0, 8)}`
  
  // Clean metadata to remove undefined values
  const metadata: any = {
    importedFrom: 'compass_artifact_wf-518344d4',
    importDate: new Date().toISOString(),
  }
  
  if (parsedWord.number !== undefined) metadata.originalNumber = parsedWord.number
  if (parsedWord.difficulty) metadata.satDifficulty = parsedWord.difficulty
  if (parsedWord.frequency) metadata.satFrequency = parsedWord.frequency
  
  return {
    id: wordId,
    word: parsedWord.word,
    meaning: parsedWord.definition || parsedWord.koreanTranslation,
    korean: parsedWord.koreanTranslation,
    partOfSpeech: parsedWord.partOfSpeech.toLowerCase() === 'unknown' ? 'noun' : parsedWord.partOfSpeech.toLowerCase(),
    level: getDifficultyLevel(parsedWord.difficulty, parsedWord.number),
    examples: parsedWord.example ? [parsedWord.example.replace(/^["']|["']$/g, '')] : [],
    synonyms: parsedWord.synonyms || [],
    antonyms: parsedWord.antonyms || [],
    frequency: parsedWord.number <= 200 ? 10 : parsedWord.number <= 600 ? 5 : 2,
    source: 'SAT Vocabulary II',
    category: ['SAT', 'Academic', 'Test Prep'],
    collectionIds: [collectionId],
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    isActive: true,
    qualityScore: calculateQualityScore(parsedWord),
    metadata,
  }
}

// Main import function
async function importSATVocabularyII() {
  console.log('🚀 Starting SAT Vocabulary II import...')
  
  const filePath = '/Users/sinclair/Downloads/compass_artifact_wf-518344d4-c632-4674-a512-022d43c8ed48_text_markdown.md'
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath)
    return
  }
  
  try {
    // Step 1: Parse the markdown file
    console.log('📖 Parsing markdown file...')
    const parsedWords = await parseMarkdownFile(filePath)
    console.log(`✅ Parsed ${parsedWords.length} words`)
    
    // Limit to first 1000 words as requested
    const wordsToImport = parsedWords.slice(0, 1000)
    console.log(`📊 Importing ${wordsToImport.length} words`)
    
    // Step 2: Create the collection in vocabulary_collections
    console.log('📚 Creating SAT Vocabulary II collection...')
    const collectionId = `sat_vocabulary_ii_${Date.now()}`
    const collectionData = {
      id: collectionId,
      name: 'SAT Vocabulary II',
      description: 'SAT 필수 어휘 1000개 - 디지털 SAT 최신 출제 경향 반영',
      type: 'official',
      category: 'SAT',
      wordCount: wordsToImport.length,
      wordIds: [],
      tags: ['SAT', 'Test Prep', 'Academic', 'English', 'Vocabulary'],
      level: 'all',
      isPublic: true,
      isOfficial: true,
      metadata: {
        source: 'Digital SAT Official Guide',
        importDate: new Date().toISOString(),
        version: '2.0',
        targetScore: '1400+',
        estimatedStudyTime: 60, // hours
      },
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      createdBy: 'admin',
      stats: {
        totalWords: wordsToImport.length,
        beginnerWords: 0,
        intermediateWords: 0,
        advancedWords: 0,
      },
    }
    
    // Step 3: Convert and prepare words for batch upload
    console.log('🔄 Converting words to database format...')
    const wordV3Documents: WordV3[] = []
    const wordIds: string[] = []
    let beginnerCount = 0
    let intermediateCount = 0
    let advancedCount = 0
    
    for (const parsedWord of wordsToImport) {
      const wordV3 = convertToWordV3(parsedWord, collectionId)
      wordV3Documents.push(wordV3)
      wordIds.push(wordV3.id)
      
      // Count by level
      if (wordV3.level === 'beginner') beginnerCount++
      else if (wordV3.level === 'intermediate') intermediateCount++
      else if (wordV3.level === 'advanced') advancedCount++
    }
    
    // Update collection stats
    collectionData.wordIds = wordIds
    collectionData.stats.beginnerWords = beginnerCount
    collectionData.stats.intermediateWords = intermediateCount
    collectionData.stats.advancedWords = advancedCount
    
    // Step 4: Upload to Firestore in batches
    console.log('📤 Uploading to Firestore...')
    const BATCH_SIZE = 100
    let uploadedCount = 0
    
    // Upload words in batches
    for (let i = 0; i < wordV3Documents.length; i += BATCH_SIZE) {
      const batch = db.batch()
      const batchWords = wordV3Documents.slice(i, i + BATCH_SIZE)
      
      for (const word of batchWords) {
        const docRef = db.collection('words_v3').doc(word.id)
        batch.set(docRef, word)
      }
      
      await batch.commit()
      uploadedCount += batchWords.length
      console.log(`  📝 Uploaded ${uploadedCount}/${wordV3Documents.length} words`)
    }
    
    // Step 5: Create the collection document
    console.log('💾 Saving collection metadata...')
    await db.collection('vocabulary_collections').doc(collectionId).set(collectionData)
    
    // Step 6: Validate the import
    console.log('✔️ Validating import...')
    const collectionDoc = await db.collection('vocabulary_collections').doc(collectionId).get()
    const sampleWords = await db.collection('words_v3')
      .where('collectionIds', 'array-contains', collectionId)
      .limit(5)
      .get()
    
    console.log('\n✨ Import completed successfully!')
    console.log('📊 Summary:')
    console.log(`  - Collection ID: ${collectionId}`)
    console.log(`  - Total words imported: ${wordsToImport.length}`)
    console.log(`  - Beginner level: ${beginnerCount}`)
    console.log(`  - Intermediate level: ${intermediateCount}`)
    console.log(`  - Advanced level: ${advancedCount}`)
    console.log(`  - Collection verified: ${collectionDoc.exists}`)
    console.log(`  - Sample words verified: ${sampleWords.size}`)
    
    // Show sample words
    console.log('\n📝 Sample imported words:')
    sampleWords.forEach(doc => {
      const word = doc.data()
      console.log(`  - ${word.word} (${word.partOfSpeech}): ${word.korean}`)
    })
    
  } catch (error) {
    console.error('❌ Error during import:', error)
    throw error
  }
}

// Run the import
importSATVocabularyII()
  .then(() => {
    console.log('\n🎉 Import process completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Import failed:', error)
    process.exit(1)
  })