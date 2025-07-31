import { NextRequest, NextResponse } from 'next/server'

// Simple test endpoint to check environment variables
export async function GET(request: NextRequest) {
  // Check which environment variables are set
  const envCheck = {
    // Basic info
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    
    // Firebase Admin - check if they exist
    ADMIN_PROJECT_ID: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
    ADMIN_CLIENT_EMAIL: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    ADMIN_PRIVATE_KEY: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    
    // Check private key format
    PRIVATE_KEY_LENGTH: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length || 0,
    PRIVATE_KEY_STARTS_WITH: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.substring(0, 20) || 'NOT_SET',
    PRIVATE_KEY_HAS_NEWLINES: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.includes('\\n') || false,
    PRIVATE_KEY_HAS_BEGIN: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.includes('BEGIN PRIVATE KEY') || false,
    
    // OpenAI
    OPENAI_KEY: !!process.env.OPENAI_API_KEY,
    
    // Test what WordServiceServer would use
    WILL_USE_ADMIN: !!(process.env.FIREBASE_ADMIN_PROJECT_ID && 
                       process.env.FIREBASE_ADMIN_CLIENT_EMAIL && 
                       process.env.FIREBASE_ADMIN_PRIVATE_KEY)
  }
  
  return NextResponse.json({
    success: true,
    environment: envCheck,
    timestamp: new Date().toISOString()
  })
}