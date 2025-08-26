/**
 * 통합 추출 API 엔드포인트
 * 
 * 모든 파일 형식에 대한 단일 진입점
 * - 이미지: Google Cloud Vision OCR
 * - PDF/TXT/CSV: 텍스트 추출 → AI 정의 생성
 */

import { NextRequest, NextResponse } from 'next/server'
import { getExtractionService, handleDiscoveryRequest } from '@/lib/extraction/unified-extraction-service'
import { getAdminAuth } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    // 인증 확인 (선택적)
    const authHeader = request.headers.get('authorization')
    let userId: string | undefined
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1]
        const auth = getAdminAuth()
        const decodedToken = await auth.verifyIdToken(token)
        userId = decodedToken.uid
      } catch (error) {
        // 인증 실패해도 계속 진행 (공개 API)
        console.log('Auth failed, continuing as anonymous')
      }
    }
    
    // Content-Type 확인
    const contentType = request.headers.get('content-type') || ''
    
    // Discovery 요청 처리 (JSON)
    if (contentType.includes('application/json')) {
      const { word, context, options } = await request.json()
      
      if (!word) {
        return NextResponse.json(
          { success: false, error: 'Word is required for discovery' },
          { status: 400 }
        )
      }
      
      const result = await handleDiscoveryRequest(word, context, {
        ...options,
        aiModel: options?.aiModel || 'gpt-4'
      })
      
      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Failed to discover word' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        word: result,
        method: 'discovery',
        userId
      })
    }
    
    // 파일 업로드 처리 (FormData)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File
      const optionsStr = formData.get('options') as string
      
      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided' },
          { status: 400 }
        )
      }
      
      // 파일 크기 제한 (20MB)
      if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: 'File too large (max 20MB)' },
          { status: 400 }
        )
      }
      
      // 옵션 파싱
      let options = {}
      if (optionsStr) {
        try {
          options = JSON.parse(optionsStr)
        } catch (e) {
          console.warn('Failed to parse options:', e)
        }
      }
      
      // 추출 서비스 호출
      const service = getExtractionService()
      const result = await service.extractFromFile(file, {
        maxWords: 1000,
        removeCommonWords: true,
        generateDefinitions: true,
        targetLanguage: 'both',
        ...options
      })
      
      if (!result.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: result.error || 'Extraction failed',
            method: result.method
          },
          { status: 500 }
        )
      }
      
      // 로깅
      console.log(`[Extract API] Success:`)
      console.log(`- File: ${file.name} (${file.size} bytes)`)
      console.log(`- Type: ${file.type}`)
      console.log(`- Method: ${result.method}`)
      console.log(`- Words: ${result.totalCount}`)
      console.log(`- Confidence: ${result.confidence}`)
      console.log(`- User: ${userId || 'anonymous'}`)
      
      return NextResponse.json({
        success: true,
        ...result,
        userId,
        fileName: file.name,
        fileSize: file.size
      })
    }
    
    // 지원하지 않는 Content-Type
    return NextResponse.json(
      { success: false, error: 'Invalid content type' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('[Extract API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// OPTIONS 요청 처리 (CORS)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}