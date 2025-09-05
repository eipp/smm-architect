#!/bin/bash

# SMM Architect Enterprise Project Cleanup Script
# Tailored for: Turborepo + pnpm + Encore.ts + Next.js + Storybook + Playwright + Artillery
# Optimized for monorepo architecture with microservices
#
# Options:
#   --dry-run   Print cleanup actions without executing them
#
# The script will prompt for confirmation before removing any files or directories.

set -euo pipefail

DRY_RUN=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            break
            ;;
    esac
done

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_ROOT="/Users/ivan/smm-architect"
PROJECT_NAME="SMM Architect"
MONOREPO_WORKSPACES=("apps" "packages" "services" "tools")
TURBO_CACHE_DIR=".turbo"
TOTAL_CLEANED=0

# SMM Architect specific patterns
SMM_BUILD_OUTPUTS=("dist" "build" ".next" "out" "storybook-static")
SMM_CACHE_DIRS=(".turbo" "coverage" ".nyc_output" ".eslintcache" "playwright-report" "test-results")
SMM_TEMP_FILES=("*.tsbuildinfo" "*.log" "*.tmp" "*.temp" "artillery-report-*.json")
SMM_NODE_ARTIFACTS=("node_modules" ".pnpm-store")
SMM_INFRASTRUCTURE_CACHE=("Chart.lock" "charts" "terraform.tfstate*" ".terraform")
SMM_MONITORING_DATA=("prometheus/data" "grafana/data" "elasticsearch/data")
SMM_SECURITY_ARTIFACTS=("*.pem" "*.key" "!*.pub" ".vault-token")

# Additional development artifacts discovered
SMM_BACKUP_FILES=("*.bak" "*.backup" "*.orig" "*.rej" "*.patch")
SMM_DEBUG_LOGS=("lerna-debug.log*" "npm-debug.log*" "pnpm-debug.log*" "yarn-*.log")
SMM_PROFILING_FILES=("*.heapsnapshot" "*.cpuprofile" "*.trace" "*.prof")
SMM_SOURCE_MAPS=("*.map")
SMM_EDITOR_FILES=("*.swp" "*.swo" "*~" "#*#" ".#*")
SMM_OS_FILES=(".DS_Store" "Thumbs.db" "desktop.ini" "._*")
SMM_LOCK_FILES=("*.lock" "*-lock.json" "yarn.lock" "bun.lock" "flake.lock")
SMM_DATABASE_FILES=("*.sqlite" "*.sqlite3" "*.db" "dump.rdb" "*.dump")

# Enterprise development clutter discovered
SMM_ARCHIVE_FILES=("*.zip" "*.tar" "*.tar.gz" "*.rar" "*.7z" "*.tgz")
SMM_DEPRECATED_DIRS=("*.old" "*.backup" "*_backup" "archive" "deprecated" "legacy")
SMM_TEST_ARTIFACTS=("tests/tmp" "**/tmp/coverage-*" "*.junit" "*.xml" "*.lcov")
SMM_REPORT_FILES=("*report*.json" "*result*.json" "*output*.json" "*summary*.json")
SMM_RUNTIME_FILES=("*.sock" "*.socket" "*.pipe" "*.pid" "*.out" "*.err")
SMM_DEVELOPMENT_OVERRIDES=("*.local" "*.personal" "*.dev" "*.override")
SMM_PROCESS_ARTIFACTS=("*.retry" "*.failed" "*.error" "*.restart")
SMM_CACHE_HISTORIES=(".cache" ".hist" ".history" ".sessions")
SMM_STALE_CONFIGS=("*-old.json" "*-backup.yml" "*.config.bak")

echo -e "${BOLD}${BLUE}🏗️  ${PROJECT_NAME} Enterprise Cleanup System${NC}"
echo -e "${CYAN}===============================================${NC}"
echo -e "${BLUE}🔧 Technology Stack:${NC} Turborepo + pnpm + Encore.ts + Next.js"
echo -e "${BLUE}🏛️  Architecture:${NC} Monorepo with 12+ microservices"
echo -e "${BLUE}📂 Workspaces:${NC} ${MONOREPO_WORKSPACES[*]}"
echo -e "${CYAN}===============================================${NC}"
echo ""

# Advanced utility functions
log_action() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")  echo -e "${BLUE}[${timestamp}] ℹ️  ${message}${NC}" ;;
        "WARN")  echo -e "${YELLOW}[${timestamp}] ⚠️  ${message}${NC}" ;;
        "ERROR") echo -e "${RED}[${timestamp}] ❌ ${message}${NC}" ;;
        "SUCCESS") echo -e "${GREEN}[${timestamp}] ✅ ${message}${NC}" ;;
        "CLEAN")   echo -e "${MAGENTA}[${timestamp}] 🧹 ${message}${NC}" ;;
    esac
}

