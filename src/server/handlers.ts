import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { kpiTools } from '../tools/kpi-tools.js';
import { municipalityTools } from '../tools/municipality-tools.js';
import { ouTools } from '../tools/ou-tools.js';
import { dataTools } from '../tools/data-tools.js';
import { analysisTools } from '../tools/analysis-tools.js';
import { koladaClient } from '../api/client.js';
import { dataCache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import { analysisPrompts, generatePromptText } from '../prompts/analysis-prompts.js';
import type { Municipality, KPI } from '../config/types.js';

export const VERSION = '2.2.1';

/**
 * Combined tool registry - 21 tools total
 * - 5 KPI tools
 * - 4 Municipality tools
 * - 3 Organizational Unit tools
 * - 4 Data Retrieval tools
 * - 5 Analysis tools (new in v2.2.0)
 */
export const allTools = {
  ...kpiTools,
  ...municipalityTools,
  ...ouTools,
  ...dataTools,
  ...analysisTools,
};

/**
 * Resource definitions
 */
export const resources = [
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
];

/**
 * API info markdown content
 */
export const apiInfoMarkdown = `# Kolada API v3 Information

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

/**
 * Create and configure MCP server with all handlers
 */
export function createMCPServer(): Server {
  const server = new Server(
    {
      name: 'kolada-mcp-server',
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  registerHandlers(server);
  return server;
}

/**
 * Register all request handlers on a server instance
 */
export function registerHandlers(server: Server): void {
  // List all available tools with annotations
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.info('Listing tools', { count: Object.keys(allTools).length });

    return {
      tools: Object.entries(allTools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: zodToJsonSchema(tool.inputSchema),
        annotations: tool.annotations,
      })),
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info('Tool call', { tool: name, args });

    const tool = allTools[name as keyof typeof allTools];
    if (!tool) {
      logger.error('Unknown tool', { tool: name });
      throw new Error(`Unknown tool: ${name}`);
    }

    // Validate input
    const validatedArgs = tool.inputSchema.parse(args);

    // Execute tool handler - cast to satisfy MCP SDK types
    const result = await tool.handler(validatedArgs as never);
    return result as { content: Array<{ type: 'text'; text: string }> };
  });

  // List available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    logger.info('Listing prompts', { count: Object.keys(analysisPrompts).length });

    return {
      prompts: Object.values(analysisPrompts).map((prompt) => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
      })),
    };
  });

  // Get prompt by name
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info('Getting prompt', { prompt: name });

    const prompt = analysisPrompts[name];
    if (!prompt) {
      logger.error('Unknown prompt', { prompt: name });
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

  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger.info('Listing resources', { count: resources.length });

    return { resources };
  });

  // Handle resource reads
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    logger.info('Reading resource', { uri });

    switch (uri) {
      case 'kolada://municipalities': {
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
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: apiInfoMarkdown,
            },
          ],
        };
      }

      default:
        logger.error('Unknown resource', { uri });
        throw new Error(`Unknown resource: ${uri}`);
    }
  });
}

/**
 * Handle JSON-RPC requests directly (for HTTP RPC endpoint)
 */
export async function handleRPCRequest(request: {
  method: string;
  id?: string | number;
  params?: Record<string, unknown>;
}): Promise<{
  jsonrpc: '2.0';
  id?: string | number;
  result?: unknown;
  error?: { code: number; message: string };
}> {
  const { method, id, params = {} } = request;

  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {},
              prompts: {},
            },
            serverInfo: {
              name: 'kolada-mcp-server',
              version: VERSION,
            },
          },
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: Object.entries(allTools).map(([name, tool]) => ({
              name,
              description: tool.description,
              inputSchema: zodToJsonSchema(tool.inputSchema),
              annotations: tool.annotations,
            })),
          },
        };

      case 'tools/call': {
        const { name, arguments: args } = params as { name: string; arguments?: unknown };
        const tool = allTools[name as keyof typeof allTools];

        if (!tool) {
          throw new Error(`Tool not found: ${name}`);
        }

        const validatedArgs = tool.inputSchema.parse(args);
        const result = await tool.handler(validatedArgs as never);

        return {
          jsonrpc: '2.0',
          id,
          result,
        };
      }

      case 'prompts/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            prompts: Object.values(analysisPrompts).map((prompt) => ({
              name: prompt.name,
              description: prompt.description,
              arguments: prompt.arguments,
            })),
          },
        };

      case 'prompts/get': {
        const { name, arguments: args } = params as { name: string; arguments?: Record<string, string> };
        const prompt = analysisPrompts[name];

        if (!prompt) {
          throw new Error(`Prompt not found: ${name}`);
        }

        const text = generatePromptText(prompt, args || {});
        return {
          jsonrpc: '2.0',
          id,
          result: {
            description: prompt.description,
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text,
                },
              },
            ],
          },
        };
      }

      case 'resources/list':
        return {
          jsonrpc: '2.0',
          id,
          result: { resources },
        };

      case 'resources/read': {
        const { uri } = params as { uri: string };
        let contents;

        if (uri === 'kolada://municipalities') {
          const municipalities = await dataCache.getOrFetch(
            'municipalities',
            () => koladaClient.fetchAllData<Municipality>('/municipality'),
            86400000
          );
          contents = [
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
                  })),
                },
                null,
                2
              ),
            },
          ];
        } else if (uri === 'kolada://kpi-catalog') {
          const kpis = await dataCache.getOrFetch(
            'kpi-catalog',
            () => koladaClient.fetchAllData<KPI>('/kpi'),
            86400000
          );
          contents = [
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
                  })),
                },
                null,
                2
              ),
            },
          ];
        } else if (uri === 'kolada://api-info') {
          contents = [
            {
              uri,
              mimeType: 'text/markdown',
              text: apiInfoMarkdown,
            },
          ];
        } else {
          throw new Error(`Resource not found: ${uri}`);
        }

        return {
          jsonrpc: '2.0',
          id,
          result: { contents },
        };
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    logger.error('RPC error', { method, error: message });

    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message,
      },
    };
  }
}
