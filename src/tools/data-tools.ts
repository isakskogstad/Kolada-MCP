import { z } from 'zod';
import { koladaClient } from '../api/client.js';
import { logger } from '../utils/logger.js';
import type { KPIData, ToolAnnotations, ToolResult } from '../config/types.js';

/**
 * Data Retrieval Tools - 4 tools for fetching actual KPI data
 * All tools are read-only and idempotent
 * Now with gender filtering support (T/M/K)
 * @version 2.2.0
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
  gender: z.enum(['T', 'M', 'K', 'all']).default('all').describe('Könsfilter: T=Totalt, M=Män, K=Kvinnor, all=visa alla'),
});

const getMunicipalityKpisSchema = z.object({
  municipality_id: z.string().describe('Kommun-ID (4-siffrig kod)'),
  year: z.number().describe('År att hämta KPIs för (obligatoriskt för att undvika timeout)'),
});

const compareMunicipalitiesSchema = z.object({
  kpi_id: z.string().describe('KPI-ID att jämföra'),
  municipality_ids: z
    .array(z.string())
    .min(2)
    .max(10)
    .describe('Lista med kommun-ID:n att jämföra (2-10 kommuner)'),
  years: z.array(z.number()).optional().describe('Specifika år att inkludera i jämförelsen'),
  gender: z.enum(['T', 'M', 'K', 'all']).default('all').describe('Könsfilter: T=Totalt, M=Män, K=Kvinnor, all=visa alla'),
});

const getKpiTrendSchema = z.object({
  kpi_id: z.string().describe('KPI-ID att analysera'),
  municipality_id: z.string().describe('Kommun-ID'),
  start_year: z.number().describe('Startår för trendanalysen'),
  end_year: z.number().optional().describe('Slutår (standard: innevarande år)'),
  gender: z.enum(['T', 'M', 'K', 'all']).default('all').describe('Könsfilter: T=Totalt, M=Män, K=Kvinnor, all=visa alla'),
});

/**
 * Helper function to filter data points by gender
 */
function filterByGender(data: KPIData[], gender: 'T' | 'M' | 'K' | 'all'): KPIData[] {
  if (gender === 'all') return data;

  return data.map(d => ({
    ...d,
    values: d.values.filter(v => v.gender === gender || (!v.gender && gender === 'T'))
  })).filter(d => d.values.length > 0);
}

