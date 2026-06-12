/**
 * Centralized Logging Utility
 *
 * This utility provides a centralized, secure, and configurable logging system
 * for the Memory application. It prevents accidental logging of sensitive data
 * and provides development/production environment control.
 *
 * @module utils/logging
 * @see {@link https://github.com/outlaw-dame/memory | Memory Project}
 */

/**
 * Log levels for categorizing log messages
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SILENT = 'SILENT',
}

/**
 * Configuration options for the logger
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel
  /** Whether to output to console */
  consoleOutput: boolean
  /** Whether this is a production environment */
  isProduction: boolean
  /** Custom log handler (e.g., for remote logging) */
  customHandler?: (level: LogLevel, message: string, context?: unknown) => void
  /** List of sensitive keys to redact from logs */
  sensitiveKeys: string[]
}

/**
 * Sensitive field patterns that should never be logged
 * These are automatically redacted from all log messages
 */
const SENSITIVE_PATTERNS = [
  // Authentication
  'token',
  'accessToken',
  'refreshToken',
  'authToken',
  'jwt',
  'session',
  'password',
  'passwd',
  'secret',
  'apiKey',
  'apikey',
  'privateKey',
  'credentials',
  'credential',
  // User Data
  'email',
  'username',
  'userId',
  'user_id',
  'userName',
  'phone',
  'phoneNumber',
  'address',
  'ssn',
  'socialSecurity',
  'creditCard',
  'cardNumber',
  'cvv',
  // Content
  'message',
  'body',
  'content',
  'postBody',
  'commentBody',
  'draft',
  // URLs
  'url',
  'uri',
  'href',
  // Files
  'file',
  'filename',
  'fileUrl',
  'attachment',
  'attachmentUrl',
  // Encryption
  'encrypted',
  'encryptionKey',
  'cipher',
  'signature',
  // Headers
  'authorization',
  'cookie',
  'set-cookie',
]

/**
 * Default sensitive keys (lowercase for case-insensitive matching)
 */
const DEFAULT_SENSITIVE_KEYS = SENSITIVE_PATTERNS.map(k => k.toLowerCase())

/**
 * Context object that can be passed to log methods
 */
export interface LogContext {
  [key: string]: unknown
}

/**
 * Result of a logging operation
 */
export interface LogResult {
  level: LogLevel
  message: string
  timestamp: Date
  context?: LogContext
}

/**
 * Logger instance for structured logging
 */
export class Logger {
  private config: LoggerConfig
  private readonly instanceName: string

  /**
   * Creates a new logger instance
   * @param instanceName - Name of the logger instance (for identification)
   * @param config - Logger configuration
   */
  constructor(instanceName: string, config: Partial<LoggerConfig> = {}) {
    this.instanceName = instanceName
    this.config = {
      level: config.level ?? (import.meta.env.PROD ? LogLevel.WARN : LogLevel.DEBUG),
      consoleOutput: config.consoleOutput ?? true,
      isProduction: config.isProduction ?? import.meta.env.PROD,
      customHandler: config.customHandler,
      sensitiveKeys: config.sensitiveKeys ?? DEFAULT_SENSITIVE_KEYS,
    }
  }

  /**
   * Creates a child logger with the same configuration
   * @param childName - Name of the child logger
   * @returns New logger instance
   */
  child(childName: string): Logger {
    return new Logger(`${this.instanceName}.${childName}`, this.config)
  }

  /**
   * Sanitizes a value by redacting sensitive information
   * @param value - The value to sanitize
   * @returns Sanitized value
   */
  private sanitize(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value
    }

    if (typeof value === 'string') {
      // Check if the string itself looks like a sensitive value
      return this.redactIfSensitive(value)
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map(item => this.sanitize(item))
      }

