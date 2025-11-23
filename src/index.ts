#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { kpiTools } from './tools/kpi-tools.js';
import { municipalityTools } from './tools/municipality-tools.js';
import { ouTools } from './tools/ou-tools.js';
import { dataTools } from './tools/data-tools.js';
import { koladaClient } from './api/client.js';
import { dataCache } from './utils/cache.js';
import { analysisPrompts, generatePromptText } from './prompts/analysis-prompts.js';
import type { Municipality, KPI } from './config/types.js';

/**
 * Kolada MCP Server
 * Provides access to Swedish municipality and regional data via the Kolada API v3
 */

// Combine all tools
const allTools = {
  ...kpiTools,
  ...municipalityTools,
  ...ouTools,
  ...dataTools,
};

// Create server instance
const server = new Server(
  {
    name: 'kolada-mcp-server',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

/**
 * List all available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.entries(allTools).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema),
    })),
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const tool = allTools[name as keyof typeof allTools];
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  // Validate input
  const validatedArgs = tool.inputSchema.parse(args);

  // Execute tool handler
  return await tool.handler(validatedArgs);
});

/**
 * List available prompts
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: Object.values(analysisPrompts).map((prompt) => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments,
    })),
  };
});

/**
 * Get prompt by name
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const prompt = analysisPrompts[name];
  if (!prompt) {
    throw new Error(`Unknown prompt: ${name}`);
  }

  const promptText = generatePromptText(prompt, args || {});

  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: promptText,
        },
      },
    ],
  };
});

/**
 * List available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'kolada://municipalities',
        name: 'Swedish Municipalities List',
        description: 'Complete list of Swedish municipalities and county councils',
        mimeType: 'application/json',
      },
      {
        uri: 'kolada://kpi-catalog',
        name: 'KPI Catalog',
        description: 'Complete catalog of available KPIs with metadata',
        mimeType: 'application/json',
      },
      {
        uri: 'kolada://api-info',
        name: 'Kolada API Information',
        description: 'API information, endpoints, and usage guidelines',
        mimeType: 'text/markdown',
      },
    ],
  };
});

/**
 * Handle resource reads
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'kolada://municipalities': {
      // Use cache for municipalities list (24h TTL)
      const municipalities = await dataCache.getOrFetch(
        'municipalities',
        () => koladaClient.fetchAllData<Municipality>('/municipality'),
        86400000 // 24 hours
      );
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                count: municipalities.length,
                municipalities: municipalities.map((m) => ({
                  id: m.id,
                  title: m.title,
                  type: m.type,
                  type_description:
                    m.type === 'K' ? 'Kommun (Municipality)' : 'Landsting/Region (County Council)',
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'kolada://kpi-catalog': {
      // Use cache for KPI catalog (24h TTL)
      const kpis = await dataCache.getOrFetch(
        'kpi-catalog',
        () => koladaClient.fetchAllData<KPI>('/kpi'),
        86400000 // 24 hours
      );
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                count: kpis.length,
                kpis: kpis.map((k) => ({
                  id: k.id,
                  title: k.title,
                  description: k.description,
                  operating_area: k.operating_area,
                  municipality_type: k.municipality_type,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'kolada://api-info': {
      const apiInfo = `# Kolada API v3 Information

## About Kolada
Kolada is a database containing key performance indicators (KPIs) for Swedish municipalities and regions.

## API Base URL
\`https://api.kolada.se/v3\`

## Rate Limits
- Maximum 5 requests per second
- Automatic retry with exponential backoff
- Request timeout: 30 seconds

## Main Endpoints
- \`/kpi\` - List and search KPIs
- \`/municipality\` - List and search municipalities
- \`/ou\` - List and search organizational units
- \`/data\` - Get KPI data for municipalities
- \`/oudata\` - Get KPI data for organizational units

## Pagination
- Default page size: 5000 items
- Follow \`next_page\` URL for additional pages
- Maximum batch size: 25 IDs per request

## Data Attribution
When using Kolada data, please cite as: **"Källa: Kolada"**

## More Information
Official API documentation: https://api.kolada.se/v3/docs
`;

      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: apiInfo,
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Kolada MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
