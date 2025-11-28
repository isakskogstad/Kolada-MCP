/**
 * Structured logging utility for Kolada MCP Server
 * @version 2.1.0
 */

import type { LogLevel, LogEntry } from '../config/types.js';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private minLevel: LogLevel;
  private serviceName: string;

  constructor(serviceName: string = 'kolada-mcp', minLevel: LogLevel = 'info') {
    this.serviceName = serviceName;
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatEntry(entry: LogEntry): string {
    const base = {
      timestamp: entry.timestamp,
      level: entry.level.toUpperCase(),
      service: this.serviceName,
      message: entry.message,
      ...entry.context,
    };
    return JSON.stringify(base);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    // Use stderr for all logs (stdout reserved for MCP protocol)
    const output = this.formatEntry(entry);

    if (level === 'error') {
      console.error(output);
    } else {
      console.error(output);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  /**
   * Log an API request
   */
  apiRequest(endpoint: string, params?: Record<string, unknown>): void {
    this.debug('API request', { endpoint, params });
  }

  /**
   * Log an API response
   */
  apiResponse(endpoint: string, status: number, duration: number): void {
    this.debug('API response', { endpoint, status, duration_ms: duration });
  }

  /**
   * Log a tool call
   */
  toolCall(toolName: string, args: Record<string, unknown>): void {
    this.info('Tool called', { tool: toolName, args });
  }

  /**
   * Log a tool result
   */
  toolResult(toolName: string, success: boolean, duration: number): void {
    this.info('Tool completed', { tool: toolName, success, duration_ms: duration });
  }

  /**
   * Log cache operations
   */
  cacheHit(key: string): void {
    this.debug('Cache hit', { key });
  }

  cacheMiss(key: string): void {
    this.debug('Cache miss', { key });
  }

  cacheSet(key: string, ttl: number): void {
    this.debug('Cache set', { key, ttl_ms: ttl });
  }
}

// Singleton instance
export const logger = new Logger();
