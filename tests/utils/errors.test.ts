import { describe, it, expect } from 'vitest';
import {
  createMcpError,
  KoladaErrorType,
  validateKpiId,
  validateBatchSize,
} from '../../src/utils/errors';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

describe('Error Utilities', () => {
  describe('createMcpError', () => {
    it('should create MCP error with correct type', () => {
      const error = createMcpError(
        KoladaErrorType.NOT_FOUND,
        'Resource not found'
      );

      expect(error).toBeInstanceOf(McpError);
      expect(error.code).toBe(ErrorCode.InvalidRequest);
      expect(error.message).toContain('NOT_FOUND');
      expect(error.message).toContain('Resource not found');
    });

    it('should include details in error', () => {
      const details = { kpi_id: 'N15033' };
      const error = createMcpError(
        KoladaErrorType.NOT_FOUND,
        'KPI not found',
        details
      );

      expect(error.data).toEqual(details);
    });
  });

  describe('validateKpiId', () => {
    it('should accept valid KPI IDs', () => {
      expect(() => validateKpiId('N15033')).not.toThrow();
      expect(() => validateKpiId('U00001')).not.toThrow();
    });

    it('should reject invalid KPI IDs', () => {
      expect(() => validateKpiId('12345')).toThrow(McpError);
      expect(() => validateKpiId('N123')).toThrow(McpError);
      expect(() => validateKpiId('X15033')).toThrow(McpError);
      expect(() => validateKpiId('')).toThrow(McpError);
    });
  });

  describe('validateBatchSize', () => {
    it('should accept arrays within limit', () => {
      expect(() => validateBatchSize(['1', '2', '3'], 5)).not.toThrow();
      expect(() => validateBatchSize([], 5)).not.toThrow();
    });

    it('should reject arrays exceeding limit', () => {
      const largeArray = Array(26).fill('item');
      expect(() => validateBatchSize(largeArray, 25)).toThrow(McpError);
    });
  });
});
