# Security Policy

## Säkerhetsöversikt / Security Overview

Kolada MCP Server tar säkerhet på allvar. Detta dokument beskriver våra säkerhetsrutiner och hur man rapporterar sårbarheter.

_Kolada MCP Server takes security seriously. This document describes our security practices and how to report vulnerabilities._

## Automatisk Säkerhetsskanning / Automated Security Scanning

Vi använder flera lager av automatisk säkerhetsskanning:

### 1. **CodeQL Analysis**
- Kör automatiskt vid varje push och pull request till main
- Analyserar kod för vanliga säkerhetsbrister
- Veckovis schemalagd skanning
- Resultat: GitHub Security → Code scanning alerts

### 2. **Secret Scanning**
Vi använder två verktyg för att upptäcka exponerade hemligheter:

#### GitGuardian
- Skannar commits för API-nycklar, lösenord och tokens
- Kör vid push och pull requests
- Upptäcker 350+ typer av secrets

#### TruffleHog
- Kompletterande scanning av historiska commits
- Veckovis schemalagd skanning
- Verifierar upptäckta secrets

### 3. **Bearer SAST**
- Static Application Security Testing
- Identifierar säkerhetsrisker i koden
- Veckovis schemalagd skanning
- OWASP Top 10 coverage

### 4. **Dependabot**
- Automatiska säkerhetsuppdateringar för dependencies
- Veckovisa kontroller av npm, GitHub Actions och Docker
- Automatiska pull requests för säkerhetspatchar

## Stödda Versioner / Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Rapportera en Sårbarhet / Reporting a Vulnerability

### Svenska
Om du upptäcker en säkerhetsbrist i Kolada MCP Server:

1. **PUBLICERA INTE** sårbarheten i en publik issue
2. Skicka ett e-postmeddelande till säkerhetsansvarig
3. Inkludera:
   - Beskrivning av sårbarheten
   - Steg för att reproducera
   - Potentiell påverkan
   - Förslag på åtgärd (om möjligt)

Vi strävar efter att:
- Bekräfta mottagande inom 48 timmar
- Ge en första bedömning inom 7 dagar
- Hålla dig informerad om framsteg
- Kreditera dig i release notes (om du önskar)

### English
If you discover a security vulnerability in Kolada MCP Server:

1. **DO NOT** disclose the vulnerability publicly in an issue
2. Send an email to the security team
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if possible)

We aim to:
- Acknowledge receipt within 48 hours
- Provide initial assessment within 7 days
- Keep you informed of progress
- Credit you in release notes (if desired)

## Säkerhetsåtgärder i Koden / Security Measures in Code

### Miljövariabler / Environment Variables
- Inga hårdkodade hemligheter i källkoden
- Alla känsliga värden hanteras via miljövariabler
- `.env.example` tillhandahålls för referens

### API-säkerhet / API Security
- Rate limiting implementerat med Bottleneck
- Request timeout konfigurerad (30s default)
- Retry logic med exponential backoff
- Ingen caching av känslig data

### Dependencies
- Regular automated security updates via Dependabot
- npm audit runs as part of CI/CD
- Minimal dependency footprint

## Säkerhetsrelaterade Konfigurationer / Security-Related Configurations

### Rekommenderade Miljövariabler
```bash
# API Configuration
KOLADA_API_BASE_URL=https://api.kolada.se/v3
KOLADA_RATE_LIMIT=5
KOLADA_TIMEOUT=30000

# Logging
LOG_LEVEL=info  # använd 'debug' endast i utveckling
```

### Produktionsdistribution / Production Deployment
- Använd alltid HTTPS
- Sätt lämpliga CORS-headers
- Implementera autentisering för känsliga endpoints
- Överväg att använda API-gateway

## Kontakt / Contact

För säkerhetsfrågor, kontakta:
- **Repository:** https://github.com/isakskogstad/kolada-mcp
- **Issues:** https://github.com/isakskogstad/kolada-mcp/issues (för icke-kritiska frågor)

## Ansvarsfriskrivning / Disclaimer

Kolada MCP Server är utvecklad av Isak Skogstad och är inte officiellt associerad med Kolada eller Sveriges Kommuner och Regioner (SKR). Projektet använder Koladas öppna API enligt deras användarvillkor.

_Kolada MCP Server is developed by Isak Skogstad and is not officially associated with Kolada or Swedish Association of Local Authorities and Regions (SKR). This project uses Kolada's open API according to their terms of service._

## Tack till / Thanks to

Vi uppskattar ansvarsfull säkerhetsrapportering och kommer att kreditera forskare som rapporterar giltiga sårbarheter (om de önskar).

_We appreciate responsible security disclosure and will credit researchers who report valid vulnerabilities (if they wish)._
