import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // This endpoint will be called from client to clear localStorage cache
    return NextResponse.json({ 
      success: true,
      message: 'Cache clear command sent. Client should clear localStorage.'
    })
  } catch (error) {
    console.error('Error in clear-word-cache:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}