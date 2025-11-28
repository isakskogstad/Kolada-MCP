import { z } from 'zod';
import { koladaClient } from '../api/client.js';
import { dataCache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import {
  createMcpError,
  KoladaErrorType,
  ERROR_MESSAGES,
  validateKpiId,
  validateBatchSize,
  handleApiError,
} from '../utils/errors.js';
import type { KPI, KPIGroup, ToolAnnotations, ToolResult } from '../config/types.js';

/**
 * KPI Tools - 5 tools for searching and retrieving KPI data
 * All tools are read-only and idempotent (safe to call multiple times)
 * @version 2.1.0
 */

// Common annotations for read-only data retrieval tools
const READ_ONLY_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  destructiveHint: false,
  openWorldHint: false,
};

// Input schemas
const searchKpisSchema = z.object({
  query: z.string().optional().describe('Sökterm för att filtrera KPIs efter titel (svenska termer ger bäst resultat)'),
  publication_date: z.string().optional().describe('Filtrera efter publiceringsdatum (YYYY-MM-DD)'),
  operating_area: z.string().optional().describe('Filtrera efter verksamhetsområde (t.ex. "Utbildning", "Hälso- och sjukvård")'),
  limit: z.number().min(1).max(100).default(20).describe('Max antal resultat (standard: 20, max: 100)'),
});

const getKpiSchema = z.object({
  kpi_id: z.string().describe('KPI-ID (t.ex. "N15033")'),
});

const getKpisSchema = z.object({
  kpi_ids: z.array(z.string()).min(1).max(25).describe('Lista med KPI-ID:n (max 25)'),
});

const getKpiGroupsSchema = z.object({
  query: z.string().optional().describe('Sökterm för att filtrera grupper efter titel'),
});

const getKpiGroupSchema = z.object({
  group_id: z.string().describe('KPI-grupp ID'),
});

export const kpiTools = {
  /**
   * Search for KPIs by query, publication date, or operating area
   */
  search_kpis: {
    description: 'Sök efter nyckeltal (KPIs) med fritextsökning, publiceringsdatum eller verksamhetsområde. Returnerar en lista med matchande KPIs. Svenska söktermer ger bäst resultat.',
    inputSchema: searchKpisSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof searchKpisSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { query, publication_date, operating_area, limit } = args;
      logger.toolCall('search_kpis', { query, publication_date, operating_area, limit });

      try {
        // Use cached KPI catalog for better performance
        let kpis = await dataCache.getOrFetch(
          'kpi-catalog-full',
          () => koladaClient.fetchAllData<KPI>('/kpi'),
          86400000 // 24 hours
        );

        // Apply filters
        if (query) {
          const searchTerm = query.toLowerCase();
          kpis = kpis.filter(
            (k) =>
              k.title.toLowerCase().includes(searchTerm) ||
              k.description?.toLowerCase().includes(searchTerm) ||
              k.id.toLowerCase().includes(searchTerm)
          );
        }

        if (publication_date) {
          kpis = kpis.filter((k) => k.publication_date === publication_date);
        }

        if (operating_area) {
          const areaLower = operating_area.toLowerCase();
          kpis = kpis.filter((k) => k.operating_area?.toLowerCase().includes(areaLower));
        }

        // Limit results
        const totalMatches = kpis.length;
        kpis = kpis.slice(0, limit);

        logger.toolResult('search_kpis', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: kpis.length,
                  total_matches: totalMatches,
                  truncated: totalMatches > limit,
                  kpis: kpis.map((k) => ({
                    id: k.id,
                    title: k.title,
                    description: k.description,
                    operating_area: k.operating_area,
                    municipality_type: k.municipality_type,
                    has_ou_data: k.has_ou_data,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('search_kpis', false, Date.now() - startTime);
        throw error;
      }
    },
  },

  /**
   * Get detailed information about a specific KPI
   */
  get_kpi: {
    description: 'Hämta detaljerad information om ett specifikt nyckeltal (KPI) via dess ID. Returnerar fullständig metadata inklusive publiceringsdatum och könsuppdelning.',
    inputSchema: getKpiSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof getKpiSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { kpi_id } = args;
      logger.toolCall('get_kpi', { kpi_id });

      try {
        validateKpiId(kpi_id);

        const response = await koladaClient.request<KPI>(`/kpi/${kpi_id}`);

        if (response.values.length === 0) {
          const error = ERROR_MESSAGES.KPI_NOT_FOUND(kpi_id);
          throw createMcpError(KoladaErrorType.NOT_FOUND, error.message, {
            suggestion: error.suggestion,
          });
        }

        logger.toolResult('get_kpi', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.values[0], null, 2),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('get_kpi', false, Date.now() - startTime);
        handleApiError(error, `get_kpi(${kpi_id})`);
      }
    },
  },

  /**
   * Get multiple KPIs by their IDs
   */
  get_kpis: {
    description: 'Hämta flera nyckeltal (KPIs) via deras ID:n i en enda förfrågan. Accepterar upp till 25 KPI-ID:n per anrop.',
    inputSchema: getKpisSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof getKpisSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { kpi_ids } = args;
      logger.toolCall('get_kpis', { kpi_ids, count: kpi_ids.length });

      try {
        validateBatchSize(kpi_ids, 25);
        kpi_ids.forEach((id: string) => validateKpiId(id));

        const kpis = await koladaClient.batchRequest<KPI>('/kpi', kpi_ids);

        logger.toolResult('get_kpis', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  requested: kpi_ids.length,
                  found: kpis.length,
                  kpis,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('get_kpis', false, Date.now() - startTime);
        handleApiError(error, 'get_kpis');
      }
    },
  },

  /**
   * List KPI groups with optional search query
   */
  get_kpi_groups: {
    description: 'Lista KPI-grupper (tematiska samlingar av nyckeltal) med valfri sökning. Grupper hjälper till att organisera KPIs efter ämne.',
    inputSchema: getKpiGroupsSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof getKpiGroupsSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { query } = args;
      logger.toolCall('get_kpi_groups', { query });

      try {
        const params: Record<string, string> = {};
        if (query) params.title = query;

        const groups = await koladaClient.fetchAllData<KPIGroup>('/kpi_groups', params);

        logger.toolResult('get_kpi_groups', true, Date.now() - startTime);

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
      } catch (error) {
        logger.toolResult('get_kpi_groups', false, Date.now() - startTime);
        throw error;
      }
    },
  },

  /**
   * Get detailed information about a KPI group including member KPIs
   */
  get_kpi_group: {
    description: 'Hämta detaljerad information om en specifik KPI-grupp inklusive alla ingående nyckeltal. Användbar för att utforska relaterade KPIs.',
    inputSchema: getKpiGroupSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof getKpiGroupSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { group_id } = args;
      logger.toolCall('get_kpi_group', { group_id });

      try {
        const response = await koladaClient.request<KPIGroup>(`/kpi_groups/${group_id}`);

        if (response.values.length === 0) {
          const error = ERROR_MESSAGES.GROUP_NOT_FOUND(group_id, 'KPI');
          throw createMcpError(KoladaErrorType.NOT_FOUND, error.message, {
            suggestion: error.suggestion,
          });
        }

        logger.toolResult('get_kpi_group', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.values[0], null, 2),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('get_kpi_group', false, Date.now() - startTime);
        handleApiError(error, `get_kpi_group(${group_id})`);
      }
    },
  },
};
