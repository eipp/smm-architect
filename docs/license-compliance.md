# Licensing Compliance Guide

## Overview
This guide outlines how SMM Architect ensures open-source licensing compliance through automated SBOM generation and validation.

## SBOM License Enrichment
- `tools/scripts/generate-sbom.sh` gathers license data for every dependency using the npm registry.
- Missing license fields are populated directly in the generated SBOM files.

## Continuous Integration Verification
- The GitHub workflow `sbom-monitoring.yml` runs the SBOM script and verifies that each component includes a license.
- The workflow fails if any dependency lacks license information, preventing non-compliant code from merging.

## Manual License Check
After generating an SBOM, run:

```bash
jq '[.components[] | select(.licenses == null or .licenses == [] or .licenses[]?.license.name == null or .licenses[]?.license.name == "" or .licenses[]?.license.name == "UNKNOWN")] | length' sbom/combined/smm-architect-complete-sbom.json
```

A result of `0` means all components have recorded licenses.

## Remediation
- Investigate any dependency with missing license data and update or replace it.
- Commit updated SBOMs and rerun verification until the workflow passes.
