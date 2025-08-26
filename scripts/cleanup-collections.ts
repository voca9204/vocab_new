/**
 * Cleanup script to fix invalid collections in vocabulary_collections
 */

import * as admin from 'firebase-admin'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

async function cleanupCollections() {
  console.log('🧹 Cleaning up invalid collections...\n')
  
  try {
    const collectionsRef = db.collection('vocabulary_collections')
    const snapshot = await collectionsRef.get()
    
    for (const doc of snapshot.docs) {
      const data = doc.data()
      let needsUpdate = false
      const updates: any = {}
      
      console.log(`📋 Checking ${doc.id}: ${data.name}`)
      
      // Fix missing or invalid isOfficial field
      if (data.isOfficial === undefined || data.isOfficial === null) {
        // Determine if it should be official based on name and structure
        const shouldBeOfficial = data.name?.includes('공식') || 
                                 ['SAT', 'TOEFL', 'TOEIC', 'GRE', 'IELTS', '수능', '기본'].some(cat => 
                                   data.name?.includes(cat) || data.category === cat)
        updates.isOfficial = shouldBeOfficial
        needsUpdate = true
        console.log(`   🔧 Setting isOfficial to ${shouldBeOfficial}`)
      }
      
      // Fix missing category
      if (!data.category || data.category === undefined) {
        let category = '기본' // default
        
        if (data.name?.includes('SAT')) category = 'SAT'
        else if (data.name?.includes('TOEFL')) category = 'TOEFL'  
        else if (data.name?.includes('TOEIC')) category = 'TOEIC'
        else if (data.name?.includes('GRE')) category = 'GRE'
        else if (data.name?.includes('IELTS')) category = 'IELTS'
        else if (data.name?.includes('수능')) category = '수능'
        
        updates.category = category
        needsUpdate = true
        console.log(`   🔧 Setting category to ${category}`)
      }
      
      // Fix missing wordCount
      if (data.wordCount === undefined || data.wordCount === null) {
        updates.wordCount = data.words?.length || 0
        needsUpdate = true
        console.log(`   🔧 Setting wordCount to ${updates.wordCount}`)
      }
      
      // Fix missing difficulty
      if (!data.difficulty || data.difficulty === undefined) {
        let difficulty = 'intermediate' // default
        
        if (data.category === 'SAT' || data.category === 'GRE') difficulty = 'advanced'
        else if (data.category === '기본') difficulty = 'beginner'
        
        updates.difficulty = difficulty
        needsUpdate = true
        console.log(`   🔧 Setting difficulty to ${difficulty}`)
      }
      
      // Add updatedAt if missing
      if (!data.updatedAt) {
        updates.updatedAt = Timestamp.now()
        needsUpdate = true
        console.log(`   🔧 Adding updatedAt timestamp`)
      }
      
      // Remove invalid collections that can't be fixed
      if (!data.name || data.name.trim() === '') {
        console.log(`   🗑️  Deleting collection with no name: ${doc.id}`)
        await doc.ref.delete()
        continue
      }
      
      // Apply updates
      if (needsUpdate) {
        await doc.ref.update(updates)
        console.log(`   ✅ Updated collection ${doc.id}`)
      } else {
        console.log(`   ✓ Collection ${doc.id} is valid`)
      }
    }
    
    console.log('\n✨ Cleanup completed successfully!')
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  }
}

// Run the cleanup
cleanupCollections()
  .then(() => {
    console.log('\n👋 Cleanup complete')
    process.exit(0)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })