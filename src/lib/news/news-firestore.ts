// News Processing - Firestore News Service

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { ProcessedNewsArticle, CrawlingSession, NewsSource } from '@/types/news'
import { FIREBASE_COLLECTIONS } from '@/lib/constants'

export interface NewsQueryOptions {
  limit?: number
  startAfter?: QueryDocumentSnapshot<DocumentData>
  category?: string
  minSATWords?: number
  maxDifficulty?: number
  dateRange?: {
    start: Date
    end: Date
  }
  educationalOnly?: boolean
  ageAppropriate?: boolean
}

export interface NewsStats {
  totalArticles: number
  articlesThisWeek: number
  avgSATWordsPerArticle: number
  topCategories: Array<{ category: string; count: number }>
  qualityDistribution: Record<number, number>
}

export class NewsFirestoreService {
  private readonly newsCollection = FIREBASE_COLLECTIONS.NEWS
  private readonly sessionsCollection = 'crawling_sessions'
  private readonly sourcesCollection = 'news_sources'

  /**
   * Store processed articles in Firestore
   */
  async storeArticles(articles: ProcessedNewsArticle[]): Promise<{
    success: number
    failed: number
    errors: string[]
  }> {
    const batch = writeBatch(db)
    const errors: string[] = []
    let success = 0

    // Process in batches of 500 (Firestore limit)
    const batchSize = 500
    for (let i = 0; i < articles.length; i += batchSize) {
      const batchArticles = articles.slice(i, i + batchSize)
      
      try {
        const batchPromises = batchArticles.map(async (article) => {
          try {
            // Check for duplicates
            if (await this.isDuplicate(article)) {
              errors.push(`Duplicate article: ${article.title}`)
              return false
            }

            const newsRef = collection(db, this.newsCollection)
            const docRef = doc(newsRef)
            
            batch.set(docRef, {
              ...article,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
            
            return true
          } catch (error) {
            errors.push(`Error preparing article ${article.title}: ${error}`)
            return false
          }
        })

        const results = await Promise.all(batchPromises)
        success += results.filter(Boolean).length

        // Commit batch
        await batch.commit()
        console.log(`✅ Stored batch of ${success} articles`)

      } catch (error) {
        errors.push(`Batch storage error: ${error}`)
        console.error('Batch storage failed:', error)
      }
    }

    return {
      success,
      failed: articles.length - success,
      errors
    }
  }

  /**
   * Check if article is duplicate
   */
  private async isDuplicate(article: ProcessedNewsArticle): Promise<boolean> {
    try {
      const newsRef = collection(db, this.newsCollection)
      const q = query(
        newsRef,
        where('url', '==', article.url),
        limit(1)
      )
      
      const snapshot = await getDocs(q)
      return !snapshot.empty
    } catch (error) {
      console.warn('Error checking for duplicates:', error)
      return false
    }
  }

  /**
   * Get latest news articles
   */
  async getLatestArticles(options: NewsQueryOptions = {}): Promise<{
    articles: ProcessedNewsArticle[]
    lastDoc: QueryDocumentSnapshot<DocumentData> | null
    hasMore: boolean
  }> {
    try {
      const newsRef = collection(db, this.newsCollection)
      const constraints: any[] = []

      // Build query constraints
      if (options.minSATWords) {
        constraints.push(where('satWordCount', '>=', options.minSATWords))
      }

      if (options.maxDifficulty) {
        constraints.push(where('difficulty', '<=', options.maxDifficulty))
      }

      if (options.educationalOnly) {
        constraints.push(where('isEducational', '==', true))
      }

      if (options.ageAppropriate) {
        constraints.push(where('ageAppropriate', '==', true))
      }

      if (options.dateRange) {
        constraints.push(where('publishedAt', '>=', options.dateRange.start))
        constraints.push(where('publishedAt', '<=', options.dateRange.end))
      }

      // Add ordering and pagination
      constraints.push(orderBy('publishedAt', 'desc'))
      
      if (options.startAfter) {
        constraints.push(startAfter(options.startAfter))
      }

      const limitCount = options.limit || 20
      constraints.push(limit(limitCount))

      const q = query(newsRef, ...constraints)
      const snapshot = await getDocs(q)

      const articles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ProcessedNewsArticle[]

      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null
      const hasMore = snapshot.docs.length === limitCount

      return { articles, lastDoc, hasMore }

    } catch (error) {
      console.error('Error fetching articles:', error)
      throw error
    }
  }

  /**
   * Get articles with specific SAT words
   */
  async getArticlesWithWords(
    words: string[],
    limitCount: number = 10
  ): Promise<ProcessedNewsArticle[]> {
    try {
      const newsRef = collection(db, this.newsCollection)
      const q = query(
        newsRef,
        where('satWords', 'array-contains-any', words),
        orderBy('satWordDensity', 'desc'),
        limit(limitCount)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ProcessedNewsArticle[]

    } catch (error) {
      console.error('Error fetching articles with words:', error)
      throw error
    }
  }

  /**
   * Get article by ID
   */
  async getArticleById(articleId: string): Promise<ProcessedNewsArticle | null> {
    try {
      const articleRef = doc(db, this.newsCollection, articleId)
      const snapshot = await getDoc(articleRef)

      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data(),
        } as ProcessedNewsArticle
      }

      return null
    } catch (error) {
      console.error('Error fetching article by ID:', error)
      throw error
    }
  }

  /**
   * Update article
   */
  async updateArticle(
    articleId: string, 
    updates: Partial<ProcessedNewsArticle>
  ): Promise<void> {
    try {
      const articleRef = doc(db, this.newsCollection, articleId)
      await updateDoc(articleRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error('Error updating article:', error)
      throw error
    }
  }

  /**
   * Delete article
   */
  async deleteArticle(articleId: string): Promise<void> {
    try {
      const articleRef = doc(db, this.newsCollection, articleId)
      await deleteDoc(articleRef)
    } catch (error) {
      console.error('Error deleting article:', error)
      throw error
    }
  }

  /**
   * Store crawling session
   */
  async storeCrawlingSession(session: CrawlingSession): Promise<string> {
    try {
      const sessionsRef = collection(db, this.sessionsCollection)
      const docRef = await addDoc(sessionsRef, {
        ...session,
        createdAt: serverTimestamp(),
      })
      return docRef.id
    } catch (error) {
      console.error('Error storing crawling session:', error)
      throw error
    }
  }

  /**
   * Get crawling sessions
   */
  async getCrawlingSessions(limitCount: number = 10): Promise<CrawlingSession[]> {
    try {
      const sessionsRef = collection(db, this.sessionsCollection)
      const q = query(
        sessionsRef,
        orderBy('startTime', 'desc'),
        limit(limitCount)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CrawlingSession[]

    } catch (error) {
      console.error('Error fetching crawling sessions:', error)
      throw error
    }
  }

  /**
   * Store/update news sources
   */
  async storeNewsSource(source: NewsSource): Promise<string> {
    try {
      const sourcesRef = collection(db, this.sourcesCollection)
      
      // Check if source exists
      const existingQuery = query(sourcesRef, where('id', '==', source.id))
      const existingSnapshot = await getDocs(existingQuery)

      if (!existingSnapshot.empty) {
        // Update existing
        const docRef = existingSnapshot.docs[0].ref
        await updateDoc(docRef, {
          ...source,
          updatedAt: serverTimestamp(),
        })
        return docRef.id
      } else {
        // Create new
        const docRef = await addDoc(sourcesRef, {
          ...source,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        return docRef.id
      }
    } catch (error) {
      console.error('Error storing news source:', error)
      throw error
    }
  }

  /**
   * Get news statistics
   */
  async getNewsStatistics(): Promise<NewsStats> {
    try {
      const newsRef = collection(db, this.newsCollection)
      
      // Get all articles (in production, this should be paginated)
      const allArticlesQuery = query(newsRef, orderBy('publishedAt', 'desc'))
      const allSnapshot = await getDocs(allArticlesQuery)
      const allArticles = allSnapshot.docs.map(doc => doc.data() as ProcessedNewsArticle)

      // Calculate statistics
      const totalArticles = allArticles.length
      
      // Articles from last week
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const articlesThisWeek = allArticles.filter(
        article => article.publishedAt.seconds * 1000 > weekAgo.getTime()
      ).length

      // Average SAT words per article
      const totalSATWords = allArticles.reduce((sum, article) => sum + article.satWordCount, 0)
      const avgSATWordsPerArticle = totalArticles > 0 ? totalSATWords / totalArticles : 0

      // Top categories (simplified)
      const categoryCount: Record<string, number> = {}
      allArticles.forEach(article => {
        article.tags?.forEach(tag => {
          categoryCount[tag] = (categoryCount[tag] || 0) + 1
        })
      })

      const topCategories = Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }))

      // Quality distribution
      const qualityDistribution: Record<number, number> = {}
      allArticles.forEach(article => {
        const quality = Math.round(article.contentQuality)
        qualityDistribution[quality] = (qualityDistribution[quality] || 0) + 1
      })

      return {
        totalArticles,
        articlesThisWeek,
        avgSATWordsPerArticle,
        topCategories,
        qualityDistribution
      }

    } catch (error) {
      console.error('Error calculating news statistics:', error)
      throw error
    }
  }

  /**
   * Clean up old articles
   */
  async cleanupOldArticles(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const newsRef = collection(db, this.newsCollection)
      const oldArticlesQuery = query(
        newsRef,
        where('publishedAt', '<=', cutoffDate),
        limit(500) // Process in batches
      )

      const snapshot = await getDocs(oldArticlesQuery)
      const batch = writeBatch(db)

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })

      await batch.commit()
      console.log(`🗑️ Cleaned up ${snapshot.docs.length} old articles`)
      
      return snapshot.docs.length

    } catch (error) {
      console.error('Error cleaning up old articles:', error)
      throw error
    }
  }

  /**
   * Get articles for vocabulary word
   */
  async getArticlesForWord(
    wordId: string,
    limitCount: number = 5
  ): Promise<ProcessedNewsArticle[]> {
    try {
      const newsRef = collection(db, this.newsCollection)
      
      // First try to find articles where the word is highlighted
      const articlesWithHighlights = await getDocs(query(
        newsRef,
        where('highlights', 'array-contains', { wordId }),
        orderBy('satWordDensity', 'desc'),
        limit(limitCount)
      ))

      if (!articlesWithHighlights.empty) {
        return articlesWithHighlights.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as ProcessedNewsArticle[]
      }

      // Fallback: search for articles containing the word in SAT words array
      const articlesWithWord = await getDocs(query(
        newsRef,
        where('satWords', 'array-contains', wordId),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      ))

      return articlesWithWord.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ProcessedNewsArticle[]

    } catch (error) {
      console.error('Error fetching articles for word:', error)
      return []
    }
  }
}

// Singleton instance
export const newsFirestoreService = new NewsFirestoreService()
