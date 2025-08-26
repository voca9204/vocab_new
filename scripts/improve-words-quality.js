const admin = require('firebase-admin');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'vocabulary-app-new',
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || 'voca-879@vocabulary-app-new.iam.gserviceaccount.com',
  privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDRHF3jahwVBS7Y
jul5yIVhJDj1bnlCEgzHbh13tkerGnAbt77S30Axoyv91rUjyDSRIiW0mzmAQp25
pkBQSpt00acGFYu/QGlOkMoN0IYwz4HHu47B2GfCu0GNq1npn168jRN/5kBWglSM
AfLz+CAOXj5dWpzU7ujtlby8gqiIgdmmVYCI5YUqJhSnE40dxpA257RceSXZy0TA
CNlBuLZ0AyYCZL3PETJ4H6BGnP2JxSazwo0Sftne4CRzi5Fc/A8e+WAQBh+oMffA
UDyNJo95BxyOOmaiM9E3+tuR45KPcJ1UPuU4D5L+DX2vIbVFTFcueNosxpY1raB/
xd1s2pzBAgMBAAECggEAF7CHgGp2ePkn1/fEwnuxhJJGc6OK0C3cTcGPTA8V6m/p
0HIOB7SsAJOUOcMXrVCSh/ie3emR55JkbPJFKfNxzhesPNe3B7kj1Pc5NLxxX1k6
wiZg41wBUUHGiOanHnzkDidLVLuAgWxtaJkV7YaoFwidNxU7XDIeqD/E7HQ+5Ivg
zRpBXaygHn+OP2IaE2tDwmIz9yBfI6CBP3SgGu2hf1cRmG+z7VcFe+tKS9Y8IboH
vaMWDUalXFoQcHvoXYq5i3mROFjstWiTRmCGJzzv97WvWOkAHchiM3TMROOPTEeG
v2RAyRoIxw77DrtcpI6aPPv3QMAgaTkSGHQXzN254wKBgQD4yzVa7B6MQ19BjwZS
FZxfGvhprx8lfGEug4f2o4JToKeabPVmNPuRAXR55eehtr2LnDm9csIqx3B4nzd2
F0B5CHjNwLP/dVM9FqIzbu95H42Pkw0tQ9Lx/BsVdBs0ivRP+t4l5mgaeZKGTAEa
/FOxuWsK666Amu9ZTjRR1QYjlwKBgQDXKulOj3Nqgp9Ixx0ySlaYs1KIF7q1u2cx
36+99qWJSh+Ixf2G6FbxVut7pLy9E+YpMoEL4h9Pfp8bMxYHmmEODkHuW7qQqZOO
M7HYO6Qf5UDUE5gT+2toBfbIJO0Qs2Ba1XSrwZ5NmnhOrzGoVq+fsi5DxgDJi7pI
3XbZQv1tZwKBgQDeIQh9Kk3H66sTrG/3P8ZCf6EFMs67OEbIMbVl9uy4X7rkvJ2J
aIqnF8Z3w1XA45huGsjOpbRIX5LCj10EOZRdu7un8IKE9aqg4yFkjIqQ+SP56VAd
du3TEcTYrbZQfjPNaO2IpyORZ7Pz5c4i2uCa0DKLKIu/1RUYBiPeYDS/9wKBgEOg
Uw/D+myBfXqsSjriLnFz+v6XJrGzou2D9oJoIQMTbvHX+KUMJTdZME3+Kuvqcy6D
lxebDGg5zdwIpGXjWZnHVWWLIwoQojXRfZYOuLjlnwiI2AV/wfRB25xwLqpPFnu2
FyNciVqusB1a5uqXxD8XC391ng26guQf5xjF+00FAoGAWDYkJJfjxF3Rk88rrUwb
U42HG/oamg9wL+GlH1Aymj6b3YRsxv11lai1410wx53WW8S56pPZ9B+SW67c4Uao
qmUf91Jr4Tjv5bSboUlKi2bmpOysU++46XoQJMG5gvKtY+cIHVQsGOdSTSpX5ZWf
rVpMVghZm6BEpdav/5wqsj8=
-----END PRIVATE KEY-----`).replace(/\\n/g, '\n')
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuration
const CONFIG = {
  BATCH_SIZE: 10,           // Process 10 words at a time
  DELAY_BETWEEN_BATCHES: 2000, // 2 seconds delay between batches
  DRY_RUN: false,           // Set to true to test without updating database
  MAX_WORDS: null,          // Limit processing (null = all words)
  CHECKPOINT_FILE: 'word-quality-checkpoint.json',
  LOG_FILE: 'word-quality-improvement.log'
};

// Progress tracking
let stats = {
  total: 0,
  processed: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
  definitionsAdded: 0,
  etymologyFixed: 0,
  lastProcessedId: null
};

// Logging
async function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  console.log(logMessage);
  
  try {
    await fs.appendFile(CONFIG.LOG_FILE, logMessage + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

// Save checkpoint
async function saveCheckpoint() {
  try {
    await fs.writeFile(CONFIG.CHECKPOINT_FILE, JSON.stringify(stats, null, 2));
    await log(`Checkpoint saved: ${stats.processed}/${stats.total} processed`, 'CHECKPOINT');
  } catch (error) {
    await log(`Failed to save checkpoint: ${error.message}`, 'ERROR');
  }
}

// Load checkpoint
async function loadCheckpoint() {
  try {
    const data = await fs.readFile(CONFIG.CHECKPOINT_FILE, 'utf8');
    const checkpoint = JSON.parse(data);
    await log(`Checkpoint loaded: Resuming from word ${checkpoint.lastProcessedId}`, 'INFO');
    return checkpoint;
  } catch (error) {
    await log('No checkpoint found, starting fresh', 'INFO');
    return null;
  }
}

// Clean and separate etymology from definition
function separateEtymologyFromDefinition(definition) {
  if (!definition) return { cleanDefinition: null, etymology: null };
  
  const lines = definition.split('\n');
  const etymologyKeywords = ['From', 'Etymology', 'Origin:', '어원:'];
  
  let cleanDefinitionLines = [];
  let etymologyLines = [];
  let foundEtymology = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this line starts etymology section
    if (etymologyKeywords.some(keyword => trimmedLine.startsWith(keyword))) {
      foundEtymology = true;
    }
    
    if (foundEtymology) {
      etymologyLines.push(trimmedLine);
    } else if (trimmedLine) {
      cleanDefinitionLines.push(trimmedLine);
    }
  }
  
  return {
    cleanDefinition: cleanDefinitionLines.length > 0 ? cleanDefinitionLines.join('\n') : null,
    etymology: etymologyLines.length > 0 ? etymologyLines.join('\n') : null
  };
}

// Generate missing data using AI
async function generateMissingData(word) {
  try {
    const prompt = `
