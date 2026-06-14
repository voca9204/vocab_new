import { NextRequest, NextResponse } from 'next/server'
import {
  getTypesenseClient,
  isTypesenseConfigured,
  TYPESENSE_COLLECTION,
  SEARCH_QUERY_BY,
} from '@/lib/typesense'

/**
 * 컬렉션 범위 단어 검색 (Typesense).
 *   GET /api/search?q=power&collectionIds=ID1,ID2&perPage=250
 *
 * 반환: { ids: string[] }  (Typesense 랭킹 순) — 클라이언트가 로드된 단어와 매핑해 렌더.
 * Typesense 미설정/오류 시 { fallback: true } → 클라이언트가 기존 메모리 검색으로 폴백.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const q = (sp.get('q') || '').trim()
  const collectionIds = (sp.get('collectionIds') || sp.get('collectionId') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const perPage = Math.min(Number(sp.get('perPage') || 250), 250)

  if (!q) {
    return NextResponse.json({ ids: [], found: 0, q })
  }

  if (!isTypesenseConfigured()) {
    return NextResponse.json({ fallback: true, reason: 'not_configured' })
  }

  try {
    const client = getTypesenseClient()
    // Typesense IN 필터: collections:=[id1,id2]
    const filter_by = collectionIds.length ? `collections:=[${collectionIds.join(',')}]` : undefined

    const res = await client
      .collections(TYPESENSE_COLLECTION)
      .documents()
      .search({
        q,
        query_by: SEARCH_QUERY_BY,
        filter_by,
        per_page: perPage,
      })

    const docs = (res.hits || []).map((h: any) => h.document)
    const ids = docs.map((d: any) => d.id)
    return NextResponse.json({ ids, docs, found: res.found, q })
  } catch (error: any) {
    console.error('[search] Typesense error:', error?.message || error)
    // 서버 다운/오류 → 클라이언트가 메모리 필터로 폴백
    return NextResponse.json({ fallback: true, reason: 'error' })
  }
}
