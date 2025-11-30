# MCP Registry Submission Guide

## Quick Start

Run the preparation script to validate your configuration:

```bash
chmod +x scripts/prepare-mcp-submission.sh
./scripts/prepare-mcp-submission.sh
```

Or trigger the GitHub Actions workflow:

```bash
# Create and push a tag
git tag -a v2.2.1 -m "MCP Registry submission v2.2.1"
git push origin v2.2.1

# Or manually trigger via GitHub UI
# Go to: Actions → Publish to MCP Registry → Run workflow
```

## Manual Submission Process

### Step 1: Fork MCP Servers Repository

1. Visit: https://github.com/modelcontextprotocol/servers
2. Click **Fork** button (top right)
3. Create fork in your account

### Step 2: Clone and Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/servers.git
cd servers

# Add upstream remote
git remote add upstream https://github.com/modelcontextprotocol/servers.git

# Create branch
git checkout -b add-kolada-mcp
```

### Step 3: Add Your Server

```bash
# Create directory structure
mkdir -p src/servers/io.github.isakskogstad

# Copy server.json
cp /path/to/kolada-mcp/server.json src/servers/io.github.isakskogstad/kolada-mcp.json
```

### Step 4: Commit Changes

```bash
# Add file
git add src/servers/io.github.isakskogstad/kolada-mcp.json

# Commit
git commit -m "Add Kolada MCP Server - Swedish municipality statistics"

# Push to your fork
git push origin add-kolada-mcp
```

### Step 5: Create Pull Request

1. Go to: https://github.com/modelcontextprotocol/servers/compare
2. Click **compare across forks**
3. Select:
   - **base repository:** modelcontextprotocol/servers
   - **base:** main
   - **head repository:** YOUR_USERNAME/servers
   - **compare:** add-kolada-mcp
4. Click **Create pull request**

### Step 6: Fill PR Details

**Title:**
```
Add Kolada MCP Server
```

**Description:**
```markdown
## New Server Submission: Kolada MCP Server

### Description
MCP server providing access to Swedish municipality and regional statistics from the Kolada API. Offers 5,000+ KPIs across 264 operating areas for all 290 Swedish municipalities and 21 regions.

### Server Details
- **Name:** io.github.isakskogstad/kolada-mcp
- **NPM Package:** kolada-mcp-server
- **Version:** 2.2.1
- **License:** MIT
- **Repository:** https://github.com/isakskogstad/kolada-mcp
- **Website:** https://github.com/isakskogstad/kolada-mcp

### Features
- 5,000+ Key Performance Indicators (KPIs)
- 264 operating areas (education, healthcare, economy, environment, etc.)
- 290 Swedish municipalities + 21 regions
- Gender-based filtering (Total/Male/Female)
- Remote endpoints (HTTP + SSE)
- NPM package for local installation
- Comprehensive Swedish documentation

### Transport Options
- **stdio:** via NPM package (npx kolada-mcp-server)
- **HTTP:** https://kolada-mcp-pafn.onrender.com/mcp
- **SSE:** https://kolada-mcp-pafn.onrender.com/sse

### Tools Provided
- KPI search and retrieval (search_kpis, get_kpi, get_kpis)
- Municipality and region lookup (search_municipalities, get_municipality)
- Organizational unit search (search_organizational_units)
- Statistical analysis (analyze_kpi_across_municipalities, compare_municipalities)
- Trend analysis (get_kpi_trend)
- Data filtering and ranking (filter_municipalities_by_kpi)

### Use Cases
- Analyze municipal performance across Sweden
- Compare statistics between municipalities
- Track trends over time
- Filter and rank municipalities by KPIs
- Access Swedish open data via AI assistants

### Testing
- [x] NPM package published and accessible
- [x] Remote endpoints operational (https://kolada-mcp-pafn.onrender.com)
- [x] server.json schema validated
- [x] Documentation complete
- [x] All transports tested (stdio, HTTP, SSE)

### Additional Information
Kolada is Sweden's most comprehensive open data source for municipal and regional statistics, maintained by SKR (Swedish Association of Local Authorities and Regions). This MCP server makes this valuable data accessible to AI assistants and LLMs.

**Data Source:** All data from Kolada API v3 (https://api.kolada.se/v3/docs)
**Attribution:** Data should be attributed as "Source: Kolada"

### Checklist
- [x] server.json follows schema v2025-10-17
- [x] NPM package exists and is public
- [x] Remote endpoints are accessible and tested
- [x] Repository is public with MIT license
- [x] README includes installation and usage instructions
- [x] All required metadata present (name, description, version, repository)
```

## Verification Checklist

Before submitting, ensure:

- [x] **server.json** validated against schema
- [x] **Version consistency** between package.json and server.json
- [x] **NPM package** published (kolada-mcp-server@2.2.1)
- [x] **Remote endpoints** operational and accessible
- [x] **GitHub repository** public with MIT license
- [x] **README** comprehensive with examples
- [x] **Icon** added to server.json
- [x] **All transports** tested (stdio, HTTP, SSE)

## Post-Submission

After creating the PR:

1. **Monitor PR status** for review comments
2. **Respond to feedback** from MCP maintainers
3. **Update if needed** based on review
4. **Wait for approval** and merge

Once merged, your server will appear in:
- MCP Registry website
- Claude Desktop server browser
- Other MCP-compatible clients

## Alternative: GitHub Actions Workflow

Instead of manual submission, use the GitHub Actions workflow:

### Trigger Workflow

**Via Git Tag:**
```bash
git tag -a v2.2.1 -m "MCP Registry submission v2.2.1"
git push origin v2.2.1
```

**Via GitHub UI:**
1. Go to: https://github.com/isakskogstad/kolada-mcp/actions
2. Select: **Publish to MCP Registry**
3. Click: **Run workflow**
4. Select branch: **main**
5. Enter version: **2.2.1**
6. Click: **Run workflow**

The workflow will:
- Validate server.json schema
- Check version consistency
- Verify NPM package exists
- Test remote endpoints
- Build project
- Create GitHub release
- Generate submission artifacts
- Display submission instructions

### Download Submission Artifacts

After workflow completes:
1. Go to workflow run page
2. Download **mcp-registry-submission** artifact
3. Contains validated server.json and metadata
4. Use for manual PR submission if needed

## Troubleshooting

### Version Mismatch
```bash
# Update both files to match
npm version 2.2.1 --no-git-tag-version
# Manually update server.json version
```

### NPM Package Not Found
```bash
# Publish to NPM first
npm run build
npm publish
```

### Remote Endpoint Not Accessible
```bash
# Check Render deployment
curl https://kolada-mcp-pafn.onrender.com/health

# Restart if needed via Render dashboard
```

### Schema Validation Failed
```bash
# Validate manually
npx ajv-cli validate \
  -s https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json \
  -d server.json
```

## Support

- **MCP Registry Issues:** https://github.com/modelcontextprotocol/servers/issues
- **Kolada MCP Issues:** https://github.com/isakskogstad/kolada-mcp/issues
- **MCP Documentation:** https://modelcontextprotocol.io/

## Timeline

Typical submission timeline:
- **Validation:** Immediate (automated)
- **Initial Review:** 1-3 business days
- **Feedback/Revision:** Variable (based on changes needed)
- **Final Approval:** 1-2 business days
- **Merge & Publication:** Same day as approval

**Total:** Usually 3-7 business days for clean submissions

## Next Steps

1. Run preparation script: `./scripts/prepare-mcp-submission.sh`
2. Review output for any issues
3. Follow manual submission process above
4. Monitor PR for feedback
5. Update README with MCP Registry badge once approved

Good luck with your submission!
