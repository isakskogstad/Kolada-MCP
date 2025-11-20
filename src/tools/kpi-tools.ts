import { z } from 'zod';
import { koladaClient } from '../api/client.js';
import {
  createMcpError,
  KoladaErrorType,
  ERROR_MESSAGES,
  validateKpiId,
  validateBatchSize,
  handleApiError,
} from '../utils/errors.js';
import type { KPI, KPIGroup } from '../config/types.js';

/**
 * KPI Tools - 5 tools for searching and retrieving KPI data
 */

export const kpiTools = {
  /**
   * Search for KPIs by query, publication date, or operating area
   */
  search_kpis: {
    description: 'Search for KPIs (Key Performance Indicators) by query string, publication date, or operating area. Returns a list of KPIs matching the criteria.',
    inputSchema: z.object({
      query: z.string().optional().describe('Search term to filter KPIs by title'),
      publication_date: z.string().optional().describe('Filter by publication date (YYYY-MM-DD)'),
      operating_area: z.string().optional().describe('Filter by operating area (e.g., "Utbildning", "Hälso- och sjukvård")'),
      limit: z.number().max(100).default(20).describe('Maximum number of results to return (default: 20, max: 100)'),
    }),
    handler: async (args: any) => {
      const { query, publication_date, operating_area, limit } = args;

      const params: Record<string, any> = {};
      if (query) params.title = query;

      let kpis = await koladaClient.fetchAllData<KPI>('/kpi', params);

      // Client-side filtering for publication_date and operating_area
      if (publication_date) {
        kpis = kpis.filter((k) => k.publication_date === publication_date);
      }
      if (operating_area) {
        kpis = kpis.filter((k) => k.operating_area === operating_area);
      }

      // Limit results
      kpis = kpis.slice(0, limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                count: kpis.length,
                kpis: kpis.map((k) => ({
                  id: k.id,
                  title: k.title,
                  description: k.description,
                  operating_area: k.operating_area,
                  municipality_type: k.municipality_type,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },
  },

  /**
   * Get detailed information about a specific KPI
   */
  get_kpi: {
    description: 'Get detailed information about a specific KPI by its ID. Returns full KPI metadata including publication schedules and gender division info.',
    inputSchema: z.object({
      kpi_id: z.string().describe('KPI ID (e.g., "N15033")'),
    }),
    handler: async (args: any) => {
      const { kpi_id } = args;

      try {
        // Validate KPI ID format
        validateKpiId(kpi_id);

        const response = await koladaClient.request<KPI>(`/kpi/${kpi_id}`);

        if (response.values.length === 0) {
          const error = ERROR_MESSAGES.KPI_NOT_FOUND(kpi_id);
          throw createMcpError(KoladaErrorType.NOT_FOUND, error.message, {
            suggestion: error.suggestion,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.values[0], null, 2),
            },
          ],
        };
      } catch (error) {
        handleApiError(error, `get_kpi(${kpi_id})`);
      }
    },
  },

  /**
   * Get multiple KPIs by their IDs
   */
  get_kpis: {
    description: 'Get multiple KPIs by their IDs in a single request. Accepts up to 25 KPI IDs per call.',
    inputSchema: z.object({
      kpi_ids: z.array(z.string()).max(25).describe('Array of KPI IDs (max 25)'),
    }),
    handler: async (args: any) => {
      const { kpi_ids } = args;

      try {
        // Validate batch size
        validateBatchSize(kpi_ids, 25);

        // Validate each KPI ID format
        kpi_ids.forEach((id: string) => validateKpiId(id));

        const kpis = await koladaClient.batchRequest<KPI>('/kpi', kpi_ids);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: kpis.length,
                  kpis,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        handleApiError(error, 'get_kpis');
      }
    },
  },

  /**
   * List KPI groups with optional search query
   */
  get_kpi_groups: {
    description: 'List KPI groups (thematic collections of KPIs) with optional search query. Groups help organize KPIs by topic.',
    inputSchema: z.object({
      query: z.string().optional().describe('Search term to filter groups by title'),
    }),
    handler: async (args: any) => {
      const { query } = args;

      const params: Record<string, any> = {};
      if (query) params.title = query;

      const groups = await koladaClient.fetchAllData<KPIGroup>('/kpi_groups', params);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                count: groups.length,
                groups: groups.map((g) => ({
                  id: g.id,
                  title: g.title,
                  description: g.description,
                  member_count: g.members?.length || 0,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    },
  },

  /**
   * Get detailed information about a KPI group including member KPIs
   */
  get_kpi_group: {
    description: 'Get detailed information about a specific KPI group including all member KPIs. Useful for exploring related KPIs.',
    inputSchema: z.object({
      group_id: z.string().describe('KPI group ID'),
    }),
    handler: async (args: any) => {
      const { group_id } = args;

      try {
        const response = await koladaClient.request<KPIGroup>(`/kpi_groups/${group_id}`);

        if (response.values.length === 0) {
          const error = ERROR_MESSAGES.GROUP_NOT_FOUND(group_id, 'KPI');
          throw createMcpError(KoladaErrorType.NOT_FOUND, error.message, {
            suggestion: error.suggestion,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.values[0], null, 2),
            },
          ],
        };
      } catch (error) {
        handleApiError(error, `get_kpi_group(${group_id})`);
      }
    },
  },
};
