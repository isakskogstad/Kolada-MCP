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

  MUNICIPALITY_NOT_FOUND: (municipalityId: string) => ({
    message: `Municipality with ID "${municipalityId}" not found`,
    suggestion: 'Use search_municipalities to find valid municipality IDs. Municipality IDs are 4-digit codes.',
  }),

  OU_NOT_FOUND: (ouId: string) => ({
    message: `Organizational unit with ID "${ouId}" not found`,
    suggestion: 'Use search_organizational_units to find valid OU IDs. OU IDs start with "V" followed by 2 digits indicating type.',
  }),

  GROUP_NOT_FOUND: (groupId: string, type: 'KPI' | 'Municipality') => ({
    message: `${type} group with ID "${groupId}" not found`,
    suggestion: `Use get_${type.toLowerCase()}_groups to find valid group IDs.`,
  }),

  INVALID_MUNICIPALITY_OR_OU: () => ({
    message: 'Either municipality_id or ou_id must be provided, but not both',
    suggestion: 'Specify exactly one: municipality_id for municipal data, or ou_id for organizational unit data.',
  }),

  INVALID_KPI_ID_FORMAT: (kpiId: string) => ({
    message: `Invalid KPI ID format: "${kpiId}"`,
    suggestion: 'KPI IDs must start with "N" or "U" followed by exactly 5 digits (e.g., "N15033").',
  }),

  INVALID_MUNICIPALITY_ID_FORMAT: (municipalityId: string) => ({
    message: `Invalid municipality ID format: "${municipalityId}"`,
    suggestion: 'Municipality IDs must be exactly 4 digits (e.g., "0180" for Stockholm).',
  }),

  INVALID_OU_ID_FORMAT: (ouId: string) => ({
    message: `Invalid OU ID format: "${ouId}"`,
    suggestion: 'OU IDs must start with "V" followed by 2 digits indicating type, then more digits (e.g., "V1101234").',
  }),

  TOO_MANY_IDS: (count: number, max: number) => ({
    message: `Too many IDs provided: ${count}. Maximum allowed: ${max}`,
    suggestion: `Split your request into multiple calls, each with at most ${max} IDs.`,
  }),

  MISSING_REQUIRED_PARAM: (param: string) => ({
    message: `Required parameter missing: ${param}`,
    suggestion: `Please provide a value for ${param}.`,
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
 * Validate municipality ID format
 */
export function validateMunicipalityId(municipalityId: string): void {
  const municipalityPattern = /^\d{4}$/;
  if (!municipalityPattern.test(municipalityId)) {
    const error = ERROR_MESSAGES.INVALID_MUNICIPALITY_ID_FORMAT(municipalityId);
    throw createMcpError(KoladaErrorType.VALIDATION_ERROR, error.message, {
      suggestion: error.suggestion,
    });
  }
}

/**
 * Validate OU ID format
 */
export function validateOuId(ouId: string): void {
  const ouPattern = /^V\d{2,}/;
  if (!ouPattern.test(ouId)) {
    const error = ERROR_MESSAGES.INVALID_OU_ID_FORMAT(ouId);
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
