import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables (hide sensitive data)
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      
      // Firebase Admin
      FIREBASE_ADMIN_PROJECT_ID: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      FIREBASE_ADMIN_CLIENT_EMAIL: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      FIREBASE_ADMIN_PRIVATE_KEY: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      FIREBASE_ADMIN_PRIVATE_KEY_LENGTH: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length || 0,
      
      // OpenAI
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      OPENAI_API_KEY_LENGTH: process.env.OPENAI_API_KEY?.length || 0,
      
      // Firebase Client
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_API_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    }
    
    // Test Firebase Admin initialization
    let adminTest = { initialized: false, error: null as any }
    try {
      const { getAdminAuth, isAdminInitialized } = await import('@/lib/firebase/admin')
      adminTest.initialized = isAdminInitialized()
      if (adminTest.initialized) {
        // Try to get auth instance
        const auth = getAdminAuth()
        adminTest.initialized = !!auth
      }
    } catch (error) {
      adminTest.error = error instanceof Error ? error.message : 'Unknown error'
    }
    
    // Check private key format
    const privateKeyCheck = {
      hasBeginMarker: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.includes('BEGIN PRIVATE KEY') || false,
      hasEndMarker: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.includes('END PRIVATE KEY') || false,
      hasNewlines: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.includes('\\n') || false,
      firstChars: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.substring(0, 30) || '',
    }
    
    return NextResponse.json({
      success: true,
      environment: envCheck,
      adminSDK: adminTest,
      privateKeyFormat: privateKeyCheck,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}