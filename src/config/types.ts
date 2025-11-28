/**
 * Type definitions for Kolada API v3 and MCP Server
 * @version 2.1.0
 */

import { z } from 'zod';

// =============================================================================
// Kolada API Types
// =============================================================================

export interface KPI {
  id: string;
  title: string;
  description: string;
  operating_area: string;
  prel_publication_date?: string;
  publication_date?: string;
  ou_publication_date?: string;
  is_divided_by_gender: boolean;
  has_ou_data: boolean;
  municipality_type: 'K' | 'L' | 'alla';
  auspices?: string;
  publ_period?: string;
}

export interface Municipality {
  id: string;
  title: string;
  type: 'K' | 'L';
}

export interface MunicipalityGroup {
  id: string;
  title: string;
  members?: string[];
}

export interface KPIGroup {
  id: string;
  title: string;
  description?: string;
  members?: string[];
}

export interface OrganizationalUnit {
  id: string;
  title: string;
  municipality: string;
  ou_type?: string;
}

export interface DataPoint {
  period: number;
  value: number;
  gender?: 'M' | 'K' | 'T';
  status?: string;
  count?: number;
}

export interface KPIData {
  kpi: string;
  municipality?: string;
  ou?: string;
  values: DataPoint[];
}

export interface KoladaResponse<T> {
  values: T[];
  count: number;
  next_page?: string;
  previous_page?: string;
}

// =============================================================================
// MCP Tool Annotations (2024-11-05 spec)
// =============================================================================

/**
 * Tool annotations provide hints about tool behavior to help LLMs
 * make better decisions about when and how to use tools.
 */
export interface ToolAnnotations {
  /**
   * If true, the tool does not modify any state (safe to call multiple times)
   */
  readOnlyHint?: boolean;

  /**
   * If true, calling the tool multiple times with same args gives same result
   */
  idempotentHint?: boolean;

  /**
   * If true, the tool may perform destructive operations
   */
  destructiveHint?: boolean;

  /**
   * If true, the tool interacts with the real world (not just data retrieval)
   */
  openWorldHint?: boolean;
}

/**
 * Standard MCP tool result
 */
export interface ToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  }>;
  isError?: boolean;
}

// =============================================================================
// Logger Types
// =============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

// =============================================================================
// Cache Types
// =============================================================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  total: number;
  valid: number;
  expired: number;
  size_bytes: number;
}
