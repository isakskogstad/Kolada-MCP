# Quick Publish to MCP Registry - Command Reference

## Prerequisites Check

```bash
# 1. Verify you're in the project directory
pwd
# Should show: /Users/isak/Desktop/CLAUDE_CODE /projects/kolada-mcp

# 2. Check current version
node -p "require('./package.json').version"
# Should show: 2.2.1

# 3. Verify NPM package exists
npm view kolada-mcp-server@2.2.1
# Should show package details

# 4. Test remote endpoint
curl https://kolada-mcp-pafn.onrender.com/health
# Should return: {"status":"healthy"}
```

## Option 1: Automated GitHub Actions (Recommended)

### Trigger via Git Tag

```bash
# Create and push tag
git tag -a v2.2.1 -m "MCP Registry submission v2.2.1"
git push origin v2.2.1

# Wait for GitHub Actions to complete
# Check: https://github.com/isakskogstad/kolada-mcp/actions
```

### Trigger Manually via GitHub UI

1. Go to: https://github.com/isakskogstad/kolada-mcp/actions
2. Click: **Publish to MCP Registry**
3. Click: **Run workflow**
4. Select branch: **main**
5. Enter version: **2.2.1**
6. Click: **Run workflow**

## Option 2: Manual Submission (Full Control)

### Step 1: Validate Configuration

```bash
# Make script executable
chmod +x scripts/prepare-mcp-submission.sh

# Run validation
./scripts/prepare-mcp-submission.sh
```

### Step 2: Fork MCP Servers Repository

```bash
# Via GitHub UI:
# 1. Visit: https://github.com/modelcontextprotocol/servers
# 2. Click "Fork" button
# 3. Create fork in your account

# Or via GitHub CLI:
gh repo fork modelcontextprotocol/servers --clone=true
cd servers
```

### Step 3: Create Submission Branch

```bash
# Create new branch
git checkout -b add-kolada-mcp

# Create directory structure
mkdir -p src/servers/io.github.isakskogstad

# Copy server.json (replace with your actual path)
cp /Users/isak/Desktop/CLAUDE_CODE\ /projects/kolada-mcp/server.json \
   src/servers/io.github.isakskogstad/kolada-mcp.json

# Verify file
cat src/servers/io.github.isakskogstad/kolada-mcp.json
```

### Step 4: Commit and Push

```bash
# Add file
git add src/servers/io.github.isakskogstad/kolada-mcp.json

# Commit
git commit -m "Add Kolada MCP Server - Swedish municipality statistics

MCP server providing access to 5,000+ KPIs for all 290 Swedish municipalities
and 21 regions from the Kolada API.

Features:
- NPM package: kolada-mcp-server@2.2.1
- Remote endpoints: HTTP + SSE
- 264 operating areas (education, healthcare, economy, etc.)
- Gender-based filtering
- Comprehensive Swedish documentation

Data source: Kolada API (Sweden's official municipal statistics)"

# Push to your fork
git push origin add-kolada-mcp
```

### Step 5: Create Pull Request

```bash
# Via GitHub CLI:
gh pr create \
  --repo modelcontextprotocol/servers \
  --title "Add Kolada MCP Server" \
  --body-file <(cat << 'EOF'
## New Server Submission: Kolada MCP Server

### Description
MCP server providing access to Swedish municipality and regional statistics from the Kolada API. Offers 5,000+ KPIs across 264 operating areas for all 290 Swedish municipalities and 21 regions.

### Server Details
- **Name:** io.github.isakskogstad/kolada-mcp
- **NPM Package:** kolada-mcp-server
- **Version:** 2.2.1
- **License:** MIT
- **Repository:** https://github.com/isakskogstad/kolada-mcp

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
- KPI search and retrieval
- Municipality and region lookup
- Organizational unit search
- Statistical analysis and comparison
- Trend analysis
- Data filtering and ranking

### Testing
- [x] NPM package published and accessible
- [x] Remote endpoints operational
- [x] server.json schema validated
- [x] Documentation complete
- [x] All transports tested

### Additional Information
Kolada is Sweden's most comprehensive open data source for municipal and regional statistics, maintained by SKR (Swedish Association of Local Authorities and Regions).
EOF
)

# Or manually:
# 1. Visit: https://github.com/modelcontextprotocol/servers/compare
# 2. Click "compare across forks"
# 3. Select your fork and branch
# 4. Fill in PR details from MCP_REGISTRY_SUBMISSION.md
```

