# Licensing Compliance Guide

## Overview

SMM Architect requires every dependency to declare a valid software license.
This guide explains how license information is collected, verified, and
automatically enforced in continuous integration.

## Generating SBOMs with License Data

Use the SBOM generation script to collect dependency information. The script
retrieves missing license metadata from the npm registry and embeds it into
all SBOM files.

```bash
# Generate SBOMs for the entire platform
tools/scripts/generate-sbom.sh
```

The script outputs a combined SBOM at
`sbom/combined/smm-architect-complete-sbom.json` and a human readable
inventory report under `sbom/reports/`.

## Verifying License Compliance

After SBOM generation, run the verification script to ensure every component
has a license and no prohibited licenses are present.

```bash
# Verify that all dependencies have acceptable licenses
tools/scripts/verify-license-compliance.sh
```

The script fails if any component is missing license information or if a
component uses one of the disallowed licenses (`GPL-3.0`, `AGPL-3.0`,
`SSPL-1.0`, or `BUSL-1.1`).

## Continuous Integration

The GitHub Actions workflows automatically run both scripts on each pull
request. SBOM generation populates license fields and the verification step
blocks the build when licensing requirements are not met.

## Reporting Issues

If the verification script fails, review the missing components and update the
package metadata or replace the dependency with one that has a compatible
license.
