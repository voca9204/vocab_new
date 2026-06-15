import { NextRequest, NextResponse } from 'next/server'
import {
  getTypesenseClient,
  isTypesenseConfigured,
  TYPESENSE_COLLECTION,
  SEARCH_QUERY_BY,
} from '@/lib/typesense'

/**
 * 컬렉션 범위 단어 검색/브라우징 (Typesense).
 *   GET /api/search?q=power&collectionIds=ID1,ID2&page=1&perPage=100
 *   - q 비어있으면 전체 브라우징(q=*) → 단어 목록 페이지네이션
 *
 * 반환: { ids, docs, found, page, perPage }
 * Typesense 미설정/오류 시 { fallback: true } → 클라이언트가 Firestore/메모리로 폴백.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const rawQ = (sp.get('q') || '').trim()
  const collectionIds = (sp.get('collectionIds') || sp.get('collectionId') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const perPage = Math.min(Math.max(Number(sp.get('perPage') || 100), 1), 250)
  const page = Math.max(Number(sp.get('page') || 1), 1)

  if (!isTypesenseConfigured()) {
    return NextResponse.json({ fallback: true, reason: 'not_configured' })
  }

  const browse = rawQ === ''
  const q = browse ? '*' : rawQ

  try {
    const client = getTypesenseClient()
    const filter_by = collectionIds.length ? `collections:=[${collectionIds.join(',')}]` : undefined

    const searchParams: any = {
      q,
      query_by: SEARCH_QUERY_BY,
      filter_by,
      per_page: perPage,
      page,
    }
    // 전체 브라우징은 안정적인 순서를 위해 난이도 오름차순 정렬
    if (browse) searchParams.sort_by = 'difficulty:asc'

    const res = await client.collections(TYPESENSE_COLLECTION).documents().search(searchParams)

    const docs = (res.hits || []).map((h: any) => h.document)
    const ids = docs.map((d: any) => d.id)
    return NextResponse.json({ ids, docs, found: res.found, page, perPage, q: rawQ })
  } catch (error: any) {
    console.error('[search] Typesense error:', error?.message || error)
    return NextResponse.json({ fallback: true, reason: 'error' })
  }
}
