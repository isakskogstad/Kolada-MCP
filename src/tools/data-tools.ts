import { z } from 'zod';
import { koladaClient } from '../api/client.js';
import { dataCache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import type { KPI, KPIData, Municipality, ToolAnnotations, ToolResult } from '../config/types.js';

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
  operating_area: z.string().optional().describe('Filtrera på verksamhetsområde (t.ex. "Utbildning", "Vård"). Använd list_operating_areas för att se tillgängliga områden.'),
  limit: z.number().min(1).max(50).default(20).describe('Max antal KPIs att returnera (standard: 20, max: 50)'),
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
   * Get available KPIs for a municipality - uses cached KPI catalog
   * This approach is reliable and never times out since it uses local data
   */
  get_municipality_kpis: {
    description: 'Visa tillgängliga KPIs för en kommun. Filtrera på verksamhetsområde för att hitta relevanta nyckeltal. Snabb och pålitlig - använder cachad KPI-katalog.',
    inputSchema: getMunicipalityKpisSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof getMunicipalityKpisSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { municipality_id, operating_area, limit } = args;
      logger.toolCall('get_municipality_kpis', { municipality_id, operating_area, limit });

      try {
        // Fetch municipality info to verify it exists and get type
        const municipalities = await dataCache.getOrFetch(
          'municipalities-full',
          () => koladaClient.fetchAllData<Municipality>('/municipality'),
          86400000
        );

        const municipality = municipalities.find((m) => m.id === municipality_id);
        if (!municipality) {
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

        // Fetch KPI catalog (cached)
        const allKpis = await dataCache.getOrFetch(
          'kpi-catalog-full',
          () => koladaClient.fetchAllData<KPI>('/kpi'),
          86400000
        );

        // Filter KPIs applicable to this municipality type
        let applicableKpis = allKpis.filter((k) => {
          // K = kommun, L = landsting/region, alla = alla typer
          if (municipality.type === 'K') {
            return k.municipality_type === 'K' || k.municipality_type === 'alla';
          } else if (municipality.type === 'L') {
            return k.municipality_type === 'L' || k.municipality_type === 'alla';
          }
          return true;
        });

        // Filter by operating area if specified
        if (operating_area) {
          const areaLower = operating_area.toLowerCase();
          applicableKpis = applicableKpis.filter((k) =>
            k.operating_area?.toLowerCase().includes(areaLower)
          );
        }

        // Group by operating area for summary
        const areaGroups: Record<string, number> = {};
        for (const kpi of applicableKpis) {
          const area = kpi.operating_area || 'Övrigt';
          areaGroups[area] = (areaGroups[area] || 0) + 1;
        }

        // Sort areas by count
        const sortedAreas = Object.entries(areaGroups)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }));

        // Limit results
        const totalApplicable = applicableKpis.length;
        const limitedKpis = applicableKpis.slice(0, limit);

        logger.toolResult('get_municipality_kpis', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  municipality: {
                    id: municipality.id,
                    name: municipality.title,
                    type: municipality.type === 'K' ? 'Kommun' : 'Region',
                  },
                  filter: operating_area || 'alla verksamhetsområden',
                  total_applicable_kpis: totalApplicable,
                  shown_kpis: limitedKpis.length,
                  operating_areas_summary: sortedAreas,
                  kpis: limitedKpis.map((k) => ({
                    id: k.id,
                    title: k.title,
                    operating_area: k.operating_area,
                    is_divided_by_gender: k.is_divided_by_gender,
                  })),
                  next_steps: [
                    'Använd get_kpi för detaljer om ett specifikt KPI',
                    'Använd get_kpi_data för att hämta faktiska värden',
                    'Filtrera på operating_area för att smalna av resultaten',
                  ],
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
