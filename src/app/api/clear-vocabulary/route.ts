import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore'

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }
    
    // 사용자의 모든 단어 조회
    const q = query(
      collection(db, 'extracted_vocabulary'),
      where('userId', '==', userId)
    )
    
    const snapshot = await getDocs(q)
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref))
    
    await Promise.all(deletePromises)
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: snapshot.size 
    })
  } catch (error) {
    console.error('Error clearing vocabulary:', error)
    return NextResponse.json(
      { error: 'Failed to clear vocabulary' }, 
      { status: 500 }
    )
  }
}