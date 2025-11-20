import { z } from 'zod';

/**
 * Prompt Templates for Kolada Data Analysis
 *
 * These prompts provide guided workflows for common analysis tasks with Swedish municipality data.
 */

export interface PromptDefinition {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

/**
 * Generate prompt text based on template and arguments
 */
export function generatePromptText(prompt: PromptDefinition, args: Record<string, any>): string {
  const promptGenerators: Record<string, (args: Record<string, any>) => string> = {
    analyze_municipality: (args) => `
Analyze key performance indicators for ${args.municipality_name || 'a Swedish municipality'}.

**Analysis Focus:**
${args.focus_areas ? `- Focus on: ${args.focus_areas}` : '- Comprehensive overview across all areas'}

**Suggested Workflow:**
1. Search for the municipality: search_municipalities with query="${args.municipality_name}"
2. Get municipality details: get_municipality with the municipality_id
3. Find relevant KPIs: ${args.focus_areas ? `search_kpis with query="${args.focus_areas}"` : 'get_municipality_kpis to see all available data'}
4. Retrieve data: get_kpi_data for selected KPIs
5. Analyze trends: get_kpi_trend for historical perspective

**Key Areas to Consider:**
- Education (Utbildning)
- Healthcare (Hälso- och sjukvård)
- Social Services (Socialtjänst)
- Infrastructure (Infrastruktur)
- Environment (Miljö)
- Economy (Ekonomi)

Provide insights on performance, trends, and comparisons to national averages.
`,

    compare_municipalities: (args) => `
Compare multiple Swedish municipalities on selected key performance indicators.

**Municipalities to Compare:**
${args.municipalities ? args.municipalities.split(',').map((m: string) => `- ${m.trim()}`).join('\n') : '- [Specify municipalities to compare]'}

**Comparison Topics:**
${args.kpi_topics || '- [Specify topics like education, healthcare, environment]'}

**Workflow:**
1. Search for each municipality: search_municipalities
2. Identify relevant KPIs: search_kpis with query="${args.kpi_topics || 'relevant topic'}"
3. Compare data: compare_municipalities with selected KPI IDs and municipality IDs
4. Analyze differences and similarities

**Comparison Framework:**
- Identify performance gaps
- Highlight best practices
- Consider demographic and economic factors
- Look for actionable insights

Present findings in a structured format showing relative performance.
`,

    trend_analysis: (args) => `
Analyze trends over time for key performance indicators in ${args.municipality || 'a municipality'}.

**Analysis Parameters:**
- Municipality: ${args.municipality || '[Specify municipality]'}
- Topic: ${args.topic || '[Specify topic area]'}
- Time Period: ${args.years || '5'} years

**Workflow:**
1. Find municipality: search_municipalities with query="${args.municipality}"
2. Identify KPIs: search_kpis with query="${args.topic}"
3. Get trend data: get_kpi_trend with start_year and end_year
4. Analyze patterns

**What to Look For:**
- Upward or downward trends
- Sudden changes or anomalies
- Seasonal patterns
- Correlation with policy changes

Provide historical context and project future trajectories where appropriate.
`,

    find_schools: (args) => `
Find and analyze schools in ${args.municipality || 'a Swedish municipality'}.

**Search Parameters:**
- Municipality: ${args.municipality || '[Specify municipality]'}
${args.school_type ? `- School Type: ${args.school_type}` : ''}
${args.school_name ? `- School Name: ${args.school_name}` : ''}

**Workflow:**
1. Find municipality: search_municipalities
2. Search for schools: search_organizational_units with municipality filter and ou_type "V11" (schools)
3. Get school details: get_organizational_unit for specific schools
4. Retrieve school data: get_kpi_data with ou_id for education KPIs

**Common School Types (ou_type):**
- V11: Primary schools (Grundskola)
- V12: Upper secondary schools (Gymnasium)
- V13: Preschools (Förskola)

**Key Education KPIs to Consider:**
- Student-teacher ratio
- Pass rates
- Student satisfaction
- Resources per student

Provide comprehensive overview of educational institutions and their performance.
`,

    regional_comparison: (args) => `
Compare municipalities within the same region on key indicators.

**Region/Group:**
${args.region || '[Specify region like "Stockholm län" or municipality group]'}

**Workflow:**
1. Find municipality groups: get_municipality_groups with query="${args.region}"
2. Get group members: get_municipality_group with group_id
3. Select relevant KPIs: search_kpis
4. Compare data: compare_municipalities with all member IDs

**Regional Context:**
- Population size differences
- Economic base variations
- Urban vs rural characteristics
- Regional policies

Present findings highlighting regional patterns and outliers within the group.
`,

    kpi_discovery: (args) => `
Discover and explore available key performance indicators.

**Search Criteria:**
${args.operating_area ? `- Operating Area: ${args.operating_area}` : ''}
${args.query ? `- Keywords: ${args.query}` : ''}

**Workflow:**
1. Browse KPI groups: get_kpi_groups to see thematic collections
2. Search KPIs: search_kpis with filters
3. Get KPI details: get_kpi for metadata and calculation methods
4. Check data availability: has_ou_data field shows if organization-level data exists

**Operating Areas (verksamhetsområden):**
- Utbildning (Education)
- Hälso- och sjukvård (Healthcare)
- Socialtjänst (Social Services)
- Kollektivtrafik (Public Transport)
- Kultur och fritid (Culture and Recreation)
- Teknisk verksamhet (Technical Services)

Provide summary of relevant KPIs with their descriptions and data availability.
`
  };

  const generator = promptGenerators[prompt.name];
  if (!generator) {
    return `Unknown prompt: ${prompt.name}`;
  }

  return generator(args);
}

/**
 * All available prompt templates
 */
export const analysisPrompts: Record<string, PromptDefinition> = {
  analyze_municipality: {
    name: 'analyze_municipality',
    description: 'Analyze key metrics and performance for a Swedish municipality',
    arguments: [
      {
        name: 'municipality_name',
        description: 'Name of the municipality to analyze (e.g., "Stockholm", "Göteborg")',
        required: true,
      },
      {
        name: 'focus_areas',
        description: 'Specific areas to focus on (e.g., "education", "healthcare", "environment")',
        required: false,
      },
    ],
  },

  compare_municipalities: {
    name: 'compare_municipalities',
    description: 'Compare multiple municipalities on selected key performance indicators',
    arguments: [
      {
        name: 'municipalities',
        description: 'Comma-separated list of municipality names to compare',
        required: true,
      },
      {
        name: 'kpi_topics',
        description: 'Topics to compare (e.g., "schools", "healthcare quality", "environmental sustainability")',
        required: true,
      },
    ],
  },

  trend_analysis: {
    name: 'trend_analysis',
    description: 'Analyze trends over time for specific performance indicators',
    arguments: [
      {
        name: 'municipality',
        description: 'Municipality name to analyze trends for',
        required: true,
      },
      {
        name: 'topic',
        description: 'Topic area to analyze (e.g., "education quality", "elderly care")',
        required: true,
      },
      {
        name: 'years',
        description: 'Number of years to analyze (default: 5)',
        required: false,
      },
    ],
  },

  find_schools: {
    name: 'find_schools',
    description: 'Find and analyze schools and educational institutions',
    arguments: [
      {
        name: 'municipality',
        description: 'Municipality to search schools in',
        required: true,
      },
      {
        name: 'school_type',
        description: 'Type of school (e.g., "grundskola", "gymnasium", "förskola")',
        required: false,
      },
      {
        name: 'school_name',
        description: 'Specific school name to search for',
        required: false,
      },
    ],
  },

  regional_comparison: {
    name: 'regional_comparison',
    description: 'Compare municipalities within the same region or group',
    arguments: [
      {
        name: 'region',
        description: 'Region name or municipality group (e.g., "Stockholm län", "Storstäder")',
        required: true,
      },
    ],
  },

  kpi_discovery: {
    name: 'kpi_discovery',
    description: 'Discover and explore available key performance indicators',
    arguments: [
      {
        name: 'query',
        description: 'Search keywords for KPIs',
        required: false,
      },
      {
        name: 'operating_area',
        description: 'Operating area to filter by (e.g., "Utbildning", "Hälso- och sjukvård")',
        required: false,
      },
    ],
  },
};
