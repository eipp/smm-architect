# Software Bill of Materials (SBOM) Implementation Guide

## Overview

This document describes the comprehensive Software Bill of Materials (SBOM) implementation for the SMM Architect platform, providing complete supply chain security visibility and compliance with industry standards.

## Table of Contents

1. [SBOM Architecture](#sbom-architecture)
2. [Implementation Components](#implementation-components)
3. [Usage Guide](#usage-guide)
4. [Compliance Frameworks](#compliance-frameworks)
5. [Vulnerability Management](#vulnerability-management)
6. [CI/CD Integration](#cicd-integration)
7. [Troubleshooting](#troubleshooting)

## SBOM Architecture

### Components Covered

The SBOM implementation covers all components of the SMM Architect platform:

#### 1. Backend Services
- **SMM Architect Core Service** (`services/smm-architect`)
  - Node.js/TypeScript application
  - Dependencies from npm packages
  - Runtime container dependencies

- **Data Subject Rights Service** (`services/dsr`)
  - GDPR compliance service
  - Express.js REST API
  - Encryption and security libraries

- **Shared Libraries** (`services/shared`)
  - Common database clients
  - Authentication services
  - Utility functions

#### 2. Frontend Applications
- **React Frontend** (`apps/frontend`)
  - React.js application
  - UI component libraries
  - Build-time dependencies

#### 3. Infrastructure Components
- **Docker Images**
  - Base operating system components
  - Runtime dependencies
  - System packages

- **Kubernetes Manifests**
  - Configuration dependencies
  - Service mesh components

### SBOM Formats

The implementation generates SBOMs in multiple formats:

1. **CycloneDX JSON** (Primary format)
   - Industry standard format
   - Rich metadata support
   - Vulnerability integration

2. **SPDX** (Secondary format)
   - License compliance focus
   - Legal review support

3. **CSV Export** (Reporting format)
   - Human-readable format
   - Spreadsheet analysis

## Implementation Components

### 1. SBOM Generation Script (`scripts/generate-sbom.sh`)

Comprehensive script that:
- Scans all source code directories
- Generates SBOMs using Syft
- Performs vulnerability analysis with Grype
- Creates compliance reports
- Uploads to secure storage (optional)

```bash
# Generate complete SBOM
./scripts/generate-sbom.sh

# Quick generation (backend only)
make sbom-quick
```

### 2. Package.json Integration

NPM scripts for easy development workflow:

```json
{
  "scripts": {
    "sbom:generate": "./scripts/generate-sbom.sh",
    "sbom:check": "./scripts/generate-sbom.sh && echo 'SBOM generation completed'",
    "security:sbom": "npm run sbom:generate",
    "supply-chain:scan": "./scripts/generate-sbom.sh"
  }
}
```

### 3. Makefile Targets

Development automation with make:

```bash
make sbom           # Full SBOM generation
make sbom-quick     # Fast backend-only scan
make security-scan  # SBOM + vulnerability analysis
make supply-chain   # Complete supply chain validation
```

### 4. GitHub Actions Workflows

Automated CI/CD integration:

- **SBOM Monitoring** (`.github/workflows/sbom-monitoring.yml`)
  - Automatic SBOM generation on commits
  - Vulnerability threshold enforcement
  - Pull request security summaries
  - Weekly scheduled scans

- **Supply Chain Security** (`.github/workflows/supply-chain-security.yml`)
  - Container image signing
  - SBOM attestation
  - Compliance validation

## Usage Guide

### Local Development

#### Prerequisites

Install required tools:

```bash
# Install Syft (SBOM generation)
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

# Install Grype (vulnerability scanning)
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin

# Install jq (JSON processing)
brew install jq  # macOS
apt-get install jq  # Ubuntu
```

#### Generate SBOM

```bash
# Complete SBOM generation
npm run sbom:generate

# Using make
make sbom

# Manual script execution
./scripts/generate-sbom.sh
```

#### Review Results

Generated files are organized in the `sbom/` directory:

```
sbom/
├── services/           # Service-specific SBOMs
│   ├── smm-architect-sbom.json
│   ├── dsr-service-sbom.json
│   └── shared-libs-sbom.json
├── infrastructure/     # Infrastructure SBOMs
│   └── docker-images/
├── vulnerabilities/    # Vulnerability reports
│   ├── smm-architect-vulnerabilities.json
│   └── dsr-service-vulnerabilities.json
├── reports/           # Summary reports
│   ├── sbom-summary-20240101_120000.json
│   └── compliance-attestation-20240101_120000.json
└── combined/          # Comprehensive SBOM
    └── smm-architect-complete-sbom.json
```

### CI/CD Integration

#### Automatic Generation

SBOMs are automatically generated:
- On every commit to main/develop branches
- On pull requests
- Weekly scheduled scans
- Manual workflow dispatch

#### Security Gates

The CI/CD pipeline enforces security thresholds:
- **FAIL**: Any critical vulnerabilities found
- **WARN**: More than 5 high severity vulnerabilities
- **PASS**: No critical vulnerabilities

#### Artifact Storage

Generated SBOMs are stored as GitHub artifacts:
- **Retention**: 90 days for regular scans, 365 days for compliance reports
- **Access**: Available through GitHub Actions interface
- **Format**: Compressed archives with all generated files

## Compliance Frameworks

### NIST Secure Software Development Framework (SSDF)

Implemented practices:
- **PO.1.1**: Naming and numbering schemes for components
- **PO.3.2**: SBOM processes and maintenance
- **PS.1.1**: Secure coding practices documentation
- **PS.3.1**: Software archiving and protection
- **PW.4.1**: Software auditing and verification

### Supply Chain Levels for Software Artifacts (SLSA)

**Level 2 Compliance**:
- ✅ Source integrity (Git version control)
- ✅ Build service (GitHub Actions)
- ✅ Provenance available (SBOM + attestation)
- ✅ Provenance authenticated (Signed artifacts)

### NTIA Minimum Elements

All required elements included:
- ✅ Supplier name
- ✅ Component name
- ✅ Version of component
- ✅ Other unique identifiers
- ✅ Dependency relationships
- ✅ Author of SBOM data
- ✅ Timestamp

## Vulnerability Management

### Scanning Process

1. **SBOM Generation**: Create component inventory
2. **Vulnerability Analysis**: Scan against known CVE databases
3. **Risk Assessment**: Prioritize by severity and exploitability
4. **Reporting**: Generate actionable vulnerability reports

### Vulnerability Databases

The implementation uses multiple vulnerability sources:
- **GitHub Advisory Database**
- **National Vulnerability Database (NVD)**
- **OSV (Open Source Vulnerabilities)**
- **Alpine SecDB** (for container images)

### Response Procedures

#### Critical Vulnerabilities (Immediate Response)
1. **Detection**: Automated scanning identifies critical CVEs
2. **Notification**: Immediate alerts to security team
3. **Assessment**: Impact analysis within 4 hours
4. **Remediation**: Patch or mitigate within 24 hours
5. **Verification**: Re-scan to confirm fix

#### High Severity Vulnerabilities (48-hour Response)
1. **Triage**: Review within 24 hours
2. **Planning**: Create remediation plan
3. **Implementation**: Apply fixes within 48 hours
4. **Testing**: Validate fixes don't break functionality

### Vulnerability Report Structure

```json
{
  "vulnerability": {
    "id": "CVE-2024-XXXXX",
    "severity": "Critical",
    "score": 9.8,
    "description": "Buffer overflow in library X"
  },
  "artifact": {
    "name": "vulnerable-library",
    "version": "1.2.3",
    "locations": [
      "services/smm-architect/package.json"
    ]
  },
  "fix": {
    "available": true,
    "versions": ["1.2.4", "1.3.0"],
    "state": "fixed"
  }
}
```

## CI/CD Integration

### Workflow Triggers

The SBOM workflows are triggered by:

```yaml
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sundays
  workflow_dispatch:      # Manual trigger
```

### Integration Points

#### 1. Development Workflow
- **Pre-commit**: SBOM validation (optional)
- **Pull Request**: Security summary comment
- **Code Review**: SBOM changes visible in PR

#### 2. Build Pipeline
- **Build**: Generate SBOMs for all components
- **Test**: Validate SBOM completeness
- **Security**: Vulnerability threshold enforcement

#### 3. Deployment Pipeline
- **Staging**: SBOM-based deployment validation
- **Production**: Signed SBOM attestation required
- **Monitoring**: Continuous vulnerability monitoring

### Workflow Artifacts

Generated artifacts include:
- **Source SBOMs**: Component inventories for source code
- **Container SBOMs**: Image and runtime dependencies
- **Vulnerability Reports**: Security analysis results
- **Compliance Reports**: Framework adherence documentation
- **Attestations**: Cryptographically signed metadata

## Troubleshooting

### Common Issues

#### 1. Syft Installation Failures

**Problem**: Syft installation fails on different platforms

**Solution**:
```bash
# Manual installation
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

# Verify installation
syft version

# Alternative: Use Docker
docker run --rm -v $(pwd):/workspace anchore/syft dir:/workspace
```

#### 2. Permission Errors

**Problem**: Script execution fails with permission errors

**Solution**:
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Check file permissions
ls -la scripts/
```

#### 3. Large Repository Timeouts

**Problem**: SBOM generation times out on large repositories

**Solution**:
```bash
# Use quick scan mode
make sbom-quick

# Exclude unnecessary directories
syft dir:. --exclude node_modules --exclude .git
```

#### 4. Vulnerability Database Updates

**Problem**: Outdated vulnerability data

**Solution**:
```bash
# Update Grype database
grype db update

# Force database refresh
grype db delete && grype db update
```

### Performance Optimization

#### Scan Time Optimization
1. **Exclude unnecessary paths**: Skip `node_modules`, `.git`, `dist`
2. **Use parallel scanning**: Scan multiple components simultaneously
3. **Cache results**: Reuse SBOMs for unchanged components
4. **Incremental scans**: Only scan changed components

#### Storage Optimization
1. **Compress artifacts**: Use gzip compression for storage
2. **Cleanup old reports**: Implement retention policies
3. **Deduplication**: Remove duplicate component entries

### Support and Monitoring

#### Health Checks
```bash
# Verify SBOM generation health
make check-tools

# Test SBOM generation
make sbom-quick

# Validate SBOM format
syft validate sbom/combined/smm-architect-complete-sbom.json
```

#### Monitoring Metrics
- SBOM generation success rate
- Vulnerability detection counts
- Time to remediation
- Compliance score trends

### Getting Help

For additional support:
1. **Documentation**: Review this guide and inline comments
2. **Logs**: Check GitHub Actions logs for detailed error messages
3. **Tools**: Consult Syft and Grype documentation
4. **Community**: Engage with SBOM and supply chain security communities

## Conclusion

This SBOM implementation provides comprehensive supply chain security visibility for the SMM Architect platform, ensuring compliance with industry standards and enabling proactive vulnerability management. Regular updates and monitoring ensure continued security posture improvement.