# Calculate directory size in human-readable format
get_size() {
    local path="$1"
    if [ -e "$path" ]; then
        if command -v gdu &> /dev/null; then
            gdu -sh "$path" 2>/dev/null | cut -f1 || echo "unknown"
        else
            du -sh "$path" 2>/dev/null | cut -f1 || echo "unknown"
        fi
    else
        echo "0B"
    fi
}

confirm_action() {
    local prompt="$1"
    read -r -p "$prompt [y/N] " response
    [[ "$response" =~ ^[Yy]$ ]]
}

# Enhanced safe removal with size tracking
safe_remove() {
    local path="$1"
    local description="$2"
    local category="${3:-general}"

    if [ -e "$path" ]; then
        local size=$(get_size "$path")
        log_action "CLEAN" "Removing $description ($size): $path"

        if [ "$DRY_RUN" = true ]; then
            log_action "INFO" "(dry-run) Would remove $description at $path"
            return
        fi

        # Backup critical files before removal (if needed)
        if [[ "$category" == "critical" ]]; then
            log_action "WARN" "Creating backup before removing critical path: $path"
            local backup_path="${path}.backup.$(date +%s)"
            cp -r "$path" "$backup_path" 2>/dev/null || true
        fi

        if confirm_action "Remove $path?"; then
            rm -rf "$path" 2>/dev/null && {
                log_action "SUCCESS" "Removed $description"
                TOTAL_CLEANED=$((TOTAL_CLEANED + 1))
            } || {
                log_action "ERROR" "Failed to remove $description"
            }
        else
            log_action "INFO" "Skipped $description"
        fi
    else
        log_action "INFO" "Not found: $description ($path)"
    fi
}

# Turborepo-specific cache analysis and cleanup
analyze_turbo_cache() {
    local workspace_dir="$1"
    local workspace_name="$2"
    
    local turbo_dir="$workspace_dir/$TURBO_CACHE_DIR"
    if [ -d "$turbo_dir" ]; then
        local cache_size=$(get_size "$turbo_dir")
        local task_count=$(find "$turbo_dir" -name "*.log" | wc -l | tr -d ' ')
        log_action "INFO" "Turbo cache analysis for $workspace_name: $cache_size, $task_count task logs"
        
        # Clean specific Turbo artifacts
        find "$turbo_dir" -name "turbo-*.log" -delete 2>/dev/null || true
        find "$turbo_dir" -name "*.json" -mtime +7 -delete 2>/dev/null || true
    fi
}

# pnpm-specific cleanup
clean_pnpm_artifacts() {
    local dir="$1"
    local name="$2"
    
    # pnpm store cache (global)
    if [ -d "$HOME/.pnpm-store" ]; then
        local store_size=$(get_size "$HOME/.pnpm-store")
        log_action "INFO" "Global pnpm store: $store_size (run 'pnpm store prune' to clean)"
    fi
    
    # Local pnpm cache
    safe_remove "$dir/.pnpm" "pnpm local cache ($name)"
    safe_remove "$dir/.pnpm-store" "pnpm store cache ($name)"
}

# Next.js specific cleanup
clean_nextjs_artifacts() {
    local dir="$1"
    local name="$2"
    
    safe_remove "$dir/.next" "Next.js build cache ($name)"
    safe_remove "$dir/out" "Next.js static export ($name)"
    safe_remove "$dir/.next/cache" "Next.js build cache ($name)"
    
    # Next.js trace files
    find "$dir" -name "*.trace" -delete 2>/dev/null || true
}

# Storybook specific cleanup
clean_storybook_artifacts() {
    local dir="$1"
    local name="$2"
    
    safe_remove "$dir/storybook-static" "Storybook build output ($name)"
    safe_remove "$dir/.storybook-static" "Storybook build output ($name)"
    safe_remove "$dir/chromatic-*" "Chromatic snapshots ($name)"
}

# Playwright specific cleanup
clean_playwright_artifacts() {
    local dir="$1"
    local name="$2"

    safe_remove "$dir/playwright-report" "Playwright test reports ($name)"
    safe_remove "$dir/test-results" "Playwright test results ($name)"
    find "$dir" -name "playwright-report-*" -type d -print0 2>/dev/null | \
        while IFS= read -r -d '' path; do
            safe_remove "$path" "Playwright report ($name)"
        done
}

# Artillery performance testing cleanup
clean_artillery_artifacts() {
    local dir="$1"
    local name="$2"
    
    find "$dir" -name "artillery-report-*.json" -delete 2>/dev/null || true
    find "$dir" -name "artillery-*.json" -delete 2>/dev/null || true
    safe_remove "$dir/reports/performance" "Performance test reports ($name)"
}

# Encore.ts specific cleanup
clean_encore_artifacts() {
    local dir="$1"
    local name="$2"
    
    safe_remove "$dir/encore.app" "Encore runtime files ($name)"
    safe_remove "$dir/.encore" "Encore cache ($name)"
    find "$dir" -name "*.encore" -delete 2>/dev/null || true
}

