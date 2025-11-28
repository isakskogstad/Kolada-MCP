#!/usr/bin/env node
/**
 * Kolada MCP Server v2.1.0
 * Provides access to Swedish municipality and regional data via the Kolada API v3
 *
 * Features:
 * - 16 tools for KPI, municipality, OU, and data retrieval
 * - 6 analysis prompts for guided workflows
 * - 3 resources for metadata catalogs
 * - Tool annotations for LLM optimization
 * - Intelligent caching with 24h TTL
 * - Structured logging
 *
 * @version 2.1.0
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, VERSION } from './server/handlers.js';
import { logger } from './utils/logger.js';

/**
 * Start the server
 */
async function main() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('Server started', { mode: 'stdio', version: VERSION });
  console.error(`Kolada MCP Server v${VERSION} running on stdio`);
}

main().catch((error) => {
  logger.error('Fatal error', { error: error.message });
  console.error('Fatal error in main():', error);
  process.exit(1);
});
