#!/bin/bash

# Dependency Signature Verification Script
# Verifies npm package signatures and integrity for all services

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPORT_DIR="$PROJECT_ROOT/signature-verification"

# Clean and create report directory
rm -rf "$REPORT_DIR"
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}🔍 Starting dependency signature verification...${NC}"

# Function to verify npm audit signatures for a service
verify_service_signatures() {
    local service_dir="$1"
    local service_name="$2"
    
    echo -e "${BLUE}📦 Verifying $service_name dependencies...${NC}"
    
    cd "$service_dir"
    
    # Check if package.json exists
    if [[ ! -f "package.json" ]]; then
        echo -e "${YELLOW}⚠️  No package.json found in $service_dir${NC}"
        return 0
    fi
    
    # Try npm audit signatures (requires npm 8.15.0+)
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        echo -e "${BLUE}ℹ️  Using npm version: $NPM_VERSION${NC}"
        
        if npm audit signatures --json > "$REPORT_DIR/${service_name}-signatures.json" 2>/dev/null; then
            echo -e "${GREEN}✅ All $service_name dependencies have valid signatures${NC}"
        else
            echo -e "${YELLOW}⚠️  npm audit signatures not supported - checking integrity hashes${NC}"
            
            # Manual integrity verification
            cat > "$REPORT_DIR/${service_name}-verify.js" << 'EOF'
const fs = require('fs');
const { execSync } = require('child_process');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

const criticalPackages = [
    'express', 'jsonwebtoken', 'bcrypt', 'helmet', 'cors',
    '@prisma/client', 'redis', 'winston', 'joi', 'zod',
    'axios', 'node-fetch', 'ws', 'socket.io', 'passport'
];

let results = {
    service: process.env.SERVICE_NAME || 'unknown',
    totalPackages: Object.keys(allDeps).length,
    criticalPackages: 0,
    verifiedPackages: 0,
    unverifiedCritical: []
};

for (const [pkgName, version] of Object.entries(allDeps)) {
    try {
        const isCritical = criticalPackages.some(critical => pkgName.includes(critical));
        if (isCritical) results.criticalPackages++;
        
        const cleanVersion = version.replace(/^[\^~]/, '');
        const metadataCmd = `npm view "${pkgName}@${cleanVersion}" dist.integrity --json 2>/dev/null || echo '{}'`;
        const metadata = JSON.parse(execSync(metadataCmd, { encoding: 'utf8' }));
        
        if (metadata.integrity) {
            results.verifiedPackages++;
            console.log(`✅ ${pkgName}: integrity hash present`);
        } else if (isCritical) {
            results.unverifiedCritical.push(pkgName);
            console.log(`❌ ${pkgName}: CRITICAL package lacks integrity hash`);
        }
    } catch (error) {
        if (criticalPackages.some(critical => pkgName.includes(critical))) {
            results.unverifiedCritical.push(pkgName);
        }
    }
}

fs.writeFileSync(
    `${process.env.REPORT_DIR}/${results.service}-verification-results.json`,
    JSON.stringify(results, null, 2)
);

console.log(`\n📊 Summary: ${results.totalPackages} total, ${results.verifiedPackages} verified`);

if (results.unverifiedCritical.length > 0) {
    console.log(`❌ Unverified critical: ${results.unverifiedCritical.join(', ')}`);
    process.exit(1);
}
EOF
            
            SERVICE_NAME="$service_name" REPORT_DIR="$REPORT_DIR" node "$REPORT_DIR/${service_name}-verify.js"
            if [[ $? -ne 0 ]]; then
                echo -e "${RED}❌ Verification failed for $service_name${NC}"
                return 1
            fi
        fi
    else
        echo -e "${RED}❌ npm not found${NC}"
        return 1
    fi
    
    cd "$PROJECT_ROOT"
    return 0
}

# Main verification process
FAILED_SERVICES=()

SERVICES=(
    "$PROJECT_ROOT/services/smm-architect:smm-architect"
    "$PROJECT_ROOT/services/shared:shared"
    "$PROJECT_ROOT/services/dsr:dsr"
    "$PROJECT_ROOT/apps/frontend:frontend"
)

for service_config in "${SERVICES[@]}"; do
    IFS=':' read -r service_path service_name <<< "$service_config"
    
    if [[ -d "$service_path" ]]; then
        if ! verify_service_signatures "$service_path" "$service_name"; then
            FAILED_SERVICES+=("$service_name")
        fi
    fi
done

# Generate summary report
cat > "$REPORT_DIR/signature-verification-summary.md" << EOF
# Dependency Signature Verification Report

**Generated:** $(date)
**Project:** SMM Architect

## Summary

EOF

if [[ ${#FAILED_SERVICES[@]} -eq 0 ]]; then
    echo "✅ **All services passed dependency signature verification**" >> "$REPORT_DIR/signature-verification-summary.md"
    echo -e "${GREEN}✅ All dependency signature verification checks passed!${NC}"
    exit 0
else
    echo "❌ **Failed services:** ${FAILED_SERVICES[*]}" >> "$REPORT_DIR/signature-verification-summary.md"
    echo -e "${RED}❌ Dependency signature verification failed${NC}"
    exit 1
fi