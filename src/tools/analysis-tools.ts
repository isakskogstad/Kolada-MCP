import { z } from 'zod';
import { koladaClient } from '../api/client.js';
import { dataCache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import type { KPI, KPIData, Municipality, ToolAnnotations, ToolResult } from '../config/types.js';

/**
 * Analysis Tools - Advanced analytical tools for KPI data
 * Includes statistical analysis, correlation, filtering, and operating area navigation
 * All tools are read-only and idempotent
 * @version 2.2.0
 */

const READ_ONLY_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  destructiveHint: false,
  openWorldHint: false,
};

// =============================================================================
// Input Schemas
// =============================================================================

const analyzeKpiSchema = z.object({
  kpi_id: z.string().describe('KPI-ID att analysera (t.ex. "N15033")'),
  year: z.number().describe('År att analysera'),
  gender: z.enum(['T', 'M', 'K']).default('T').describe('Kön: T=Totalt, M=Män, K=Kvinnor'),
  municipality_type: z.enum(['K', 'L', 'all']).default('K').describe('Kommuntyp: K=Kommun, L=Region, all=alla'),
  top_n: z.number().min(1).max(50).default(10).describe('Antal topprankade att visa (standard: 10)'),
  bottom_n: z.number().min(1).max(50).default(10).describe('Antal bottenprestanda att visa (standard: 10)'),
});

const filterMunicipalitiesSchema = z.object({
  kpi_id: z.string().describe('KPI-ID att filtrera på'),
  year: z.number().describe('År att analysera'),
  threshold: z.number().describe('Tröskelvärde för filtrering'),
  operator: z.enum(['gt', 'lt', 'gte', 'lte', 'eq']).describe('Operator: gt (>), lt (<), gte (>=), lte (<=), eq (=)'),
  gender: z.enum(['T', 'M', 'K']).default('T').describe('Kön: T=Totalt, M=Män, K=Kvinnor'),
  municipality_type: z.enum(['K', 'L', 'all']).default('K').describe('Kommuntyp: K=Kommun, L=Region, all=alla'),
});

const compareKpisSchema = z.object({
  kpi_id_1: z.string().describe('Första KPI-ID för korrelationsanalys'),
  kpi_id_2: z.string().describe('Andra KPI-ID för korrelationsanalys'),
  year: z.number().describe('År att analysera'),
  gender: z.enum(['T', 'M', 'K']).default('T').describe('Kön: T=Totalt, M=Män, K=Kvinnor'),
  municipality_type: z.enum(['K', 'L', 'all']).default('K').describe('Kommuntyp: K=Kommun, L=Region, all=alla'),
});

const listOperatingAreasSchema = z.object({});

const getKpisByOperatingAreaSchema = z.object({
  operating_area: z.string().describe('Verksamhetsområde att filtrera på (t.ex. "Utbildning", "Vård och omsorg")'),
  limit: z.number().min(1).max(100).default(50).describe('Max antal KPIs att returnera (standard: 50)'),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate Pearson correlation coefficient between two arrays
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n < 2) return NaN;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return NaN;
  return numerator / denominator;
}

/**
 * Calculate basic statistics for an array of numbers
 */
