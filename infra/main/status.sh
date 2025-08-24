#!/bin/bash

echo "📊 SMM Architect Infrastructure Status"
echo "====================================="

echo "📍 Current Stack: $(pulumi stack --show-name)"
echo "🌍 AWS Region: $(pulumi config get aws:region)"
echo "🏗️  Environment: $(pulumi config get workspace:environment)"
echo "📦 Resource Tier: $(pulumi config get workspace:resourceTier)"

echo ""
echo "💳 AWS Account Info:"
aws sts get-caller-identity 2>/dev/null || echo "❌ AWS credentials not configured"

echo ""
echo "📋 Stack Resources:"
pulumi stack ls 2>/dev/null || echo "❌ No stacks found"

echo ""
echo "⚙️  Configuration:"
pulumi config

echo ""
echo "🔗 Stack URL: https://app.pulumi.com/eipp/smm-architect-infra"