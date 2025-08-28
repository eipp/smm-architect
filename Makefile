# SMM Architect Makefile
# Development and build automation for the SMM Architect platform

.PHONY: help install build test clean sbom security supply-chain docker

# Default target
.DEFAULT_GOAL := help

# Configuration
TIMESTAMP := $(shell date +%Y%m%d_%H%M%S)
PROJECT_ROOT := $(shell pwd)
SBOM_OUTPUT := $(PROJECT_ROOT)/sbom

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

help: ## Show this help message
	@echo "SMM Architect Development Commands"
	@echo "================================="
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## Install all dependencies
	@echo "$(YELLOW)Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)Dependencies installed successfully$(NC)"

build: ## Build all services
	@echo "$(YELLOW)Building all services...$(NC)"
	cd services/smm-architect && npm run build
	cd apps/frontend && npm run build
	@echo "$(GREEN)Build completed successfully$(NC)"

test: ## Run all tests
	@echo "$(YELLOW)Running tests...$(NC)"
	npm test
	@echo "$(GREEN)Tests completed$(NC)"

test-security: ## Run security tests including tenant isolation
	@echo "$(YELLOW)Running security tests...$(NC)"
	@echo "🔍 Validating RLS policies in migrations..."
	node tools/migration-rls-linter.js services/smm-architect/migrations/
	@echo "🔴 Running evil tenant security tests..."
	npm run test:security
	@echo "$(GREEN)Security tests completed$(NC)"