function calculateStats(values: number[]): {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  std_dev: number;
} {
  if (values.length === 0) {
    return { count: 0, min: NaN, max: NaN, mean: NaN, median: NaN, std_dev: NaN };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = values.length;
  const min = sorted[0];
  const max = sorted[count - 1];
  const mean = values.reduce((a, b) => a + b, 0) / count;

  // Median
  const mid = Math.floor(count / 2);
  const median = count % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  // Standard deviation
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / count;
  const std_dev = Math.sqrt(avgSquaredDiff);

  return { count, min, max, mean, median, std_dev };
}

/**
 * Extract value from KPI data for specific gender
 */
function extractValue(dataPoint: KPIData, gender: 'T' | 'M' | 'K'): number | null {
  if (!dataPoint.values || dataPoint.values.length === 0) return null;

  // Try to find gender-specific value
  const genderValue = dataPoint.values.find((v) => v.gender === gender);
  if (genderValue && genderValue.value !== null && genderValue.value !== undefined) {
    return genderValue.value;
  }

  // Fall back to first value if no gender match
  const firstValue = dataPoint.values[0];
  if (firstValue && firstValue.value !== null && firstValue.value !== undefined) {
    return firstValue.value;
  }

  return null;
}

// =============================================================================
// Helper to batch array into chunks
// =============================================================================
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// =============================================================================
// Tools
// =============================================================================

export const analysisTools = {
  /**
   * Analyze a KPI across all municipalities with statistical summary and rankings
   */
  analyze_kpi_across_municipalities: {
    description:
      'Analysera ett KPI över alla kommuner med statistik (min, max, medel, median) och rankning. Visar toppkommuner och bottenkommuner. Perfekt för benchmarking och jämförelser.',
    inputSchema: analyzeKpiSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof analyzeKpiSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { kpi_id, year, gender, municipality_type, top_n, bottom_n } = args;
      logger.toolCall('analyze_kpi_across_municipalities', { kpi_id, year, gender, municipality_type, top_n, bottom_n });

      try {
        // Fetch all municipalities
        const municipalities = await dataCache.getOrFetch(
          'municipalities-full',
          () => koladaClient.fetchAllData<Municipality>('/municipality'),
          86400000
        );

        // Filter by type
        const filteredMunicipalities =
          municipality_type === 'all' ? municipalities : municipalities.filter((m) => m.type === municipality_type);

        // Create ID to name mapping
        const idToName: Record<string, string> = {};
        filteredMunicipalities.forEach((m) => {
          idToName[m.id] = m.title;
        });

        // Fetch KPI data in batches (max 25 municipalities per request to avoid URL length issues)
        const BATCH_SIZE = 25;
        const municipalityIdChunks = chunkArray(filteredMunicipalities.map((m) => m.id), BATCH_SIZE);

        const allData: KPIData[] = [];
        for (const chunk of municipalityIdChunks) {
          const endpoint = `/data/kpi/${kpi_id}/municipality/${chunk.join(',')}/year/${year}`;
          const batchData = await koladaClient.fetchAllData<KPIData>(endpoint);
          allData.push(...batchData);
        }

        const data = allData;

        // Extract values with municipality info
        const municipalityValues: { id: string; name: string; value: number }[] = [];

        for (const dataPoint of data) {
          if (!dataPoint.municipality) continue;
          const value = extractValue(dataPoint, gender);
          if (value !== null) {
            municipalityValues.push({
              id: dataPoint.municipality,
              name: idToName[dataPoint.municipality] || dataPoint.municipality,
              value,
            });
          }
        }

        if (municipalityValues.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'NO_DATA',
                  message: `Ingen data hittades för KPI ${kpi_id}, år ${year}, kön ${gender}`,
                  suggestion: 'Försök med ett annat år eller kontrollera att KPI-ID:t är korrekt.',
                }),
              },
            ],
            isError: true,
          };
        }

        // Calculate statistics
        const values = municipalityValues.map((mv) => mv.value);
        const stats = calculateStats(values);

        // Sort for rankings
        const sorted = [...municipalityValues].sort((a, b) => b.value - a.value);
        const topMunicipalities = sorted.slice(0, top_n);
        const bottomMunicipalities = sorted.slice(-bottom_n).reverse();

        // Calculate how many are above/below average
        const aboveAverage = municipalityValues.filter((mv) => mv.value > stats.mean).length;
        const belowAverage = municipalityValues.filter((mv) => mv.value < stats.mean).length;

        logger.toolResult('analyze_kpi_across_municipalities', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  kpi_id,
                  year,
                  gender,
                  municipality_type,
                  statistics: {
                    count: stats.count,
                    min: parseFloat(stats.min.toFixed(2)),
                    max: parseFloat(stats.max.toFixed(2)),
                    mean: parseFloat(stats.mean.toFixed(2)),
                    median: parseFloat(stats.median.toFixed(2)),
                    std_dev: parseFloat(stats.std_dev.toFixed(2)),
                    above_average: aboveAverage,
                    below_average: belowAverage,
                  },
                  top_municipalities: topMunicipalities.map((m, i) => ({
                    rank: i + 1,
                    id: m.id,
                    name: m.name,
                    value: parseFloat(m.value.toFixed(2)),
                  })),
                  bottom_municipalities: bottomMunicipalities.map((m, i) => ({
                    rank: stats.count - bottom_n + i + 1,
                    id: m.id,
                    name: m.name,
                    value: parseFloat(m.value.toFixed(2)),
                  })),
                  source: 'Kolada - Källa: Kolada',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('analyze_kpi_across_municipalities', false, Date.now() - startTime);
        throw error;
      }
    },
  },

  /**
   * Filter municipalities by KPI threshold value
   */
  filter_municipalities_by_kpi: {
    description:
      'Filtrera kommuner baserat på KPI-tröskelvärde. Hitta t.ex. alla kommuner där lärartäthet > 12 eller arbetslöshet < 5%. Användbart för att identifiera kommuner som uppfyller specifika kriterier.',
    inputSchema: filterMunicipalitiesSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof filterMunicipalitiesSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { kpi_id, year, threshold, operator, gender, municipality_type } = args;
      logger.toolCall('filter_municipalities_by_kpi', { kpi_id, year, threshold, operator, gender, municipality_type });

      try {
        // Fetch all municipalities
        const municipalities = await dataCache.getOrFetch(
          'municipalities-full',
          () => koladaClient.fetchAllData<Municipality>('/municipality'),
          86400000
        );

        // Filter by type
        const filteredMunicipalities =
          municipality_type === 'all' ? municipalities : municipalities.filter((m) => m.type === municipality_type);

        // Create ID to name mapping
        const idToName: Record<string, string> = {};
        filteredMunicipalities.forEach((m) => {
          idToName[m.id] = m.title;
        });

        // Fetch KPI data in batches
        const BATCH_SIZE = 25;
        const municipalityIdChunks = chunkArray(filteredMunicipalities.map((m) => m.id), BATCH_SIZE);

        const allData: KPIData[] = [];
        for (const chunk of municipalityIdChunks) {
          const endpoint = `/data/kpi/${kpi_id}/municipality/${chunk.join(',')}/year/${year}`;
          const batchData = await koladaClient.fetchAllData<KPIData>(endpoint);
          allData.push(...batchData);
        }

        const data = allData;

        // Apply threshold filter
        const operatorFn: Record<string, (v: number, t: number) => boolean> = {
          gt: (v, t) => v > t,
          lt: (v, t) => v < t,
          gte: (v, t) => v >= t,
          lte: (v, t) => v <= t,
          eq: (v, t) => v === t,
        };

        const filterFn = operatorFn[operator];
        const matchingMunicipalities: { id: string; name: string; value: number }[] = [];

        for (const dataPoint of data) {
          if (!dataPoint.municipality) continue;
          const value = extractValue(dataPoint, gender);
          if (value !== null && filterFn(value, threshold)) {
            matchingMunicipalities.push({
              id: dataPoint.municipality,
              name: idToName[dataPoint.municipality] || dataPoint.municipality,
              value,
            });
          }
        }

        // Sort by value
        matchingMunicipalities.sort((a, b) => b.value - a.value);

        const operatorSymbols: Record<string, string> = {
          gt: '>',
          lt: '<',
          gte: '>=',
          lte: '<=',
          eq: '=',
        };

        logger.toolResult('filter_municipalities_by_kpi', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  kpi_id,
                  year,
                  gender,
                  filter: `värde ${operatorSymbols[operator]} ${threshold}`,
                  municipality_type,
                  matching_count: matchingMunicipalities.length,
                  total_municipalities: filteredMunicipalities.length,
                  municipalities: matchingMunicipalities.map((m) => ({
                    id: m.id,
                    name: m.name,
                    value: parseFloat(m.value.toFixed(2)),
                  })),
                  source: 'Kolada - Källa: Kolada',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('filter_municipalities_by_kpi', false, Date.now() - startTime);
        throw error;
      }
    },
  },

  /**
   * Calculate Pearson correlation between two KPIs
   */
  compare_kpis: {
    description:
      'Beräkna Pearson-korrelation mellan två KPIs för att se om det finns samband. T.ex. korrelation mellan lärartäthet och skolresultat. Värden nära 1 = starkt positivt samband, nära -1 = starkt negativt, nära 0 = inget samband.',
    inputSchema: compareKpisSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof compareKpisSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { kpi_id_1, kpi_id_2, year, gender, municipality_type } = args;
      logger.toolCall('compare_kpis', { kpi_id_1, kpi_id_2, year, gender, municipality_type });

      try {
        // Fetch all municipalities
        const municipalities = await dataCache.getOrFetch(
          'municipalities-full',
          () => koladaClient.fetchAllData<Municipality>('/municipality'),
          86400000
        );

        // Filter by type
        const filteredMunicipalities =
          municipality_type === 'all' ? municipalities : municipalities.filter((m) => m.type === municipality_type);

        // Fetch data for both KPIs in batches
        const BATCH_SIZE = 25;
        const municipalityIdChunks = chunkArray(filteredMunicipalities.map((m) => m.id), BATCH_SIZE);

        // Helper to fetch all batches for a KPI
        const fetchKpiData = async (kpiId: string): Promise<KPIData[]> => {
          const allData: KPIData[] = [];
          for (const chunk of municipalityIdChunks) {
            const endpoint = `/data/kpi/${kpiId}/municipality/${chunk.join(',')}/year/${year}`;
            const batchData = await koladaClient.fetchAllData<KPIData>(endpoint);
            allData.push(...batchData);
          }
          return allData;
        };

        const [data1, data2] = await Promise.all([
          fetchKpiData(kpi_id_1),
          fetchKpiData(kpi_id_2),
        ]);

        // Create maps for matching
        const values1: Record<string, number> = {};
        const values2: Record<string, number> = {};

        for (const d of data1) {
          if (d.municipality) {
            const v = extractValue(d, gender);
            if (v !== null) values1[d.municipality] = v;
          }
        }

        for (const d of data2) {
          if (d.municipality) {
            const v = extractValue(d, gender);
            if (v !== null) values2[d.municipality] = v;
          }
        }

        // Find common municipalities
        const commonIds = Object.keys(values1).filter((id) => id in values2);

        if (commonIds.length < 3) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'INSUFFICIENT_DATA',
                  message: `För få kommuner med data för båda KPIs (${commonIds.length} hittades, minst 3 krävs)`,
                  suggestion: 'Försök med ett annat år eller andra KPIs.',
                }),
              },
            ],
            isError: true,
          };
        }

        const x = commonIds.map((id) => values1[id]);
        const y = commonIds.map((id) => values2[id]);

        const correlation = pearsonCorrelation(x, y);

        // Interpret correlation
        let interpretation: string;
        const absCorr = Math.abs(correlation);
        if (absCorr >= 0.8) {
          interpretation = correlation > 0 ? 'Mycket starkt positivt samband' : 'Mycket starkt negativt samband';
        } else if (absCorr >= 0.6) {
          interpretation = correlation > 0 ? 'Starkt positivt samband' : 'Starkt negativt samband';
        } else if (absCorr >= 0.4) {
          interpretation = correlation > 0 ? 'Måttligt positivt samband' : 'Måttligt negativt samband';
        } else if (absCorr >= 0.2) {
          interpretation = correlation > 0 ? 'Svagt positivt samband' : 'Svagt negativt samband';
        } else {
          interpretation = 'Inget eller mycket svagt samband';
        }

        logger.toolResult('compare_kpis', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  kpi_id_1,
                  kpi_id_2,
                  year,
                  gender,
                  municipality_type,
                  correlation: {
                    pearson_coefficient: parseFloat(correlation.toFixed(4)),
                    interpretation,
                    municipalities_compared: commonIds.length,
                  },
                  note: 'Korrelation innebär inte kausalitet - två variabler kan vara korrelerade utan att den ena orsakar den andra.',
                  source: 'Kolada - Källa: Kolada',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('compare_kpis', false, Date.now() - startTime);
        throw error;
      }
    },
  },

  /**
   * List all operating areas with KPI counts
   */
  list_operating_areas: {
    description:
      'Lista alla verksamhetsområden (t.ex. Utbildning, Vård och omsorg) med antal KPIs per område. Ger överblick över vilka typer av data som finns tillgänglig.',
    inputSchema: listOperatingAreasSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (): Promise<ToolResult> => {
      const startTime = Date.now();
      logger.toolCall('list_operating_areas', {});

      try {
        // Use cached KPI catalog
        const kpis = await dataCache.getOrFetch(
          'kpi-catalog-full',
          () => koladaClient.fetchAllData<KPI>('/kpi'),
          86400000
        );

        // Count KPIs per operating area
        const areaCounts: Record<string, number> = {};

        for (const kpi of kpis) {
          const area = kpi.operating_area || 'Övrigt';
          areaCounts[area] = (areaCounts[area] || 0) + 1;
        }

        // Sort by count descending
        const sortedAreas = Object.entries(areaCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, kpi_count: count }));

        logger.toolResult('list_operating_areas', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  total_kpis: kpis.length,
                  operating_areas_count: sortedAreas.length,
                  operating_areas: sortedAreas,
                  usage_tip:
                    'Använd get_kpis_by_operating_area med ett områdesnamn för att se KPIs inom det området.',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('list_operating_areas', false, Date.now() - startTime);
        throw error;
      }
    },
  },

  /**
   * Get KPIs filtered by operating area
   */
  get_kpis_by_operating_area: {
    description:
      'Hämta alla KPIs inom ett specifikt verksamhetsområde. T.ex. alla utbildnings-KPIs eller alla vård-KPIs. Enklare än fritextsökning för att hitta relaterade nyckeltal.',
    inputSchema: getKpisByOperatingAreaSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    handler: async (args: z.infer<typeof getKpisByOperatingAreaSchema>): Promise<ToolResult> => {
      const startTime = Date.now();
      const { operating_area, limit } = args;
      logger.toolCall('get_kpis_by_operating_area', { operating_area, limit });

      try {
        // Use cached KPI catalog
        const kpis = await dataCache.getOrFetch(
          'kpi-catalog-full',
          () => koladaClient.fetchAllData<KPI>('/kpi'),
          86400000
        );

        // Filter by operating area (case-insensitive partial match)
        const areaLower = operating_area.toLowerCase();
        const matchingKpis = kpis.filter((k) => k.operating_area?.toLowerCase().includes(areaLower));

        const totalMatches = matchingKpis.length;
        const limitedKpis = matchingKpis.slice(0, limit);

        logger.toolResult('get_kpis_by_operating_area', true, Date.now() - startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  operating_area,
                  count: limitedKpis.length,
                  total_matches: totalMatches,
                  truncated: totalMatches > limit,
                  kpis: limitedKpis.map((k) => ({
                    id: k.id,
                    title: k.title,
                    description: k.description,
                    has_ou_data: k.has_ou_data,
                    is_divided_by_gender: k.is_divided_by_gender,
                    municipality_type: k.municipality_type,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.toolResult('get_kpis_by_operating_area', false, Date.now() - startTime);
        throw error;
      }
    },
  },
};
