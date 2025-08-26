// Official Collections API (Admin Only)

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getAdminFirestore } from '@/lib/firebase/admin'
import { isAdmin } from '@/lib/auth/admin'
import type { 
  OfficialCollection,
  UploadOfficialCollectionRequest,
  CollectionFilterOptions 
} from '@/types/collections'

// GET /api/collections/official - Get official collections
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse filter options
    const options: CollectionFilterOptions = {
      category: searchParams.get('category') as any,
      difficulty: searchParams.get('difficulty') as any,
      tags: searchParams.get('tags')?.split(',').filter(Boolean),
      sortBy: searchParams.get('sortBy') as any || 'createdAt',
      sortOrder: searchParams.get('sortOrder') as any || 'desc',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      cursor: searchParams.get('cursor') || undefined
    }
    
    const db = getAdminFirestore()
    let query = db.collection('vocabulary_collections')
    
    // Apply filters
    if (options.category) {
      query = query.where('category', '==', options.category)
    }
    if (options.difficulty) {
      query = query.where('difficulty', '==', options.difficulty)
    }
    if (options.tags && options.tags.length > 0) {
      query = query.where('tags', 'array-contains-any', options.tags)
    }
    
    // Apply sorting
    query = query.orderBy(options.sortBy!, options.sortOrder as any)
    
    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit)
    }
    if (options.cursor) {
      const cursorDoc = await db.collection('vocabulary_collections').doc(options.cursor).get()
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc)
      }
    }
    
    const snapshot = await query.get()
    const collections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as OfficialCollection[]
    
    return NextResponse.json({
      success: true,
      collections,
      totalCount: collections.length,
      hasMore: collections.length === options.limit,
      nextCursor: collections.length > 0 ? collections[collections.length - 1].id : null
    })
  } catch (error) {
    console.error('Error fetching official collections:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch collections' },
      { status: 500 }
    )
  }
}

// POST /api/collections/official - Create official collection (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Get auth token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const token = authHeader.split('Bearer ')[1]
    const auth = getAuth()
    const decodedToken = await auth.verifyIdToken(token)
    const userEmail = decodedToken.email
    
    // Check admin access
    if (!userEmail || !isAdmin(userEmail)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    const body: UploadOfficialCollectionRequest = await request.json()
    
    // Validate required fields
    if (!body.category || !body.name || !body.difficulty || !body.words || body.words.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const db = getAdminFirestore()
    
    // First, save words to the words collection
    const wordIds: string[] = []
    const batch = db.batch()
    
    for (const wordData of body.words) {
      const wordRef = db.collection('words').doc()
      wordIds.push(wordRef.id)
      
      batch.set(wordRef, {
        word: wordData.word.toLowerCase(),
        definition: wordData.definition,
        partOfSpeech: wordData.partOfSpeech || [],
        examples: wordData.examples || [],
        etymology: wordData.etymology,
        pronunciation: wordData.pronunciation,
        source: {
          type: 'official',
          collection: body.category,
          addedBy: userEmail,
          addedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
    
    // Create the collection document
    const collectionRef = db.collection('vocabulary_collections').doc()
    const collection: OfficialCollection = {
      id: collectionRef.id,
      name: body.name,
      displayName: body.displayName || body.name,
      category: body.category,
      description: body.description,
      words: wordIds,
      wordCount: wordIds.length,
      difficulty: body.difficulty,
      isOfficial: true,
      uploadedBy: decodedToken.uid,
      uploadedByEmail: userEmail,
      version: body.metadata.version || '1.0.0',
      tags: body.metadata.tags || [],
      source: {
        type: 'manual',
        publisher: body.metadata.publisher
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    batch.set(collectionRef, collection)
    
    // Commit the batch
    await batch.commit()
    
    return NextResponse.json({
      success: true,
      collection,
      message: `Successfully created ${body.name} with ${wordIds.length} words`
    })
  } catch (error) {
    console.error('Error creating official collection:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create collection' },
      { status: 500 }
    )
  }
}

// PUT /api/collections/official/[id] - Update official collection (Admin only)
export async function PUT(request: NextRequest) {
  try {
    // Get collection ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const collectionId = pathParts[pathParts.length - 1]
    
    if (!collectionId || collectionId === 'official') {
      return NextResponse.json(
        { success: false, error: 'Collection ID required' },
        { status: 400 }
      )
    }
    
    // Get auth token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const token = authHeader.split('Bearer ')[1]
    const auth = getAuth()
    const decodedToken = await auth.verifyIdToken(token)
    const userEmail = decodedToken.email
    
    // Check admin access
    if (!userEmail || !isAdmin(userEmail)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    const updates = await request.json()
    
    const db = getAdminFirestore()
    const collectionRef = db.collection('vocabulary_collections').doc(collectionId)
    
    // Check if collection exists
    const collectionDoc = await collectionRef.get()
    if (!collectionDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      )
    }
    
    // Update the collection
    await collectionRef.update({
      ...updates,
      updatedAt: new Date()
    })
    
    return NextResponse.json({
      success: true,
      message: 'Collection updated successfully'
    })
  } catch (error) {
    console.error('Error updating official collection:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update collection' },
      { status: 500 }
    )
  }
}

// DELETE /api/collections/official/[id] - Delete official collection (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Get collection ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const collectionId = pathParts[pathParts.length - 1]
    
    if (!collectionId || collectionId === 'official') {
      return NextResponse.json(
        { success: false, error: 'Collection ID required' },
        { status: 400 }
      )
    }
    
    // Get auth token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const token = authHeader.split('Bearer ')[1]
    const auth = getAuth()
    const decodedToken = await auth.verifyIdToken(token)
    const userEmail = decodedToken.email
    
    // Check admin access
    if (!userEmail || !isAdmin(userEmail)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    const db = getAdminFirestore()
    const collectionRef = db.collection('vocabulary_collections').doc(collectionId)
    
    // Check if collection exists
    const collectionDoc = await collectionRef.get()
    if (!collectionDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      )
    }
    
    // Delete the collection
    await collectionRef.delete()
    
    // Note: We're not deleting the words as they might be used in other collections
    // Consider implementing a cleanup job for orphaned words
    
    return NextResponse.json({
      success: true,
      message: 'Collection deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting official collection:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete collection' },
      { status: 500 }
    )
  }
}