      const sanitized: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(value)) {
        const lowerKey = key.toLowerCase()
        
        // Check if key matches any sensitive pattern
        const isSensitive = this.config.sensitiveKeys.some(
          pattern => lowerKey.includes(pattern)
        )

        if (isSensitive) {
          sanitized[key] = '[REDACTED]'
        } else {
          sanitized[key] = this.sanitize(val)
        }
      }
      return sanitized
    }

    return value
  }

  /**
   * Checks if a string value looks like sensitive data and should be redacted
   * @param value - The string value to check
   * @returns Redacted string or original value
   */
  private redactIfSensitive(value: string): string {
    // Don't redact short strings that are likely field names
    if (value.length <= 10) {
      return value
    }

    // Patterns that indicate sensitive data
    const sensitivePatterns = [
      // JWT tokens (3 parts separated by dots)
      /^([a-zA-Z0-9_\-]+\.){2}[a-zA-Z0-9_\-]+$/,
      // UUIDs
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      // Email addresses
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      // Bearer tokens
      /^Bearer /i,
      // Basic Auth
      /^Basic /i,
      // URLs with sensitive paths
      /token=/i,
      /password=/i,
      /secret=/i,
      /key=/i,
      // Long alphanumeric strings (likely hashes/tokens)
      /^[a-zA-Z0-9]{32,}$/,
    ]

    if (sensitivePatterns.some(pattern => pattern.test(value))) {
      return '[REDACTED]'
    }

    return value
  }

  /**
   * Formats a log message with metadata
   * @param level - Log level
   * @param message - Log message (may contain placeholders)
   * @param context - Additional context
   * @returns Formatted message
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString()
    const sanitizedContext = context ? this.sanitize(context) : undefined
    
    // Format the message with context
    let formattedMessage = message
    
    if (sanitizedContext && Object.keys(sanitizedContext).length > 0) {
      try {
        formattedMessage = message + ' ' + JSON.stringify(sanitizedContext)
      } catch {
        // If context can't be stringified, just use the message
        formattedMessage = message
      }
    }

    return `[${timestamp}] [${this.instanceName}] [${level}] ${formattedMessage}`
  }

  /**
   * Determines if a log level should be output based on configuration
   * @param level - Log level to check
   * @returns Whether the level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
      LogLevel.SILENT,
    ]

    const levelIndex = levels.indexOf(level)
    const configIndex = levels.indexOf(this.config.level)

    return levelIndex >= configIndex
  }

  /**
   * Logs a debug message
   * @param message - Debug message
   * @param context - Additional context
   */
  debug(message: string, context?: LogContext): LogResult | null {
    if (!this.shouldLog(LogLevel.DEBUG)) {
      return null
    }

    const formatted = this.formatMessage(LogLevel.DEBUG, message, context)
    
    if (this.config.consoleOutput) {
      console.debug(formatted)
    }

    this.config.customHandler?.(LogLevel.DEBUG, formatted, context)

    return {
      level: LogLevel.DEBUG,
      message: formatted,
      timestamp: new Date(),
      context: this.sanitize(context),
    }
  }

  /**
   * Logs an info message
   * @param message - Info message
   * @param context - Additional context
   */
  info(message: string, context?: LogContext): LogResult | null {
    if (!this.shouldLog(LogLevel.INFO)) {
      return null
    }

    const formatted = this.formatMessage(LogLevel.INFO, message, context)
    
    if (this.config.consoleOutput) {
      console.info(formatted)
    }

    this.config.customHandler?.(LogLevel.INFO, formatted, context)

    return {
      level: LogLevel.INFO,
      message: formatted,
      timestamp: new Date(),
      context: this.sanitize(context),
    }
  }

  /**
   * Logs a warning message
   * @param message - Warning message
   * @param context - Additional context
   */
  warn(message: string, context?: LogContext): LogResult | null {
    if (!this.shouldLog(LogLevel.WARN)) {
      return null
    }

    const formatted = this.formatMessage(LogLevel.WARN, message, context)
    
    if (this.config.consoleOutput) {
      console.warn(formatted)
    }

    this.config.customHandler?.(LogLevel.WARN, formatted, context)

    return {
      level: LogLevel.WARN,
      message: formatted,
      timestamp: new Date(),
      context: this.sanitize(context),
    }
  }

  /**
   * Logs an error message
   * @param message - Error message
   * @param context - Additional context (error object can be passed)
   */
  error(message: string, context?: LogContext): LogResult | null {
    if (!this.shouldLog(LogLevel.ERROR)) {
      return null
    }

    const formatted = this.formatMessage(LogLevel.ERROR, message, context)
    
    if (this.config.consoleOutput) {
      console.error(formatted)
    }

    this.config.customHandler?.(LogLevel.ERROR, formatted, context)

    return {
      level: LogLevel.ERROR,
      message: formatted,
      timestamp: new Date(),
      context: this.sanitize(context),
    }
  }

  /**
   * Logs an error with stack trace
   * @param error - Error object
   * @param context - Additional context
   */
  errorWithStack(error: unknown, context?: LogContext): LogResult | null {
    if (!this.shouldLog(LogLevel.ERROR)) {
      return null
    }

    const errorObj = error instanceof Error ? error : new Error(String(error))
    
    const sanitizedContext = {
      ...context,
      error: {
        name: errorObj.name,
        message: errorObj.message,
        // Don't log the full stack in production
        stack: this.config.isProduction ? undefined : errorObj.stack,
      },
    }

    const formatted = this.formatMessage(
      LogLevel.ERROR,
      errorObj.message,
      sanitizedContext
    )
    
    if (this.config.consoleOutput) {
      console.error(formatted)
    }

    this.config.customHandler?.(LogLevel.ERROR, formatted, sanitizedContext)

    return {
      level: LogLevel.ERROR,
      message: formatted,
      timestamp: new Date(),
      context: this.sanitize(sanitizedContext),
    }
  }

  /**
   * Adds additional sensitive keys to redact
   * @param keys - Keys to add to the sensitive list
   */
  addSensitiveKeys(keys: string[]): void {
    this.config.sensitiveKeys = [...new Set([...this.config.sensitiveKeys, ...keys.map(k => k.toLowerCase())])]
  }

  /**
   * Temporarily increases log level for debugging
   * @param durationMs - Duration in milliseconds
   */
  async debugMode(durationMs = 5000): Promise<void> {
    const originalLevel = this.config.level
    this.config.level = LogLevel.DEBUG
    
    // Restore original level after duration
    await new Promise(resolve => setTimeout(resolve, durationMs))
    this.config.level = originalLevel
  }

  /**
   * Gets the current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config }
  }

  /**
   * Updates the logger configuration
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

/**
 * Pre-configured logger instances for different parts of the application
 */