You are a vocabulary expert. Analyze the word "${word.word}" and provide the missing information.

Current data:
- Part of Speech: ${word.partOfSpeech?.join(', ') || 'unknown'}
- Korean Definition: ${word.definition || 'missing'}
- English Definition: ${word.englishDefinition || 'missing'}
- Etymology: ${word.etymology || 'missing'}

Please provide a JSON response with:
{
  "koreanDefinition": "간단하고 명확한 한국어 정의 (없으면 생성)",
  "englishDefinition": "Clear English definition (if missing)",
  "etymology": "Word origin and etymology in English (if missing or needs correction)",
  "examples": ["2-3 example sentences showing usage"],
  "synonyms": ["list of synonyms"],
  "antonyms": ["list of antonyms if applicable"],
  "difficulty": 1-10 (estimated difficulty level),
  "isSAT": true/false (is this a common SAT word?)
}

Important:
1. Keep Korean definitions concise and clear
2. Etymology should be informative but not too lengthy
3. Examples should demonstrate different uses of the word
4. Only provide what's actually missing or needs improvement
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a vocabulary expert. Provide accurate and educational information about English words.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error) {
    await log(`AI generation failed for "${word.word}": ${error.message}`, 'ERROR');
    return null;
  }
}

// Process a single word
async function processWord(doc) {
  const data = doc.data();
  const wordId = doc.id;
  const updates = {};
  let needsUpdate = false;
  
  await log(`Processing: "${data.word}" (ID: ${wordId})`, 'DEBUG');
  
  // 1. Check and clean definition
  if (!data.definition || data.definition === 'N/A' || data.definition.includes('Etymology') || data.definition.includes('From ')) {
    const { cleanDefinition, etymology } = separateEtymologyFromDefinition(data.definition);
    
    if (cleanDefinition !== data.definition) {
      updates.definition = cleanDefinition;
      needsUpdate = true;
      stats.etymologyFixed++;
      await log(`  - Separated etymology from definition`, 'FIX');
    }
    
    if (etymology && !data.etymology) {
      updates.etymology = etymology;
      needsUpdate = true;
      await log(`  - Moved etymology to proper field`, 'FIX');
    }
  }
  
  // 2. Generate missing essential data
  const missingFields = [];
  if (!data.definition || data.definition === 'N/A') missingFields.push('definition');
  if (!data.englishDefinition) missingFields.push('englishDefinition');
  if (!data.examples || data.examples.length === 0) missingFields.push('examples');
  if (!data.etymology) missingFields.push('etymology');
  
  if (missingFields.length > 0) {
    await log(`  - Missing fields: ${missingFields.join(', ')}`, 'INFO');
    
    const aiData = await generateMissingData(data);
    
    if (aiData) {
      // Add missing Korean definition
      if ((!data.definition || data.definition === 'N/A') && aiData.koreanDefinition) {
        updates.definition = aiData.koreanDefinition;
        needsUpdate = true;
        stats.definitionsAdded++;
        await log(`  - Added Korean definition: ${aiData.koreanDefinition}`, 'ADD');
      }
      
      // Add missing English definition
      if (!data.englishDefinition && aiData.englishDefinition) {
        updates.englishDefinition = aiData.englishDefinition;
        needsUpdate = true;
        await log(`  - Added English definition`, 'ADD');
      }
      
      // Add missing etymology
      if (!data.etymology && aiData.etymology) {
        updates.etymology = aiData.etymology;
        needsUpdate = true;
        await log(`  - Added etymology`, 'ADD');
      }
      
      // Add missing examples
      if ((!data.examples || data.examples.length === 0) && aiData.examples) {
        updates.examples = aiData.examples;
        needsUpdate = true;
        await log(`  - Added ${aiData.examples.length} examples`, 'ADD');
      }
      
      // Add missing synonyms
      if ((!data.synonyms || data.synonyms.length === 0) && aiData.synonyms) {
        updates.synonyms = aiData.synonyms;
        needsUpdate = true;
        await log(`  - Added ${aiData.synonyms.length} synonyms`, 'ADD');
      }
      
      // Add missing difficulty
      if (!data.difficulty && aiData.difficulty) {
        updates.difficulty = aiData.difficulty;
        needsUpdate = true;
        await log(`  - Added difficulty: ${aiData.difficulty}`, 'ADD');
      }
      
      // Add SAT flag if missing
      if (data.isSAT === undefined && aiData.isSAT !== undefined) {
        updates.isSAT = aiData.isSAT;
        needsUpdate = true;
        await log(`  - Set SAT flag: ${aiData.isSAT}`, 'ADD');
      }
    }
  }
  
  // 3. Update the document if needed
  if (needsUpdate) {
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    updates.qualityImproved = true;
    updates.qualityImprovedAt = admin.firestore.FieldValue.serverTimestamp();
    
    if (!CONFIG.DRY_RUN) {
      await db.collection('words').doc(wordId).update(updates);
      await log(`✅ Updated "${data.word}" with ${Object.keys(updates).length - 3} improvements`, 'SUCCESS');
    } else {
      await log(`🔍 [DRY RUN] Would update "${data.word}" with ${Object.keys(updates).length - 3} improvements`, 'INFO');
    }
    
    stats.updated++;
    return true;
  } else {
    await log(`⏭️  Skipped "${data.word}" - already good quality`, 'SKIP');
    stats.skipped++;
    return false;
  }
}

