<img width="850" height="371" alt="KOLADA (5)" src="https://github.com/user-attachments/assets/9dd18a33-0f97-4490-af45-5b5a32dc15d0" />

# Kolada MCP Server

[![npm version](https://img.shields.io/npm/v/kolada-mcp-server.svg)](https://www.npmjs.com/package/kolada-mcp-server)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-green.svg)](https://registry.modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**MCP-server för svensk kommun- och regionstatistik från Kolada API.**

Kolada MCP-server ger LLM:er och AI-chatbotar tillgång till **5 000+ nyckeltal (KPI:er)** inom 264 verksamhetsområden för Sveriges 290 kommuner och 21 regioner. Data omfattar utbildning, vård, ekonomi, miljö, befolkning med mera.

> **English:** Kolada MCP Server connects LLMs and AI chatbots to 5,000+ Key Performance Indicators (KPIs) across 264 operating areas for all 290 Swedish municipalities and 21 regions. Kolada is Sweden's most comprehensive open data source for municipal and regional statistics.

## Installation

### Fjärrserver (rekommenderas)

Använd den hostade servern direkt – ingen lokal installation krävs:

```
https://kolada-mcp-pafn.onrender.com/mcp
```

Se [klientkonfiguration](#klientkonfiguration) nedan för hur du ansluter från din AI-klient.

### Lokal installation

**Med npx (snabbast):**
```bash
npx kolada-mcp-server
```

**Med global installation:**
```bash
npm install -g kolada-mcp-server
kolada-mcp-server
```

## Klientkonfiguration

### Claude Web (claude.ai)

1. Gå till **Inställningar** → **Integreringar** (Connectors)
2. Klicka **Lägg till anpassad anslutning** (Add custom connector)
3. Ange URL:
   ```
   https://kolada-mcp-pafn.onrender.com/mcp
   ```
4. Klicka **Lägg till**

### Claude Desktop

Lägg till i konfigurationsfilen:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Med fjärrserver:**
```json
{
  "mcpServers": {
    "kolada": {
      "url": "https://kolada-mcp-pafn.onrender.com/mcp"
    }
  }
}
```

**Med npx (lokal):**
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

### Claude Code (CLI)

**Med fjärrserver (HTTP):**
```bash
claude mcp add --transport http kolada https://kolada-mcp-pafn.onrender.com/mcp
```

**Med fjärrserver (SSE):**
```bash
claude mcp add --transport sse kolada https://kolada-mcp-pafn.onrender.com/sse
```

**Med npx (lokal):**
```bash
claude mcp add kolada -- npx -y kolada-mcp-server
```

Verifiera med:
```bash
claude mcp list
```

### ChatGPT (Developer Mode)

1. Aktivera **Developer Mode** i ChatGPT-inställningar → Connectors
2. Klicka **Create** för att skapa en ny connector
3. Ange:
   - **Connector name:** Kolada
   - **Description:** Swedish municipal statistics
   - **Connector URL:**
     ```
     https://kolada-mcp-pafn.onrender.com/mcp
     ```
4. Klicka **Create**

### OpenAI Codex CLI

Lägg till i `~/.codex/config.toml`:

```toml
[mcp_servers.kolada]
url = "https://kolada-mcp-pafn.onrender.com/sse"
```

Eller via CLI:
```bash
codex mcp add kolada --url https://kolada-mcp-pafn.onrender.com/sse
```

### Gemini CLI

Lägg till i `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "kolada": {
      "url": "https://kolada-mcp-pafn.onrender.com/sse"
    }
  }
}
```

Eller via CLI:
```bash
gemini mcp add kolada --url https://kolada-mcp-pafn.onrender.com/sse
```

### Firebase Studio / Android Studio

Lägg till i `mcp.json` i projektroten:

```json
{
  "mcpServers": {
    "kolada": {
      "url": "https://kolada-mcp-pafn.onrender.com/sse"
    }
  }
}
```

### Andra MCP-klienter

**SSE-transport (t.ex. Lovable):**
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

## Verktyg

### Nyckeltal (KPI)

| Verktyg | Beskrivning |
|---------|-------------|
| `search_kpis` | Fritextsökning bland 5 000+ nyckeltal |
| `get_kpi` | Hämta metadata för ett nyckeltal via ID |
| `get_kpis` | Hämta flera nyckeltal samtidigt (max 25) |
| `get_kpi_groups` | Lista tematiska grupper |
| `get_kpi_group` | Hämta alla nyckeltal i en grupp |
| `list_operating_areas` | Lista 264 verksamhetsområden |
| `get_kpis_by_operating_area` | Filtrera nyckeltal per verksamhetsområde |

### Kommuner och regioner

| Verktyg | Beskrivning |
|---------|-------------|
| `search_municipalities` | Sök bland 290 kommuner och 21 regioner |
| `get_municipality` | Hämta detaljer via kommun-ID (t.ex. "0180") |
| `get_municipality_groups` | Lista kommungrupper |
| `get_municipality_group` | Hämta kommuner i en grupp |

### Organisationsenheter

| Verktyg | Beskrivning |
|---------|-------------|
| `search_organizational_units` | Sök skolor, äldreboenden m.m. |
| `get_organizational_unit` | Hämta enhetsdetaljer |
| `get_ou_types` | Lista enhetstyper |

### Data

| Verktyg | Beskrivning |
|---------|-------------|
| `get_kpi_data` | Hämta värden med könsfiltrering (T/M/K) |
| `get_municipality_kpis` | Lista KPI:er för en kommun |
| `compare_municipalities` | Jämför 2–10 kommuner |
| `get_kpi_trend` | Tidsserieanalys |

### Analys

| Verktyg | Beskrivning |
|---------|-------------|
| `analyze_kpi_across_municipalities` | Statistik + rankning |
| `filter_municipalities_by_kpi` | Filtrera efter tröskelvärde |
| `compare_kpis` | Korrelation mellan nyckeltal |

## Verksamhetsområden (urval)

| Område | Antal KPI:er |
|--------|-------------|
| Kommunen, övergripande | 553 |
| Grundskola åk 0-9 | 470 |
| Gymnasieskola åk 1-3 | 215 |
| Hälso- och sjukvård | 204 |
| Befolkning | 199 |
| Region/Landsting | 151 |
| Förskoleverksamhet | 135 |
| Vuxenutbildning | 126 |

*Totalt 264 verksamhetsområden.*

## Enhetstyper

| Kod | Typ |
|-----|-----|
| V11 | Förskola |
| V15 | Grundskola |
| V16 | Gymnasieskola |
| V17 | Anpassad skola |
| V18 | Vuxenutbildning |
| V21 | Äldreboende |
| V31 | Fritidshem |

## Huvudfunktioner

- **Könsfiltrering** – T (totalt), M (män), K (kvinnor)
- **Intelligent cachning** – 24-timmarscache för kataloger
- **Hastighetsbegränsning** – Respekterar Koladas API-gränser
- **Dubbla transportlägen** – stdio lokalt, HTTP/SSE för fjärråtkomst
- **Svensk dokumentation** – Optimerat för svenska AI-assistenter

## API-endpoints

| Endpoint | Metod | Beskrivning |
|----------|-------|-------------|
| `/mcp` | GET/POST | Standard MCP (rekommenderas) |
| `/sse` | GET | Server-Sent Events |
| `/rpc` | POST | JSON-RPC |
| `/health` | GET | Hälsokontroll |

## Exempelanvändning

Fråga din AI-assistent:

- "Hur stor är befolkningen i Stockholm?" → 988 943 (2023)
- "Vilka kommuner har störst befolkning?"
- "Jämför utbildningskostnader i Göteborg och Malmö"
- "Visa trenden för äldreomsorgskostnader i Uppsala de senaste 5 åren"
- "Hitta nyckeltal för förskoleverksamhet"

## Om Kolada

[Kolada](https://www.kolada.se/) är databasen för nyckeltal i Sveriges kommuner och regioner. Den förvaltas av SKR (Sveriges Kommuner och Regioner).

**Datakälla:** Ange "Källa: Kolada" vid användning.

## Länkar

- [Kolada](https://www.kolada.se/)
- [Kolada API v3](https://api.kolada.se/v3/docs)
- [SKR](https://skr.se/)

## Licens

MIT – se [LICENSE](LICENSE)
Oberoende projekt utan officiell koppling till Kolada eller SKR.

Skapat av Isak Skogstad. 
