/**
 * Error handling utilities for MCP server
 *
 * Provides standardized error codes and messages following MCP protocol.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Kolada-specific error types
 */
export enum KoladaErrorType {
  NOT_FOUND = 'NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  API_ERROR = 'API_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * Create standardized MCP error
 */
export function createMcpError(
  type: KoladaErrorType,
  message: string,
  details?: any
): McpError {
  // Map Kolada error types to MCP error codes
  const errorCodeMap: Record<KoladaErrorType, ErrorCode> = {
    [KoladaErrorType.NOT_FOUND]: ErrorCode.InvalidRequest,
    [KoladaErrorType.INVALID_INPUT]: ErrorCode.InvalidParams,
    [KoladaErrorType.API_ERROR]: ErrorCode.InternalError,
    [KoladaErrorType.RATE_LIMITED]: ErrorCode.InternalError,
    [KoladaErrorType.NETWORK_ERROR]: ErrorCode.InternalError,
    [KoladaErrorType.VALIDATION_ERROR]: ErrorCode.InvalidParams,
  };

  const errorCode = errorCodeMap[type] || ErrorCode.InternalError;

  return new McpError(
    errorCode,
    `${type}: ${message}`,
    details
  );
}

/**
 * Error messages with suggestions
 */
export const ERROR_MESSAGES = {
  KPI_NOT_FOUND: (kpiId: string) => ({
    message: `KPI with ID "${kpiId}" not found`,
    suggestion: 'Use search_kpis to find valid KPI IDs. KPI IDs start with "N" or "U" followed by 5 digits.',
  }),

  GROUP_NOT_FOUND: (groupId: string, type: 'KPI' | 'Municipality') => ({
    message: `${type} group with ID "${groupId}" not found`,
    suggestion: `Use get_${type.toLowerCase()}_groups to find valid group IDs.`,
  }),

  INVALID_KPI_ID_FORMAT: (kpiId: string) => ({
    message: `Invalid KPI ID format: "${kpiId}"`,
    suggestion: 'KPI IDs must start with "N" or "U" followed by exactly 5 digits (e.g., "N15033").',
  }),

  TOO_MANY_IDS: (count: number, max: number) => ({
    message: `Too many IDs provided: ${count}. Maximum allowed: ${max}`,
    suggestion: `Split your request into multiple calls, each with at most ${max} IDs.`,
  }),

  API_RATE_LIMITED: () => ({
    message: 'API rate limit exceeded',
    suggestion: 'The request will be automatically retried with exponential backoff. If this persists, reduce request frequency.',
  }),

  NETWORK_ERROR: (details: string) => ({
    message: `Network error: ${details}`,
    suggestion: 'Check your internet connection and try again. If the problem persists, the Kolada API may be temporarily unavailable.',
  }),
};

/**
 * Validate KPI ID format
 */
export function validateKpiId(kpiId: string): void {
  const kpiPattern = /^[NU]\d{5}$/;
  if (!kpiPattern.test(kpiId)) {
    const error = ERROR_MESSAGES.INVALID_KPI_ID_FORMAT(kpiId);
    throw createMcpError(KoladaErrorType.VALIDATION_ERROR, error.message, {
      suggestion: error.suggestion,
    });
  }
}


/**
 * Validate batch size
 */
export function validateBatchSize(ids: string[], maxSize: number): void {
  if (ids.length > maxSize) {
    const error = ERROR_MESSAGES.TOO_MANY_IDS(ids.length, maxSize);
    throw createMcpError(KoladaErrorType.VALIDATION_ERROR, error.message, {
      suggestion: error.suggestion,
    });
  }
}

/**
 * Handle API errors and convert to MCP errors
 */
export function handleApiError(error: any, context?: string): never {
  if (error instanceof McpError) {
    throw error;
  }

  const contextPrefix = context ? `${context}: ` : '';

  if (error.response?.status === 404) {
    throw createMcpError(
      KoladaErrorType.NOT_FOUND,
      `${contextPrefix}Resource not found`,
      { originalError: error.message }
    );
  }

  if (error.response?.status === 429) {
    const apiError = ERROR_MESSAGES.API_RATE_LIMITED();
    throw createMcpError(
      KoladaErrorType.RATE_LIMITED,
      `${contextPrefix}${apiError.message}`,
      { suggestion: apiError.suggestion }
    );
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    const netError = ERROR_MESSAGES.NETWORK_ERROR(error.message);
    throw createMcpError(
      KoladaErrorType.NETWORK_ERROR,
      `${contextPrefix}${netError.message}`,
      { suggestion: netError.suggestion }
    );
  }

  // Generic error
  throw createMcpError(
    KoladaErrorType.API_ERROR,
    `${contextPrefix}${error.message || 'Unknown error occurred'}`,
    { originalError: error }
  );
}
