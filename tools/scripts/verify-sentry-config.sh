#!/bin/bash

# Sentry Configuration Verification Script
# This script verifies that Sentry is properly configured across the SMM Architect platform

echo "🔍 Verifying Sentry Configuration..."
echo "====================================="

# Check if required environment variables are set
echo "Checking environment variables..."

if [ -z "$SENTRY_DSN" ]; then
  echo "❌ SENTRY_DSN is not set"
  echo "   Please set SENTRY_DSN in your environment or .env file"
else
  echo "✅ SENTRY_DSN is set"
fi

if [ -z "$SENTRY_ORG" ]; then
  echo "⚠️  SENTRY_ORG is not set (required for source map uploads)"
else
  echo "✅ SENTRY_ORG is set"
fi

if [ -z "$SENTRY_PROJECT" ]; then
  echo "⚠️  SENTRY_PROJECT is not set (required for source map uploads)"
else
  echo "✅ SENTRY_PROJECT is set"
fi

if [ -z "$SENTRY_AUTH_TOKEN" ]; then
  echo "⚠️  SENTRY_AUTH_TOKEN is not set (required for source map uploads)"
else
  echo "✅ SENTRY_AUTH_TOKEN is set"
fi

# Check if Sentry is enabled
if [ "$SENTRY_ENABLED" = "false" ]; then
  echo "⚠️  Sentry is disabled (SENTRY_ENABLED=false)"
else
  echo "✅ Sentry is enabled"
fi

echo ""
echo "Checking package dependencies..."

# Check root dependencies
if grep -q "@sentry/node" package.json; then
  echo "✅ @sentry/node found in root dependencies"
else
  echo "❌ @sentry/node not found in root dependencies"
fi

if grep -q "@sentry/profiling-node" package.json; then
  echo "✅ @sentry/profiling-node found in root dependencies"
else
  echo "❌ @sentry/profiling-node not found in root dependencies"
fi

# Check frontend dependencies
if grep -q "@sentry/nextjs" apps/frontend/package.json; then
  echo "✅ @sentry/nextjs found in frontend dependencies"
else
  echo "❌ @sentry/nextjs not found in frontend dependencies"
fi

if grep -q "@sentry/react" apps/frontend/package.json; then
  echo "✅ @sentry/react found in frontend dependencies"
else
  echo "❌ @sentry/react not found in frontend dependencies"
fi

# Check backend service dependencies
echo ""
echo "Checking backend service dependencies..."

for service in smm-architect toolhub model-router audit simulator; do
  if [ -f "services/$service/package.json" ]; then
    if grep -q "@sentry/node" "services/$service/package.json"; then
      echo "✅ @sentry/node found in $service dependencies"
    else
      echo "❌ @sentry/node not found in $service dependencies"
    fi
    
    if grep -q "@sentry/profiling-node" "services/$service/package.json"; then
      echo "✅ @sentry/profiling-node found in $service dependencies"
    else
      echo "❌ @sentry/profiling-node not found in $service dependencies"
    fi
  fi
done

echo ""
echo "Checking configuration files..."

# Check if config files exist
if [ -f "apps/frontend/sentry.client.config.ts" ]; then
  echo "✅ Frontend client config exists"
else
  echo "❌ Frontend client config missing"
fi

if [ -f "apps/frontend/sentry.server.config.ts" ]; then
  echo "✅ Frontend server config exists"
else
  echo "❌ Frontend server config missing"
fi

if [ -f "apps/frontend/sentry.edge.config.ts" ]; then
  echo "✅ Frontend edge config exists"
else
  echo "❌ Frontend edge config missing"
fi

# Check backend config files
for service in smm-architect toolhub model-router audit simulator; do
  if [ -f "services/$service/src/config/sentry.ts" ]; then
    echo "✅ $service Sentry config exists"
  else
    echo "❌ $service Sentry config missing"
  fi
done

if [ -f "services/shared/sentry-utils.ts" ]; then
  echo "✅ Shared Sentry utilities exist"
else
  echo "❌ Shared Sentry utilities missing"
fi

echo ""
echo "Checking integration points..."

# Check if Sentry is imported in main files
if grep -q "import.*sentry" services/smm-architect/src/main.ts; then
  echo "✅ SMM Architect service imports Sentry"
else
  echo "❌ SMM Architect service does not import Sentry"
fi

if grep -q "import.*sentry" services/toolhub/src/server.ts; then
  echo "✅ ToolHub service imports Sentry"
else
  echo "❌ ToolHub service does not import Sentry"
fi

if grep -q "import.*sentry" services/model-router/src/index.ts; then
  echo "✅ Model Router service imports Sentry"
else
  echo "❌ Model Router service does not import Sentry"
fi

if grep -q "import.*sentry" services/audit/src/server.ts; then
  echo "✅ Audit service imports Sentry"
else
  echo "❌ Audit service does not import Sentry"
fi

if grep -q "import.*sentry" services/simulator/src/server.ts; then
  echo "✅ Simulator service imports Sentry"
else
  echo "❌ Simulator service does not import Sentry"
fi

echo ""
echo "Verification complete!"
echo "======================"

echo "Next steps:"
echo "1. Set your Sentry DSN in the environment variables"
echo "2. (Optional) Set SENTRY_ORG, SENTRY_PROJECT, and SENTRY_AUTH_TOKEN for source map uploads"
echo "3. Run 'npm install' in root and all service directories"
echo "4. Test error tracking by triggering an error in development"