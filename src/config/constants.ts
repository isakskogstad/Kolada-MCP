/**
 * Configuration constants for Kolada API
 */

export const KOLADA_CONFIG = {
  BASE_URL: process.env.KOLADA_API_BASE_URL || 'https://api.kolada.se/v3',

  // Rate limiting
  MAX_REQUESTS_PER_SECOND: parseInt(process.env.KOLADA_RATE_LIMIT || '5'),
  MIN_REQUEST_INTERVAL: 200, // milliseconds (1000ms / 5 = 200ms)

  // Pagination
  DEFAULT_PER_PAGE: 5000,
  MAX_BATCH_SIZE: 25,

  // Timeouts
  REQUEST_TIMEOUT: parseInt(process.env.KOLADA_TIMEOUT || '30000'),

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 1000, // Start with 1 second

  // Caching
  CACHE_TTL: {
    MUNICIPALITIES: parseInt(process.env.KOLADA_CACHE_TTL || '86400') * 1000, // 24 hours
    KPI_CATALOG: 86400000, // 24 hours
    KPI_GROUPS: 86400000, // 24 hours
    INDIVIDUAL_KPI: 3600000, // 1 hour
    DATA: 300000, // 5 minutes
  },
} as const;

export const ERROR_MESSAGES = {
  NOT_FOUND: 'Resource not found',
  INVALID_INPUT: 'Invalid input parameters',
  API_ERROR: 'Kolada API error',
  RATE_LIMITED: 'Rate limit exceeded',
  NETWORK_ERROR: 'Network connection error',
} as const;

export const MUNICIPALITY_TYPES = {
  K: 'Kommun (Municipality)',
  L: 'Landsting/Region (County Council)',
  ALL: 'Alla (All types)',
} as const;
