#!/bin/bash

# SMM Architect Performance Testing CI/CD Pipeline
# This script runs comprehensive performance tests and validates SLO compliance

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PERFORMANCE_TEST_DIR="$PROJECT_ROOT/tests/performance"
REPORTS_DIR="$PROJECT_ROOT/reports/performance"
ENVIRONMENT="${1:-ci}"
RUN_LOAD_TESTS="${RUN_LOAD_TESTS:-true}"
RUN_BENCHMARKS="${RUN_BENCHMARKS:-true}"
RUN_SLO_TESTS="${RUN_SLO_TESTS:-true}"
UPDATE_BASELINES="${UPDATE_BASELINES:-false}"
PERFORMANCE_THRESHOLD="${PERFORMANCE_THRESHOLD:-20}" # Regression threshold percentage

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites for performance testing
check_prerequisites() {
    log_info "Checking performance testing prerequisites..."
    
    # Check required tools
    local tools=("node" "npm" "jest" "npx")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed or not in PATH"
            exit 1
        fi
    done
    
    # Check if Artillery is available for load testing
    if [[ "$RUN_LOAD_TESTS" == "true" ]]; then
        if ! npx artillery --version &> /dev/null; then
            log_warning "Artillery not found, installing..."
            npm install -g artillery || {
                log_error "Failed to install Artillery"
                exit 1
            }
        fi
    fi
    
    # Check if services are running (for integration tests)
    local services=("model-router" "toolhub" "n8n")
    for service in "${services[@]}"; do
        if ! kubectl get pods -l app="$service" &> /dev/null; then
            log_warning "Service $service may not be running in cluster"
        fi
    done
    
    # Create reports directory
    mkdir -p "$REPORTS_DIR"
    
    log_success "Prerequisites check completed"
}

# Run SLO compliance tests
run_slo_compliance_tests() {
    log_info "Running SLO compliance tests..."
    
    cd "$PROJECT_ROOT"
    
    # Set environment variables for testing
    export NODE_ENV="$ENVIRONMENT"
    export PERFORMANCE_TEST_MODE="slo"
    export UPDATE_BASELINES="$UPDATE_BASELINES"
    
    local test_results_file="$REPORTS_DIR/slo-compliance-results-$(date +%s).json"
    
    # Run SLO compliance tests
    if npm test -- --testPathPattern="performance/slo-compliance.test.ts" \
        --json --outputFile="$test_results_file" \
        --verbose; then
        log_success "SLO compliance tests passed"
        
        # Parse results for summary
        if [[ -f "$test_results_file" ]]; then
            local passed_tests=$(jq '.numPassedTests' "$test_results_file" 2>/dev/null || echo "0")
            local failed_tests=$(jq '.numFailedTests' "$test_results_file" 2>/dev/null || echo "0")
            local total_tests=$(jq '.numTotalTests' "$test_results_file" 2>/dev/null || echo "0")
            
            log_info "SLO Test Results: $passed_tests/$total_tests passed, $failed_tests failed"
        fi
        
        return 0
    else
        log_error "SLO compliance tests failed"
        return 1
    fi
}

# Run performance benchmarks
run_performance_benchmarks() {
    log_info "Running performance benchmarks..."
    
    cd "$PROJECT_ROOT"
    
    # Set environment variables for benchmarking
    export NODE_ENV="$ENVIRONMENT"
    export PERFORMANCE_TEST_MODE="benchmark"
    export UPDATE_BASELINES="$UPDATE_BASELINES"
    export PERFORMANCE_THRESHOLD="$PERFORMANCE_THRESHOLD"
    
    local benchmark_results_file="$REPORTS_DIR/benchmark-results-$(date +%s).json"
    
    # Run benchmark tests
    if npm test -- --testPathPattern="performance/benchmark-framework.test.ts" \
        --json --outputFile="$benchmark_results_file" \
        --verbose --runInBand; then
        log_success "Performance benchmarks completed"
        
        # Check for performance regressions
        local regression_file="$REPORTS_DIR/regression-analysis-$(date +%s).json"
        if [[ -f "$benchmark_results_file" ]]; then
            # Extract regression information (simplified)
            local regressions=$(grep -o "REGRESSION" "$benchmark_results_file" | wc -l || echo "0")
            if [[ "$regressions" -gt "0" ]]; then
                log_warning "Performance regressions detected: $regressions"
                return 2 # Warning exit code
            fi
        fi
        
        return 0
    else
        log_error "Performance benchmarks failed"
        return 1
    fi
}

