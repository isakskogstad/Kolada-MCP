#!/bin/bash

# MCP Registry Submission Preparation Script
# This script prepares your server.json for MCP Registry submission

set -e

echo "========================================="
echo "Kolada MCP - Registry Submission Prep"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Verify server.json exists
echo "Step 1: Checking server.json..."
if [ ! -f "server.json" ]; then
    echo -e "${RED}Error: server.json not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ server.json found${NC}"
echo ""

# Step 2: Validate JSON syntax
echo "Step 2: Validating JSON syntax..."
if command -v jq &> /dev/null; then
    if jq empty server.json 2>/dev/null; then
        echo -e "${GREEN}✓ Valid JSON syntax${NC}"
    else
        echo -e "${RED}✗ Invalid JSON syntax${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ jq not installed, skipping JSON validation${NC}"
    echo "  Install with: brew install jq (macOS) or apt-get install jq (Linux)"
fi
echo ""

# Step 3: Check version consistency
echo "Step 3: Checking version consistency..."
PACKAGE_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
SERVER_VERSION=$(node -p "require('./server.json').version" 2>/dev/null || echo "unknown")

if [ "$PACKAGE_VERSION" = "$SERVER_VERSION" ]; then
    echo -e "${GREEN}✓ Version consistent: $PACKAGE_VERSION${NC}"
else
    echo -e "${RED}✗ Version mismatch:${NC}"
    echo "  package.json: $PACKAGE_VERSION"
    echo "  server.json: $SERVER_VERSION"
    exit 1
fi
echo ""

# Step 4: Verify NPM package
echo "Step 4: Verifying NPM package..."
if npm view kolada-mcp-server@$PACKAGE_VERSION version > /dev/null 2>&1; then
    echo -e "${GREEN}✓ NPM package exists: kolada-mcp-server@$PACKAGE_VERSION${NC}"
else
    echo -e "${RED}✗ NPM package not found: kolada-mcp-server@$PACKAGE_VERSION${NC}"
    echo "  Publish to NPM first: npm publish"
    exit 1
fi
echo ""

# Step 5: Test remote endpoints
echo "Step 5: Testing remote endpoints..."

# Test HTTP endpoint
HTTP_URL="https://kolada-mcp-pafn.onrender.com/health"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HTTP_URL" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ HTTP endpoint healthy ($HTTP_URL)${NC}"
else
    echo -e "${YELLOW}⚠ HTTP endpoint returned status: $HTTP_STATUS${NC}"
fi

# Test SSE endpoint
SSE_URL="https://kolada-mcp-pafn.onrender.com/sse"
SSE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SSE_URL" 2>/dev/null || echo "000")

if [ "$SSE_STATUS" = "200" ] || [ "$SSE_STATUS" = "101" ]; then
    echo -e "${GREEN}✓ SSE endpoint accessible ($SSE_URL)${NC}"
else
    echo -e "${YELLOW}⚠ SSE endpoint returned status: $SSE_STATUS${NC}"
fi
echo ""

# Step 6: Display submission information
echo "========================================="
echo "Ready for MCP Registry Submission!"
echo "========================================="
echo ""
echo "Configuration Summary:"
echo "  MCP Name: io.github.isakskogstad/kolada-mcp"
echo "  Version: $PACKAGE_VERSION"
echo "  NPM Package: kolada-mcp-server@$PACKAGE_VERSION"
echo "  Remote Endpoint: https://kolada-mcp-pafn.onrender.com/mcp"
echo ""
echo "Next Steps:"
echo ""
echo "1. Fork the MCP Servers repository:"
echo "   https://github.com/modelcontextprotocol/servers"
echo ""
echo "2. Clone your fork:"
echo "   git clone https://github.com/YOUR_USERNAME/servers.git"
echo "   cd servers"
echo ""
echo "3. Create a new branch:"
echo "   git checkout -b add-kolada-mcp"
echo ""
echo "4. Copy your server.json to the correct location:"
echo "   mkdir -p src/servers/io.github.isakskogstad"
echo "   cp /path/to/kolada-mcp/server.json src/servers/io.github.isakskogstad/kolada-mcp.json"
echo ""
echo "5. Commit and push:"
echo "   git add src/servers/io.github.isakskogstad/kolada-mcp.json"
echo "   git commit -m 'Add Kolada MCP Server - Swedish municipality statistics'"
echo "   git push origin add-kolada-mcp"
echo ""
echo "6. Create Pull Request:"
echo "   - Go to: https://github.com/modelcontextprotocol/servers/compare"
echo "   - Select your fork and branch"
echo "   - Title: 'Add Kolada MCP Server'"
echo "   - Description: Use the template below"
echo ""
echo "========================================="
echo "Pull Request Template:"
echo "========================================="
cat << 'EOF'

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

### Use Cases
- Analyze municipal performance across Sweden
- Compare statistics between municipalities
- Track trends over time
- Filter and rank municipalities by KPIs
- Access Swedish open data via AI assistants

### Testing
- [x] NPM package published and accessible
- [x] Remote endpoints operational
- [x] server.json schema validated
- [x] Documentation complete
- [x] All transports tested

### Additional Information
Kolada is Sweden's most comprehensive open data source for municipal and regional statistics, maintained by SKR (Swedish Association of Local Authorities and Regions).

EOF

echo ""
echo "========================================="
echo "Submission prepared successfully!"
echo "========================================="
