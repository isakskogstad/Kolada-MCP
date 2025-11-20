import { z } from 'zod';
import { koladaClient } from '../api/client.js';
import type { OrganizationalUnit } from '../config/types.js';

/**
 * Organizational Unit Tools - 3 tools for searching and retrieving OU data
 */

export const ouTools = {
  /**
   * Search for organizational units (schools, care facilities, etc.)
   */
  search_organizational_units: {
    description: 'Search for organizational units such as schools, preschools, care facilities, etc. Filter by name, municipality, or type.',
    inputSchema: z.object({
      query: z.string().optional().describe('Search term to filter units by name'),
      municipality: z.string().optional().describe('Filter by municipality ID (4-digit code)'),
      ou_type: z.string().optional().describe('Filter by OU type prefix (e.g., "V11" for preschools, "V15" for primary schools)'),
      limit: z.number().max(100).default(20).describe('Maximum number of results (default: 20, max: 100)'),
    }),
    handler: async (args: any) => {
      const { query, municipality, ou_type, limit } = args;

      const params: Record<string, any> = {};
      if (query) params.title = query;
      if (municipality) params.municipality = municipality;

      let units = await koladaClient.fetchAllData<OrganizationalUnit>('/ou', params);

      // Client-side filtering for ou_type
      if (ou_type) {
        units = units.filter((u) => u.id.startsWith(ou_type));
      }

      // Limit results
      units = units.slice(0, limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                count: units.length,
                organizational_units: units.map((u) => ({
                  id: u.id,
                  title: u.title,
                  municipality: u.municipality,
                  ou_type: u.ou_type,
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
   * Get detailed information about a specific organizational unit
   */
  get_organizational_unit: {
    description: 'Get detailed information about a specific organizational unit by its ID.',
    inputSchema: z.object({
      ou_id: z.string().describe('Organizational unit ID'),
    }),
    handler: async (args: any) => {
      const { ou_id } = args;

      const response = await koladaClient.request<OrganizationalUnit>(`/ou/${ou_id}`);

      if (response.values.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'NOT_FOUND',
                message: `Organizational unit with ID "${ou_id}" not found`,
                suggestion: 'Use search_organizational_units to find valid OU IDs',
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
   * Get list of available organizational unit types
   */
  get_ou_types: {
    description: 'Get a list of common organizational unit types and their descriptions (e.g., V11=Preschool, V15=Primary School).',
    inputSchema: z.object({}),
    handler: async () => {
      const ouTypes = {
        V11: 'Förskola (Preschool)',
        V15: 'Grundskola (Primary School)',
        V16: 'Gymnasieskola (Upper Secondary School)',
        V17: 'Särskola (Special Needs School)',
        V18: 'Vuxenutbildning (Adult Education)',
        V21: 'Äldreboende (Elderly Care)',
        V31: 'Fritidshem (After-school Care)',
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ou_types: ouTypes,
                note: 'These are common OU type prefixes. Use search_organizational_units to find actual units.',
              },
              null,
              2
            ),
          },
        ],
      };
    },
  },
};