export const dataTools = {
  /**
   * Retrieve actual KPI data for municipalities or OUs
   */
  get_kpi_data: {
    description: 'Hämta faktiska KPI-datavärden för specifika kommuner eller organisationsenheter. Kan filtrera efter år och kön (T=Totalt, M=Män, K=Kvinnor).',
    inputSchema: getKpiDataSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof getKpiDataSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { kpi_id, municipality_id, ou_id, years, gender } = args;
      logger.toolCall('get_kpi_data', { kpi_id, municipality_id, ou_id, years, gender });

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
        // Kolada API v3 uses path-based URLs for data
        let endpoint: string;
        if (ou_id) {
          endpoint = `/oudata/kpi/${kpi_id}/ou/${ou_id}`;
          if (years && years.length > 0) {
            endpoint += `/year/${years.join(',')}`;
          }
        } else if (municipality_id) {
          endpoint = `/data/kpi/${kpi_id}/municipality/${municipality_id}`;
          if (years && years.length > 0) {
            endpoint += `/year/${years.join(',')}`;
          }
        } else {
          endpoint = `/data/kpi/${kpi_id}`;
          if (years && years.length > 0) {
            endpoint += `/year/${years.join(',')}`;
          }
        }

        let data = await koladaClient.fetchAllData<KPIData>(endpoint);

        // Apply gender filter
        data = filterByGender(data, gender);

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
                  gender_filter: gender,
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
   * NOTE: This endpoint is unreliable due to Kolada API limitations.
   * Often times out even for small municipalities. Use search_kpis + get_kpi_data instead.
   */
  get_municipality_kpis: {
    description: '⚠️ EXPERIMENTELL - Ofta timeout pga API-begränsningar. Hämtar KPIs för en kommun/år. REKOMMENDATION: Använd istället search_kpis för att hitta KPIs efter ämne, sedan get_kpi_data för att hämta värden.',
    inputSchema: getMunicipalityKpisSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof getMunicipalityKpisSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { municipality_id, year } = args;
      logger.toolCall('get_municipality_kpis', { municipality_id, year });

      try {
        // Kolada API v3 uses path-based URLs
        // Year is now required to reduce dataset size
        const endpoint = `/data/municipality/${municipality_id}/year/${year}`;

        // Fetch with limited page size to avoid timeout
        // Use per_page=1000 for faster response, we only need KPI IDs
        const response = await koladaClient.request<KPIData>(endpoint, { per_page: 1000 });
        const data = response.values || [];

        // Extract unique KPI IDs from this sample
        const kpiIds = [...new Set(data.map((d) => d.kpi))];

        // Check if there's more data (pagination)
        const hasMore = response.next_page !== undefined;

        logger.toolResult('get_municipality_kpis', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  municipality_id,
                  year,
                  available_kpis: kpiIds,
                  kpi_count: kpiIds.length,
                  sample_note: hasMore
                    ? 'Detta är ett urval av KPIs. Det finns fler tillgängliga. Använd search_kpis för att söka efter specifika KPIs.'
                    : 'Komplett lista för detta år.',
                  usage_tip: 'Använd get_kpi för detaljer om varje KPI, eller get_kpi_data för att hämta faktiska värden. För specifika ämnesområden, använd search_kpis med relevanta sökord.',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('get_municipality_kpis', false, Date.now() - startTime);

        // Provide helpful error message for timeouts
        if (error instanceof Error && error.message.includes('timeout')) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'TIMEOUT',
                  message: `Förfrågan tog för lång tid för kommun ${municipality_id}, år ${year}`,
                  suggestion: 'Stora kommuner som Stockholm har mycket data. Använd istället: 1) search_kpis för att hitta specifika KPIs, 2) get_kpi_data för att hämta värden för enskilda KPIs.',
                  alternative_workflow: [
                    'search_kpis med query="skola" för utbildnings-KPIs',
                    'search_kpis med query="vård" för vård-KPIs',
                    'get_kpi_data med specifik kpi_id och municipality_id'
                  ]
                }),
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    },
  },

  /**
   * Compare a KPI across multiple municipalities
   */
  compare_municipalities: {
    description: 'Jämför ett specifikt nyckeltal över flera kommuner för angivna år. Utmärkt för benchmarking. Stöder könsfiltrering (T/M/K).',
    inputSchema: compareMunicipalitiesSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof compareMunicipalitiesSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { kpi_id, municipality_ids, years, gender } = args;
      logger.toolCall('compare_municipalities', { kpi_id, municipality_ids, years, gender });

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
          // Kolada API v3 uses path-based URLs
          let endpoint = `/data/kpi/${kpi_id}/municipality/${municipality_id}`;
          if (years && years.length > 0) {
            endpoint += `/year/${years.join(',')}`;
          }

          let data = await koladaClient.fetchAllData<KPIData>(endpoint);

          // Apply gender filter
          data = filterByGender(data, gender);

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
                  gender_filter: gender,
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
    description: 'Hämta historisk trenddata för ett nyckeltal som visar förändringar över tid. Användbart för att analysera utveckling och identifiera trender. Stöder könsfiltrering (T/M/K).',
    inputSchema: getKpiTrendSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof getKpiTrendSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { kpi_id, municipality_id, start_year, end_year, gender } = args;
      logger.toolCall('get_kpi_trend', { kpi_id, municipality_id, start_year, end_year, gender });

      try {
        const endYr = end_year || new Date().getFullYear();
        const years = Array.from({ length: endYr - start_year + 1 }, (_, i) => start_year + i);

        // Kolada API v3 uses path-based URLs
        const endpoint = `/data/kpi/${kpi_id}/municipality/${municipality_id}/year/${years.join(',')}`;

        let data = await koladaClient.fetchAllData<KPIData>(endpoint);

        // Apply gender filter
        data = filterByGender(data, gender);

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
                  gender_filter: gender,
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