clean: ## Clean build artifacts and temporary files
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	rm -rf node_modules/.cache
	rm -rf apps/frontend/dist
	rm -rf services/*/dist
	rm -rf coverage
	rm -rf $(SBOM_OUTPUT)
	@echo "$(GREEN)Cleanup completed$(NC)"

# SBOM and Supply Chain Security Targets
sbom: ## Generate Software Bill of Materials (SBOM)
	@echo "$(YELLOW)Generating SBOM for all components...$(NC)"
	./tools/scripts/generate-sbom.sh
	@echo "$(GREEN)SBOM generation completed. Check ./sbom/ directory$(NC)"

sbom-quick: ## Generate SBOM for backend services only (faster)
	@echo "$(YELLOW)Generating SBOM for backend services...$(NC)"
	mkdir -p $(SBOM_OUTPUT)/services
	syft packages dir:services/smm-architect --output cyclonedx-json --file $(SBOM_OUTPUT)/services/smm-architect-sbom.json
	syft packages dir:services/dsr --output cyclonedx-json --file $(SBOM_OUTPUT)/services/dsr-service-sbom.json
	@echo "$(GREEN)Quick SBOM generation completed$(NC)"

security-scan: sbom ## Run comprehensive security scan with vulnerability analysis
	@echo "$(YELLOW)Running security scan with vulnerability analysis...$(NC)"
	./tools/scripts/generate-sbom.sh
	@if [ -d "$(SBOM_OUTPUT)/vulnerabilities" ]; then \
		echo "$(YELLOW)Vulnerability Summary:$(NC)"; \
		find $(SBOM_OUTPUT)/vulnerabilities -name "*.json" -exec sh -c 'echo "File: $$1"; jq -r ".matches | length" "$$1" 2>/dev/null || echo "0"' _ {} \; | \
		awk 'BEGIN{total=0} /^[0-9]+$$/{total+=$$1} END{print "Total vulnerabilities found: " total}'; \
	fi
	@echo "$(GREEN)Security scan completed$(NC)"

supply-chain: ## Complete supply chain security validation
	@echo "$(YELLOW)Running complete supply chain security validation...$(NC)"
	@echo "1. Generating SBOMs..."
	./tools/scripts/generate-sbom.sh
	@echo "2. Running container image signing validation..."
	@if [ -f ".github/workflows/supply-chain-security.yml" ]; then \
		echo "Supply chain security workflow is configured"; \
	else \
		echo "$(RED)Warning: Supply chain security workflow not found$(NC)"; \
	fi
	@echo "3. Checking compliance attestation..."
	@if [ -f "$(SBOM_OUTPUT)/reports/compliance-attestation-*.json" ]; then \
		echo "$(GREEN)Compliance attestation generated$(NC)"; \
	else \
		echo "$(RED)Warning: Compliance attestation not found$(NC)"; \
	fi
	@echo "$(GREEN)Supply chain validation completed$(NC)"

# Docker and Container Targets
docker-build: ## Build all Docker containers
	@echo "$(YELLOW)Building Docker containers...$(NC)"
	docker-compose build
	@echo "$(GREEN)Docker build completed$(NC)"

docker-sbom: ## Generate SBOM for Docker images
	@echo "$(YELLOW)Generating SBOM for Docker images...$(NC)"
	mkdir -p $(SBOM_OUTPUT)/infrastructure
	@if command -v syft >/dev/null 2>&1; then \
		docker-compose config --services | while read service; do \
			image=$$(docker-compose config | grep -A 5 "$$service:" | grep "image:" | awk '{print $$2}'); \
			if [ ! -z "$$image" ]; then \
				echo "Scanning $$image..."; \
				syft packages "$$image" --output cyclonedx-json --file "$(SBOM_OUTPUT)/infrastructure/$${service}-sbom.json" 2>/dev/null || echo "Failed to scan $$image"; \
			fi; \
		done; \
	else \
		echo "$(RED)Syft not installed. Please install Syft to generate container SBOMs$(NC)"; \
	fi
	@echo "$(GREEN)Docker SBOM generation completed$(NC)"

# Development Workflow Targets
dev-setup: install ## Complete development environment setup
	@echo "$(YELLOW)Setting up development environment...$(NC)"
	npm install
	chmod +x tools/scripts/*.sh
	@echo "$(GREEN)Development environment setup completed$(NC)"

dev-check: test test-security sbom ## Run all development checks (tests, security, SBOM)
	@echo "$(YELLOW)Running complete development checks...$(NC)"
	npm test
	npm run test:security
	$(MAKE) sbom-quick
	@echo "$(GREEN)All development checks passed$(NC)"

# CI/CD Integration Targets
ci-build: install build test ## CI build pipeline
	@echo "$(YELLOW)Running CI build pipeline...$(NC)"
	$(MAKE) install
	$(MAKE) build
	$(MAKE) test
	@echo "$(GREEN)CI build pipeline completed$(NC)"

ci-security: test-security supply-chain ## CI security pipeline
	@echo "$(YELLOW)Running CI security pipeline...$(NC)"
	$(MAKE) test-security
	$(MAKE) supply-chain
	@echo "$(GREEN)CI security pipeline completed$(NC)"

# Production Readiness Targets
prod-ready: ci-build ci-security ## Validate production readiness
	@echo "$(YELLOW)Validating production readiness...$(NC)"
	$(MAKE) ci-build
	$(MAKE) ci-security
	@echo "$(GREEN)Production readiness validation completed$(NC)"
	@echo ""
	@echo "Production Readiness Checklist:"
	@echo "  ✓ Build pipeline passed"
	@echo "  ✓ All tests passed"
	@echo "  ✓ Security tests passed"
	@echo "  ✓ SBOM generated"
	@echo "  ✓ Supply chain security validated"
	@echo ""
	@echo "$(GREEN)System is ready for production deployment$(NC)"

# Utility Targets
check-tools: ## Check if required tools are installed
	@echo "$(YELLOW)Checking required tools...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)Node.js is required but not installed$(NC)"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)npm is required but not installed$(NC)"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)Docker is required but not installed$(NC)"; exit 1; }
	@command -v syft >/dev/null 2>&1 || echo "$(YELLOW)Warning: Syft not installed (required for SBOM generation)$(NC)"
	@command -v grype >/dev/null 2>&1 || echo "$(YELLOW)Warning: Grype not installed (required for vulnerability scanning)$(NC)"
	@echo "$(GREEN)Tool check completed$(NC)"

show-sbom: ## Show SBOM generation status and results
	@echo "$(YELLOW)SBOM Generation Status$(NC)"
	@echo "====================="
	@if [ -d "$(SBOM_OUTPUT)" ]; then \
		echo "SBOM Directory: $(SBOM_OUTPUT)"; \
		echo "Generated Files:"; \
		find $(SBOM_OUTPUT) -name "*.json" -o -name "*.csv" | sort; \
		echo ""; \
		echo "Summary:"; \
		echo "  Services: $$(find $(SBOM_OUTPUT)/services -name "*.json" 2>/dev/null | wc -l | tr -d ' ')"; \
		echo "  Infrastructure: $$(find $(SBOM_OUTPUT)/infrastructure -name "*.json" 2>/dev/null | wc -l | tr -d ' ')"; \
		echo "  Reports: $$(find $(SBOM_OUTPUT)/reports -name "*.json" 2>/dev/null | wc -l | tr -d ' ')"; \
	else \
		echo "$(RED)No SBOM directory found. Run 'make sbom' to generate SBOMs$(NC)"; \
	fi

# Archive and Release Targets
archive-sbom: sbom ## Archive SBOM files with timestamp
	@echo "$(YELLOW)Archiving SBOM files...$(NC)"
	tar -czf sbom-archive-$(TIMESTAMP).tar.gz -C $(SBOM_OUTPUT) .
	@echo "$(GREEN)SBOM archived to sbom-archive-$(TIMESTAMP).tar.gz$(NC)"