// Default logger configuration
const defaultConfig: LoggerConfig = {
  level: import.meta.env.PROD ? LogLevel.WARN : LogLevel.DEBUG,
  consoleOutput: true,
  isProduction: import.meta.env.PROD,
  sensitiveKeys: DEFAULT_SENSITIVE_KEYS,
}

/**
 * Root logger for the application
 * Use this for top-level application logging
 */
export const logger = new Logger('Memory', defaultConfig)

/**
 * Logger for API-related operations
 * Automatically redacts auth tokens, URLs, and request/response data
 */
export const apiLogger = new Logger('Memory.API', {
  ...defaultConfig,
  sensitiveKeys: [
    ...DEFAULT_SENSITIVE_KEYS,
    'request',
    'response',
    'headers',
    'payload',
    'data',
    'query',
    'params',
    'body',
  ],
})

/**
 * Logger for authentication-related operations
 * Maximum sensitivity - redacts almost everything
 */
export const authLogger = new Logger('Memory.Auth', {
  ...defaultConfig,
  // In production, auth logger only logs errors
  level: import.meta.env.PROD ? LogLevel.ERROR : LogLevel.DEBUG,
})

/**
 * Logger for UI-related operations
 * Logs component lifecycle, interactions, etc.
 */
export const uiLogger = new Logger('Memory.UI', defaultConfig)

/**
 * Logger for platform-related operations
 * Logs platform detection, capabilities, etc.
 */
export const platformLogger = new Logger('Memory.Platform', defaultConfig)

/**
 * Logger for store-related operations
 * Logs state changes, actions, mutations
 */
export const storeLogger = new Logger('Memory.Store', defaultConfig)

/**
 * Logger for network operations
 * Logs network status, connectivity, etc.
 */
export const networkLogger = new Logger('Memory.Network', defaultConfig)

/**
 * Utility functions for one-off logging without creating a logger instance
 */

/**
 * Logs a debug message directly
 * @param message - Debug message
 * @param context - Additional context
 */
export function debug(message: string, context?: LogContext): LogResult | null {
  return logger.debug(message, context)
}

/**
 * Logs an info message directly
 * @param message - Info message
 * @param context - Additional context
 */
export function info(message: string, context?: LogContext): LogResult | null {
  return logger.info(message, context)
}

/**
 * Logs a warning message directly
 * @param message - Warning message
 * @param context - Additional context
 */
export function warn(message: string, context?: LogContext): LogResult | null {
  return logger.warn(message, context)
}

/**
 * Logs an error message directly
 * @param message - Error message
 * @param context - Additional context
 */
export function error(message: string, context?: LogContext): LogResult | null {
  return logger.error(message, context)
}

/**
 * Logs an error with stack trace directly
 * @param err - Error object
 * @param context - Additional context
 */
export function errorWithStack(err: unknown, context?: LogContext): LogResult | null {
  return logger.errorWithStack(err, context)
}

/**
 * Helper to create a module-specific logger
 * @param moduleName - Name of the module
 * @returns Configured logger instance
 */
export function createLogger(moduleName: string): Logger {
  return new Logger(`Memory.${moduleName}`, defaultConfig)
}

// Export types
export type { LoggerConfig, LogContext, LogResult }
