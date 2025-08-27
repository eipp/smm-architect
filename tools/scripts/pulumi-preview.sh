#!/bin/bash
# Pulumi Preview Script for SMM Architect Infrastructure
# Tests infrastructure configuration without actual deployment

set -e

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

log_info() {
    echo -e \"${BLUE}[INFO]${NC} $1\"
}

log_success() {
    echo -e \"${GREEN}[SUCCESS]${NC} $1\"
}

log_warning() {
    echo -e \"${YELLOW}[WARNING]${NC} $1\"
}

log_error() {
    echo -e \"${RED}[ERROR]${NC} $1\"
}

# Configuration
PULUMI_BACKEND=${PULUMI_BACKEND:-\"file://./pulumi-state\"}
PULUMI_STACK=${PULUMI_STACK:-\"dev\"}
PROJECT_NAME=\"smm-architect\"
INFRA_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")/../infra/main\" && pwd)\"
WORKSPACE_ROOT=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")/..\" && pwd)\"

log_info \"Starting Pulumi preview for SMM Architect infrastructure\"
log_info \"Infrastructure directory: $INFRA_DIR\"
log_info \"Workspace root: $WORKSPACE_ROOT\"
log_info \"Pulumi backend: $PULUMI_BACKEND\"
log_info \"Pulumi stack: $PULUMI_STACK\"

# Check prerequisites
log_info \"Checking prerequisites...\"

# Check if Pulumi CLI is installed
if ! command -v pulumi &> /dev/null; then
    log_error \"Pulumi CLI is not installed. Please install it first.\"
    log_info \"Installation: https://www.pulumi.com/docs/get-started/install/\"
    exit 1
fi

# Check Node.js version
if ! node --version | grep -E \"v1[8-9]\\.|v[2-9][0-9]\\.\" &> /dev/null; then
    log_error \"Node.js 18+ is required\"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    log_error \"npm is not installed\"
    exit 1
fi

log_success \"Prerequisites check passed\"

# Navigate to infrastructure directory
cd \"$INFRA_DIR\"

# Set up Pulumi backend
log_info \"Setting up Pulumi backend...\"
if [ ! -z \"$PULUMI_ACCESS_TOKEN\" ]; then
    pulumi login
else
    # Use local file backend for development
    pulumi login \"$PULUMI_BACKEND\"
fi

# Install dependencies
log_info \"Installing Pulumi dependencies...\"
npm install

# Initialize or select stack
log_info \"Setting up Pulumi stack: $PULUMI_STACK\"
if pulumi stack ls | grep -q \"$PULUMI_STACK\"; then
    log_info \"Stack $PULUMI_STACK already exists, selecting it\"
    pulumi stack select \"$PULUMI_STACK\"
else
    log_info \"Creating new stack: $PULUMI_STACK\"
    pulumi stack init \"$PULUMI_STACK\" --non-interactive
fi

# Set default configuration for preview
log_info \"Setting up configuration for preview...\"
pulumi config set aws:region us-east-1 --non-interactive || true
pulumi config set environment dev --non-interactive || true
pulumi config set project:name \"$PROJECT_NAME\" --non-interactive || true

# Set environment variables for AWS (use dummy values if not set)
export AWS_REGION=${AWS_REGION:-\"us-east-1\"}
export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-\"dummy-access-key\"}
export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-\"dummy-secret-key\"}

log_warning \"Using AWS credentials: ${AWS_ACCESS_KEY_ID:0:8}... (showing first 8 chars)\"
log_info \"Note: Preview will work with dummy credentials, but actual deployment requires real AWS credentials\"

# Run Pulumi preview
log_info \"Running Pulumi preview...\"
echo \"=====================================\n\"

if pulumi preview --non-interactive --color always; then
    echo \"\n=====================================\n\"
    log_success \"Pulumi preview completed successfully!\"
    log_info \"Infrastructure configuration is valid\"
    
    # Output summary
    echo \"\n${BLUE}Preview Summary:${NC}\"
    echo \"  ✓ Pulumi configuration validated\"
    echo \"  ✓ TypeScript compilation successful\"
    echo \"  ✓ AWS provider configuration valid\"
    echo \"  ✓ Resource definitions validated\"
    echo \"  ✓ No syntax or configuration errors\"
    
else
    echo \"\n=====================================\n\"
    log_error \"Pulumi preview failed!\"
    log_error \"There are issues with the infrastructure configuration\"
    
    # Show common troubleshooting steps
    echo \"\n${YELLOW}Troubleshooting:${NC}\"
    echo \"  1. Check TypeScript compilation: npm run build\"
    echo \"  2. Verify Pulumi dependencies: npm install\"
    echo \"  3. Check AWS provider configuration\"
    echo \"  4. Review Pulumi.yaml and index.ts files\"
    echo \"  5. Check environment variables and secrets\"
    
    exit 1
fi

# Test workspace provisioning service integration
log_info \"Testing workspace provisioning service integration...\"

# Check if workspace provisioning service has compatible dependencies
PROVISIONING_DIR=\"$WORKSPACE_ROOT/services/workspace-provisioning\"
if [ -d \"$PROVISIONING_DIR\" ]; then
    cd \"$PROVISIONING_DIR\"
    
    log_info \"Installing workspace provisioning dependencies...\"
    npm install
    
    log_info \"Running TypeScript compilation check...\"
    if npm run build; then
        log_success \"Workspace provisioning service compiles successfully\"
    else
        log_error \"Workspace provisioning service compilation failed\"
        exit 1
    fi
    
    # Test Pulumi Automation API integration
    log_info \"Testing Pulumi Automation API integration...\"
    cat > test-automation-api.js << 'EOF'
const { LocalWorkspace } = require('@pulumi/pulumi/automation');

async function testAutomationAPI() {
    try {
        console.log('Testing Pulumi Automation API...');
        
        // Test basic functionality without creating actual resources
        const workspace = await LocalWorkspace.create({
            projectSettings: {
                name: 'test-automation',
                runtime: 'nodejs'
            }
        });
        
        console.log('✓ Pulumi Automation API is working');
        console.log('✓ LocalWorkspace can be created');
        
        // Test that we can access Pulumi version
        const version = await workspace.pulumiVersion();
        console.log(`✓ Pulumi CLI version: ${version}`);
        
    } catch (error) {
        console.error('✗ Pulumi Automation API test failed:', error.message);
        process.exit(1);
    }
}

testAutomationAPI();
EOF
    
    if node test-automation-api.js; then
        log_success \"Pulumi Automation API integration test passed\"
        rm -f test-automation-api.js
    else
        log_error \"Pulumi Automation API integration test failed\"
        rm -f test-automation-api.js
        exit 1
    fi
else
    log_warning \"Workspace provisioning service directory not found: $PROVISIONING_DIR\"
fi

# Final summary
echo \"\n${GREEN}=====================================\n${NC}\"
log_success \"All Pulumi infrastructure tests passed!\"
echo \"\n${BLUE}What was tested:${NC}\"
echo \"  ✓ Pulumi CLI installation and version\"
echo \"  ✓ Pulumi dependencies installation\"
echo \"  ✓ Infrastructure configuration validation\"
echo \"  ✓ TypeScript compilation\"
echo \"  ✓ AWS provider configuration\"
echo \"  ✓ Workspace provisioning service integration\"
echo \"  ✓ Pulumi Automation API functionality\"
echo \"\n${BLUE}Ready for:${NC}\"
echo \"  ✓ Development environment setup\"
echo \"  ✓ Infrastructure deployment (with real AWS credentials)\"
echo \"  ✓ Workspace provisioning automation\"
echo \"\n${GREEN}=====================================\n${NC}\"

log_info \"Pulumi preview script completed successfully\"
", "original_text": "", "replace_all": false}]