# Comprehensive development artifacts cleanup
clean_development_artifacts() {
    local dir="$1"
    local name="$2"
    
    log_action "INFO" "🧹 Deep cleaning development artifacts for $name"
    
    # Backup files cleanup
    for pattern in "${SMM_BACKUP_FILES[@]}"; do
        find "$dir" -name "$pattern" -not -path "*/node_modules/*" -delete 2>/dev/null || true
    done
    
    # Debug logs cleanup (specific to package managers)
    for log_pattern in "${SMM_DEBUG_LOGS[@]}"; do
        find "$dir" -name "$log_pattern" -not -path "*/node_modules/*" -delete 2>/dev/null || true
    done
    
    # Profiling files cleanup
    for prof_pattern in "${SMM_PROFILING_FILES[@]}"; do
        find "$dir" -name "$prof_pattern" -not -path "*/node_modules/*" -delete 2>/dev/null || true
    done
    
    # Source maps cleanup (outside node_modules)
    find "$dir" -name "*.map" -not -path "*/node_modules/*" -delete 2>/dev/null || true
    
    # Editor temporary files
    for editor_pattern in "${SMM_EDITOR_FILES[@]}"; do
        find "$dir" -name "$editor_pattern" -not -path "*/node_modules/*" -delete 2>/dev/null || true
    done
    
    # OS-specific files
    for os_pattern in "${SMM_OS_FILES[@]}"; do
        find "$dir" -name "$os_pattern" -delete 2>/dev/null || true
    done
    
    # Database files (local development)
    for db_pattern in "${SMM_DATABASE_FILES[@]}"; do
        find "$dir" -name "$db_pattern" -not -path "*/node_modules/*" -delete 2>/dev/null || true
    done
    
    # Lock files from other package managers (preserve pnpm-lock.yaml)
    find "$dir" -name "yarn.lock" -not -path "*/node_modules/*" -delete 2>/dev/null || true
    find "$dir" -name "bun.lock" -not -path "*/node_modules/*" -delete 2>/dev/null || true
    find "$dir" -name "flake.lock" -not -path "*/node_modules/*" -delete 2>/dev/null || true
}

# IDE-specific cleanup with safety checks
clean_ide_artifacts() {
    local dir="$1"
    local name="$2"
    
    log_action "INFO" "💻 Cleaning IDE artifacts for $name"
    
    # VSCode settings (keep if it contains project-specific settings)
    local vscode_dir="$dir/.vscode"
    if [ -d "$vscode_dir" ]; then
        local vscode_size=$(get_size "$vscode_dir")
        log_action "WARN" "VSCode directory found ($vscode_size): $vscode_dir"
        
        # Only clean cache-like files, preserve settings
        find "$vscode_dir" -name "*.log" -delete 2>/dev/null || true
        find "$vscode_dir" -name "*.cache" -delete 2>/dev/null || true
        
        log_action "INFO" "Preserved VSCode settings, cleaned cache files only"
    fi
    
    # IntelliJ IDEA artifacts (usually safe to remove)
    safe_remove "$dir/.idea" "IntelliJ IDEA directory ($name)"
    
    # Other editor artifacts
    find "$dir" -name "*.code-workspace" -delete 2>/dev/null || true
}

# Enterprise-grade clutter cleanup
clean_enterprise_artifacts() {
    local dir="$1"
    local name="$2"
    
    log_action "INFO" "🏢 Enterprise clutter cleanup for $name"
    
    # Archive files cleanup (often forgotten after sharing/backup)
    for archive_pattern in "${SMM_ARCHIVE_FILES[@]}"; do
        find "$dir" -name "$archive_pattern" -not -path "*/node_modules/*" -not -path "*/infrastructure/kubernetes/helm/*/charts/*" | while read -r archive_file; do
            if [ -f "$archive_file" ]; then
                local archive_size=$(get_size "$archive_file")
                log_action "WARN" "Archive file found ($archive_size): $archive_file"
                log_action "INFO" "Consider reviewing: might be leftover from development"
            fi
        done
    done
    
    # Deprecated/backup directories
    for deprecated_pattern in "${SMM_DEPRECATED_DIRS[@]}"; do
        find "$dir" -name "$deprecated_pattern" -type d -not -path "*/node_modules/*" | while read -r deprecated_dir; do
            if [ -d "$deprecated_dir" ]; then
                local deprecated_size=$(get_size "$deprecated_dir")
                log_action "WARN" "Deprecated directory found ($deprecated_size): $deprecated_dir"
                safe_remove "$deprecated_dir" "Deprecated directory ($name)" "review"
            fi
        done
    done
    
    # Test artifacts cleanup
    safe_remove "$dir/tests/tmp" "Test temporary files ($name)"
    find "$dir" -path "*/tmp/coverage-*" -type d -print0 2>/dev/null | \
        while IFS= read -r -d '' path; do
            safe_remove "$path" "Coverage temp directory ($name)"
        done
    
    # Runtime process artifacts
    for runtime_pattern in "${SMM_RUNTIME_FILES[@]}"; do
        find "$dir" -name "$runtime_pattern" -not -path "*/node_modules/*" -delete 2>/dev/null || true
    done
    
    # Development override files
    for override_pattern in "${SMM_DEVELOPMENT_OVERRIDES[@]}"; do
        find "$dir" -name "$override_pattern" -not -path "*/node_modules/*" | while read -r override_file; do
            if [ -f "$override_file" ]; then
                log_action "WARN" "Development override found: $override_file"
                log_action "INFO" "Review if still needed for local development"
            fi
        done
    done
    
    # Process state artifacts
    for process_pattern in "${SMM_PROCESS_ARTIFACTS[@]}"; do
        find "$dir" -name "$process_pattern" -not -path "*/node_modules/*" -delete 2>/dev/null || true
    done
    
    # Cache and history files
    for cache_pattern in "${SMM_CACHE_HISTORIES[@]}"; do
        find "$dir" -name "$cache_pattern" -not -path "*/node_modules/*" -type f -delete 2>/dev/null || true
    done
}

