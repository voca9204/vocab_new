import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      hasFirebaseAdmin: {
        projectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
        privateKeyLength: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length || 0
      },
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasFirebaseClient: {
        apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      }
    }
  })
}