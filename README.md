<p align="center">
  <img src="https://github.com/user-attachments/assets/99408392-8535-45e2-abea-435ad47b91ba" alt="Kolada MCP Server" width="800" />
</p>

<h1 align="center">Kolada MCP Server</h1>

<p align="center">
  <strong>Svenska kommun- och regiondata för AI-assistenter via Model Context Protocol</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/kolada-mcp-server"><img src="https://img.shields.io/npm/v/kolada-mcp-server.svg" alt="npm version" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-2025--03--26-blue.svg" alt="MCP Protocol" /></a>
</p>

---

Kolada MCP Server ger LLMs och AI-assistenter direkt tillgång till [Koladas](https://www.kolada.se/) öppna data via [Model Context Protocol](https://modelcontextprotocol.io/). Sök bland 6 000+ nyckeltal för Sveriges 290 kommuner och 21 regioner – utan att hantera HTTP-anrop eller API-format.

## ✨ Funktioner

- **21 verktyg** för att söka, analysera och jämföra kommundata
- **Könsuppdelad statistik** (totalt/män/kvinnor)
- **Trendanalyser** över tid
- **Benchmarking** mellan kommuner
- **Korrelationsanalys** mellan nyckeltal
- Dokumentation på svenska i MCP-metadatan

---

## 🚀 Snabbstart

### Fjärrserver-URL

Ingen installation krävs – anslut direkt till den hostade servern:

| Transport | URL |
|-----------|-----|
| **Streamable HTTP** (rekommenderas) | `https://kolada-mcp-pafn.onrender.com/mcp` |
| **SSE** (legacy) | `https://kolada-mcp-pafn.onrender.com/sse` |

---

## 📱 Installation per klient

### Claude Web & Claude Desktop

Lägg till som Custom Connector (Pro/Max/Team/Enterprise):

1. Gå till **Settings** → **Connectors**
2. Klicka **Add custom connector**
3. Ange URL: `https://kolada-mcp-pafn.onrender.com/mcp`
4. Klicka **Add**

> 💡 Kräver ingen autentisering – servern är öppen.

---

### Claude Code (CLI)

Lägg till med ett terminalkommando:

```bash
# Streamable HTTP (rekommenderas)
claude mcp add --transport http kolada https://kolada-mcp-pafn.onrender.com/mcp

# SSE (alternativ)
claude mcp add --transport sse kolada https://kolada-mcp-pafn.onrender.com/sse
```

**Scope-alternativ:**
- `--scope local` – endast aktuellt projekt (default)
- `--scope project` – delas med teamet via `.mcp.json`
- `--scope user` – tillgänglig i alla projekt

Verifiera anslutning:
```bash
/mcp
```

---

### ChatGPT (Developer Mode)

ChatGPT stödjer MCP via Custom Connectors:

1. Gå till **Settings** → **Connectors** → **Advanced settings**
2. Aktivera **Developer Mode**
3. Klicka **Create** under Custom Connectors
4. Fyll i:
   - **Name:** Kolada
   - **MCP server URL:** `https://kolada-mcp-pafn.onrender.com/mcp`
5. Klicka **Create**

---

### VS Code (GitHub Copilot)

Skapa `.vscode/mcp.json` i ditt projekt:

```json
{
  "servers": {
    "kolada": {
      "type": "http",
      "url": "https://kolada-mcp-pafn.onrender.com/mcp"
    }
  }
}
```

**Aktivera:**
1. Öppna VS Code Settings → sök "MCP"
2. Aktivera **Chat > MCP**
3. Byt till **Agent Mode** i Copilot
4. Klicka **Start** i mcp.json-filen

Alternativt via Command Palette:
- `Cmd+Shift+P` → **MCP: Add Server** → **HTTP** → ange URL

---

### Cursor

Lägg till i `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "kolada": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://kolada-mcp-pafn.onrender.com/sse"
      ]
    }
  }
}
```

> 📝 Cursor använder SSE-transport via `mcp-remote` proxy.

---

### Windsurf

Öppna `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "kolada": {
      "serverUrl": "https://kolada-mcp-pafn.onrender.com/mcp"
    }
  }
}
```

**Via UI:**
1. **Windsurf Settings** → **Cascade** → **Manage MCPs**
2. Klicka **Add Custom Server +**
3. Ange URL: `https://kolada-mcp-pafn.onrender.com/mcp`
4. Klicka **Refresh Servers**

---

### Gemini CLI

Lägg till i `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "kolada": {
      "httpUrl": "https://kolada-mcp-pafn.onrender.com/mcp"
    }
  }
}
```

Eller via kommando:
```bash
gemini mcp add -t http -s user kolada https://kolada-mcp-pafn.onrender.com/mcp
```

---

### Visual Studio 2022+

Skapa `.mcp.json` i solution-roten:

```json
{
  "mcpServers": {
    "kolada": {
      "type": "http",
      "url": "https://kolada-mcp-pafn.onrender.com/mcp"
    }
  }
}
```

**Aktivera:**
1. **View** → **GitHub Copilot Chat**
2. Välj **Agent** i mode-dropdown
3. Klicka verktygsikonen för att se tillgängliga MCP-verktyg

---

### Lokal installation (stdio)

För offline-användning eller utveckling:

```bash
npm install -g kolada-mcp-server
```

Konfiguration för lokala klienter:

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

Eller från källkod:
```bash
git clone https://github.com/isakskogstad/kolada-mcp.git
cd kolada-mcp
npm install && npm run build
```

---

## ✅ Kompatibilitet

| Klient | Transport | Metod | Status |
|--------|-----------|-------|--------|
| Claude Web/Desktop | Streamable HTTP | Custom Connector (UI) | ✅ |
| Claude Code | Streamable HTTP | CLI: `claude mcp add` | ✅ |
| ChatGPT | Streamable HTTP | Custom Connector (Developer Mode) | ✅ |
| VS Code / Copilot | HTTP | `.vscode/mcp.json` | ✅ |
| Visual Studio | HTTP | `.mcp.json` | ✅ |
| Cursor | SSE | `~/.cursor/mcp.json` + mcp-remote | ✅ |
| Windsurf | Streamable HTTP | `mcp_config.json` / UI | ✅ |
| Gemini CLI | HTTP | `~/.gemini/settings.json` / CLI | ✅ |
| Stdio (lokal) | stdio | JSON-config med command | ✅ |

---

## 🛠️ Verktyg

### Nyckeltal (KPIs)

| Verktyg | Beskrivning |
|---------|-------------|
| `search_kpis` | Fritextsökning på nyckeltal |
| `get_kpi` | Detaljer för ett KPI |
| `get_kpis` | Hämta flera KPIs samtidigt |
| `get_kpi_groups` | Lista tematiska KPI-grupper |
| `get_kpi_group` | Detaljer för en KPI-grupp |

### Kommuner & regioner

| Verktyg | Beskrivning |
|---------|-------------|
| `search_municipalities` | Sök kommuner och regioner |
| `get_municipality` | Detaljer för en kommun |
| `get_municipality_groups` | Lista kommungrupper |
| `get_municipality_group` | Detaljer för kommungrupp |

### Organisationsenheter

| Verktyg | Beskrivning |
|---------|-------------|
| `search_organizational_units` | Sök skolor, förskolor, äldreboenden m.m. |
| `get_organizational_unit` | Detaljer för en enhet |
| `get_ou_types` | Enhetstyper (V11=förskola, V15=grundskola, etc.) |

### Data & jämförelser

| Verktyg | Beskrivning |
|---------|-------------|
| `get_kpi_data` | Faktiska värden för ett KPI |
| `get_municipality_kpis` | Tillgängliga KPIs för en kommun |
| `compare_municipalities` | Jämför kommuner för ett KPI |
| `get_kpi_trend` | Trend över tid |

### Analys

| Verktyg | Beskrivning |
|---------|-------------|
| `analyze_kpi_across_municipalities` | Statistik med min/max/medel/median och ranking |
| `filter_municipalities_by_kpi` | Filtrera på tröskelvärden |
| `compare_kpis` | Pearson-korrelation mellan KPIs |
| `list_operating_areas` | Lista verksamhetsområden |
| `get_kpis_by_operating_area` | KPIs per verksamhetsområde |

---

## 💡 Exempel

**Sök gymnasiebehörighet i Kungälv:**
```
→ search_municipalities("Kungälv") 
→ get_kpi_data("N15424", municipality_id="1482")
```

**Jämför skolresultat mellan kommuner:**
```
→ compare_municipalities("N15504", ["0180", "1480", "1281"])
```

**Hitta kommuner med hög lärartäthet:**
```
→ filter_municipalities_by_kpi("N11811", operator="lt", threshold=5, year=2023)
```

---

## 📚 Om Kolada

[Kolada](https://www.kolada.se/) är en öppen databas med nyckeltal för svenska kommuner och regioner. Databasen förvaltas av [RKA](https://rfrka.se/) (Rådet för främjande av kommunala analyser).

Vid användning av data, ange: **Källa: Kolada**

**Resurser:**
- [Kolada webbplats](https://www.kolada.se/)
- [Kolada API v3 dokumentation](https://api.kolada.se/v3/docs)
- [RKA webbplats](https://rfrka.se/)

---

## 📄 Licens

MIT License – se [LICENSE](LICENSE)

---

<p align="center">
  <sub>Detta är ett community-projekt och är inte officiellt knutet till Kolada eller RKA.</sub>
</p>