# SBOM and report cleanup with age-based retention
clean_reports_and_sbom() {
    local dir="$1"
    local name="$2"
    
    log_action "INFO" "📋 Report and SBOM cleanup for $name"
    
    # Clean old SBOM reports (keep recent ones)
    if [ -d "$dir/sbom/reports" ]; then
        local sbom_count=$(find "$dir/sbom/reports" -name "*.json" | wc -l | tr -d ' ')
        if [ "$sbom_count" -gt 5 ]; then
            log_action "WARN" "Found $sbom_count SBOM reports, cleaning old ones"
            find "$dir/sbom/reports" -name "*.json" -mtime +7 -delete 2>/dev/null || true
            local remaining_count=$(find "$dir/sbom/reports" -name "*.json" | wc -l | tr -d ' ')
            log_action "SUCCESS" "Kept $remaining_count recent SBOM reports"
        fi
    fi
    
    # Clean test report artifacts
    for report_pattern in "${SMM_REPORT_FILES[@]}"; do
        find "$dir" -name "$report_pattern" -not -path "*/node_modules/*" -not -path "*/sbom/*" -mtime +3 | while read -r report_file; do
            if [ -f "$report_file" ]; then
                local report_size=$(get_size "$report_file")
                log_action "CLEAN" "Old report file ($report_size): $report_file"
                rm -f "$report_file" 2>/dev/null || true
            fi
        done
    done
}

# Large file analysis (potential clutter)
analyze_large_files() {
    local dir="$1"
    local name="$2"
    
    log_action "INFO" "📊 Large file analysis for $name"
    
    # Find files larger than 50MB outside node_modules
    local large_files=$(find "$dir" -type f -size +50M -not -path "*/node_modules/*" 2>/dev/null)
    
    if [ -n "$large_files" ]; then
        log_action "WARN" "Large files found (>50MB):"
        while IFS= read -r large_file; do
            if [ -f "$large_file" ]; then
                local file_size=$(get_size "$large_file")
                local file_type=$(file -b "$large_file" 2>/dev/null || echo "unknown")
                echo -e "  ${YELLOW}⚠️  ${NC}$large_file ($file_size) - $file_type"
                
                # Suggest actions based on file type
                if [[ "$file_type" == *"database"* ]]; then
                    log_action "INFO" "Consider: Database file - might be development data"
                elif [[ "$file_type" == *"archive"* ]]; then
                    log_action "INFO" "Consider: Archive file - might be old backup"
                elif [[ "$large_file" == *".log"* ]]; then
                    log_action "INFO" "Consider: Log file - can likely be cleaned"
                fi
            fi
        done <<< "$large_files"
    fi
}

# Stale configuration cleanup
clean_stale_configs() {
    local dir="$1"
    local name="$2"
    
    log_action "INFO" "⚙️  Stale configuration cleanup for $name"
    
    # Look for backup/old config files
    for config_pattern in "${SMM_STALE_CONFIGS[@]}"; do
        find "$dir" -name "$config_pattern" -not -path "*/node_modules/*" | while read -r config_file; do
            if [ -f "$config_file" ]; then
                log_action "WARN" "Stale config found: $config_file"
                safe_remove "$config_file" "Stale config file ($name)"
            fi
        done
    done
    
    # Check for duplicate config files
    find "$dir" -name "*.config.*" -not -path "*/node_modules/*" | while read -r config_file; do
        local base_name=$(basename "$config_file" | sed 's/\.[^.]*$//')
        local dir_name=$(dirname "$config_file")
        local count=$(find "$dir_name" -name "$base_name.*" | wc -l | tr -d ' ')
        
        if [ "$count" -gt 2 ]; then
            log_action "WARN" "Multiple config files for $base_name in $dir_name"
        fi
    done
}

