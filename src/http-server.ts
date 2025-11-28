#!/usr/bin/env node
/**
 * Kolada MCP HTTP Server v2.1.0
 * Provides HTTP/SSE transport for the Kolada MCP server
 *
 * Supports:
 * - SSE endpoint for real-time streaming
 * - JSON-RPC endpoint for direct requests
 * - Health check endpoint
 *
 * @version 2.1.0
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import { dataCache } from './utils/cache.js';
import { logger } from './utils/logger.js';
import { createMCPServer, handleRPCRequest, VERSION } from './server/handlers.js';

const PORT = parseInt(process.env.PORT || '3000');

/**
 * Start HTTP server with SSE transport
 */
async function startHTTPServer() {
  const app = express();

  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'kolada-mcp-server',
      version: VERSION,
      access: 'open',
      cache_stats: dataCache.getStats(),
    });
  });

  // MCP SSE endpoint (open access)
  app.get('/sse', async (req, res) => {
    logger.info('SSE connection established', { ip: req.ip });

    const server = createMCPServer();
    const transport = new SSEServerTransport('/message', res);

    await server.connect(transport);

    // Handle client disconnect
    req.on('close', () => {
      logger.info('SSE connection closed', { ip: req.ip });
    });
  });

  // MCP message endpoint (for sending messages via POST)
  app.post('/message', async (req, res) => {
    logger.debug('Message received', { body: req.body });
    res.json({ received: true });
  });

  // JSON-RPC endpoint (for direct POST requests without SSE)
  app.post('/rpc', async (req, res) => {
    const response = await handleRPCRequest(req.body);
    res.json(response);
  });

  app.listen(PORT, () => {
    logger.info('HTTP server started', { port: PORT, version: VERSION });

    console.log(`
╔══════════════════════════════════════════════════════════╗
║  🚀 Kolada MCP HTTP Server v${VERSION}                       ║
╟──────────────────────────────────────────────────────────╢
║  Port:           ${PORT.toString().padEnd(42)}║
║  SSE Endpoint:   /sse                                    ║
║  RPC Endpoint:   /rpc                                    ║
║  Health Check:   /health                                 ║
║  Auth:           🌐 Open Access (No authentication)      ║
╚══════════════════════════════════════════════════════════╝

📖 Usage with LLMs (Lovable, etc):
   SSE Endpoint: http://localhost:${PORT}/sse
   RPC Endpoint: http://localhost:${PORT}/rpc

   No authentication required - open access for all LLMs
    `);
  });
}

/**
 * Main entry point - supports both stdio and HTTP modes
 */
async function main() {
  const mode = process.env.MCP_MODE || 'stdio';

  if (mode === 'http') {
    await startHTTPServer();
  } else {
    // Original stdio mode
    const server = createMCPServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('Server started', { mode: 'stdio', version: VERSION });
    console.error(`Kolada MCP Server v${VERSION} running on stdio`);
  }
}

main().catch((error) => {
  logger.error('Fatal error', { error: error.message });
  console.error('Fatal error:', error);
  process.exit(1);
});
