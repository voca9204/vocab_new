import { NextResponse } from 'next/server'
import { isAdminInitialized, getAdminFirestore } from '@/lib/firebase/admin'

export async function GET() {
  const diagnostics = {
    env: {
      hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'NOT_SET',
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL ? 
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL.substring(0, 20) + '...' : 'NOT_SET',
      privateKeyLength: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length || 0,
      nodeEnv: process.env.NODE_ENV,
    },
    adminSDK: {
      initialized: false,
      error: null as string | null,
    },
    firestore: {
      canConnect: false,
      error: null as string | null,
    }
  }

  try {
    // Test Admin SDK initialization
    diagnostics.adminSDK.initialized = isAdminInitialized()
    
    if (diagnostics.adminSDK.initialized) {
      // Test Firestore connection
      try {
        const db = getAdminFirestore()
        const testDoc = await db.collection('test').doc('ping').get()
        diagnostics.firestore.canConnect = true
      } catch (firestoreError) {
        diagnostics.firestore.error = firestoreError instanceof Error ? 
          firestoreError.message : 'Unknown Firestore error'
      }
    }
  } catch (error) {
    diagnostics.adminSDK.error = error instanceof Error ? 
      error.message : 'Unknown initialization error'
  }

  return NextResponse.json(diagnostics)
}