## Verification After Submission

### Check PR Status

```bash
# Via GitHub CLI
gh pr status --repo modelcontextprotocol/servers

# Via browser
# Visit: https://github.com/modelcontextprotocol/servers/pulls
```

### Monitor CI/CD

Your PR will trigger automated checks:
- Schema validation
- Lint checks
- Build verification
- Link validation

Wait for all checks to pass (green checkmarks).

## Post-Merge

Once your PR is merged, verify listing:

```bash
# Check MCP Registry website
# Visit: https://registry.modelcontextprotocol.io/

# Search for "kolada" or "swedish"
# Your server should appear with icon and description
```

### Update README Badge

After approval, update the MCP Registry badge in README.md:

```markdown
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-green.svg)](https://registry.modelcontextprotocol.io/servers/io.github.isakskogstad/kolada-mcp)
```

## Troubleshooting

### Version Mismatch Error

```bash
# Update package.json
npm version 2.2.1 --no-git-tag-version

# Update server.json manually
# Edit line 6: "version": "2.2.1"

# Verify consistency
./scripts/prepare-mcp-submission.sh
```

### Schema Validation Failed

```bash
# Install validator
npm install -g ajv-cli

# Validate manually
ajv validate \
  -s https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json \
  -d server.json

# Check for common issues:
# - Missing required fields
# - Invalid URL formats
# - Incorrect version format
```

### Remote Endpoint Not Responding

```bash
# Test health endpoint
curl -i https://kolada-mcp-pafn.onrender.com/health

# Test MCP endpoint
curl -i https://kolada-mcp-pafn.onrender.com/mcp

# Check Render logs
# Visit: https://dashboard.render.com/

# Restart service if needed
```

### NPM Package Not Found

```bash
# Check if package exists
npm view kolada-mcp-server

# If not published, publish now
npm run build
npm publish

# Verify publication
npm view kolada-mcp-server@2.2.1
```

## Timeline Expectations

| Stage | Duration |
|-------|----------|
| Validation (automated) | Immediate |
| Initial review | 1-3 business days |
| Feedback/revision | Variable |
| Final approval | 1-2 business days |
| Merge & publication | Same day |
| **Total** | **3-7 business days** |

## Support Resources

- **MCP Registry:** https://github.com/modelcontextprotocol/servers
- **MCP Docs:** https://modelcontextprotocol.io/
- **Your Issues:** https://github.com/isakskogstad/kolada-mcp/issues
- **Kolada API:** https://api.kolada.se/v3/docs

## Quick Commands Summary

```bash
# 1. Validate everything
./scripts/prepare-mcp-submission.sh

# 2. Option A: Automated (via tag)
git tag -a v2.2.1 -m "MCP Registry submission"
git push origin v2.2.1

# 2. Option B: Manual submission
gh repo fork modelcontextprotocol/servers --clone=true
cd servers
git checkout -b add-kolada-mcp
mkdir -p src/servers/io.github.isakskogstad
cp /path/to/server.json src/servers/io.github.isakskogstad/kolada-mcp.json
git add src/servers/io.github.isakskogstad/kolada-mcp.json
git commit -m "Add Kolada MCP Server"
git push origin add-kolada-mcp
gh pr create --repo modelcontextprotocol/servers

# 3. Monitor PR
gh pr status --repo modelcontextprotocol/servers

# 4. After merge, verify
# Visit: https://registry.modelcontextprotocol.io/
```

## Ready to Publish?

Choose your method:
- **Quick & Automated:** Use GitHub Actions (Option 1)
- **Full Control:** Manual submission (Option 2)

Both methods are valid - automated is faster, manual gives you more control over the PR description.

Good luck! 🚀
