#!/usr/bin/env node

/**
 * 통합 단어 구조 마이그레이션 스크립트
 * 
 * 목적: 모든 단어를 UnifiedWordV3 구조로 통합
 * - Nested structure → Unified 
 * - Flat structure → Unified
 * - 데이터 검증 및 품질 점수 계산
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  BATCH_SIZE: 500,           // Firestore batch write limit
  DRY_RUN: false,            // Set to false to actually update
  BACKUP_BEFORE_MIGRATION: true,
  LOG_FILE: 'migration-to-v3.log',
  COLLECTIONS_TO_MIGRATE: [
    'words',
    'ai_generated_words',
    'photo_vocabulary_words',
    'personal_collection_words',
    'veterans_vocabulary'
  ],
  TARGET_COLLECTION: 'words_v3'  // New unified collection
};

// Stats tracking
let stats = {
  total: 0,
  migrated: 0,
  skipped: 0,
  errors: 0,
  collections: {}
};

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Firebase Admin (use environment variable or service account file)
function initializeFirebase() {
  try {
    // Try environment variables first
    if (process.env.FIREBASE_ADMIN_PROJECT_ID) {
      const serviceAccount = {
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
      };
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // Try service account file
      const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
      const serviceAccount = require(serviceAccountPath);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    
    return admin.firestore();
  } catch (error) {
    console.error('Failed to initialize Firebase:', error.message);
    console.log('\nPlease ensure either:');
    console.log('1. Environment variables are set (FIREBASE_ADMIN_*), or');
    console.log('2. serviceAccountKey.json exists in project root');
    process.exit(1);
  }
}

const db = initializeFirebase();

// Logging
async function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  try {
    await fs.appendFile(CONFIG.LOG_FILE, logMessage + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

// Calculate quality score
function calculateQualityScore(word) {
  let score = 0;
  const weights = {
    definition: 20,
    englishDefinition: 15,
    examples: 15,
    pronunciation: 10,
    etymology: 10,
    synonyms: 10,
    antonyms: 5,
    partOfSpeech: 5,
    difficulty: 5,
    frequency: 5
  };
  
  if (word.definition) score += weights.definition;
  if (word.englishDefinition) score += weights.englishDefinition;
  if (word.examples && word.examples.length > 0) {
    score += Math.min(weights.examples, word.examples.length * 5);
  }
  if (word.pronunciation) score += weights.pronunciation;
  if (word.etymology) score += weights.etymology;
  if (word.synonyms && word.synonyms.length > 0) {
    score += Math.min(weights.synonyms, word.synonyms.length * 2);
  }
  if (word.antonyms && word.antonyms.length > 0) {
    score += Math.min(weights.antonyms, word.antonyms.length * 2);
  }
  if (word.partOfSpeech && word.partOfSpeech.length > 0) {
    score += weights.partOfSpeech;
  }
  if (word.difficulty) score += weights.difficulty;
  if (word.frequency) score += weights.frequency;
  
  return Math.min(100, score);
}

// Determine source type
function determineSourceType(data, collectionName) {
  if (data.source?.type) return data.source.type;
  
  switch (collectionName) {
    case 'ai_generated_words':
      return 'ai_generated';
    case 'photo_vocabulary_words':
      return 'photo_extraction';
    case 'personal_collection_words':
      return 'user_submission';
    case 'veterans_vocabulary':
      return 'pdf_extraction';
    default:
      if (data.qualityImproved) return 'ai_generated';
      return 'legacy_import';
  }
}

// Extract categories
function extractCategories(data) {
  const categories = [];
  
  if (data.isSAT !== false) categories.push('SAT');
  if (data.isTOEFL) categories.push('TOEFL');
  if (data.isTOEIC) categories.push('TOEIC');
  if (data.category) categories.push(data.category);
  
  return [...new Set(categories)]; // Remove duplicates
}

// Convert to UnifiedWordV3 structure
function toUnifiedWordV3(data, collectionName, docId) {
  // Handle both old structures
  let definition = null;
  let examples = [];
  
  // Try flat structure first (quality improved words)
  if (data.definition && typeof data.definition === 'string') {
    definition = data.definition;
    examples = data.examples || [];
  }
  // Try nested structure (original format)
  else if (data.definitions && Array.isArray(data.definitions) && data.definitions[0]) {
    definition = data.definitions[0].definition || null;
    examples = data.definitions[0].examples || [];
  }
  
  // Build unified structure
  const unifiedWord = {
    id: docId,
    word: data.word || '',
    normalizedWord: data.normalizedWord || data.word?.toLowerCase().trim() || '',
    
    // Definitions (flat)
    definition: definition || null,
    englishDefinition: data.englishDefinition || null,
    
    // Language info
    pronunciation: data.pronunciation || null,
    partOfSpeech: data.partOfSpeech || [],
    
    // Examples & usage
    examples: examples,
    
    // Related words
    synonyms: data.synonyms || [],
    antonyms: data.antonyms || [],
    
    // Etymology
    etymology: data.etymology || data.realEtymology || null,
    
    // Metadata
    difficulty: data.difficulty || 5,
    frequency: data.frequency || 5,
    importance: data.importance || 5,
    
    // Categories & tags
    categories: extractCategories(data),
    tags: data.tags || [],
    
    // Source tracking
    source: {
      type: determineSourceType(data, collectionName),
      collection: collectionName,
      originalId: docId,
      extractedFrom: data.source?.extractedFrom || null,
      addedBy: data.source?.addedBy || data.createdBy || null,
      addedAt: data.source?.addedAt || data.createdAt || admin.firestore.Timestamp.now()
    },
    
    // Quality & validation
    quality: {
      score: 0, // Will be calculated
      validated: data.quality?.validated || false,
      validatedBy: data.quality?.validatedBy || null,
      validatedAt: data.quality?.validatedAt || null,
      improvedBy: data.qualityImproved ? 'quality-script' : null,
      improvedAt: data.qualityImprovedAt || null
    },
    
    // AI generation tracking
    aiGenerated: data.aiGenerated || null,
    
    // Timestamps
    createdAt: data.createdAt || admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  };
  
  // Calculate quality score
  unifiedWord.quality.score = calculateQualityScore(unifiedWord);
  
  return unifiedWord;
}

// Validate unified word
function validateWord(word) {
  const errors = [];
  
  if (!word.word) errors.push('Missing word field');
  if (!word.definition && !word.englishDefinition) {
    errors.push('No definition available in any language');
  }
  if (word.difficulty < 1 || word.difficulty > 10) {
    errors.push(`Invalid difficulty: ${word.difficulty}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Backup collection
async function backupCollection(collectionName) {
  await log(`Backing up ${collectionName}...`, 'BACKUP');
  
  const snapshot = await db.collection(collectionName).get();
  const data = [];
  
  snapshot.forEach(doc => {
    data.push({
      id: doc.id,
      data: doc.data()
    });
  });
  
  const backupPath = `backup_${collectionName}_${Date.now()}.json`;
  await fs.writeFile(backupPath, JSON.stringify(data, null, 2));
  
  await log(`Backed up ${data.length} documents to ${backupPath}`, 'BACKUP');
  return backupPath;
}

// Migrate a single collection
async function migrateCollection(collectionName) {
  await log(`\nMigrating ${collectionName}...`, 'START');
  
  const collectionStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0
  };
  
  try {
    // Get all documents
    const snapshot = await db.collection(collectionName).get();
    collectionStats.total = snapshot.size;
    
    await log(`Found ${snapshot.size} documents in ${collectionName}`, 'INFO');
    
    // Process in batches
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += CONFIG.BATCH_SIZE) {
      const batch = db.batch();
      const batchDocs = docs.slice(i, Math.min(i + CONFIG.BATCH_SIZE, docs.length));
      
      for (const doc of batchDocs) {
        try {
          const data = doc.data();
          const unifiedWord = toUnifiedWordV3(data, collectionName, doc.id);
          
          // Validate
          const validation = validateWord(unifiedWord);
          if (!validation.valid) {
            await log(`Validation failed for ${doc.id}: ${validation.errors.join(', ')}`, 'ERROR');
            collectionStats.errors++;
            continue;
          }
          
          // Add to batch
          const targetRef = db.collection(CONFIG.TARGET_COLLECTION).doc(unifiedWord.id);
          batch.set(targetRef, unifiedWord);
          
          collectionStats.migrated++;
        } catch (error) {
          await log(`Error processing ${doc.id}: ${error.message}`, 'ERROR');
          collectionStats.errors++;
        }
      }
      
      // Commit batch
      if (!CONFIG.DRY_RUN) {
        await batch.commit();
        await log(`Batch committed: ${collectionStats.migrated}/${collectionStats.total}`, 'PROGRESS');
      } else {
        await log(`[DRY RUN] Would commit batch: ${collectionStats.migrated}/${collectionStats.total}`, 'INFO');
      }
    }
  } catch (error) {
    await log(`Failed to migrate ${collectionName}: ${error.message}`, 'ERROR');
  }
  
  stats.collections[collectionName] = collectionStats;
  stats.total += collectionStats.total;
  stats.migrated += collectionStats.migrated;
  stats.skipped += collectionStats.skipped;
  stats.errors += collectionStats.errors;
  
  await log(`Completed ${collectionName}: ${collectionStats.migrated}/${collectionStats.total} migrated`, 'COMPLETE');
}

// Main migration function
async function migrate() {
  await log('=' . repeat(60), 'INFO');
  await log('UNIFIED WORD STRUCTURE MIGRATION V3', 'START');
  await log('=' . repeat(60), 'INFO');
  await log(`Configuration:`, 'CONFIG');
  await log(`  - Dry Run: ${CONFIG.DRY_RUN}`, 'CONFIG');
  await log(`  - Target Collection: ${CONFIG.TARGET_COLLECTION}`, 'CONFIG');
  await log(`  - Collections to Migrate: ${CONFIG.COLLECTIONS_TO_MIGRATE.join(', ')}`, 'CONFIG');
  
  try {
    // Backup if requested
    if (CONFIG.BACKUP_BEFORE_MIGRATION && !CONFIG.DRY_RUN) {
      await log('\nCreating backups...', 'BACKUP');
      for (const collection of CONFIG.COLLECTIONS_TO_MIGRATE) {
        await backupCollection(collection);
      }
    }
    
    // Migrate each collection
    for (const collection of CONFIG.COLLECTIONS_TO_MIGRATE) {
      await migrateCollection(collection);
    }
    
    // Final report
    await log('\n' + '=' . repeat(60), 'INFO');
    await log('MIGRATION COMPLETED', 'SUCCESS');
    await log('=' . repeat(60), 'INFO');
    await log(`Total Documents: ${stats.total}`, 'STATS');
    await log(`Successfully Migrated: ${stats.migrated}`, 'STATS');
    await log(`Skipped: ${stats.skipped}`, 'STATS');
    await log(`Errors: ${stats.errors}`, 'STATS');
    await log(`Success Rate: ${((stats.migrated / stats.total) * 100).toFixed(2)}%`, 'STATS');
    
    // Per-collection stats
    await log('\nPer-Collection Results:', 'STATS');
    for (const [collection, collectionStats] of Object.entries(stats.collections)) {
      await log(`  ${collection}: ${collectionStats.migrated}/${collectionStats.total}`, 'STATS');
    }
    
    if (CONFIG.DRY_RUN) {
      await log('\n⚠️  This was a DRY RUN - no actual changes were made', 'WARNING');
      await log('Set CONFIG.DRY_RUN = false to perform actual migration', 'WARNING');
    }
    
  } catch (error) {
    await log(`Migration failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  migrate().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { toUnifiedWordV3, validateWord, calculateQualityScore };