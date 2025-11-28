import { z } from 'zod';
import { koladaClient } from '../api/client.js';
import { logger } from '../utils/logger.js';
import type { OrganizationalUnit, ToolAnnotations, ToolResult } from '../config/types.js';

/**
 * Organizational Unit Tools - 3 tools for searching and retrieving OU data
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
const searchOuSchema = z.object({
  query: z.string().optional().describe('Sökterm för att filtrera enheter efter namn'),
  municipality: z.string().optional().describe('Filtrera efter kommun-ID (4-siffrig kod)'),
  ou_type: z.string().optional().describe('Filtrera efter OU-typ (t.ex. "V11" för förskola, "V15" för grundskola)'),
  limit: z.number().min(1).max(100).default(20).describe('Max antal resultat (standard: 20, max: 100)'),
});

const getOuSchema = z.object({
  ou_id: z.string().describe('Organisationsenhet-ID'),
});

const getOuTypesSchema = z.object({});

export const ouTools = {
  /**
   * Search for organizational units (schools, care facilities, etc.)
   */
  search_organizational_units: {
    description: 'Sök efter organisationsenheter som skolor, förskolor, äldreboenden etc. Filtrera efter namn, kommun eller typ.',
    inputSchema: searchOuSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof searchOuSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { query, municipality, ou_type, limit } = args;
      logger.toolCall('search_organizational_units', { query, municipality, ou_type, limit });

      try {
        const params: Record<string, string> = {};
        if (query) params.title = query;
        if (municipality) params.municipality = municipality;

        let units = await koladaClient.fetchAllData<OrganizationalUnit>('/ou', params);

        // Client-side filtering for ou_type
        if (ou_type) {
          units = units.filter((u) => u.id.startsWith(ou_type));
        }

        // Limit results
        const totalMatches = units.length;
        units = units.slice(0, limit);

        logger.toolResult('search_organizational_units', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: units.length,
                  total_matches: totalMatches,
                  truncated: totalMatches > limit,
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
      } catch (error) {
        logger.toolResult('search_organizational_units', false, Date.now() - startTime);
        throw error;
      }
    },
  },

  /**
   * Get detailed information about a specific organizational unit
   */
  get_organizational_unit: {
    description: 'Hämta detaljerad information om en specifik organisationsenhet via dess ID.',
    inputSchema: getOuSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof getOuSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { ou_id } = args;
      logger.toolCall('get_organizational_unit', { ou_id });

      try {
        const response = await koladaClient.request<OrganizationalUnit>(`/ou/${ou_id}`);

        if (response.values.length === 0) {
          logger.toolResult('get_organizational_unit', false, Date.now() - startTime);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'NOT_FOUND',
                  message: `Organisationsenhet med ID "${ou_id}" hittades inte`,
                  suggestion: 'Använd search_organizational_units för att hitta giltiga OU-ID:n',
                }),
              },
            ],
            isError: true,
          };
        }

        logger.toolResult('get_organizational_unit', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.values[0], null, 2),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('get_organizational_unit', false, Date.now() - startTime);
        throw error;
      }
    },
  },

  /**
   * Get list of available organizational unit types
   */
  get_ou_types: {
    description: 'Hämta en lista över vanliga organisationsenhetstyper och deras beskrivningar (t.ex. V11=Förskola, V15=Grundskola).',
    inputSchema: getOuTypesSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (): Promise<ToolResult> => {
      const startTime = Date.now();
      logger.toolCall('get_ou_types', {});

      const ouTypes = {
        V11: 'Förskola (Preschool)',
        V15: 'Grundskola (Primary School)',
        V16: 'Gymnasieskola (Upper Secondary School)',
        V17: 'Särskola (Special Needs School)',
        V18: 'Vuxenutbildning (Adult Education)',
        V21: 'Äldreboende (Elderly Care)',
        V31: 'Fritidshem (After-school Care)',
      };

      logger.toolResult('get_ou_types', true, Date.now() - startTime);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ou_types: ouTypes,
                note: 'Dessa är vanliga OU-typprefix. Använd search_organizational_units för att hitta faktiska enheter.',
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
