# Kolada MCP Server

[![npm version](https://img.shields.io/npm/v/kolada-mcp-server.svg)](https://www.npmjs.com/package/kolada-mcp-server)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-green.svg)](https://registry.modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**MCP server for Swedish municipality and regional statistics from Kolada API.**

Access 6,000+ Key Performance Indicators (KPIs) covering education, healthcare, environment, economy and more for all 290 Swedish municipalities and 21 regions. Connect LLMs and AI assistants to Sweden's most comprehensive open data source for municipal statistics.

## Installation

### Option 1: npx (Quickest)

Run directly without installation:

```bash
npx kolada-mcp-server
```

### Option 2: Global Install

```bash
npm install -g kolada-mcp-server
kolada-mcp-server
```

### Option 3: Remote Server (No Install)

Use the hosted server - no installation required.

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

**Using npx:**
```json
{
  "mcpServers": {
    "kolada": {
      "command": "npx",
      "args": ["-y", "kolada-mcp-server"]
    }
  }
}
```

**Using global install:**
```json
{
  "mcpServers": {
    "kolada": {
      "command": "kolada-mcp-server"
    }
  }
}
```

**Using remote server:**
```json
{
  "mcpServers": {
    "kolada": {
      "url": "https://kolada-mcp-pafn.onrender.com/mcp"
    }
  }
}
```

### Other MCP Clients

**SSE Transport (e.g., Lovable):**
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

## Features

### 21 Tools in 5 Categories

**KPI Tools**
- `search_kpis` - Full-text search for KPIs
- `get_kpi` - Get KPI details by ID
- `get_kpis` - Batch fetch multiple KPIs
- `get_kpi_groups` - List thematic KPI groups
- `get_kpi_group` - Get group details

**Municipality Tools**
- `search_municipalities` - Search municipalities/regions
- `get_municipality` - Get municipality details
- `get_municipality_groups` - List municipality groups
- `get_municipality_group` - Get group details

**Organizational Unit Tools**
- `search_organizational_units` - Search schools, care facilities, etc.
- `get_organizational_unit` - Get unit details
- `get_ou_types` - List common unit types

**Data Tools**
- `get_kpi_data` - Get actual KPI values (with gender filtering)
- `get_municipality_kpis` - List available KPIs for a municipality
- `compare_municipalities` - Compare municipalities on a KPI
- `get_kpi_trend` - Historical trend analysis

**Analysis Tools**
- `analyze_kpi_across_municipalities` - Statistical analysis with ranking
- `filter_municipalities_by_kpi` - Filter by thresholds
- `compare_kpis` - Pearson correlation between KPIs
- `list_operating_areas` - List operating areas with KPI counts
- `get_kpis_by_operating_area` - Filter KPIs by area

### Key Features

- **Gender Filtering**: Filter data by T (Total), M (Male), K (Female)
- **Intelligent Caching**: 24-hour cache for KPI and municipality catalogs
- **Rate Limiting**: Built-in rate limiting respecting Kolada API limits
- **Dual Transport**: stdio for local, HTTP/SSE for remote
- **Swedish Documentation**: All tool descriptions in Swedish for optimal AI understanding

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp` | GET/POST | Standard MCP endpoint (recommended) |
| `/sse` | GET | Server-Sent Events for streaming |
| `/rpc` | POST | Direct JSON-RPC calls |
| `/health` | GET | Health check |

## Example Usage

Ask your AI assistant:

- "What is the population of Stockholm municipality?"
- "Compare education costs across the 10 largest municipalities"
- "Show me the trend for elderly care costs in Gothenburg over the last 5 years"
- "Which municipalities have the highest proportion of renewable energy?"
- "Find KPIs related to preschool quality"

## About Kolada

[Kolada](https://www.kolada.se/) is the Swedish municipalities and regions database containing key performance indicators. It is maintained by SKR (Swedish Association of Local Authorities and Regions).

**Data Attribution**: When using Kolada data, please cite as: "Source: Kolada"

## Links

- [Kolada Website](https://www.kolada.se/)
- [Kolada API v3 Documentation](https://api.kolada.se/v3/docs)
- [SKR Website](https://skr.se/)

## License

MIT License - see [LICENSE](LICENSE)

This is an independent project and is not officially affiliated with Kolada or SKR.

---

## Changelog

### v2.2.1
- Improved `get_municipality_kpis` - fast and reliable using cached catalog
- Operating area filtering for focused results

### v2.2.0
- 5 new analysis tools for statistics, filtering, and correlation
- Gender filtering (T/M/K) in all data tools
- Batch fetching for large datasets

### v2.1.0
- Added tool annotations for MCP 2024-11-05
- Improved error handling

### v2.0.0
- Complete rewrite with TypeScript
- HTTP server with SSE support
- 21 tools covering all Kolada API capabilities
