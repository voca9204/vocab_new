#!/usr/bin/env tsx
/**
 * Analyze duplication between SAT Vocabulary II and existing words collection
 * This script helps determine if we should use existing words data or keep separate
 */

import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

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

interface WordData {
  word: string
  definition?: string
  korean?: string
  englishDefinition?: string
  partOfSpeech?: string | string[]
  examples?: string[]
  synonyms?: string[]
  antonyms?: string[]
  etymology?: string
  difficulty?: number
  frequency?: number
  collectionIds?: string[]
}

async function analyzeDuplication() {
  console.log('🔍 Analyzing SAT Vocabulary II duplication with existing words...\n')
  console.log('=' .repeat(60))
  
  // Step 1: Get all SAT II words from words_v3
  console.log('📚 Step 1: Fetching SAT Vocabulary II words from words_v3...')
  const satIISnapshot = await db.collection('words_v3')
    .where('collectionIds', 'array-contains', 'sat_vocabulary_ii_1756394109723')
    .get()
  
  const satIIWords = new Map<string, WordData>()
  satIISnapshot.forEach(doc => {
    const data = doc.data() as WordData
    satIIWords.set(data.word.toLowerCase(), data)
  })
  console.log(`   Found ${satIIWords.size} SAT II words in words_v3\n`)

  // Step 2: Get all words from the main 'words' collection
  console.log('📚 Step 2: Fetching existing words from main collection...')
  const wordsSnapshot = await db.collection('words').get()
  
  const existingWords = new Map<string, WordData>()
  wordsSnapshot.forEach(doc => {
    const data = doc.data() as WordData
    existingWords.set(data.word.toLowerCase(), data)
  })
  console.log(`   Found ${existingWords.size} words in main collection\n`)

  // Step 3: Analyze duplication
  console.log('🔬 Step 3: Analyzing duplication...')
  const duplicates: string[] = []
  const uniqueToSATII: string[] = []
  const dataQualityComparison: {
    word: string
    satII: { score: number, hasKorean: boolean, hasExamples: boolean, hasEtymology: boolean }
    existing: { score: number, hasKorean: boolean, hasExamples: boolean, hasEtymology: boolean }
    recommendation: 'use_existing' | 'use_sat_ii' | 'merge'
  }[] = []

  // Analyze each SAT II word
  for (const [word, satIIData] of satIIWords) {
    if (existingWords.has(word)) {
      duplicates.push(word)
      
      const existingData = existingWords.get(word)!
      
      // Calculate data quality scores
      const satIIScore = calculateQualityScore(satIIData)
      const existingScore = calculateQualityScore(existingData)
      
      dataQualityComparison.push({
        word,
        satII: {
          score: satIIScore,
          hasKorean: !!satIIData.korean,
          hasExamples: !!(satIIData.examples && satIIData.examples.length > 0),
          hasEtymology: !!satIIData.etymology
        },
        existing: {
          score: existingScore,
          hasKorean: !!existingData.korean,
          hasExamples: !!(existingData.examples && existingData.examples.length > 0),
          hasEtymology: !!existingData.etymology
        },
        recommendation: 
          existingScore > satIIScore + 10 ? 'use_existing' :
          satIIScore > existingScore + 10 ? 'use_sat_ii' :
          'merge'
      })
    } else {
      uniqueToSATII.push(word)
    }
  }

  // Step 4: Generate report
  console.log('\n' + '=' .repeat(60))
  console.log('📊 DUPLICATION ANALYSIS REPORT')
  console.log('=' .repeat(60))
  
  const duplicatePercentage = (duplicates.length / satIIWords.size * 100).toFixed(1)
  console.log(`\n📈 Overall Statistics:`)
  console.log(`   Total SAT II words: ${satIIWords.size}`)
  console.log(`   Duplicates found: ${duplicates.length} (${duplicatePercentage}%)`)
  console.log(`   Unique to SAT II: ${uniqueToSATII.length} (${(uniqueToSATII.length / satIIWords.size * 100).toFixed(1)}%)`)

  // Quality comparison statistics
  const betterInExisting = dataQualityComparison.filter(c => c.recommendation === 'use_existing').length
  const betterInSATII = dataQualityComparison.filter(c => c.recommendation === 'use_sat_ii').length
  const shouldMerge = dataQualityComparison.filter(c => c.recommendation === 'merge').length

  console.log(`\n📊 Data Quality Comparison (for ${duplicates.length} duplicates):`)
  console.log(`   Better in existing collection: ${betterInExisting} words`)
  console.log(`   Better in SAT II: ${betterInSATII} words`)
  console.log(`   Should merge data: ${shouldMerge} words`)

  // Sample comparison
  console.log(`\n🔍 Sample Quality Comparisons (first 10 duplicates):`)
  dataQualityComparison.slice(0, 10).forEach(comp => {
    console.log(`\n   📝 "${comp.word}":`)
    console.log(`      SAT II score: ${comp.satII.score} (Korean: ${comp.satII.hasKorean ? '✅' : '❌'}, Examples: ${comp.satII.hasExamples ? '✅' : '❌'}, Etymology: ${comp.satII.hasEtymology ? '✅' : '❌'})`)
    console.log(`      Existing score: ${comp.existing.score} (Korean: ${comp.existing.hasKorean ? '✅' : '❌'}, Examples: ${comp.existing.hasExamples ? '✅' : '❌'}, Etymology: ${comp.existing.hasEtymology ? '✅' : '❌'})`)
    console.log(`      → Recommendation: ${comp.recommendation.replace('_', ' ')}`)
  })

  // Architecture recommendations
  console.log('\n' + '=' .repeat(60))
  console.log('🏗️  ARCHITECTURE RECOMMENDATIONS')
  console.log('=' .repeat(60))
  
  if (duplicatePercentage > '70') {
    console.log('\n⚠️  HIGH DUPLICATION DETECTED (>70%)')
    console.log('\nRecommended Strategy: REFERENCE EXISTING DATA')
    console.log('1. Modify vocabulary_collections to store word references instead of duplicating')
    console.log('2. Update WordAdapter to fetch from main words collection when available')
    console.log('3. Only store unique SAT II words in words_v3')
    console.log('4. Benefits:')
    console.log('   - Reduce storage by ~70%')
    console.log('   - Single source of truth for word data')
    console.log('   - Easier to maintain and update')
  } else if (duplicatePercentage > '40') {
    console.log('\n⚡ MODERATE DUPLICATION DETECTED (40-70%)')
    console.log('\nRecommended Strategy: HYBRID APPROACH')
    console.log('1. Keep separate collections but implement smart fetching')
    console.log('2. Prioritize existing words collection for duplicates')
    console.log('3. Merge high-quality data from both sources')
    console.log('4. Benefits:')
    console.log('   - Balance between efficiency and flexibility')
    console.log('   - Can customize SAT-specific data')
  } else {
    console.log('\n✅ LOW DUPLICATION DETECTED (<40%)')
    console.log('\nRecommended Strategy: KEEP SEPARATE')
    console.log('1. Maintain separate collections as currently implemented')
    console.log('2. Each collection serves its specific purpose')
    console.log('3. Benefits:')
    console.log('   - Clear separation of concerns')
    console.log('   - Independent management of different word sets')
  }

  // Data migration suggestions
  if (betterInExisting > betterInSATII) {
    console.log('\n📋 Data Migration Suggestion:')
    console.log('The existing words collection generally has better data quality.')
    console.log('Consider updating vocabulary_collections to reference existing words.')
  }

  console.log('\n' + '=' .repeat(60))
  console.log('✨ Analysis Complete!')
}

function calculateQualityScore(word: WordData): number {
  let score = 0
  
  // Basic fields (10 points each)
  if (word.definition) score += 10
  if (word.korean) score += 10
  if (word.englishDefinition) score += 10
  
  // Part of speech (5 points)
  if (word.partOfSpeech) score += 5
  
  // Examples (15 points, more for multiple)
  if (word.examples && word.examples.length > 0) {
    score += Math.min(15, 5 * word.examples.length)
  }
  
  // Etymology (15 points)
  if (word.etymology) score += 15
  
  // Synonyms/Antonyms (10 points each)
  if (word.synonyms && word.synonyms.length > 0) score += 10
  if (word.antonyms && word.antonyms.length > 0) score += 10
  
  // Metadata (5 points each)
  if (word.difficulty !== undefined) score += 5
  if (word.frequency !== undefined) score += 5
  
  return score
}

analyzeDuplication()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })