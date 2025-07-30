/**
 * 데이터베이스 모니터링 서비스
 */

import { WordService } from './word-service'

export class DatabaseMonitoringService {
  private wordService: WordService
  private static instance: DatabaseMonitoringService
  
  constructor() {
    this.wordService = new WordService()
  }
  
  static getInstance(): DatabaseMonitoringService {
    if (!DatabaseMonitoringService.instance) {
      DatabaseMonitoringService.instance = new DatabaseMonitoringService()
    }
    return DatabaseMonitoringService.instance
  }
  
  /**
   * 전체 무결성 검사 실행
   */
  async runIntegrityCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical'
    report: {
      totalWords: number
      duplicates: Array<{ word: string, ids: string[] }>
      malformedWords: string[]
      recommendations: string[]
    }
    timestamp: Date
  }> {
    try {
      const integrity = await this.wordService.checkDatabaseIntegrity()
      const recommendations: string[] = []
      
      // 상태 판정
      let status: 'healthy' | 'warning' | 'critical' = 'healthy'
      
      if (integrity.duplicates.length > 0) {
        status = 'warning'
        recommendations.push(`${integrity.duplicates.length}개의 중복 단어를 제거하세요`)
      }
      
      if (integrity.malformedWords.length > 0) {
        status = 'critical'
        recommendations.push(`${integrity.malformedWords.length}개의 잘못된 단어를 수정하세요`)
      }
      
      if (integrity.duplicates.length > 10) {
        status = 'critical'
        recommendations.push('심각한 중복 문제 - 즉시 정리가 필요합니다')
      }
      
      if (status === 'healthy') {
        recommendations.push('데이터베이스가 건강한 상태입니다')
      }
      
      return {
        status,
        report: {
          ...integrity,
          recommendations
        },
        timestamp: new Date()
      }
    } catch (error) {
      return {
        status: 'critical',
        report: {
          totalWords: 0,
          duplicates: [],
          malformedWords: [],
          recommendations: [`검사 중 오류 발생: ${error}`]
        },
        timestamp: new Date()
      }
    }
  }
  
  /**
   * 성능 메트릭 수집
   */
  async collectPerformanceMetrics(): Promise<{
    queryPerformance: {
      avgResponseTime: number
      slowQueries: number
    }
    databaseSize: {
      totalDocuments: number
      estimatedSize: string
    }
    timestamp: Date
  }> {
    const startTime = Date.now()
    
    try {
      // 샘플 쿼리 성능 측정
      await this.wordService.searchWords('test', { limit: 10 })
      const queryTime = Date.now() - startTime
      
      const integrity = await this.wordService.checkDatabaseIntegrity()
      
      return {
        queryPerformance: {
          avgResponseTime: queryTime,
          slowQueries: queryTime > 1000 ? 1 : 0
        },
        databaseSize: {
          totalDocuments: integrity.totalWords,
          estimatedSize: `${Math.round(integrity.totalWords * 2 / 1024)}KB` // 대략적 추정
        },
        timestamp: new Date()
      }
    } catch (error) {
      return {
        queryPerformance: {
          avgResponseTime: -1,
          slowQueries: 1
        },
        databaseSize: {
          totalDocuments: 0,
          estimatedSize: 'unknown'
        },
        timestamp: new Date()
      }
    }
  }
  
  /**
   * 자동 정리 제안
   */
  async getCleanupRecommendations(): Promise<{
    priority: 'low' | 'medium' | 'high' | 'critical'
    actions: Array<{
      type: 'remove_duplicates' | 'fix_malformed' | 'optimize_indexes'
      description: string
      estimatedImpact: string
    }>
  }> {
    const integrity = await this.wordService.checkDatabaseIntegrity()
    const actions: Array<{
      type: 'remove_duplicates' | 'fix_malformed' | 'optimize_indexes'
      description: string
      estimatedImpact: string
    }> = []
    
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'low'
    
    if (integrity.duplicates.length > 0) {
      priority = 'medium'
      const duplicateCount = integrity.duplicates.reduce((sum, dup) => sum + dup.ids.length - 1, 0)
      actions.push({
        type: 'remove_duplicates',
        description: `${duplicateCount}개의 중복 단어 제거`,
        estimatedImpact: `${Math.round(duplicateCount * 2 / 1024)}KB 절약, 검색 성능 개선`
      })
    }
    
    if (integrity.malformedWords.length > 0) {
      priority = 'high'
      actions.push({
        type: 'fix_malformed',
        description: `${integrity.malformedWords.length}개의 잘못된 단어 수정`,
        estimatedImpact: '데이터 무결성 개선, 오류 방지'
      })
    }
    
    if (integrity.duplicates.length > 10 || integrity.malformedWords.length > 5) {
      priority = 'critical'
    }
    
    if (integrity.totalWords > 5000) {
      actions.push({
        type: 'optimize_indexes',
        description: '데이터베이스 인덱스 최적화 권장',
        estimatedImpact: '쿼리 성능 20-30% 개선'
      })
    }
    
    return { priority, actions }
  }
  
  /**
   * 알림 시스템 (추후 확장 가능)
   */
  async sendAlert(level: 'info' | 'warning' | 'error', message: string): Promise<void> {
    // 콘솔 로그 (추후 이메일, Slack 등으로 확장 가능)
    const timestamp = new Date().toISOString()
    const prefix = {
      info: '💡',
      warning: '⚠️',
      error: '🚨'
    }[level]
    
    console.log(`${prefix} [${timestamp}] ${message}`)
    
    // 추후 확장: 
    // - 이메일 알림
    // - Slack 웹훅
    // - Discord 알림
    // - 관리자 대시보드
  }
  
  /**
   * 정기 건강 체크
   */
  async performHealthCheck(): Promise<void> {
    console.log('🏥 데이터베이스 건강 체크 시작...')
    
    const integrity = await this.runIntegrityCheck()
    const performance = await this.collectPerformanceMetrics()
    const cleanup = await this.getCleanupRecommendations()
    
    // 상태별 알림
    switch (integrity.status) {
      case 'critical':
        await this.sendAlert('error', `데이터베이스 상태 위험: ${integrity.report.recommendations.join(', ')}`)
        break
      case 'warning':
        await this.sendAlert('warning', `데이터베이스 주의 필요: ${integrity.report.recommendations.join(', ')}`)
        break
      case 'healthy':
        await this.sendAlert('info', '데이터베이스 상태 양호')
        break
    }
    
    // 성능 알림
    if (performance.queryPerformance.avgResponseTime > 2000) {
      await this.sendAlert('warning', `쿼리 성능 저하: ${performance.queryPerformance.avgResponseTime}ms`)
    }
    
    // 정리 권장사항
    if (cleanup.priority === 'critical' || cleanup.priority === 'high') {
      await this.sendAlert('warning', `데이터베이스 정리 필요: ${cleanup.actions.map(a => a.description).join(', ')}`)
    }
    
    console.log('✅ 건강 체크 완료')
  }
}

export default DatabaseMonitoringService