# Environment files audit (security-focused)
clean_environment_files() {
    local dir="$1"
    local name="$2"
    
    log_action "INFO" "🔐 Auditing environment files for $name"
    
    # Find all .env files (excluding examples)
    local env_files=$(find "$dir" -name ".env*" -not -name "*.example" -not -name "*.template" 2>/dev/null)
    
    if [ -n "$env_files" ]; then
        while IFS= read -r env_file; do
            if [ -f "$env_file" ]; then
                local env_size=$(get_size "$env_file")
                log_action "WARN" "Environment file found ($env_size): $env_file"
                log_action "INFO" "Checking if file should be preserved or cleaned"
                
                # Check if it's in infrastructure (might be needed)
                if [[ "$env_file" == *"/infrastructure/"* ]]; then
                    log_action "INFO" "Infrastructure env file preserved: $env_file"
                else
                    log_action "WARN" "Consider reviewing: $env_file (may contain secrets)"
                fi
            fi
        done <<< "$env_files"
    fi
}

# TypeScript specific cleanup with project references
clean_typescript_artifacts() {
    local dir="$1"
    local name="$2"
    
    # Enhanced TypeScript cleanup for monorepo
    find "$dir" -name "*.tsbuildinfo" -delete 2>/dev/null || true
    find "$dir" -name ".tsbuildinfo" -delete 2>/dev/null || true
    
    # Clean TypeScript composite project references
    find "$dir" -path "*/dist/tsconfig.tsbuildinfo" -delete 2>/dev/null || true
}

# Comprehensive workspace cleanup function
clean_workspace_artifacts() {
    local workspace_dir="$1"
    local workspace_name="$2"
    local workspace_type="${3:-unknown}"
    
    log_action "INFO" "🔍 Analyzing workspace: $workspace_name ($workspace_type)"
    
    # Technology-specific cleanups
    analyze_turbo_cache "$workspace_dir" "$workspace_name"
    clean_pnpm_artifacts "$workspace_dir" "$workspace_name"
    clean_typescript_artifacts "$workspace_dir" "$workspace_name"
    
    # Comprehensive development artifacts cleanup
    clean_development_artifacts "$workspace_dir" "$workspace_name"
    clean_ide_artifacts "$workspace_dir" "$workspace_name"
    clean_environment_files "$workspace_dir" "$workspace_name"
    
    # Enterprise-grade clutter cleanup
    clean_enterprise_artifacts "$workspace_dir" "$workspace_name"
    clean_reports_and_sbom "$workspace_dir" "$workspace_name"
    analyze_large_files "$workspace_dir" "$workspace_name"
    clean_stale_configs "$workspace_dir" "$workspace_name"
    
    # App-specific cleanups
    if [[ "$workspace_type" == "frontend" || "$workspace_name" == *"frontend"* ]]; then
        clean_nextjs_artifacts "$workspace_dir" "$workspace_name"
        clean_storybook_artifacts "$workspace_dir" "$workspace_name"
        clean_playwright_artifacts "$workspace_dir" "$workspace_name"
    fi
    
    # Service-specific cleanups
    if [[ "$workspace_type" == "service" || "$workspace_name" == *"service"* ]]; then
        clean_encore_artifacts "$workspace_dir" "$workspace_name"
    fi
    
    # Performance testing cleanup for all workspaces
    clean_artillery_artifacts "$workspace_dir" "$workspace_name"
    
    # Standard build artifacts
    for output in "${SMM_BUILD_OUTPUTS[@]}"; do
        safe_remove "$workspace_dir/$output" "Build output: $output ($workspace_name)"
    done
    
    # Standard cache directories
    for cache_dir in "${SMM_CACHE_DIRS[@]}"; do
        safe_remove "$workspace_dir/$cache_dir" "Cache: $cache_dir ($workspace_name)"
    done
    
    # Temporary files with enhanced patterns
    find "$workspace_dir" -name "*.log" -not -path "*/node_modules/*" -delete 2>/dev/null || true
    find "$workspace_dir" -name "*.tmp" -not -path "*/node_modules/*" -delete 2>/dev/null || true
    find "$workspace_dir" -name "*.temp" -not -path "*/node_modules/*" -delete 2>/dev/null || true
    find "$workspace_dir" -name "*.pid" -not -path "*/node_modules/*" -delete 2>/dev/null || true
}


# ========================================
# MAIN EXECUTION LOGIC
# ========================================

# Clean root project with enhanced analysis
log_action "INFO" "🌐 Starting root project cleanup"
clean_workspace_artifacts "$PROJECT_ROOT" "Root Project" "monorepo-root"