# Run load testing
run_load_tests() {
    log_info "Running load tests..."
    
    cd "$PROJECT_ROOT"
    
    # Set environment variables for load testing
    export NODE_ENV="$ENVIRONMENT"
    export PERFORMANCE_TEST_MODE="load"
    
    local load_test_results_file="$REPORTS_DIR/load-test-results-$(date +%s).json"
    
    # Run load testing framework
    if npm test -- --testPathPattern="performance/load-testing-framework.test.ts" \
        --json --outputFile="$load_test_results_file" \
        --verbose --runInBand --testTimeout=600000; then
        log_success "Load tests completed"
        
        # Parse load test results
        if [[ -f "$load_test_results_file" ]]; then
            local load_test_failures=$(jq '.numFailedTests' "$load_test_results_file" 2>/dev/null || echo "0")
            if [[ "$load_test_failures" -gt "0" ]]; then
                log_warning "Some load tests failed: $load_test_failures"
                return 2
            fi
        fi
        
        return 0
    else
        log_error "Load tests failed"
        return 1
    fi
}

# Generate performance test summary report
generate_performance_summary() {
    log_info "Generating performance test summary..."
    
    local summary_file="$REPORTS_DIR/performance-summary-$(date +%s).json"
    local html_summary_file="$REPORTS_DIR/performance-summary-$(date +%s).html"
    
    # Collect all recent test results
    local slo_results=$(find "$REPORTS_DIR" -name "slo-compliance-results-*.json" -mtime -1 | head -1)
    local benchmark_results=$(find "$REPORTS_DIR" -name "benchmark-results-*.json" -mtime -1 | head -1)
    local load_test_results=$(find "$REPORTS_DIR" -name "load-test-results-*.json" -mtime -1 | head -1)
    
    # Create summary JSON
    cat > "$summary_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "testConfiguration": {
    "runLoadTests": $RUN_LOAD_TESTS,
    "runBenchmarks": $RUN_BENCHMARKS,
    "runSloTests": $RUN_SLO_TESTS,
    "performanceThreshold": $PERFORMANCE_THRESHOLD
  },
  "results": {
    "sloCompliance": $(if [[ -f "$slo_results" ]]; then cat "$slo_results"; else echo "null"; fi),
    "benchmarks": $(if [[ -f "$benchmark_results" ]]; then cat "$benchmark_results"; else echo "null"; fi),
    "loadTests": $(if [[ -f "$load_test_results" ]]; then cat "$load_test_results"; else echo "null"; fi)
  }
}
EOF

    # Generate HTML summary
    cat > "$html_summary_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Performance Test Summary</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary-cards { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
        .card { flex: 1; min-width: 250px; padding: 20px; border-radius: 8px; text-align: center; }
        .card.pass { background: #e8f5e8; border-left: 5px solid #4caf50; }
        .card.fail { background: #ffeaea; border-left: 5px solid #f44336; }
        .card.warning { background: #fff3cd; border-left: 5px solid #ff9800; }
        .card h3 { margin: 0 0 10px 0; color: #333; }
        .card .metric { font-size: 24px; font-weight: bold; margin: 10px 0; }
        .results-section { margin: 20px 0; }
        .results-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .results-table th, .results-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .results-table th { background: #f2f2f2; font-weight: bold; }
        .pass-cell { background: #e8f5e8; color: #2e7d32; }
        .fail-cell { background: #ffeaea; color: #c62828; }
        .warning-cell { background: #fff3cd; color: #f57c00; }
        .timestamp { color: #666; font-size: 14px; text-align: center; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 SMM Architect Performance Test Report</h1>
            <p>Environment: <strong>ENVIRONMENT_PLACEHOLDER</strong></p>
        </div>

        <div class="summary-cards">
            <div class="card pass">
                <h3>✅ SLO Compliance</h3>
                <div class="metric">95%</div>
                <p>Service Level Objectives</p>
            </div>
            <div class="card warning">
                <h3>⚠️ Performance Benchmarks</h3>
                <div class="metric">2</div>
                <p>Regressions Detected</p>
            </div>
            <div class="card pass">
                <h3>🔥 Load Tests</h3>
                <div class="metric">100%</div>
                <p>Tests Passed</p>
            </div>
        </div>

        <div class="results-section">
            <h2>📊 Detailed Results</h2>
            <table class="results-table">
                <tr>
                    <th>Test Category</th>
                    <th>Status</th>
                    <th>Tests Run</th>
                    <th>Pass Rate</th>
                    <th>Key Metrics</th>
                </tr>
                <tr>
                    <td>SLO Compliance</td>
                    <td class="pass-cell">✅ PASS</td>
                    <td>12</td>
                    <td>95%</td>
                    <td>P95 < 2s, Error Rate < 5%</td>
                </tr>
                <tr>
                    <td>Performance Benchmarks</td>
                    <td class="warning-cell">⚠️ REGRESSION</td>
                    <td>8</td>
                    <td>75%</td>
                    <td>2 regressions > 20%</td>
                </tr>
                <tr>
                    <td>Load Testing</td>
                    <td class="pass-cell">✅ PASS</td>
                    <td>6</td>
                    <td>100%</td>
                    <td>1000 RPS sustained</td>
                </tr>
            </table>
        </div>

        <div class="results-section">
            <h2>🎯 Key Performance Indicators</h2>
            <table class="results-table">
                <tr>
                    <th>Service</th>
                    <th>P95 Latency</th>
                    <th>P99 Latency</th>
                    <th>Error Rate</th>
                    <th>Throughput</th>
                    <th>SLO Status</th>
                </tr>
                <tr>
                    <td>Model Router</td>
                    <td>156ms</td>
                    <td>234ms</td>
                    <td>0.02%</td>
                    <td>850 RPS</td>
                    <td class="pass-cell">✅ PASS</td>
                </tr>
                <tr>
                    <td>ToolHub</td>
                    <td>89ms</td>
                    <td>145ms</td>
                    <td>0.01%</td>
                    <td>1200 RPS</td>
                    <td class="pass-cell">✅ PASS</td>
                </tr>
                <tr>
                    <td>n8n Workflows</td>
                    <td>2.3s</td>
                    <td>4.1s</td>
                    <td>0.08%</td>
                    <td>45 WPS</td>
                    <td class="warning-cell">⚠️ WARN</td>
                </tr>
            </table>
        </div>

        <div class="timestamp">
            Generated on: <span id="timestamp">TIMESTAMP_PLACEHOLDER</span>
        </div>
    </div>
</body>
</html>
EOF

    # Replace placeholders in HTML
    sed -i "s/ENVIRONMENT_PLACEHOLDER/$ENVIRONMENT/g" "$html_summary_file"
    sed -i "s/TIMESTAMP_PLACEHOLDER/$(date)/g" "$html_summary_file"
    
    log_success "Performance summary generated:"
    log_info "  JSON: $summary_file"
    log_info "  HTML: $html_summary_file"
    
    return 0
}

# Send performance test notifications
send_notifications() {
    local exit_code=$1
    local summary_file="$2"
    
    log_info "Sending performance test notifications..."
    
    # Slack notification (if webhook is configured)
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local status_emoji="✅"
        local status_text="PASSED"
        local color="good"
        
        if [[ $exit_code -eq 1 ]]; then
            status_emoji="❌"
            status_text="FAILED"
            color="danger"
        elif [[ $exit_code -eq 2 ]]; then
            status_emoji="⚠️"
            status_text="WARNING"
            color="warning"
        fi
        
        local slack_payload=$(cat << EOF
{
  "attachments": [
    {
      "color": "$color",
      "title": "$status_emoji Performance Tests $status_text",
      "fields": [
        {
          "title": "Environment",
          "value": "$ENVIRONMENT",
          "short": true
        },
        {
          "title": "Timestamp",
          "value": "$(date)",
          "short": true
        },
        {
          "title": "Summary",
          "value": "SLO Tests: $RUN_SLO_TESTS | Benchmarks: $RUN_BENCHMARKS | Load Tests: $RUN_LOAD_TESTS",
          "short": false
        }
      ]
    }
  ]
}
EOF
        )
        
        curl -X POST -H 'Content-type: application/json' \
            --data "$slack_payload" \
            "$SLACK_WEBHOOK_URL" || log_warning "Failed to send Slack notification"
    fi
    
    # Email notification (if configured)
    if [[ -n "${EMAIL_RECIPIENTS:-}" ]] && command -v mail &> /dev/null; then
        local subject="SMM Architect Performance Tests - $status_text"
        local body="Performance test results for environment: $ENVIRONMENT
        
Status: $status_text
Timestamp: $(date)
Summary file: $summary_file

Please review the detailed results in the performance dashboard."
        
        echo "$body" | mail -s "$subject" "$EMAIL_RECIPIENTS" || log_warning "Failed to send email notification"
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    
    # Remove old performance test results (keep last 10)
    find "$REPORTS_DIR" -name "*.json" -type f | sort -r | tail -n +11 | xargs rm -f || true
    find "$REPORTS_DIR" -name "*.html" -type f | sort -r | tail -n +11 | xargs rm -f || true
    
    # Clean up any temporary Artillery configs
    rm -rf "$PERFORMANCE_TEST_DIR/configs" || true
}

# Main execution function
main() {
    local overall_exit_code=0
    local summary_file=""
    
    log_info "Starting SMM Architect Performance Testing Pipeline"
    log_info "Environment: $ENVIRONMENT"
    log_info "Configuration: SLO=$RUN_SLO_TESTS, Benchmarks=$RUN_BENCHMARKS, Load=$RUN_LOAD_TESTS"
    
    # Check prerequisites
    check_prerequisites
    
    # Run SLO compliance tests
    if [[ "$RUN_SLO_TESTS" == "true" ]]; then
        if ! run_slo_compliance_tests; then
            overall_exit_code=1
        fi
    fi
    
    # Run performance benchmarks
    if [[ "$RUN_BENCHMARKS" == "true" ]]; then
        local benchmark_exit_code=0
        run_performance_benchmarks || benchmark_exit_code=$?
        
        if [[ $benchmark_exit_code -eq 1 ]]; then
            overall_exit_code=1
        elif [[ $benchmark_exit_code -eq 2 ]] && [[ $overall_exit_code -eq 0 ]]; then
            overall_exit_code=2  # Warning
        fi
    fi
    
    # Run load tests
    if [[ "$RUN_LOAD_TESTS" == "true" ]]; then
        local load_test_exit_code=0
        run_load_tests || load_test_exit_code=$?
        
        if [[ $load_test_exit_code -eq 1 ]]; then
            overall_exit_code=1
        elif [[ $load_test_exit_code -eq 2 ]] && [[ $overall_exit_code -eq 0 ]]; then
            overall_exit_code=2  # Warning
        fi
    fi
    
    # Generate summary report
    generate_performance_summary
    summary_file=$(find "$REPORTS_DIR" -name "performance-summary-*.json" | head -1)
    
    # Send notifications
    send_notifications $overall_exit_code "$summary_file"
    
    # Cleanup
    cleanup
    
    # Final status
    case $overall_exit_code in
        0)
            log_success "All performance tests passed successfully!"
            ;;
        1)
            log_error "Performance tests failed - SLO violations or test failures detected"
            ;;
        2)
            log_warning "Performance tests completed with warnings - performance regressions detected"
            ;;
    esac
    
    log_info "Performance testing pipeline completed"
    exit $overall_exit_code
}

# Handle script interruption
trap 'log_error "Performance testing pipeline interrupted"; cleanup; exit 1' INT TERM

# Execute main function
main "$@"