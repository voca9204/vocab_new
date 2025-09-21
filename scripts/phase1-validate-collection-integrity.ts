#!/usr/bin/env tsx
/**
 * Phase 1.3: Data Validation System
 * 
 * Comprehensive integrity validation with detailed reporting
 * Following improvement-plan.md specifications with enhanced monitoring
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

interface IntegrityReport {
  timestamp: Date
  totalCollections: number
  validCollections: number
  brokenReferences: number
  missingCollectionIds: number
  totalWords: number
  wordsWithCollections: number
  bidirectionalIntegrity: number // percentage
  collectionHealth: CollectionHealth[]
  summary: {
    overallHealth: 'excellent' | 'good' | 'poor' | 'critical'
    criticalIssues: string[]
    recommendations: string[]
  }
}

interface CollectionHealth {
  id: string
  name: string
  type: 'official' | 'personal'
  wordCount: number
  validReferences: number
  brokenReferences: number
  missingReverseRefs: number
  integrityScore: number
  status: 'healthy' | 'warning' | 'critical'
  issues: string[]
}

interface ValidationConfig {
  SAMPLE_SIZE_PERCENT: number
  INTEGRITY_THRESHOLDS: {
    EXCELLENT: number
    GOOD: number
    POOR: number
  }
  COMPREHENSIVE_CHECK: boolean
}

// Configuration based on command line args
const CONFIG: ValidationConfig = {
  SAMPLE_SIZE_PERCENT: process.argv.includes('--quick') ? 10 : process.argv.includes('--comprehensive') ? 100 : 25,
  INTEGRITY_THRESHOLDS: {
    EXCELLENT: 98,
    GOOD: 90,
    POOR: 70
  },
  COMPREHENSIVE_CHECK: process.argv.includes('--comprehensive')
}

async function validateEnvironment(): Promise<void> {
  console.log('🔒 Validating environment for integrity check...')
  
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('Missing required Firebase admin credentials')
  }
  
  try {
    const [wordsTest, collectionsTest] = await Promise.all([
      db.collection('words_v3').limit(1).get(),
      db.collection('vocabulary_collections').limit(1).get()
    ])
    console.log(`✅ Database connectivity verified`)
  } catch (error) {
    throw new Error(`Database connection failed: ${error}`)
  }
}

async function validateCollectionHealth(collectionDoc: admin.firestore.QueryDocumentSnapshot): Promise<CollectionHealth> {
  const data = collectionDoc.data()
  // Handle both 'wordIds' and 'words' field names
  const wordIds = data.wordIds || data.words || []
  
  const health: CollectionHealth = {
    id: collectionDoc.id,
    name: data.name || collectionDoc.id,
    type: collectionDoc.ref.parent.id === 'vocabulary_collections' ? 'official' : 'personal',
    wordCount: wordIds.length,
    validReferences: 0,
    brokenReferences: 0,
    missingReverseRefs: 0,
    integrityScore: 0,
    status: 'healthy',
    issues: []
  }
  
  if (wordIds.length === 0) {
    health.issues.push('Empty collection - no words')
    health.status = 'warning'
    health.integrityScore = 0
    return health
  }
  
  // Sample words for validation (configurable sample size)
  const sampleSize = Math.max(1, Math.ceil(wordIds.length * CONFIG.SAMPLE_SIZE_PERCENT / 100))
  const sampleWords = CONFIG.COMPREHENSIVE_CHECK 
    ? wordIds 
    : wordIds.slice(0, sampleSize)
  
  console.log(`   📊 Validating "${health.name}": ${sampleWords.length}/${wordIds.length} words`)
  
  for (const wordId of sampleWords) {
    try {
      const wordDoc = await db.collection('words_v3').doc(wordId).get()
      
      if (!wordDoc.exists) {
        health.brokenReferences++
        if (health.issues.length < 5) { // Limit issue details
          health.issues.push(`Word not found: ${wordId}`)
        }
      } else {
        const wordData = wordDoc.data()!
        if (!wordData.collectionIds?.includes(collectionDoc.id)) {
          health.missingReverseRefs++
          if (health.issues.length < 5) {
            health.issues.push(`Missing reverse reference: ${wordId}`)
          }
        } else {
          health.validReferences++
        }
      }
    } catch (error) {
      health.brokenReferences++
      if (health.issues.length < 5) {
        health.issues.push(`Error checking ${wordId}: ${error}`)
      }
    }
  }
  
  // Calculate integrity score (scale up if sampling)
  const totalChecked = sampleWords.length
  const actualValidReferences = health.validReferences
  const actualBrokenReferences = health.brokenReferences
  const actualMissingReverseRefs = health.missingReverseRefs
  
  // Scale up stats if sampling
  if (!CONFIG.COMPREHENSIVE_CHECK && sampleWords.length < wordIds.length) {
    const scaleFactor = wordIds.length / sampleWords.length
    health.validReferences = Math.round(actualValidReferences * scaleFactor)
    health.brokenReferences = Math.round(actualBrokenReferences * scaleFactor)
    health.missingReverseRefs = Math.round(actualMissingReverseRefs * scaleFactor)
  }
  
  health.integrityScore = totalChecked > 0 
    ? Math.round((actualValidReferences / totalChecked) * 100)
    : 0
  
  // Determine status
  if (health.integrityScore >= CONFIG.INTEGRITY_THRESHOLDS.EXCELLENT) {
    health.status = 'healthy'
  } else if (health.integrityScore >= CONFIG.INTEGRITY_THRESHOLDS.GOOD) {
    health.status = 'warning'
  } else {
    health.status = 'critical'
  }
  
  // Add summary issues
  if (health.brokenReferences > 0) {
    health.issues.unshift(`${health.brokenReferences} broken references`)
  }
  if (health.missingReverseRefs > 0) {
    health.issues.unshift(`${health.missingReverseRefs} missing reverse references`)
  }
  
  return health
}

async function validateSystemIntegrity(): Promise<IntegrityReport> {
  console.log(`🔍 System Integrity Validation (${CONFIG.SAMPLE_SIZE_PERCENT}% sample)`)
  
  const report: IntegrityReport = {
    timestamp: new Date(),
    totalCollections: 0,
    validCollections: 0,
    brokenReferences: 0,
    missingCollectionIds: 0,
    totalWords: 0,
    wordsWithCollections: 0,
    bidirectionalIntegrity: 0,
    collectionHealth: [],
    summary: {
      overallHealth: 'excellent',
      criticalIssues: [],
      recommendations: []
    }
  }
  
  // Validate all collections
  console.log('\n📚 Validating official collections...')
  const officialCollections = await db.collection('vocabulary_collections').get()
  
  for (const collection of officialCollections.docs) {
    const health = await validateCollectionHealth(collection)
    report.collectionHealth.push(health)
    report.totalCollections++
    
    if (health.status === 'healthy') {
      report.validCollections++
    }
    
    report.brokenReferences += health.brokenReferences
    report.missingCollectionIds += health.missingReverseRefs
  }
  
  console.log('\n👤 Validating personal collections...')
  const personalCollections = await db.collection('personal_collections').get()
  
  for (const collection of personalCollections.docs) {
    const health = await validateCollectionHealth(collection)
    report.collectionHealth.push(health)
    report.totalCollections++
    
    if (health.status === 'healthy') {
      report.validCollections++
    }
    
    report.brokenReferences += health.brokenReferences
    report.missingCollectionIds += health.missingReverseRefs
  }
  
  // Check reverse direction (words → collections)
  console.log('\n🔄 Validating reverse relationships...')
  const wordsWithCollections = await db.collection('words_v3')
    .where('collectionIds', '!=', null)
    .get()
  
  report.wordsWithCollections = wordsWithCollections.size
  
  const totalWordsSnapshot = await db.collection('words_v3').get()
  report.totalWords = totalWordsSnapshot.size
  
  // Calculate bidirectional integrity
  const totalExpectedReferences = report.collectionHealth.reduce((sum, health) => sum + health.wordCount, 0)
  const totalValidReferences = report.collectionHealth.reduce((sum, health) => sum + health.validReferences, 0)
  
  report.bidirectionalIntegrity = totalExpectedReferences > 0 
    ? Math.round((totalValidReferences / totalExpectedReferences) * 100)
    : 100
  
  // Determine overall health
  const criticalCollections = report.collectionHealth.filter(h => h.status === 'critical').length
  const warningCollections = report.collectionHealth.filter(h => h.status === 'warning').length
  
  if (criticalCollections > 0) {
    report.summary.overallHealth = 'critical'
    report.summary.criticalIssues.push(`${criticalCollections} collections in critical state`)
  } else if (report.bidirectionalIntegrity < CONFIG.INTEGRITY_THRESHOLDS.GOOD) {
    report.summary.overallHealth = 'poor'
    report.summary.criticalIssues.push(`Low bidirectional integrity: ${report.bidirectionalIntegrity}%`)
  } else if (warningCollections > report.totalCollections / 2) {
    report.summary.overallHealth = 'poor'
    report.summary.criticalIssues.push(`${warningCollections} collections need attention`)
  } else if (report.bidirectionalIntegrity < CONFIG.INTEGRITY_THRESHOLDS.EXCELLENT) {
    report.summary.overallHealth = 'good'
  }
  
  // Generate recommendations
  if (report.brokenReferences > 0) {
    report.summary.recommendations.push(`Run Phase 1.2 cleanup to remove ${report.brokenReferences} broken references`)
  }
  
  if (report.missingCollectionIds > 0) {
    report.summary.recommendations.push(`Run Phase 1.1 to fix ${report.missingCollectionIds} missing bidirectional references`)
  }
  
  if (report.bidirectionalIntegrity < 95) {
    report.summary.recommendations.push('Consider running full Phase 1 data integrity fixes')
  }
  
  const emptyCollections = report.collectionHealth.filter(h => h.wordCount === 0).length
  if (emptyCollections > 0) {
    report.summary.recommendations.push(`Consider removing or populating ${emptyCollections} empty collections`)
  }
  
  return report
}

function printDetailedReport(report: IntegrityReport): void {
  console.log('\n' + '=' .repeat(80))
  console.log('📊 COMPREHENSIVE INTEGRITY VALIDATION REPORT')
  console.log('=' .repeat(80))
  
  // Overall health status
  const healthIcon = {
    excellent: '💚',
    good: '💛', 
    poor: '🧡',
    critical: '❤️'
  }[report.summary.overallHealth]
  
  console.log(`\n🎯 OVERALL HEALTH: ${healthIcon} ${report.summary.overallHealth.toUpperCase()}`)
  console.log(`📅 Validated: ${report.timestamp.toISOString()}`)
  console.log(`🔍 Sample Size: ${CONFIG.SAMPLE_SIZE_PERCENT}% ${CONFIG.COMPREHENSIVE_CHECK ? '(Comprehensive)' : '(Sampled)'}`)
  
  // System metrics
  console.log(`\n📈 SYSTEM METRICS:`)
  console.log(`   📚 Total Collections: ${report.totalCollections}`)
  console.log(`   ✅ Healthy Collections: ${report.validCollections} (${Math.round((report.validCollections/report.totalCollections)*100)}%)`)
  console.log(`   📝 Total Words: ${report.totalWords}`)
  console.log(`   🔗 Words with Collections: ${report.wordsWithCollections} (${Math.round((report.wordsWithCollections/report.totalWords)*100)}%)`)
  console.log(`   🎯 Bidirectional Integrity: ${report.bidirectionalIntegrity}%`)
  
  // Issues summary
  if (report.summary.criticalIssues.length > 0) {
    console.log(`\n🚨 CRITICAL ISSUES:`)
    report.summary.criticalIssues.forEach(issue => {
      console.log(`   ❌ ${issue}`)
    })
  }
  
  // Collection health details
  console.log(`\n📋 COLLECTION HEALTH DETAILS:`)
  
  // Group by type
  const officialCollections = report.collectionHealth.filter(h => h.type === 'official')
  const personalCollections = report.collectionHealth.filter(h => h.type === 'personal')
  
  if (officialCollections.length > 0) {
    console.log(`\n   📚 Official Collections (${officialCollections.length}):`)
    officialCollections.forEach(health => {
      const statusIcon = health.status === 'healthy' ? '💚' : health.status === 'warning' ? '💛' : '❤️'
      console.log(`      ${statusIcon} "${health.name}" - ${health.integrityScore}% integrity`)
      console.log(`         📊 ${health.wordCount} words, ${health.validReferences} valid, ${health.brokenReferences + health.missingReverseRefs} issues`)
      
      if (health.issues.length > 0 && health.status !== 'healthy') {
        health.issues.slice(0, 3).forEach(issue => {
          console.log(`         ⚠️  ${issue}`)
        })
        if (health.issues.length > 3) {
          console.log(`         ... and ${health.issues.length - 3} more issues`)
        }
      }
    })
  }
  
  if (personalCollections.length > 0) {
    console.log(`\n   👤 Personal Collections (${personalCollections.length}):`)
    personalCollections.forEach(health => {
      const statusIcon = health.status === 'healthy' ? '💚' : health.status === 'warning' ? '💛' : '❤️'
      console.log(`      ${statusIcon} "${health.name}" - ${health.integrityScore}% integrity`)
      console.log(`         📊 ${health.wordCount} words, ${health.validReferences} valid, ${health.brokenReferences + health.missingReverseRefs} issues`)
    })
  }
  
  // Recommendations
  if (report.summary.recommendations.length > 0) {
    console.log(`\n💡 RECOMMENDATIONS:`)
    report.summary.recommendations.forEach(rec => {
      console.log(`   🔧 ${rec}`)
    })
  }
  
  // Next steps
  console.log(`\n🚀 NEXT STEPS:`)
  if (report.summary.overallHealth === 'critical') {
    console.log(`   ⚡ URGENT: Fix critical issues immediately`)
    console.log(`   🔧 Run: npx tsx scripts/phase1-fix-bidirectional-references.ts`)
    console.log(`   🧹 Run: npx tsx scripts/phase1-cleanup-broken-references.ts`)
  } else if (report.summary.overallHealth === 'poor') {
    console.log(`   📋 Fix major integrity issues`)
    console.log(`   🔧 Consider running Phase 1 fixes selectively`)
  } else if (report.summary.overallHealth === 'good') {
    console.log(`   🎯 Fine-tune remaining issues`)
    console.log(`   📈 Ready for Phase 2 performance optimization`)
  } else {
    console.log(`   ✨ System integrity is excellent!`)
    console.log(`   🚀 Ready to proceed with Phase 2: Performance Optimization`)
  }
}

async function saveValidationReport(report: IntegrityReport): Promise<void> {
  const reportDoc = {
    ...report,
    // Convert date to Firestore timestamp
    timestamp: admin.firestore.Timestamp.fromDate(report.timestamp)
  }
  
  await db.collection('_validation_reports').add(reportDoc)
  console.log(`\n💾 Report saved to _validation_reports collection`)
}

async function validateCollectionIntegrity(): Promise<void> {
  console.log('🚀 Phase 1.3: Collection Integrity Validation')
  console.log('=' .repeat(60))
  
  const startTime = Date.now()
  
  try {
    // Environment validation
    await validateEnvironment()
    
    // Run comprehensive validation
    const report = await validateSystemIntegrity()
    
    // Print detailed report
    printDetailedReport(report)
    
    // Save report for historical tracking
    await saveValidationReport(report)
    
    const duration = Math.round((Date.now() - startTime) / 1000)
    console.log(`\n⏱️  Validation completed in ${duration} seconds`)
    
    // Exit with appropriate code
    if (report.summary.overallHealth === 'critical') {
      console.log('\n🚨 CRITICAL ISSUES DETECTED - Immediate attention required')
      process.exit(1)
    } else if (report.summary.overallHealth === 'poor') {
      console.log('\n⚠️  ISSUES DETECTED - Consider running Phase 1 fixes')
      process.exit(1)
    } else {
      console.log('\n✅ VALIDATION COMPLETE - System integrity acceptable')
      process.exit(0)
    }
    
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR during validation:')
    console.error(error)
    console.error('\nValidation aborted. Please check the error and retry.')
    process.exit(1)
  }
}

// Execute the script
validateCollectionIntegrity()
  .catch((error) => {
    console.error('💥 Unhandled error:', error)
    process.exit(1)
  })