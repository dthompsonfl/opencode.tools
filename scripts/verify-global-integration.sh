#!/bin/bash
# OpenCode Tools Integration Verification Script
# This script verifies that OpenCode Tools is properly integrated

echo "🔍 Verifying OpenCode Tools Integration"
echo "======================================"

# Check if config exists
if [ -f "C:\Users\drpt0\.opencode\config.json" ]; then
    echo "✅ Global config exists: C:\Users\drpt0\.opencode\config.json"
else
    echo "❌ Global config missing: C:\Users\drpt0\.opencode\config.json"
    exit 1
fi

# Check if tools are registered
TOOLS_COUNT=$(grep -o '"[^"]*":' "C:\Users\drpt0\.opencode\config.json" | wc -l)
echo "📊 Registered tools: $TOOLS_COUNT"

# Check specific OpenCode Tools markers
if grep -q "opencode-tools" "C:\Users\drpt0\.opencode\config.json"; then
    echo "✅ OpenCode Tools integration detected"
else
    echo "⚠️  OpenCode Tools integration not found"
fi

echo ""
echo "🎯 Integration Status: $([ $TOOLS_COUNT -gt 0 ] && echo 'SUCCESS' || echo 'NEEDS SETUP')"