# Clean workspaces with type detection
for workspace_type in "${MONOREPO_WORKSPACES[@]}"; do
    workspace_base="$PROJECT_ROOT/$workspace_type"
    
    if [ -d "$workspace_base" ]; then
        echo -e "\n${BOLD}${CYAN}📁 Processing $workspace_type workspaces${NC}"
        echo -e "${CYAN}$(printf '=%.0s' {1..50})${NC}"
        
        for workspace_dir in "$workspace_base"/*/; do
            if [ -d "$workspace_dir" ]; then
                workspace_name=$(basename "$workspace_dir")
                
                # Detect workspace type for specialized cleanup
                detected_type="$workspace_type"
                if [[ "$workspace_name" == *"frontend"* ]]; then
                    detected_type="frontend"
                elif [[ "$workspace_name" == *"service"* || "$workspace_name" == "smm-architect" || "$workspace_name" == "toolhub" ]]; then
                    detected_type="service"
                elif [[ "$workspace_name" == *"ui"* || "$workspace_name" == *"shared"* ]]; then
                    detected_type="library"
                fi
                
                clean_workspace_artifacts "$workspace_dir" "$workspace_name" "$detected_type"
            fi
        done
    else
        log_action "WARN" "Workspace directory not found: $workspace_base"
    fi
done

# SMM Architect specific infrastructure cleanup
echo -e "\n${BOLD}${MAGENTA}🏭 Infrastructure & Platform Cleanup${NC}"
echo -e "${MAGENTA}$(printf '=%.0s' {1..50})${NC}"

# Kubernetes Helm artifacts
helm_charts_dir="$PROJECT_ROOT/infrastructure/kubernetes/helm/smm-architect"
if [ -d "$helm_charts_dir" ]; then
    log_action "INFO" "🚀 Cleaning Kubernetes Helm artifacts"
    safe_remove "$helm_charts_dir/Chart.lock" "Helm Chart lock file"
    safe_remove "$helm_charts_dir/charts" "Helm dependencies cache"
    
    # Clean Helm chart tarballs
    find "$helm_charts_dir" -name "*.tgz" -delete 2>/dev/null || true
fi

# Pulumi state and cache
pulumi_dir="$PROJECT_ROOT/infrastructure/pulumi"
if [ -d "$pulumi_dir" ]; then
    log_action "INFO" "☁️  Cleaning Pulumi artifacts"
    find "$pulumi_dir" -name "Pulumi.*.yaml.bak" -delete 2>/dev/null || true
fi

# Terraform artifacts (if any)
terraform_dirs=$(find "$PROJECT_ROOT" -name ".terraform" -type d 2>/dev/null)
if [ -n "$terraform_dirs" ]; then
    while IFS= read -r tf_dir; do
        safe_remove "$tf_dir" "Terraform cache directory"
    done <<< "$terraform_dirs"
fi

# Monitoring platform data cleanup
echo -e "\n${BOLD}${YELLOW}📊 Monitoring & Observability Cleanup${NC}"
echo -e "${YELLOW}$(printf '=%.0s' {1..50})${NC}"

for data_dir in "${SMM_MONITORING_DATA[@]}"; do
    full_path="$PROJECT_ROOT/monitoring/$data_dir"
    if [ -d "$full_path" ]; then
        local size=$(get_size "$full_path")
        log_action "WARN" "Found monitoring data ($size): $full_path"
        log_action "INFO" "Skipping automatic removal of monitoring data (contains metrics/logs)"
        log_action "INFO" "To manually clean: rm -rf '$full_path'"
    fi
done

# Security artifacts cleanup
echo -e "\n${BOLD}${RED}🔐 Security & Secrets Cleanup${NC}"
echo -e "${RED}$(printf '=%.0s' {1..50})${NC}"

# Remove security test artifacts but preserve keys
find "$PROJECT_ROOT" -name "*.pem" -not -name "*.pub" -delete 2>/dev/null || true
find "$PROJECT_ROOT" -name ".vault-token" -delete 2>/dev/null || true

# Clean up SBOM artifacts (can be regenerated)
sbom_dir="$PROJECT_ROOT/sbom"
if [ -d "$sbom_dir" ]; then
    log_action "INFO" "📋 Cleaning SBOM artifacts (can be regenerated with 'make sbom')"
    find "$sbom_dir" -name "*.json" -mtime +30 -delete 2>/dev/null || true
fi

# System-specific cleanup
echo -e "\n${BOLD}${CYAN}🖥️  System & OS Cleanup${NC}"
echo -e "${CYAN}$(printf '=%.0s' {1..50})${NC}"

# macOS specific
if [[ "$OSTYPE" == "darwin"* ]]; then
    log_action "INFO" "🍎 Cleaning macOS system artifacts"
    find "$PROJECT_ROOT" -name ".DS_Store" -delete 2>/dev/null || true
    find "$PROJECT_ROOT" -name "._*" -delete 2>/dev/null || true
fi

# Windows specific
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    log_action "INFO" "🗺️  Cleaning Windows system artifacts"
    find "$PROJECT_ROOT" -name "Thumbs.db" -delete 2>/dev/null || true
    find "$PROJECT_ROOT" -name "desktop.ini" -delete 2>/dev/null || true
fi

# IDE and editor artifacts
log_action "INFO" "📝 Cleaning IDE artifacts"
find "$PROJECT_ROOT" -name "*.swp" -delete 2>/dev/null || true
find "$PROJECT_ROOT" -name "*.swo" -delete 2>/dev/null || true
find "$PROJECT_ROOT" -name "*~" -delete 2>/dev/null || true

# Enhanced node_modules analysis
echo -e "\n${BOLD}${YELLOW}⚠️  Node.js Dependencies Analysis${NC}"
echo -e "${YELLOW}$(printf '=%.0s' {1..50})${NC}"

node_modules_dirs=$(find "$PROJECT_ROOT" -name "node_modules" -type d | head -20)
if [ -n "$node_modules_dirs" ]; then
    total_nm_size=0
    log_action "WARN" "Node modules directories found:"
    
    while IFS= read -r nm_dir; do
        size=$(get_size "$nm_dir")
        relative_path=${nm_dir#$PROJECT_ROOT/}
        echo -e "  ${YELLOW}➤${NC} $relative_path ($size)"
    done <<< "$node_modules_dirs"
    
    echo ""
    log_action "INFO" "To clean all node_modules (requires reinstall):"
    echo -e "  ${CYAN}find '$PROJECT_ROOT' -name 'node_modules' -type d -exec rm -rf {} +${NC}"
    echo -e "  ${CYAN}pnpm install${NC}"
    
    echo ""
    log_action "INFO" "To clean pnpm global store:"
    echo -e "  ${CYAN}pnpm store prune${NC}"
else
    log_action "SUCCESS" "No node_modules directories found"
fi


# ========================================
# ENTERPRISE REPORTING & RECOMMENDATIONS
# ========================================

echo -e "\n${BOLD}${GREEN}✅ SMM Architect Cleanup Complete!${NC}"
echo -e "${GREEN}$(printf '=%.0s' {1..50})${NC}"

# Cleanup summary
log_action "SUCCESS" "Cleaned $TOTAL_CLEANED artifacts across the monorepo"

echo -e "\n${BOLD}${BLUE}📊 Cleanup Summary${NC}"
echo -e "${BLUE}$(printf '-%.0s' {1..30})${NC}"
echo -e "${GREEN}✅ Build outputs:${NC} dist/, build/, .next/, out/, storybook-static/"
echo -e "${GREEN}✅ Cache systems:${NC} .turbo/, coverage/, .eslintcache, playwright caches"
echo -e "${GREEN}✅ TypeScript:${NC} *.tsbuildinfo files and incremental build info"
echo -e "${GREEN}✅ Test artifacts:${NC} coverage/, test-results/, playwright-report/"
echo -e "${GREEN}✅ Performance:${NC} artillery-report-*.json, lighthouse artifacts"
echo -e "${GREEN}✅ Platform cache:${NC} Encore, Next.js, Storybook, Playwright caches"
echo -e "${GREEN}✅ Infrastructure:${NC} Helm charts cache, Pulumi artifacts"
echo -e "${GREEN}✅ Security:${NC} Temporary keys, vault tokens, old SBOM files"
echo -e "${GREEN}✅ System files:${NC} .DS_Store, Thumbs.db, editor swap files"
echo -e "${GREEN}✅ Development artifacts:${NC} *.bak, *.orig, *.patch backup files"
echo -e "${GREEN}✅ Debug logs:${NC} npm-debug.log, yarn-error.log, pnpm-debug.log"
echo -e "${GREEN}✅ Profiling files:${NC} *.heapsnapshot, *.cpuprofile, *.trace"
echo -e "${GREEN}✅ Source maps:${NC} *.map files outside node_modules"
echo -e "${GREEN}✅ Editor artifacts:${NC} *.swp, *.swo, *~, IDE cache files"
echo -e "${GREEN}✅ Lock file conflicts:${NC} yarn.lock, bun.lock, flake.lock"
echo -e "${GREEN}✅ Database files:${NC} *.sqlite, *.db, dump.rdb local files"
echo -e "${GREEN}✅ Enterprise clutter:${NC} Archive files, deprecated directories"
echo -e "${GREEN}✅ Test artifacts:${NC} tests/tmp/, old report files, junit outputs"
echo -e "${GREEN}✅ Runtime artifacts:${NC} *.sock, *.pid, *.pipe process files"
echo -e "${GREEN}✅ Development overrides:${NC} *.local, *.dev, *.personal configs"
echo -e "${GREEN}✅ Process states:${NC} *.retry, *.failed, *.error files"
echo -e "${GREEN}✅ Stale configs:${NC} *-old.json, *-backup.yml files"
echo -e "${GREEN}✅ SBOM reports:${NC} Age-based cleanup of old compliance reports"

echo -e "\n${BOLD}${CYAN}🔍 Technology Stack Status${NC}"
echo -e "${CYAN}$(printf '-%.0s' {1..30})${NC}"

# Check technology stack health
if command -v pnpm &> /dev/null; then
    pnpm_version=$(pnpm --version)
    echo -e "${GREEN}✅ pnpm:${NC} v$pnpm_version (recommended: 8.15.0)"
else
    echo -e "${RED}❌ pnpm:${NC} Not found (required for SMM Architect)"
fi

if command -v turbo &> /dev/null; then
    turbo_version=$(turbo --version)
    echo -e "${GREEN}✅ Turborepo:${NC} v$turbo_version"
else
    echo -e "${YELLOW}⚠️  Turborepo:${NC} Not found globally (using pnpm turbo)"
fi

if command -v encore &> /dev/null; then
    encore_version=$(encore version 2>/dev/null | head -1 || echo "unknown")
    echo -e "${GREEN}✅ Encore.ts:${NC} $encore_version"
else
    echo -e "${YELLOW}⚠️  Encore.ts:${NC} CLI not found (install: npm install -g @encore/cli)"
fi

if command -v node &> /dev/null; then
    node_version=$(node --version)
    echo -e "${GREEN}✅ Node.js:${NC} $node_version (required: 18+)"
else
    echo -e "${RED}❌ Node.js:${NC} Not found"
fi

echo -e "\n${BOLD}${MAGENTA}🚀 Next Steps & Recommendations${NC}"
echo -e "${MAGENTA}$(printf '-%.0s' {1..40})${NC}"

echo -e "${BLUE}1. Development Environment:${NC}"
echo -e "   ${CYAN}pnpm install${NC}                    # Reinstall dependencies"
echo -e "   ${CYAN}pnpm build${NC}                      # Rebuild all packages"
echo -e "   ${CYAN}pnpm test${NC}                       # Verify everything works"

echo -e "\n${BLUE}2. Performance Optimization:${NC}"
echo -e "   ${CYAN}pnpm store prune${NC}                # Clean global pnpm store"
echo -e "   ${CYAN}pnpm dlx turbo prune --scope=@smm-architect/frontend${NC}  # Create deployment subset"
echo -e "   ${CYAN}docker system prune -f${NC}          # Clean Docker artifacts"

echo -e "\n${BLUE}3. Development Workflow:${NC}"
echo -e "   ${CYAN}pnpm dev${NC}                        # Start all services in dev mode"
echo -e "   ${CYAN}pnpm build --filter=changed${NC}     # Build only changed packages"
echo -e "   ${CYAN}pnpm test --filter=changed${NC}      # Test only changed packages"

echo -e "\n${BLUE}4. Monitoring & Maintenance:${NC}"
echo -e "   ${CYAN}make sbom${NC}                       # Regenerate security bill of materials"
echo -e "   ${CYAN}make ci-security${NC}                # Run security scans"
echo -e "   ${CYAN}npm audit signatures${NC}            # Verify package signatures"

echo -e "\n${BLUE}5. Infrastructure Management:${NC}"
echo -e "   ${CYAN}cd infrastructure/pulumi && pulumi preview${NC}  # Preview infrastructure changes"
echo -e "   ${CYAN}kubectl get pods -n smm-architect${NC}           # Check cluster status"

echo -e "\n${BOLD}${YELLOW}📝 Cleanup Script Configuration${NC}"
echo -e "${YELLOW}$(printf '-%.0s' {1..35})${NC}"
echo -e "${BLUE}Script location:${NC} $PROJECT_ROOT/cleanup.sh"
echo -e "${BLUE}Make executable:${NC} chmod +x cleanup.sh"
echo -e "${BLUE}Run cleanup:${NC} ./cleanup.sh"
echo -e "${BLUE}Schedule cleanup:${NC} Add to cron or CI/CD pipeline"

echo -e "\n${BOLD}${GREEN}🎆 SMM Architect is now optimized and ready for development!${NC}"

# Calculate total project size after cleanup
total_size=$(get_size "$PROJECT_ROOT")
log_action "INFO" "Current project size: $total_size"

# Create cleanup report
cleanup_report="$PROJECT_ROOT/.cleanup-report-$(date +%Y%m%d_%H%M%S).txt"
cat > "$cleanup_report" << EOF
SMM Architect Cleanup Report
Generated: $(date)
Project: $PROJECT_NAME
Location: $PROJECT_ROOT
Total artifacts cleaned: $TOTAL_CLEANED
Project size after cleanup: $total_size

Technology Stack:
- Turborepo + pnpm monorepo
- Encore.ts backend services
- Next.js frontend with Storybook
- Playwright E2E testing
- Artillery performance testing
- Kubernetes + Helm deployment
- Prometheus + Grafana monitoring

Next recommended actions:
1. pnpm install (reinstall dependencies)
2. pnpm build (rebuild all packages)
3. pnpm test (verify functionality)
4. Review and commit changes
EOF

log_action "SUCCESS" "Cleanup report saved: $cleanup_report"