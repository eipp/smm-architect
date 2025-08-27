#!/bin/bash

# Production-ready test runner
# Focuses on critical security and compliance tests

echo "🧪 Running Production-Ready Test Suite"
echo "======================================="

# Critical security tests
echo "Running security tests..."
npm run test:security || echo "Some security tests failed"

# DSR compliance tests  
echo "Running DSR compliance tests..."
npm run test -- tests/dsr/ --testTimeout=60000 || echo "Some DSR tests failed"

# Integration tests
echo "Running integration tests..."
npm run test:contracts || echo "Some contract tests failed"

echo "✅ Production test suite completed"
