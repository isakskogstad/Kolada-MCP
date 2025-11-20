import { z } from 'zod';
import { koladaClient } from '../api/client.js';
import type { KPIData } from '../config/types.js';

/**
 * Data Retrieval Tools - 4 tools for fetching actual KPI data
 */

export const dataTools = {
  /**
   * Retrieve actual KPI data for municipalities or OUs
   */
  get_kpi_data: {
    description: 'Retrieve actual KPI data values for specific municipalities or organizational units. Can filter by years.',
    inputSchema: z.object({
      kpi_id: z.string().describe('KPI ID to retrieve data for'),
      municipality_id: z.string().optional().describe('Municipality ID (use this OR ou_id, not both)'),
      ou_id: z.string().optional().describe('Organizational unit ID (use this OR municipality_id, not both)'),
      years: z.array(z.number()).optional().describe('Filter by specific years (e.g., [2020, 2021, 2022])'),
    }),
    handler: async (args: any) => {
      const { kpi_id, municipality_id, ou_id, years } = args;

      if (!municipality_id && !ou_id) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'INVALID_INPUT',
                message: 'Either municipality_id or ou_id must be provided',
              }),
            },
          ],
        };
      }

      const params: Record<string, any> = { kpi: kpi_id };
      if (municipality_id) params.municipality = municipality_id;
      if (ou_id) params.ou = ou_id;
      if (years) params.year = years.join(',');

      const endpoint = ou_id ? '/oudata' : '/data';
      const data = await koladaClient.fetchAllData<KPIData>(endpoint, params);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                kpi_id,
                entity_id: municipality_id || ou_id,
                entity_type: municipality_id ? 'municipality' : 'organizational_unit',
                data_points: data,
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
   * Get all available KPIs for a specific municipality
   */
  get_municipality_kpis: {
    description: 'Get a list of all KPIs that have data available for a specific municipality. Optionally filter by year.',
    inputSchema: z.object({
      municipality_id: z.string().describe('Municipality ID (4-digit code)'),
      year: z.number().optional().describe('Filter by specific year'),
    }),
    handler: async (args: any) => {
      const { municipality_id, year } = args;

      const params: Record<string, any> = { municipality: municipality_id };
      if (year) params.year = year;

      const data = await koladaClient.fetchAllData<KPIData>('/data', params);

      // Extract unique KPI IDs
      const kpiIds = [...new Set(data.map((d) => d.kpi))];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                municipality_id,
                year: year || 'all',
                available_kpis: kpiIds,
                kpi_count: kpiIds.length,
                note: 'Use get_kpi to get details about each KPI, or get_kpi_data to retrieve actual values',
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
   * Compare a KPI across multiple municipalities
   */
  compare_municipalities: {
    description: 'Compare a specific KPI across multiple municipalities for specified years. Great for benchmarking.',
    inputSchema: z.object({
      kpi_id: z.string().describe('KPI ID to compare'),
      municipality_ids: z
        .array(z.string())
        .min(2)
        .max(10)
        .describe('Array of municipality IDs to compare (2-10 municipalities)'),
      years: z.array(z.number()).optional().describe('Specific years to include in comparison'),
    }),
    handler: async (args: any) => {
      const { kpi_id, municipality_ids, years } = args;

      const comparison: any = {
        kpi_id,
        municipalities: [],
      };

      for (const municipality_id of municipality_ids) {
        const params: Record<string, any> = {
          kpi: kpi_id,
          municipality: municipality_id,
        };
        if (years) params.year = years.join(',');

        const data = await koladaClient.fetchAllData<KPIData>('/data', params);

        comparison.municipalities.push({
          municipality_id,
          data: data,
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(comparison, null, 2),
          },
        ],
      };
    },
  },

  /**
   * Get historical trend data for a KPI
   */
  get_kpi_trend: {
    description: 'Get historical trend data for a KPI showing changes over time. Useful for analyzing development and identifying trends.',
    inputSchema: z.object({
      kpi_id: z.string().describe('KPI ID to analyze'),
      municipality_id: z.string().describe('Municipality ID'),
      start_year: z.number().describe('Starting year for the trend analysis'),
      end_year: z.number().optional().describe('Ending year (defaults to current year)'),
    }),
    handler: async (args: any) => {
      const { kpi_id, municipality_id, start_year, end_year } = args;

      const endYr = end_year || new Date().getFullYear();

      const years = Array.from({ length: endYr - start_year + 1 }, (_, i) => start_year + i);

      const params: Record<string, any> = {
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
          previousValue && currentValue ? ((currentValue - previousValue) / previousValue) * 100 : null;

        return {
          ...d,
          year_over_year_change_percent: change ? change.toFixed(2) : null,
        };
      });

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
