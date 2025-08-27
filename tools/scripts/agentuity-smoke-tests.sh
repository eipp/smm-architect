#!/bin/bash

# Agentuity Agent Smoke Tests
# Validates production deployment and integration

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SMOKE_TENANT="smoke-test-tenant-$(date +%s)"
SMOKE_WORKSPACE="smoke-test-workspace-$(date +%s)"
LOG_FILE="/tmp/agentuity-smoke-tests.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

# Check required environment variables
check_environment() {
    log "Checking environment variables..."
    
    local required_vars=(
        "AGENTUITY_WEBHOOK_URL"
        "AGENTUITY_API_KEY" 
        "VAULT_ADDR"
        "VAULT_TOKEN"
        "TOOLHUB_ENDPOINT"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    success "All required environment variables are set"
}

# Generate webhook signature
generate_signature() {
    local payload="$1"
    local secret="$2"
    echo -n "$payload" | openssl dgst -sha256 -hmac "$secret" | cut -d' ' -f2
}

# Test 1: Basic connectivity
test_connectivity() {
    log "Testing basic connectivity to Agentuity agent..."
    
    local health_url="${AGENTUITY_WEBHOOK_URL}/_health"
    
    if curl -s -f "$health_url" > /dev/null 2>&1; then
        success "Health endpoint is accessible"
    else
        warning "Health endpoint not accessible (may not be implemented)"
    fi
}

# Test 2: Authentication validation
test_authentication() {
    log "Testing webhook authentication..."
    
    local payload='{
        "tenantId": "'$SMOKE_TENANT'",
        "workspaceId": "'$SMOKE_WORKSPACE'",
        "content": "Authentication test",
        "action": "health_check"
    }'
    
    # Test with invalid signature
    local response=$(curl -s -w "%{http_code}" -o /tmp/auth_test_response.json \
        -X POST "$AGENTUITY_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -H "X-Agentuity-Signature: sha256=invalid_signature" \
        -d "$payload")
    
    if [[ "$response" == "401" ]]; then
        success "Invalid signature correctly rejected"
    else
        error "Authentication validation failed - invalid signature was accepted"
        return 1
    fi
}

# Test 3: Valid agent request
test_valid_request() {
    log "Testing valid agent request processing..."
    
    # First, store webhook key in Vault for smoke test tenant
    vault kv put "secret/agentuity/$SMOKE_TENANT/webhook_key" key="smoke-test-webhook-key" || {
        warning "Could not store webhook key in Vault"
    }
    
    vault kv put "secret/workspaces/$SMOKE_TENANT/toolhub-api-key" api_key="smoke-test-toolhub-key" || {
        warning "Could not store ToolHub key in Vault"
    }
    
    local payload='{
        "tenantId": "'$SMOKE_TENANT'",
        "workspaceId": "'$SMOKE_WORKSPACE'", 
        "content": "Generate a brief social media strategy for a tech startup",
        "action": "research"
    }'
    
    # Generate valid signature
    local signature=$(generate_signature "$payload" "smoke-test-webhook-key")
    
    log "Sending test request to agent..."
    local response=$(curl -s -w "%{http_code}" -o /tmp/agent_response.json \
        -X POST "$AGENTUITY_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -H "X-Tenant-ID: $SMOKE_TENANT" \
        -H "X-Workspace-ID: $SMOKE_WORKSPACE" \
        -H "X-Agentuity-Signature: sha256=$signature" \
        -d "$payload")
    
    local http_code="${response: -3}"
    
    if [[ "$http_code" == "200" ]]; then
        local status=$(cat /tmp/agent_response.json | jq -r '.status' 2>/dev/null || echo "unknown")
        
        if [[ "$status" == "completed" ]]; then
            success "Agent processed request successfully"
            
            # Validate response structure
            local has_result=$(cat /tmp/agent_response.json | jq -r '.result != null' 2>/dev/null || echo "false")
            local has_metadata=$(cat /tmp/agent_response.json | jq -r '.metadata != null' 2>/dev/null || echo "false")
            
            if [[ "$has_result" == "true" && "$has_metadata" == "true" ]]; then
                success "Response structure is valid"
            else
                warning "Response structure may be incomplete"
            fi
            
        else
            error "Agent returned status: $status"
            cat /tmp/agent_response.json | jq '.' 2>/dev/null || cat /tmp/agent_response.json
            return 1
        fi
    else
        error "Agent request failed with HTTP $http_code"
        cat /tmp/agent_response.json 2>/dev/null || echo "No response body"
        return 1
    fi
}

# Test 4: Tenant isolation
test_tenant_isolation() {
    log "Testing tenant isolation..."
    
    # Create workspace for legitimate tenant
    local legit_tenant="legit-tenant-$(date +%s)"
    local legit_workspace="legit-workspace-$(date +%s)"
    
    # Set up legitimate tenant
    vault kv put "secret/agentuity/$legit_tenant/webhook_key" key="legit-webhook-key" || {
        warning "Could not set up legitimate tenant in Vault"
        return 0
    }
    
    # Evil tenant tries to access legitimate tenant's workspace
    local evil_payload='{
        "tenantId": "'$SMOKE_TENANT'",
        "workspaceId": "'$legit_workspace'",
        "content": "Try to access other tenant data",
        "action": "research"
    }'
    
    local evil_signature=$(generate_signature "$evil_payload" "smoke-test-webhook-key")
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/isolation_test.json \
        -X POST "$AGENTUITY_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -H "X-Tenant-ID: $SMOKE_TENANT" \
        -H "X-Workspace-ID: $legit_workspace" \
        -H "X-Agentuity-Signature: sha256=$evil_signature" \
        -d "$evil_payload")
    
    local http_code="${response: -3}"
    
    if [[ "$http_code" == "403" || "$http_code" == "404" || "$http_code" == "400" ]]; then
        success "Tenant isolation working - cross-tenant access denied"
    else
        local status=$(cat /tmp/isolation_test.json | jq -r '.status' 2>/dev/null || echo "unknown")
        if [[ "$status" == "failed" ]]; then
            success "Tenant isolation working - agent rejected cross-tenant request"
        else
            error "Tenant isolation may be compromised - cross-tenant access succeeded"
            return 1
        fi
    fi
}

