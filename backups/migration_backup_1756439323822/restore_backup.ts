#!/usr/bin/env tsx
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
    console.log(`Restoring ${collection.collection}...`)
    
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
    console.log(`✅ Restored ${collection.collection}`)
  }
  
  console.log('🎉 Restore complete!')
}

// Uncomment to run restore
// restoreFromBackup().catch(console.error)