// Main processing function
async function improveWordsQuality() {
  try {
    await log('🚀 Starting Words Quality Improvement Agent', 'START');
    await log(`Configuration: Batch Size=${CONFIG.BATCH_SIZE}, Dry Run=${CONFIG.DRY_RUN}`, 'CONFIG');
    
    // Load checkpoint if exists
    const checkpoint = await loadCheckpoint();
    if (checkpoint) {
      stats = checkpoint;
    }
    
    // Get all words that need processing
    let query = db.collection('words');
    
    // Apply filters to get problematic words first
    // Priority 1: Words without definitions
    // Priority 2: Words with etymology mixed in definition
    // Priority 3: Words without examples
    
    if (stats.lastProcessedId) {
      query = query.orderBy(admin.firestore.FieldPath.documentId()).startAfter(stats.lastProcessedId);
    } else {
      query = query.orderBy(admin.firestore.FieldPath.documentId());
    }
    
    if (CONFIG.MAX_WORDS) {
      query = query.limit(CONFIG.MAX_WORDS);
    }
    
    const snapshot = await query.get();
    const totalWords = snapshot.size;
    stats.total = totalWords + stats.processed;
    
    await log(`📊 Found ${totalWords} words to process`, 'INFO');
    
    // Process in batches
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += CONFIG.BATCH_SIZE) {
      const batch = docs.slice(i, Math.min(i + CONFIG.BATCH_SIZE, docs.length));
      
      await log(`\n📦 Processing batch ${Math.floor(i/CONFIG.BATCH_SIZE) + 1}/${Math.ceil(docs.length/CONFIG.BATCH_SIZE)}`, 'BATCH');
      
      // Process batch in parallel
      const promises = batch.map(doc => processWord(doc));
      const results = await Promise.all(promises);
      
      // Update stats
      stats.processed += batch.length;
      stats.lastProcessedId = batch[batch.length - 1].id;
      
      // Save checkpoint after each batch
      await saveCheckpoint();
      
      // Show progress
      const progress = ((stats.processed / stats.total) * 100).toFixed(2);
      await log(`📈 Progress: ${stats.processed}/${stats.total} (${progress}%)`, 'PROGRESS');
      await log(`   Updated: ${stats.updated}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`, 'STATS');
      await log(`   Definitions Added: ${stats.definitionsAdded}, Etymology Fixed: ${stats.etymologyFixed}`, 'STATS');
      
      // Delay between batches to avoid rate limits
      if (i + CONFIG.BATCH_SIZE < docs.length) {
        await log(`⏳ Waiting ${CONFIG.DELAY_BETWEEN_BATCHES}ms before next batch...`, 'INFO');
        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_BATCHES));
      }
    }
    
    // Final report
    await log('\n' + '='.repeat(60), 'INFO');
    await log('✅ WORDS QUALITY IMPROVEMENT COMPLETED', 'SUCCESS');
    await log('='.repeat(60), 'INFO');
    await log(`📊 Final Statistics:`, 'REPORT');
    await log(`   Total Processed: ${stats.processed}`, 'REPORT');
    await log(`   Words Updated: ${stats.updated}`, 'REPORT');
    await log(`   Words Skipped: ${stats.skipped}`, 'REPORT');
    await log(`   Errors: ${stats.errors}`, 'REPORT');
    await log(`   Definitions Added: ${stats.definitionsAdded}`, 'REPORT');
    await log(`   Etymology Separated: ${stats.etymologyFixed}`, 'REPORT');
    await log(`   Success Rate: ${((stats.updated / stats.processed) * 100).toFixed(2)}%`, 'REPORT');
    
    // Clean up checkpoint file on successful completion
    if (stats.processed === stats.total) {
      try {
        await fs.unlink(CONFIG.CHECKPOINT_FILE);
        await log('🧹 Checkpoint file cleaned up', 'INFO');
      } catch (error) {
        // File might not exist
      }
    }
    
  } catch (error) {
    await log(`❌ Fatal error: ${error.message}`, 'ERROR');
    await log(error.stack, 'ERROR');
    await saveCheckpoint();
  } finally {
    // Clean up
    await admin.app().delete();
    process.exit(0);
  }
}

// Command line arguments
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
Words Quality Improvement Agent
================================

This script improves the quality of words in the Firestore database by:
1. Separating etymology from definitions
2. Adding missing Korean definitions
3. Adding missing English definitions
4. Generating examples and synonyms
5. Setting difficulty levels and SAT flags

Usage:
  node improve-words-quality.js [options]

Options:
  --dry-run          Test without updating database
  --limit <number>   Process only N words
  --batch <number>   Process N words per batch (default: 10)
  --help            Show this help message

Examples:
  node improve-words-quality.js --dry-run --limit 10
  node improve-words-quality.js --batch 5
  `);
  process.exit(0);
}

// Parse command line arguments
if (args.includes('--dry-run')) {
  CONFIG.DRY_RUN = true;
}

const limitIndex = args.indexOf('--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
  CONFIG.MAX_WORDS = parseInt(args[limitIndex + 1]);
}

const batchIndex = args.indexOf('--batch');
if (batchIndex !== -1 && args[batchIndex + 1]) {
  CONFIG.BATCH_SIZE = parseInt(args[batchIndex + 1]);
}

// Run the improvement agent
improveWordsQuality();