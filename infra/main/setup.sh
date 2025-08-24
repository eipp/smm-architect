#!/bin/bash

# SMM Architect Infrastructure Setup Script
# This script sets up the complete Pulumi infrastructure environment

set -e

echo "🚀 SMM Architect Infrastructure Setup"
echo "======================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running from correct directory
if [[ ! -f "Pulumi.yaml" ]]; then
    print_error "Please run this script from the infra/main directory"
    exit 1
fi

print_status "Checking prerequisites..."

# Check if Pulumi is installed
if ! command -v pulumi &> /dev/null; then
    print_error "Pulumi is not installed. Please install Pulumi first."
    exit 1
fi
print_success "Pulumi CLI found"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_warning "AWS CLI not found. Installing via Homebrew..."
    brew install awscli
fi
print_success "AWS CLI found"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi
print_success "Node.js found ($(node --version))"

# Check AWS credentials
print_status "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    print_warning "AWS credentials not configured."
    read -p "Do you want to configure AWS credentials now? (y/n): " configure_aws
    
    if [[ $configure_aws =~ ^[Yy]$ ]]; then
        echo ""
        echo "Please enter your AWS credentials:"
        aws configure
    else
        print_warning "AWS credentials not configured. You can configure them later with 'aws configure'"
    fi
else
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    AWS_USER=$(aws sts get-caller-identity --query Arn --output text | cut -d'/' -f2)
    print_success "AWS credentials configured (Account: $AWS_ACCOUNT, User: $AWS_USER)"
fi

# Install dependencies
print_status "Installing Pulumi providers..."
if command -v pnpm &> /dev/null; then
    print_status "Using pnpm package manager"
    # Try to install with increased memory
    NODE_OPTIONS="--max-old-space-size=4096" pnpm install @pulumi/aws @pulumi/kubernetes || {
        print_warning "pnpm install failed, trying npm..."
        npm install @pulumi/aws @pulumi/kubernetes --no-package-lock
    }
else
    print_status "Using npm package manager"
    npm install @pulumi/aws @pulumi/kubernetes
fi

# Create environment-specific configuration
print_status "Setting up environment configurations..."

# Development environment
print_status "Configuring development environment..."
pulumi config set aws:region us-east-1
pulumi config set workspace:id "smm-architect-dev"
pulumi config set workspace:environment "development"
pulumi config set workspace:resourceTier "small"

# Create staging stack
print_status "Creating staging stack..."
if ! pulumi stack ls | grep -q "staging"; then
    pulumi stack init staging
    pulumi config set aws:region us-east-1 --stack staging
    pulumi config set workspace:id "smm-architect-staging" --stack staging
    pulumi config set workspace:environment "staging" --stack staging
    pulumi config set workspace:resourceTier "medium" --stack staging
fi

# Switch back to dev stack
pulumi stack select dev

print_status "Creating configuration files..."

# Create .env file for local development
cat > .env << EOF
# SMM Architect Infrastructure Environment
PULUMI_STACK=dev
AWS_REGION=us-east-1
WORKSPACE_ID=smm-architect-dev
ENVIRONMENT=development
RESOURCE_TIER=small
EOF

# Create deployment script
cat > deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying SMM Architect Infrastructure..."

# Load environment variables
source .env

# Deploy infrastructure
pulumi up --yes

echo "✅ Deployment completed!"
echo "📊 View your stack at: $(pulumi stack --show-urns | head -1)"
EOF

chmod +x deploy.sh

# Create destroy script  
cat > destroy.sh << 'EOF'
#!/bin/bash
set -e

echo "⚠️  Destroying SMM Architect Infrastructure..."
echo "This will permanently delete all resources!"

read -p "Are you sure you want to destroy all infrastructure? (yes/no): " confirm

if [[ $confirm == "yes" ]]; then
    pulumi destroy --yes
    echo "💥 Infrastructure destroyed!"
else
    echo "❌ Destruction cancelled"
fi
EOF

chmod +x destroy.sh

# Create status script
cat > status.sh << 'EOF'
#!/bin/bash

echo "📊 SMM Architect Infrastructure Status"
echo "====================================="

echo "📍 Current Stack: $(pulumi stack --show-name)"
echo "🌍 AWS Region: $(pulumi config get aws:region)"
echo "🏗️  Environment: $(pulumi config get workspace:environment)"
echo "📦 Resource Tier: $(pulumi config get workspace:resourceTier)"

echo ""
echo "📋 Stack Resources:"
pulumi stack --show-urns 2>/dev/null || echo "No resources deployed yet"

echo ""
echo "⚙️  Configuration:"
pulumi config
EOF

chmod +x status.sh

# Validate configuration
print_status "Validating configuration..."
pulumi preview > /dev/null 2>&1 && print_success "Configuration validated" || print_error "Configuration validation failed"

# Final success message
echo ""
print_success "🎉 SMM Architect Infrastructure Setup Complete!"
echo ""
echo "📁 Setup Summary:"
echo "   • Pulumi project configured"
echo "   • AWS provider installed"
echo "   • Development and staging stacks created"
echo "   • Helper scripts generated"
echo ""
echo "🚀 Next Steps:"
echo "   1. Deploy infrastructure:     ./deploy.sh"
echo "   2. Check status:              ./status.sh"  
echo "   3. View configuration:        pulumi config"
echo "   4. Preview changes:           pulumi preview"
echo "   5. Destroy resources:         ./destroy.sh"
echo ""
echo "📚 Documentation:"
echo "   • Pulumi Console: https://app.pulumi.com/eipp/smm-architect-infra"
echo "   • Project README: ../../README.md"
echo ""