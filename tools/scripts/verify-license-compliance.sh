#!/bin/bash
set -euo pipefail

# License compliance verification script
# Ensures SBOM contains license information for all components
# and checks for disallowed licenses.

SBOM_FILE="${1:-sbom/combined/smm-architect-complete-sbom.json}"

if [[ ! -f "$SBOM_FILE" ]]; then
  echo "SBOM file not found: $SBOM_FILE" >&2
  exit 1
fi

# Check for missing license information
missing=$(jq -r '.components[] | select(.licenses == null or (.licenses | length == 0) or ([.licenses[].license.name] | any(. == "" or . == "Unknown"))) | "\(.name)@\(.version)"' "$SBOM_FILE")

if [[ -n "$missing" ]]; then
  echo "❌ Missing license information for:" >&2
  echo "$missing" >&2
  exit 1
fi

# Check for problematic licenses
PROBLEMATIC_LICENSES=("GPL-3.0" "AGPL-3.0" "SSPL-1.0" "BUSL-1.1")

detected=$(jq -r '.components[]?.licenses[]?.license.name // empty' "$SBOM_FILE" | sort -u)

for bad in "${PROBLEMATIC_LICENSES[@]}"; do
  if echo "$detected" | grep -q "$bad"; then
    echo "❌ Problematic license detected: $bad" >&2
    exit 1
  fi
done

echo "✅ License compliance verified"
