#!/bin/bash

# Start server in background
MCP_MODE=http node dist/http-server.js > /tmp/server.log 2>&1 &
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"

# Wait for server to start
sleep 3

echo ""
echo "=== Testing /health endpoint ==="
curl -s http://localhost:3000/health | python3 -m json.tool

echo ""
echo ""
echo "=== Testing /rpc endpoint (tools/list) ==="
echo "First few tools:"
curl -s -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'result' in data and 'tools' in data['result']:
    tools = data['result']['tools'][:2]  # First 2 tools
    print(json.dumps({'tools': tools}, indent=2))
else:
    print(json.dumps(data, indent=2))
"

# Cleanup
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
echo ""
echo "Server stopped"