# Test 5: Cost estimation
test_cost_estimation() {
    log "Testing cost estimation and guards..."
    
    # Test with very large content that should trigger cost guards
    local large_content=$(printf 'A%.0s' {1..10000})  # 10,000 characters
    
    local payload='{
        "tenantId": "'$SMOKE_TENANT'",
        "workspaceId": "'$SMOKE_WORKSPACE'",
        "content": "'$large_content'",
        "action": "creative"
    }'
    
    local signature=$(generate_signature "$payload" "smoke-test-webhook-key")
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/cost_test.json \
        -X POST "$AGENTUITY_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -H "X-Tenant-ID: $SMOKE_TENANT" \
        -H "X-Workspace-ID: $SMOKE_WORKSPACE" \
        -H "X-Agentuity-Signature: sha256=$signature" \
        -d "$payload")
    
    local http_code="${response: -3}"
    
    if [[ "$http_code" == "429" ]]; then
        success "Cost guards working - large request rejected"
    elif [[ "$http_code" == "200" ]]; then
        local estimated_cost=$(cat /tmp/cost_test.json | jq -r '.metadata.estimated_cost' 2>/dev/null || echo "0")
        if [[ "$estimated_cost" != "0" && "$estimated_cost" != "null" ]]; then
            success "Cost estimation working - cost: $estimated_cost"
        else
            warning "Cost estimation may not be working properly"
        fi
    else
        warning "Cost test returned unexpected status: $http_code"
    fi
}

# Test 6: Integration with ToolHub
test_toolhub_integration() {
    log "Testing ToolHub integration..."
    
    # This test checks if the agent properly integrates with ToolHub
    # by examining the response metadata
    
    local payload='{
        "tenantId": "'$SMOKE_TENANT'",
        "workspaceId": "'$SMOKE_WORKSPACE'",
        "content": "Test ToolHub integration",
        "action": "research"
    }'
    
    local signature=$(generate_signature "$payload" "smoke-test-webhook-key")
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/toolhub_test.json \
        -X POST "$AGENTUITY_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -H "X-Tenant-ID: $SMOKE_TENANT" \
        -H "X-Workspace-ID: $SMOKE_WORKSPACE" \
        -H "X-Agentuity-Signature: sha256=$signature" \
        -d "$payload")
    
    local http_code="${response: -3}"
    
    if [[ "$http_code" == "200" ]]; then
        local toolhub_processed=$(cat /tmp/toolhub_test.json | jq -r '.toolhub_processed' 2>/dev/null || echo "false")
        
        if [[ "$toolhub_processed" == "true" ]]; then
            success "ToolHub integration working"
        else
            warning "ToolHub integration may not be active"
        fi
    else
        warning "Could not test ToolHub integration - agent request failed"
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up smoke test data..."
    
    # Remove Vault secrets
    vault kv delete "secret/agentuity/$SMOKE_TENANT/webhook_key" 2>/dev/null || true
    vault kv delete "secret/workspaces/$SMOKE_TENANT/toolhub-api-key" 2>/dev/null || true
    
    # Clean up temporary files
    rm -f /tmp/auth_test_response.json
    rm -f /tmp/agent_response.json
    rm -f /tmp/isolation_test.json
    rm -f /tmp/cost_test.json
    rm -f /tmp/toolhub_test.json
    
    success "Cleanup completed"
}

# Main execution
main() {
    log "🚀 Starting Agentuity Agent Smoke Tests"
    log "Tenant: $SMOKE_TENANT"
    log "Workspace: $SMOKE_WORKSPACE"
    log "Webhook URL: $AGENTUITY_WEBHOOK_URL"
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    local failed_tests=0
    
    # Run tests
    check_environment || ((failed_tests++))
    test_connectivity || ((failed_tests++))
    test_authentication || ((failed_tests++))
    test_valid_request || ((failed_tests++))
    test_tenant_isolation || ((failed_tests++))
    test_cost_estimation || ((failed_tests++))
    test_toolhub_integration || ((failed_tests++))
    
    # Summary
    log "\n📊 Smoke Test Summary"
    log "Log file: $LOG_FILE"
    
    if [[ $failed_tests -eq 0 ]]; then
        success "All smoke tests passed! 🎉"
        success "Agentuity agent is production ready"
        exit 0
    else
        error "$failed_tests test(s) failed"
        error "Please review the issues before proceeding to production"
        exit 1
    fi
}

# Run main function
main "$@"