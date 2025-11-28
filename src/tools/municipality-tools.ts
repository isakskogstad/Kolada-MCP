import { z } from 'zod';
import { koladaClient } from '../api/client.js';
import { dataCache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import type { Municipality, MunicipalityGroup, ToolAnnotations, ToolResult } from '../config/types.js';

/**
 * Municipality Tools - 4 tools for searching and retrieving municipality data
 * All tools are read-only and idempotent
 * @version 2.1.0
 */

const READ_ONLY_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  destructiveHint: false,
  openWorldHint: false,
};

// Input schemas
const searchMunicipalitiesSchema = z.object({
  query: z.string().optional().describe('Sökterm för att filtrera kommuner efter namn'),
  municipality_type: z
    .enum(['K', 'L', 'all'])
    .default('all')
    .describe('Typfilter: K=Kommun, L=Landsting/Region, all=båda'),
});

const getMunicipalitySchema = z.object({
  municipality_id: z.string().describe('Kommun-ID (4-siffrig kod, t.ex. "0180" för Stockholm)'),
});

const getMunicipalityGroupsSchema = z.object({
  query: z.string().optional().describe('Sökterm för att filtrera grupper efter titel'),
});

const getMunicipalityGroupSchema = z.object({
  group_id: z.string().describe('Kommungrupp-ID'),
});

export const municipalityTools = {
  /**
   * Search for municipalities (kommuner) or county councils (landsting)
   */
  search_municipalities: {
    description: 'Sök efter svenska kommuner eller regioner (landsting). Filtrera efter namn eller typ. Det finns 290 kommuner och 21 regioner i Sverige.',
    inputSchema: searchMunicipalitiesSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof searchMunicipalitiesSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { query, municipality_type } = args;
      logger.toolCall('search_municipalities', { query, municipality_type });

      try {
        // Use cached municipality list
        let municipalities = await dataCache.getOrFetch(
          'municipalities-full',
          () => koladaClient.fetchAllData<Municipality>('/municipality'),
          86400000 // 24 hours
        );

        // Apply filters
        if (query) {
          const searchTerm = query.toLowerCase();
          municipalities = municipalities.filter(
            (m) =>
              m.title.toLowerCase().includes(searchTerm) ||
              m.id.includes(searchTerm)
          );
        }

        if (municipality_type !== 'all') {
          municipalities = municipalities.filter((m) => m.type === municipality_type);
        }

        logger.toolResult('search_municipalities', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: municipalities.length,
                  municipalities: municipalities.map((m) => ({
                    id: m.id,
                    title: m.title,
                    type: m.type,
                    type_description: m.type === 'K' ? 'Kommun' : 'Region',
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('search_municipalities', false, Date.now() - startTime);
        throw error;
      }
    },
  },

  /**
   * Get detailed information about a specific municipality
   */
  get_municipality: {
    description: 'Hämta detaljerad information om en specifik kommun via dess ID. Kommun-ID är 4-siffriga koder (t.ex. "0180" för Stockholm, "1480" för Göteborg).',
    inputSchema: getMunicipalitySchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof getMunicipalitySchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { municipality_id } = args;
      logger.toolCall('get_municipality', { municipality_id });

      try {
        const response = await koladaClient.request<Municipality>(`/municipality/${municipality_id}`);

        if (response.values.length === 0) {
          logger.toolResult('get_municipality', false, Date.now() - startTime);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'NOT_FOUND',
                  message: `Kommun med ID "${municipality_id}" hittades inte`,
                  suggestion: 'Använd search_municipalities för att hitta giltiga kommun-ID:n',
                }),
              },
            ],
            isError: true,
          };
        }

        logger.toolResult('get_municipality', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.values[0], null, 2),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('get_municipality', false, Date.now() - startTime);
        throw error;
      }
    },
  },

  /**
   * List municipality groups (e.g., metropolitan regions, coastal municipalities)
   */
  get_municipality_groups: {
    description: 'Lista kommungrupper som storstadsregioner, kustkommuner etc. Grupper hjälper till att jämföra liknande kommuner.',
    inputSchema: getMunicipalityGroupsSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof getMunicipalityGroupsSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { query } = args;
      logger.toolCall('get_municipality_groups', { query });

      try {
        const params: Record<string, string> = {};
        if (query) params.title = query;

        const groups = await koladaClient.fetchAllData<MunicipalityGroup>('/municipality_groups', params);

        logger.toolResult('get_municipality_groups', true, Date.now() - startTime);

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
        logger.toolResult('get_municipality_groups', false, Date.now() - startTime);
        throw error;
      }
    },
  },

  /**
   * Get detailed information about a municipality group including members
   */
  get_municipality_group: {
    description: 'Hämta detaljerad information om en specifik kommungrupp inklusive alla medlemskommuner. Användbar för att analysera grupper av liknande kommuner.',
    inputSchema: getMunicipalityGroupSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof getMunicipalityGroupSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { group_id } = args;
      logger.toolCall('get_municipality_group', { group_id });

      try {
        const response = await koladaClient.request<MunicipalityGroup>(`/municipality_groups/${group_id}`);

        if (response.values.length === 0) {
          logger.toolResult('get_municipality_group', false, Date.now() - startTime);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'NOT_FOUND',
                  message: `Kommungrupp med ID "${group_id}" hittades inte`,
                  suggestion: 'Använd get_municipality_groups för att hitta giltiga grupp-ID:n',
                }),
              },
            ],
            isError: true,
          };
        }

        logger.toolResult('get_municipality_group', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.values[0], null, 2),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('get_municipality_group', false, Date.now() - startTime);
        throw error;
      }
    },
  },
};
