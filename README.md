# Kolada MCP Server

> **MCP server providing access to Swedish municipality and regional data through the Kolada API v3**

[![npm version](https://img.shields.io/npm/v/kolada-mcp-server.svg)](https://www.npmjs.com/package/kolada-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP 2024-11-05](https://img.shields.io/badge/MCP-2024--11--05-blue.svg)](https://modelcontextprotocol.io/)

## 🌟 Features

### Core Capabilities

- **16 Tools** for comprehensive data access
  - 5 KPI tools (search, retrieve, groups)
  - 4 Municipality tools (search, groups, metadata)
  - 3 Organizational Unit tools (schools, care facilities)
  - 4 Data Retrieval tools (KPI data, comparisons, trends)

- **6 Prompts** for guided analysis workflows
  - Municipality analysis and comparisons
  - Trend analysis over time
  - School discovery and evaluation
  - Regional performance comparisons
  - KPI exploration and discovery

- **3 Resources** for metadata catalogs
  - Complete municipalities list
  


## 📦 Quick Start

### Option 1: Remote Server (Recommended for ChatGPT, Claude Web)

**No installation required!** Use the public MCP server:

```
https://kolada-mcp-pafn.onrender.com/mcp
```

Configure in your MCP client:
```json
{
  "mcpServers": {
    "kolada": {
      "url": "https://kolada-mcp-pafn.onrender.com/mcp"
    }
  }
}
```

### Option 2: Local Installation (Claude Code, Cursor, etc.)

```bash
npm install -g kolada-mcp-server
```

Or from source:

```bash
git clone https://github.com/isakskogstad/kolada-mcp.git
cd kolada-mcp
npm install
npm run build
```

## 🚀 Usage with Claude Desktop/Claude Code

Add to your Claude Desktop configuration file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "kolada": {
      "command": "node",
      "args": ["/path/to/kolada-mcp-server/dist/index.js"]
    }
  }
}
```

Or if installed via npm:

```json
{
  "mcpServers": {
    "kolada": {
      "command": "kolada-mcp-server"
    }
  }
}
```

Restart Claude Desktop to load the server.

## 🌐 Remote MCP Server (ChatGPT, Claude Web, Lovable)

The Kolada MCP server is available as a public remote server - **no installation required!**

### Public Server URL

```
https://kolada-mcp-pafn.onrender.com/mcp
```

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp` | GET/POST | Standard MCP endpoint (recommended) |
| `/sse` | GET | Server-Sent Events for streaming |
| `/rpc` | POST | JSON-RPC direct requests |
| `/health` | GET | Health check |

### Configuration Examples

**For ChatGPT / Claude Web / Generic MCP Client:**
```json
{
  "mcpServers": {
    "kolada": {
      "url": "https://kolada-mcp-pafn.onrender.com/mcp"
    }
  }
}
```

**For Lovable (SSE transport):**
```json
{
  "mcpServers": {
    "kolada": {
      "url": "https://kolada-mcp-pafn.onrender.com/sse",
      "transport": "sse"
    }
  }
}
```

### Self-Hosting (Optional)

If you prefer to run your own HTTP server:

```bash
npm run dev:http  # Development
npm run start:http # Production (after npm run build)
```



## 🎯 Prompts (v2.0)

Kolada MCP Server includes 6 guided analysis workflows that help AI assistants perform common analysis tasks:


#### `kpi_discovery`
Discover and explore available key performance indicators.

**Arguments:**
- `query` (optional): Search keywords for KPIs
- `operating_area` (optional): Operating area filter (e.g., "Utbildning")


## 📚 Resources

### `kolada://municipalities`
Complete list of Swedish municipalities and county councils.

### `kolada://kpi-catalog`
Complete catalog of available KPIs with metadata.

### `kolada://api-info`
API information, endpoints, rate limits, and usage guidelines.

## 💡 Usage Examples

### Example 1: Search for education-related KPIs

```
User: Find KPIs related to education
Assistant uses: search_kpis with query="skola"
```

### Example 2: Compare municipalities

```
User: Compare Stockholm and Gothenburg on teacher-student ratio
Assistant uses:
1. search_municipalities to find Stockholm (0180) and Gothenburg (1480)
2. search_kpis to find the relevant KPI
3. compare_municipalities with those IDs and the KPI
```

### Example 3: Analyze trends

```
User: Show me how Stockholm's healthcare spending has changed over the last 5 years
Assistant uses:
1. search_municipalities to find Stockholm (0180)
2. search_kpis with query="hälso- och sjukvård"
3. get_kpi_trend with the selected KPI and Stockholm's ID
```

## 🏗️ Architecture

```
kolada-mcp-server/
├── src/
│   ├── index.ts                 # Stdio entry point
│   ├── http-server.ts           # HTTP/SSE entry point
│   ├── server/
│   │   └── handlers.ts          # Shared MCP handlers (v2.1)
│   ├── config/
│   │   ├── constants.ts         # API configuration
│   │   └── types.ts             # TypeScript type definitions
│   ├── api/
│   │   └── client.ts            # HTTP client with rate limiting
│   ├── tools/
│   │   ├── kpi-tools.ts         # KPI search & retrieval tools
│   │   ├── municipality-tools.ts # Municipality tools
│   │   ├── ou-tools.ts          # Organizational unit tools
│   │   └── data-tools.ts        # Data retrieval tools
│   ├── prompts/
│   │   └── analysis-prompts.ts  # Analysis prompt templates
│   └── utils/
│       ├── cache.ts             # In-memory caching
│       ├── errors.ts            # Error handling utilities
│       └── logger.ts            # Structured logging (v2.1)
├── dist/                        # Compiled JavaScript
└── package.json
```

## 🔧 Configuration

Environment variables (optional):

```bash
KOLADA_API_BASE_URL=https://api.kolada.se/v3  # API base URL
KOLADA_RATE_LIMIT=5                            # Requests per second
KOLADA_CACHE_TTL=86400                         # Cache TTL in seconds
KOLADA_TIMEOUT=30000                           # Request timeout in ms
```

## 📖 About Kolada

Kolada is a database containing key performance indicators (KPIs) for Swedish municipalities and regions. The database is maintained by SKR (Sveriges Kommuner och Regioner / Swedish Association of Local Authorities and Regions).

### Data Attribution

When using Kolada data, please cite as: **"Källa: Kolada"**

### Official Resources

- [Kolada Website](https://www.kolada.se/)
- [API Documentation](https://api.kolada.se/v3/docs)
- [SKR Website](https://skr.se/)


## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## ⚠️ Disclaimer

This is an independent project and is not officially associated with Kolada or SKR.

---

**Made with ❤️ for the Swedish open data community**
