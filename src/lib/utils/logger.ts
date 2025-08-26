/**
 * Environment-aware logging utility
 * Only logs in development mode unless explicitly enabled
 */

const isDevelopment = process.env.NODE_ENV === 'development'
const isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG === 'true'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

const currentLogLevel = isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR

class Logger {
  private prefix: string
  private enabled: boolean

  constructor(prefix: string = '', enabled: boolean = true) {
    this.prefix = prefix
    this.enabled = enabled
  }

  private shouldLog(level: LogLevel): boolean {
    return this.enabled && level >= currentLogLevel
  }

  private formatMessage(message: string): string {
    const timestamp = new Date().toISOString()
    return this.prefix 
      ? `[${timestamp}] [${this.prefix}] ${message}`
      : `[${timestamp}] ${message}`
  }

  debug(...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('🔍'), ...args)
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('ℹ️'), ...args)
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('⚠️'), ...args)
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('❌'), ...args)
    }
  }

  // Performance logging - only in development
  time(label: string): void {
    if (isDevelopment) {
      console.time(`${this.prefix ? `[${this.prefix}] ` : ''}${label}`)
    }
  }

  timeEnd(label: string): void {
    if (isDevelopment) {
      console.timeEnd(`${this.prefix ? `[${this.prefix}] ` : ''}${label}`)
    }
  }

  // Group logging for better organization
  group(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.group(this.formatMessage(label))
    }
  }

  groupEnd(): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.groupEnd()
    }
  }

  // Table logging for structured data
  table(data: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.table(data)
    }
  }
}

// Create specialized loggers for different parts of the app
export const logger = new Logger()
export const adapterLogger = new Logger('Adapter')
export const contextLogger = new Logger('Context')
export const cacheLogger = new Logger('Cache')
export const firebaseLogger = new Logger('Firebase')
export const apiLogger = new Logger('API')

// Export default logger instance
export default logger