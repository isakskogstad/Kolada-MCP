import { z } from 'zod';
import { koladaClient } from '../api/client.js';
import type { Municipality, MunicipalityGroup } from '../config/types.js';

/**
 * Municipality Tools - 4 tools for searching and retrieving municipality data
 */

export const municipalityTools = {
  /**
   * Search for municipalities (kommuner) or county councils (landsting)
   */
  search_municipalities: {
    description: 'Search for Swedish municipalities (kommuner) or county councils (landsting/regioner). Filter by name or type.',
    inputSchema: z.object({
      query: z.string().optional().describe('Search term to filter municipalities by name'),
      municipality_type: z
        .enum(['K', 'L', 'all'])
        .default('all')
        .describe('Type filter: K=Kommun (municipality), L=Landsting/Region (county council), all=both'),
    }),
    handler: async (args: any) => {
      const { query, municipality_type } = args;

      const params: Record<string, any> = {};
      if (query) params.title = query;
      if (municipality_type !== 'all') params.type = municipality_type;

      const municipalities = await koladaClient.fetchAllData<Municipality>('/municipality', params);

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
                  type_description: m.type === 'K' ? 'Kommun (Municipality)' : 'Landsting/Region (County Council)',
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
   * Get detailed information about a specific municipality
   */
  get_municipality: {
    description: 'Get detailed information about a specific municipality by its ID. Municipality IDs are 4-digit codes (e.g., "0180" for Stockholm).',
    inputSchema: z.object({
      municipality_id: z.string().describe('Municipality ID (4-digit code, e.g., "0180" for Stockholm)'),
    }),
    handler: async (args: any) => {
      const { municipality_id } = args;

      const response = await koladaClient.request<Municipality>(`/municipality/${municipality_id}`);

      if (response.values.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'NOT_FOUND',
                message: `Municipality with ID "${municipality_id}" not found`,
                suggestion: 'Use search_municipalities to find valid municipality IDs',
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.values[0], null, 2),
          },
        ],
      };
    },
  },

  /**
   * List municipality groups (e.g., metropolitan regions, coastal municipalities)
   */
  get_municipality_groups: {
    description: 'List municipality groups such as metropolitan regions, coastal municipalities, etc. Groups help compare similar municipalities.',
    inputSchema: z.object({
      query: z.string().optional().describe('Search term to filter groups by title'),
    }),
    handler: async (args: any) => {
      const { query } = args;

      const params: Record<string, any> = {};
      if (query) params.title = query;

      const groups = await koladaClient.fetchAllData<MunicipalityGroup>('/municipality_groups', params);

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
    },
  },

  /**
   * Get detailed information about a municipality group including members
   */
  get_municipality_group: {
    description: 'Get detailed information about a specific municipality group including all member municipalities. Useful for analyzing groups of similar municipalities.',
    inputSchema: z.object({
      group_id: z.string().describe('Municipality group ID'),
    }),
    handler: async (args: any) => {
      const { group_id } = args;

      const response = await koladaClient.request<MunicipalityGroup>(`/municipality_groups/${group_id}`);

      if (response.values.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'NOT_FOUND',
                message: `Municipality group with ID "${group_id}" not found`,
                suggestion: 'Use get_municipality_groups to find valid group IDs',
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.values[0], null, 2),
          },
        ],
      };
    },
  },
};
