import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { collection, getDocs } from 'firebase/firestore'

export async function GET() {
  try {
    const vocabSnapshot = await getDocs(collection(db, 'vocabularies'))
    const vocabularies = vocabSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    return NextResponse.json({
      success: true,
      count: vocabularies.length,
      vocabularies
    })
  } catch (error) {
    console.error('Error fetching vocabularies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vocabularies' },
      { status: 500 }
    )
  }
}