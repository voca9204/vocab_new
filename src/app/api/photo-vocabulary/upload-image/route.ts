import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore, getAdminStorage } from '@/lib/firebase/admin'
import OpenAI from 'openai'

interface ImageUploadRequest {
  userId: string
  collectionId: string
  collectionName?: string
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
    const file = storage.file(fileName)
    
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    
    await file.save(imageBuffer, {
      metadata: {
        contentType: imageFile.type,
      },
    })

    // Make the file publicly readable
    await file.makePublic()
    
    const imageUrl = `https://storage.googleapis.com/${storage.name}/${fileName}`

    console.log(`[upload-image] Image uploaded: ${imageUrl}`)

    // Use OpenAI Vision to extract vocabulary from the image
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey })

    const prompt = `Analyze this image and extract English vocabulary words that would be useful for SAT preparation. 

Please identify:
1. Objects, people, actions, and concepts visible in the image
2. Descriptive words that could describe what's shown
3. Academic vocabulary related to the context

For each word, provide:
- The English word
- Korean definition
- Part of speech
- A brief context about why this word is relevant to the image

Format your response as a JSON array like this:
[
  {
    "word": "architecture",
    "definition": "건축, 건축학",
    "partOfSpeech": ["n."],
    "context": "Building structure visible in the image",
    "difficulty": 6
  }
]

Focus on 5-10 most valuable SAT vocabulary words. Prioritize words that are:
- SAT-level difficulty (not too basic, not too obscure)
- Clearly related to what's visible in the image
- Useful for academic writing and reading`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.3
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { success: false, message: 'Failed to extract vocabulary from image' },
        { status: 500 }
      )
    }

    let extractedWords: any[] = []
    try {
      // Clean and parse response
      let cleanContent = content
      if (content.includes('```json')) {
        cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      } else if (content.includes('```')) {
        cleanContent = content.replace(/```\n?/g, '').trim()
      }
      
      extractedWords = JSON.parse(cleanContent)
      
      if (!Array.isArray(extractedWords)) {
        throw new Error('Invalid response format')
      }
    } catch (parseError) {
      console.error('[upload-image] Parse error:', parseError)
      return NextResponse.json(
        { success: false, message: 'Failed to parse vocabulary extraction' },
        { status: 500 }
      )
    }

    // Create photo vocabulary collection document if it doesn't exist
    const collectionRef = db.collection('photo_vocabulary_collections').doc(collectionId)
    const collectionDoc = await collectionRef.get()
    
    if (!collectionDoc.exists) {
      await collectionRef.set({
        id: collectionId,
        name: collectionName || `Photo Collection ${new Date().toLocaleDateString()}`,
        description: 'Auto-created from photo upload',
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        wordCount: 0,
        isActive: true
      })
    }

    // Add words to photo_vocabulary_words collection
    const batch = db.batch()
    const addedWords: any[] = []

    for (const wordData of extractedWords) {
      const wordId = `${collectionId}_${wordData.word.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`
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
      message: `Successfully extracted ${extractedWords.length} vocabulary words`
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