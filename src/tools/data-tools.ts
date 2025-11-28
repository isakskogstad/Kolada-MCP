import { z } from 'zod';
import { koladaClient } from '../api/client.js';
import { logger } from '../utils/logger.js';
import type { KPIData, ToolAnnotations, ToolResult } from '../config/types.js';

/**
 * Data Retrieval Tools - 4 tools for fetching actual KPI data
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
const getKpiDataSchema = z.object({
  kpi_id: z.string().describe('KPI-ID för att hämta data'),
  municipality_id: z.string().optional().describe('Kommun-ID (använd detta ELLER ou_id, inte båda)'),
  ou_id: z.string().optional().describe('Organisationsenhet-ID (använd detta ELLER municipality_id, inte båda)'),
  years: z.array(z.number()).optional().describe('Filtrera efter specifika år (t.ex. [2020, 2021, 2022])'),
});

const getMunicipalityKpisSchema = z.object({
  municipality_id: z.string().describe('Kommun-ID (4-siffrig kod)'),
  year: z.number().optional().describe('Filtrera efter specifikt år'),
});

const compareMunicipalitiesSchema = z.object({
  kpi_id: z.string().describe('KPI-ID att jämföra'),
  municipality_ids: z
    .array(z.string())
    .min(2)
    .max(10)
    .describe('Lista med kommun-ID:n att jämföra (2-10 kommuner)'),
  years: z.array(z.number()).optional().describe('Specifika år att inkludera i jämförelsen'),
});

const getKpiTrendSchema = z.object({
  kpi_id: z.string().describe('KPI-ID att analysera'),
  municipality_id: z.string().describe('Kommun-ID'),
  start_year: z.number().describe('Startår för trendanalysen'),
  end_year: z.number().optional().describe('Slutår (standard: innevarande år)'),
});

export const dataTools = {
  /**
   * Retrieve actual KPI data for municipalities or OUs
   */
  get_kpi_data: {
    description: 'Hämta faktiska KPI-datavärden för specifika kommuner eller organisationsenheter. Kan filtrera efter år.',
    inputSchema: getKpiDataSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof getKpiDataSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { kpi_id, municipality_id, ou_id, years } = args;
      logger.toolCall('get_kpi_data', { kpi_id, municipality_id, ou_id, years });

      if (!municipality_id && !ou_id) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'INVALID_INPUT',
                message: 'Antingen municipality_id eller ou_id måste anges',
                suggestion: 'Ange municipality_id för kommundata eller ou_id för organisationsenhetsdata',
              }),
            },
          ],
          isError: true,
        };
      }

      try {
        const params: Record<string, string> = { kpi: kpi_id };
        if (municipality_id) params.municipality = municipality_id;
        if (ou_id) params.ou = ou_id;
        if (years) params.year = years.join(',');

        const endpoint = ou_id ? '/oudata' : '/data';
        const data = await koladaClient.fetchAllData<KPIData>(endpoint, params);

        logger.toolResult('get_kpi_data', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  kpi_id,
                  entity_id: municipality_id || ou_id,
                  entity_type: municipality_id ? 'kommun' : 'organisationsenhet',
                  data_points: data,
                  source: 'Kolada - Källa: Kolada',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('get_kpi_data', false, Date.now() - startTime);
        throw error;
      }
    },
  },

  /**
   * Get all available KPIs for a specific municipality
   */
  get_municipality_kpis: {
    description: 'Hämta en lista över alla KPIs som har tillgänglig data för en specifik kommun. Valfritt filtrera efter år.',
    inputSchema: getMunicipalityKpisSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof getMunicipalityKpisSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { municipality_id, year } = args;
      logger.toolCall('get_municipality_kpis', { municipality_id, year });

      try {
        const params: Record<string, string | number> = { municipality: municipality_id };
        if (year) params.year = year;

        const data = await koladaClient.fetchAllData<KPIData>('/data', params);

        // Extract unique KPI IDs
        const kpiIds = [...new Set(data.map((d) => d.kpi))];

        logger.toolResult('get_municipality_kpis', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  municipality_id,
                  year: year || 'alla',
                  available_kpis: kpiIds,
                  kpi_count: kpiIds.length,
                  note: 'Använd get_kpi för detaljer om varje KPI, eller get_kpi_data för att hämta faktiska värden',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('get_municipality_kpis', false, Date.now() - startTime);
        throw error;
      }
    },
  },

  /**
   * Compare a KPI across multiple municipalities
   */
  compare_municipalities: {
    description: 'Jämför ett specifikt nyckeltal över flera kommuner för angivna år. Utmärkt för benchmarking.',
    inputSchema: compareMunicipalitiesSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof compareMunicipalitiesSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { kpi_id, municipality_ids, years } = args;
      logger.toolCall('compare_municipalities', { kpi_id, municipality_ids, years });

      try {
        interface ComparisonEntry {
          municipality_id: string;
          data: KPIData[];
        }

        const comparison: {
          kpi_id: string;
          municipalities: ComparisonEntry[];
        } = {
          kpi_id,
          municipalities: [],
        };

        // Fetch data for all municipalities in parallel for better performance
        const promises = municipality_ids.map(async (municipality_id) => {
          const params: Record<string, string> = {
            kpi: kpi_id,
            municipality: municipality_id,
          };
          if (years) params.year = years.join(',');

          const data = await koladaClient.fetchAllData<KPIData>('/data', params);

          return {
            municipality_id,
            data,
          };
        });

        comparison.municipalities = await Promise.all(promises);

        logger.toolResult('compare_municipalities', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ...comparison,
                  source: 'Kolada - Källa: Kolada',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('compare_municipalities', false, Date.now() - startTime);
        throw error;
      }
    },
  },

  /**
   * Get historical trend data for a KPI
   */
  get_kpi_trend: {
    description: 'Hämta historisk trenddata för ett nyckeltal som visar förändringar över tid. Användbart för att analysera utveckling och identifiera trender.',
    inputSchema: getKpiTrendSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof getKpiTrendSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { kpi_id, municipality_id, start_year, end_year } = args;
      logger.toolCall('get_kpi_trend', { kpi_id, municipality_id, start_year, end_year });

      try {
        const endYr = end_year || new Date().getFullYear();
        const years = Array.from({ length: endYr - start_year + 1 }, (_, i) => start_year + i);

        const params: Record<string, string> = {
          kpi: kpi_id,
          municipality: municipality_id,
          year: years.join(','),
        };

        const data = await koladaClient.fetchAllData<KPIData>('/data', params);

        // Calculate year-over-year changes if data exists
        const trend = data.map((d, index) => {
          const previousValue = index > 0 ? data[index - 1].values[0]?.value : null;
          const currentValue = d.values[0]?.value;
          const change =
            previousValue && currentValue
              ? ((currentValue - previousValue) / previousValue) * 100
              : null;

          return {
            ...d,
            year_over_year_change_percent: change ? parseFloat(change.toFixed(2)) : null,
          };
        });

        logger.toolResult('get_kpi_trend', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  kpi_id,
                  municipality_id,
                  period: `${start_year}-${endYr}`,
                  trend_data: trend,
                  source: 'Kolada - Källa: Kolada',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('get_kpi_trend', false, Date.now() - startTime);
        throw error;
      }
    },
  },
};
