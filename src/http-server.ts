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
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { marked } from 'marked';
import { dataCache } from './utils/cache.js';
import { logger } from './utils/logger.js';
import { createMCPServer, handleRPCRequest, VERSION } from './server/handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000');

/**
 * Start HTTP server with SSE transport
 */
async function startHTTPServer() {
  const app = express();

  app.use(express.json());

  // Root endpoint - serve README.md as HTML
  app.get('/', (req, res) => {
    try {
      // Read README.md from project root
      const readmePath = join(__dirname, '..', 'README.md');
      const readmeContent = readFileSync(readmePath, 'utf-8');

      // Convert markdown to HTML
      const htmlContent = marked(readmeContent);

      // Serve with GitHub-style CSS
      res.send(`
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kolada MCP Server</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
      color: #24292f;
      background-color: #ffffff;
    }

    img {
      max-width: 100%;
      height: auto;
    }

    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
      border-bottom: 1px solid #d8dee4;
      padding-bottom: 0.3em;
    }

    h1 { font-size: 2em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }

    code {
      background-color: #f6f8fa;
      padding: 0.2em 0.4em;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
      font-size: 85%;
    }

    pre {
      background-color: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow: auto;
    }

    pre code {
      background-color: transparent;
      padding: 0;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
    }

    table th, table td {
      padding: 6px 13px;
      border: 1px solid #d8dee4;
    }

    table th {
      background-color: #f6f8fa;
      font-weight: 600;
    }

    table tr:nth-child(2n) {
      background-color: #f6f8fa;
    }

    a {
      color: #0969da;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    blockquote {
      padding: 0 1em;
      color: #656d76;
      border-left: 0.25em solid #d8dee4;
      margin: 0 0 16px 0;
    }

    ul, ol {
      padding-left: 2em;
    }

    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
      `);
    } catch (error) {
      logger.error('Error serving README', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).send('Error loading documentation');
    }
  });

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

  // MCP endpoint - standard path for remote MCP servers
  // Supports both GET (SSE) and POST (JSON-RPC) for maximum compatibility
  app.get('/mcp', async (req, res) => {
    logger.info('MCP SSE connection via /mcp', { ip: req.ip });

    const server = createMCPServer();
    const transport = new SSEServerTransport('/mcp', res);

    await server.connect(transport);

    req.on('close', () => {
      logger.info('MCP SSE connection closed', { ip: req.ip });
    });
  });

  app.post('/mcp', async (req, res) => {
    logger.debug('MCP RPC request via /mcp', { body: req.body });
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
║  MCP Endpoint:   /mcp (recommended for remote clients)   ║
║  SSE Endpoint:   /sse                                    ║
║  RPC Endpoint:   /rpc                                    ║
║  Health Check:   /health                                 ║
║  Auth:           🌐 Open Access (No authentication)      ║
╚══════════════════════════════════════════════════════════╝

📖 Usage:
   Remote MCP (ChatGPT, Claude Web): http://localhost:${PORT}/mcp
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
