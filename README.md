# Kolada MCP Server


[![npm version](https://img.shields.io/npm/v/kolada-mcp-server.svg)](https://www.npmjs.com/package/kolada-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP 2024-11-05](https://img.shields.io/badge/MCP-2024--11--05-blue.svg)](https://modelcontextprotocol.io/)

Kolada MCP Server ger tillgång till svenska kommun- och regiondata via Kolada API v3. Anslut LLMs eller AI-chatbotar för att enkelt söka i Koladas öppna data om kommuner, regioner, skolor, äldreboenden och nyckeltal (KPIs) – utan att hantera HTTP-anrop eller API-format. Installera lokalt (för ex. claude code, codex m.m.) eller anslut via MCP server remote URL (för ex. ChatGPT, Claude web m.m.)

---

## Funktioner

### Verktyg (tools)

Servern exponerar **21 verktyg** uppdelade i fem huvudområden:

- **Nyckeltal (KPIs)**
  - `search_kpis` – fritextsökning på nyckeltal
  - `get_kpi` – detaljer för ett KPI
  - `get_kpis` – hämta flera KPIs samtidigt
  - `get_kpi_groups` – lista tematiska KPI-grupper
  - `get_kpi_group` – detaljer för en KPI-grupp

- **Kommuner och regioner**
  - `search_municipalities` – sök kommuner/regioner
  - `get_municipality` – detaljer för en kommun
  - `get_municipality_groups` – lista kommungrupper
  - `get_municipality_group` – detaljer för kommungrupp

- **Organisationsenheter (skolor, vård m.m.)**
  - `search_organizational_units` – sök skolor, förskolor, äldreboenden m.m.
  - `get_organizational_unit` – detaljer för en enhet
  - `get_ou_types` – vanliga enhetstyper (t.ex. förskola, grundskola)

- **Data och jämförelser**
  - `get_kpi_data` – faktiska värden för ett KPI (med könsfiltrering T/M/K)
  - `get_municipality_kpis` – visa tillgängliga KPIs för en kommun (filtrera på verksamhetsområde)
  - `compare_municipalities` – jämför kommuner för ett KPI (med könsfiltrering)
  - `get_kpi_trend` – trend över tid för ett KPI i en kommun (med könsfiltrering)

- **Analys (nytt i v2.2.0)** 🆕
  - `analyze_kpi_across_municipalities` – statistisk analys med min/max/medel/median och ranking
  - `filter_municipalities_by_kpi` – filtrera kommuner efter tröskelvärden (över/under/mellan)
  - `compare_kpis` – Pearson-korrelation mellan två KPIs
  - `list_operating_areas` – lista verksamhetsområden med antal KPIs
  - `get_kpis_by_operating_area` – filtrera KPIs per verksamhetsområde

Alla verktyg och argument är dokumenterade på svenska direkt i MCP-metadatan, vilket gör det lätt för AI-assistenter att använda servern utan extra dokumentation.

---

## Nyheter i v2.2.1

- **Förbättrad `get_municipality_kpis`** – snabb och pålitlig utan timeout
  - Använder cachad KPI-katalog istället för problematisk API-endpoint
  - Filtrera på verksamhetsområde för fokuserade resultat
  - Visar sammanfattning av tillgängliga verksamhetsområden

## Nyheter i v2.2.0

- **5 nya analysverktyg** för statistik, filtrering och korrelationsanalys
- **Könsfiltrering (T/M/K)** i alla data-verktyg
  - T = Totalt, M = Män, K = Kvinnor
- Batch-hämtning för att hantera stora datamängder utan timeout

---

## Snabbstart

### Alternativ A: Fjärrserver (rekommenderas)

Ingen installation krävs – använd den publika MCP-servern:

```text
https://kolada-mcp-pafn.onrender.com/mcp
```

Exempel på konfiguration i en MCP-klient:

```json
{
  "mcpServers": {
    "kolada": {
      "url": "https://kolada-mcp-pafn.onrender.com/mcp"
    }
  }
}
```

#### SSE-transport (t.ex. Lovable)

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

### Alternativ B: Lokal installation

Installera via npm:

```bash
npm install -g kolada-mcp-server
```

Eller från källkod:

```bash
git clone https://github.com/isakskogstad/kolada-mcp.git
cd kolada-mcp
npm install
npm run build
```

---

## HTTP-server och endpoints

### Publik fjärrserver

```text
https://kolada-mcp-pafn.onrender.com
```

### Endpoints

| Endpoint | Metod | Beskrivning |
|---------|-------|-------------|
| `/mcp`  | GET/POST | Standard MCP-endpoint (rekommenderad) |
| `/sse`  | GET | Server-Sent Events för streaming |
| `/rpc`  | POST | Direkta JSON-RPC-anrop |
| `/health` | GET | Hälsokontroll |

---

## Om Kolada

Kolada är en databas med nyckeltal (KPIs) för svenska kommuner och regioner. Databasen förvaltas av SKR (Sveriges Kommuner och Regioner).

När du använder data från Kolada bör du ange:
**"Källa: Kolada"**

Mer information:

- [Kolada – webbplats](https://www.kolada.se/)
- [Kolada API v3 – dokumentation](https://api.kolada.se/v3/docs)
- [SKR – webbplats](https://skr.se/)

---

## Licens och ansvar

Projektet är licensierat under MIT-licensen – se filen [LICENSE](LICENSE).

Detta är ett fristående projekt och är inte officiellt knutet till Kolada eller SKR.
