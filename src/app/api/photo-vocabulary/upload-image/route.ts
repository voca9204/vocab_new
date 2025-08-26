import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore, getAdminStorage } from '@/lib/firebase/admin'

// Common words to filter out
const COMMON_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'down', 'out', 'over', 'under',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
  'might', 'must', 'can', 'shall', 'i', 'you', 'he', 'she', 'it', 'we',
  'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her',
  'its', 'our', 'their', 'this', 'that', 'these', 'those', 'what', 'which',
  'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'all', 'some',
  'any', 'many', 'much', 'more', 'most', 'less', 'least', 'very', 'too',
  'quite', 'just', 'only', 'not', 'no', 'yes', 'so', 'if', 'then', 'because',
  'as', 'until', 'while', 'although', 'though', 'since', 'before', 'after',
  'above', 'below', 'between', 'through', 'during', 'about', 'against'
])

function isCommonWord(word: string): boolean {
  return COMMON_WORDS.has(word.toLowerCase())
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const userId = formData.get('userId') as string
    const collectionId = formData.get('collectionId') as string
    const collectionName = formData.get('collectionName') as string | undefined

    if (!imageFile || !userId || !collectionId) {
      return NextResponse.json(
        { success: false, message: 'Image, user ID, and collection ID are required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, message: 'Only image files are allowed' },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()
    const storage = getAdminStorage()

    // Upload image to Firebase Storage
    const fileName = `photo-vocabulary/${userId}/${collectionId}/${Date.now()}-${imageFile.name}`
    const bucket = storage.bucket()
    const file = bucket.file(fileName)
    
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    
    await file.save(imageBuffer, {
      metadata: {
        contentType: imageFile.type,
      },
    })

    // Make the file publicly readable
    await file.makePublic()
    
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'vocabulary-app-new.firebasestorage.app'
    const imageUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`

    console.log(`[upload-image] Image uploaded: ${imageUrl}`)

    // Use Google Cloud Vision API to extract text from the image
    const { ImageAnnotatorClient } = await import('@google-cloud/vision')
    const vision = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    })

    // Detect text in the image
    const [result] = await vision.textDetection({
      image: { content: imageBuffer.toString('base64') }
    })

    const detections = result.textAnnotations || []
    const fullText = detections[0]?.description || ''

    if (!fullText) {
      return NextResponse.json(
        { success: false, message: 'No text found in the image' },
        { status: 400 }
      )
    }

    console.log(`[upload-image] Extracted text: ${fullText.substring(0, 200)}...`)

    // Extract meaningful words from the text
    // Filter for SAT-level vocabulary (longer words, excluding common words)
    const words = fullText
      .split(/[\s\n\r\t,;.!?()[\]{}'"]+/)
      .filter(word => word.length > 0)
      .map(word => word.toLowerCase().trim())
      .filter((word, index, self) => self.indexOf(word) === index) // Remove duplicates
      .filter(word => {
        // Filter for SAT-level words
        return word.length >= 5 && // At least 5 characters
               /^[a-z]+$/.test(word) && // Only letters
               !isCommonWord(word) // Not a common word
      })
      .slice(0, 15) // Limit to 15 words

    // Convert to the expected format
    const extractedWords = words.map((word, index) => ({
      word: word,
      definition: '정의를 추가해주세요', // User will add definitions
      partOfSpeech: ['n.'], // Default part of speech
      context: `Found in image: "${fullText.substring(0, 50)}..."`,
      difficulty: Math.min(10, Math.max(1, Math.floor(word.length / 2))) // Estimate difficulty by length
    }))

    if (extractedWords.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No vocabulary words found in the image' },
        { status: 400 }
      )
    }

    // Create photo vocabulary collection document if it doesn't exist
    const collectionRef = db.collection('photo_vocabulary_collections').doc(collectionId)
    const collectionDoc = await collectionRef.get()
    
    if (!collectionDoc.exists) {
      await collectionRef.set({
        id: collectionId,
        name: collectionName || `Photo Collection ${new Date().toLocaleDateString()}`,
        userId,
        imageUrl,
        fileName: imageFile.name,
        wordCount: 0,
        words: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
      })
    }

    // Store extracted words in photo_vocabulary_words collection
    const batch = db.batch()
    const addedWords = []

    for (const wordData of extractedWords) {
      const wordId = `${collectionId}_${wordData.word}_${Date.now()}`
      const wordRef = db.collection('photo_vocabulary_words').doc(wordId)
      
      const photoVocabularyWord = {
        id: wordId,
        word: wordData.word,
        definition: wordData.definition,
        context: wordData.context || '',
        partOfSpeech: wordData.partOfSpeech || ['n.'],
        difficulty: wordData.difficulty || 5,
        frequency: 50, // Default frequency
        collectionId,
        userId,
        imageUrl,
        fileName,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        studyStatus: {
          studied: false,
          masteryLevel: 0,
          reviewCount: 0,
          lastStudiedAt: null
        }
      }
      
      batch.set(wordRef, photoVocabularyWord)
      addedWords.push(photoVocabularyWord)
    }

    // Update collection word count
    const newWordCount = (collectionDoc.data()?.wordCount || 0) + extractedWords.length
    batch.update(collectionRef, {
      wordCount: newWordCount,
      updatedAt: new Date()
    })

    await batch.commit()

    console.log(`[upload-image] Added ${extractedWords.length} words to collection ${collectionId}`)

    return NextResponse.json({
      success: true,
      imageUrl,
      fileName,
      wordsExtracted: extractedWords.length,
      words: addedWords,
      collectionId,
      message: `Successfully extracted ${extractedWords.length} vocabulary words using Google Cloud Vision`
    })

  } catch (error) {
    console.error('[upload-image] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to process image upload'
      },
      { status: 500 }
    )
  }
}