#!/usr/bin/env tsx
/**
 * Backup Script: Create safety backup before migration
 * Exports legacy collections to JSON files for recovery
 */

import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

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

async function createBackup() {
  console.log('💾 Creating Backup Before Migration\n')
  console.log('=' .repeat(60))
  
  const backupDir = path.join(process.cwd(), 'backups', `migration_backup_${Date.now()}`)
  
  // Create backup directory
  if (!fs.existsSync(path.dirname(backupDir))) {
    fs.mkdirSync(path.dirname(backupDir), { recursive: true })
  }
  fs.mkdirSync(backupDir, { recursive: true })
  
  console.log(`📁 Backup directory: ${backupDir}`)
  
  const collectionsToBackup = [
    { name: 'words', description: 'Legacy master words collection' },
    { name: 'words_v3', description: 'Current unified words collection' },
    { name: 'vocabulary_collections', description: 'Collection metadata' }
  ]
  
  const backupSummary: {
    collection: string
    count: number
    filePath: string
    timestamp: Date
  }[] = []
  
  for (const col of collectionsToBackup) {
    console.log(`\n📦 Backing up ${col.name}...`)
    
    try {
      const snapshot = await db.collection(col.name).get()
      const documents: any[] = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        // Convert Firestore timestamps to ISO strings for JSON serialization
        const serializedData = JSON.parse(JSON.stringify(data, (key, value) => {
          if (value && typeof value === 'object' && value._seconds !== undefined) {
            return new Date(value._seconds * 1000).toISOString()
          }
          return value
        }))
        
        documents.push({
          id: doc.id,
          data: serializedData
        })
      })
      
      const filePath = path.join(backupDir, `${col.name}.json`)
      
      const backupData = {
        collection: col.name,
        description: col.description,
        backupTimestamp: new Date().toISOString(),
        documentCount: documents.length,
        documents
      }
      
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2))
      
      console.log(`   ✅ ${col.name}: ${documents.length} documents`)
      console.log(`   📄 File: ${path.relative(process.cwd(), filePath)}`)
      
      backupSummary.push({
        collection: col.name,
        count: documents.length,
        filePath: path.relative(process.cwd(), filePath),
        timestamp: new Date()
      })
      
    } catch (error) {
      console.error(`   ❌ Error backing up ${col.name}:`, error)
    }
  }
  
  // Create backup manifest
  const manifestPath = path.join(backupDir, 'backup_manifest.json')
  const manifest = {
    backupTimestamp: new Date().toISOString(),
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    backupPurpose: 'Pre-migration safety backup',
    collections: backupSummary,
    totalDocuments: backupSummary.reduce((sum, col) => sum + col.count, 0)
  }
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  
  // Create restore script
  const restoreScriptPath = path.join(backupDir, 'restore_backup.ts')
  const restoreScript = `#!/usr/bin/env tsx
/**
 * RESTORE SCRIPT - Generated automatically
 * Use this script to restore from backup if needed
 */

import * as admin from 'firebase-admin'
import * as fs from 'fs'
import * as path from 'path'

// Initialize Firebase Admin (configure your service account)
// const serviceAccount = require('./path/to/service-account.json')
// admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })

const db = admin.firestore()

async function restoreFromBackup() {
  console.log('🔄 Restoring from backup...')
  
  const manifest = JSON.parse(fs.readFileSync('./backup_manifest.json', 'utf-8'))
  
  for (const collection of manifest.collections) {
    console.log(\`Restoring \${collection.collection}...\`)
    
    const backupData = JSON.parse(fs.readFileSync(collection.filePath, 'utf-8'))
    const batch = db.batch()
    
    backupData.documents.forEach((doc: any, index: number) => {
      const docRef = db.collection(collection.collection).doc(doc.id)
      batch.set(docRef, doc.data)
      
      // Commit in batches of 500
      if ((index + 1) % 500 === 0) {
        await batch.commit()
        batch = db.batch()
      }
    })
    
    await batch.commit()
    console.log(\`✅ Restored \${collection.collection}\`)
  }
  
  console.log('🎉 Restore complete!')
}

// Uncomment to run restore
// restoreFromBackup().catch(console.error)
`
  
  fs.writeFileSync(restoreScriptPath, restoreScript)
  fs.chmodSync(restoreScriptPath, '755')
  
  // Generate summary report
  console.log('\n' + '=' .repeat(60))
  console.log('📊 BACKUP SUMMARY')
  console.log('=' .repeat(60))
  
  console.log(`\n✅ Backup Complete!`)
  console.log(`   Backup directory: ${path.relative(process.cwd(), backupDir)}`)
  console.log(`   Total collections backed up: ${backupSummary.length}`)
  console.log(`   Total documents: ${manifest.totalDocuments}`)
  
  console.log(`\n📋 Backup Contents:`)
  backupSummary.forEach(col => {
    console.log(`   • ${col.collection}: ${col.count} documents`)
  })
  
  console.log(`\n📄 Generated Files:`)
  console.log(`   • backup_manifest.json - Backup metadata`)
  console.log(`   • restore_backup.ts - Restore script (if needed)`)
  
  console.log(`\n⚠️  Safety Notes:`)
  console.log(`   • Keep this backup until migration is verified`)
  console.log(`   • Restore script is available if rollback is needed`)
  console.log(`   • Test restore in development environment first`)
  
  console.log('\n🚀 Ready to proceed with migration!')
}

createBackup()
  .then(() => {
    console.log('\n✨ Backup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Backup failed:', error)
    process.exit(1)
  })