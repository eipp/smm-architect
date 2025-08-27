#!/bin/bash
set -e

echo "🚀 Deploying SMM Architect Infrastructure..."

# Check if we're in the right directory
if [[ ! -f "Pulumi.yaml" ]]; then
    echo "❌ Error: Please run this script from the infra/main directory"
    exit 1
fi

# Deploy infrastructure
echo "📦 Running Pulumi deployment..."
pulumi up --yes

echo ""
echo "✅ Deployment completed!"
echo "📊 View your stack at: https://app.pulumi.com/eipp/smm-architect-infra"
echo ""
echo "🔧 Next steps:"
echo "   1. Install AWS provider: npm install @pulumi/aws"
echo "   2. Uncomment AWS resources in index.ts"
echo "   3. Run './deploy.sh' again to deploy AWS resources"