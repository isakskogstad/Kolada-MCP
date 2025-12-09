# Snabbguide: Säkerhetskonfiguration / Quick Guide: Security Configuration

## ⚡ Snabbstart / Quick Start

### 1. Lägg till nödvändiga secrets
Gå till: **Settings → Secrets and variables → Actions**

Lägg till:
- `GITGUARDIAN_API_KEY` - https://www.gitguardian.com/ (gratis för publika repos)
- `BEARER_TOKEN` - https://www.bearer.com/ (gratis för open source)

### 2. Verifiera att workflows fungerar
- Gå till **Actions** tab
- Kontrollera att inga workflows failar på grund av saknade secrets

### 3. Granska Security-fliken
- Gå till **Security** tab
- Kontrollera **Code scanning alerts**
- Åtgärda eventuella befintliga problem

---

## 🔍 Vad händer automatiskt? / What Happens Automatically?

### Vid varje commit/PR:
- ✅ GitGuardian skannar efter secrets
- ✅ TruffleHog verifierar inga nya secrets läggs till
- ✅ CodeQL analyserar kod för säkerhetsbrister
- ✅ Bearer SAST kontrollerar applikationssäkerhet
- ✅ Security Audit kör npm audit och kommenterar på PR

### Schemalagt:
- ✅ **Måndagar 06:00**: CodeQL + Dependabot
- ✅ **Dagligen 02:00**: Security Audit
- ✅ **Lördagar 18:00**: Bearer SAST
- ✅ **Söndagar 00:00**: TruffleHog

---

## 🚨 När en sårbarhet upptäcks / When a Vulnerability is Found

### 1. Automatisk notifiering
Du får en notification från GitHub

### 2. Hitta detaljer
- **Security tab** → Code scanning alerts
- **Actions tab** → Workflow run logs
- **PR comments** (om det gäller en PR)

### 3. Åtgärda problemet
Security Audit ger konkreta förslag:

**För sårbara dependencies:**
```bash
npm audit fix
# eller för breaking changes:
npm audit fix --force
# Testa efter: npm test && npm run build
```

**För exponerade secrets:**
1. Ta bort secret från koden
2. Rotera/återkalla compromised credentials
3. Lägg till i `.env` istället
4. Använd `process.env.SECRET_NAME`

**För kod-sårbarheter:**
- Följ förslag från CodeQL/Bearer
- Uppdatera till säkrare patterns
- Testa ändringarna

---

## 📋 Checklista för PR:s / PR Checklist

Innan merge:
- [ ] Alla security checks är gröna
- [ ] Security Audit har inga kritiska fynd
- [ ] Inga nya secrets exponerade
- [ ] Dependencies uppdaterade (om relevant)
- [ ] SECURITY.md uppdaterad (vid säkerhetsändringar)

---

## 🔧 Felsökning / Troubleshooting

### Workflow failar på secret
**Problem**: `Error: Input required and not supplied: api-key`
**Lösning**: Lägg till motsvarande secret i repository settings

### False positives från secret scanning
**Lösning**: 
1. Verifiera att det INTE är en riktig secret
2. Lägg till i `.gitignore` om det är en testfil
3. Använd GitGuardian's ignore-funktionalitet vid behov

### Dependabot skapar för många PR:s
**Lösning**: Detta är normalt första gången. Granska och merge, eller:
- Stäng PR:s du inte vill ha
- Justera `open-pull-requests-limit` i `dependabot.yml`

### CodeQL tar lång tid
**Normal**: CodeQL-analys kan ta 5-10 minuter första gången
**Optimering**: Redan konfigurerad att köra veckovis

---

## 📚 Läs mer / Read More

- **SECURITY.md** - Fullständig säkerhetspolicy
- **SECURITY_SETUP.md** - Detaljerad teknisk dokumentation
- **README.md** - Översikt över säkerhetsfunktioner

---

## ✅ Status Check

Ditt repository har nu:
- ✅ 6 säkerhetsverktyg aktiva
- ✅ Automatiska sårbarhetsuppdateringar
- ✅ PR-kommentarer med åtgärdsförslag
- ✅ Schemalagda säkerhetsskanningar
- ✅ Dokumenterad säkerhetspolicy
- ✅ Tydlig rapporteringsprocess

**Nästa steg**: Lägg till de två secrets och börja använda systemet! 🚀
