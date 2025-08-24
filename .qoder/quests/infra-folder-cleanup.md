# Infrastructure Folder Cleanup and Development Workflow Standardization

## Overview

This design addresses critical organizational and development workflow issues in the SMM Architect project that are impacting maintainability, developer onboarding, and CI/CD reliability. The project currently suffers from inconsistent folder structures, missing containerization standards, incomplete monorepo configuration, and gaps in development tooling.

### Problem Statement

The codebase exhibits several structural inconsistencies that create friction for developers and operational teams:

1. **Duplicate Infrastructure Folders**: Both `infra/` and `infrastructure/` directories exist with overlapping responsibilities
2. **Inconsistent Service Packaging**: Mixed approach to containerization and build configuration across services
3. **Missing Monorepo Tooling**: Lack of workspace configuration for efficient dependency management
4. **Incomplete Health Monitoring**: Services lack standardized health endpoints for deployment readiness
5. **Missing Local Development Stack**: No orchestrated development environment for integration testing
6. **Security Configuration Gaps**: Missing secret scanning and development security practices
7. **Test-Reality Mismatch**: Rich test suite but many implementations use mocks instead of real integrations
8. **Incomplete CI/CD Gating**: Missing required validation jobs for production readiness

## Architecture

### Current State Analysis

```mermaid
graph TD
    A[Root Project] --> B[infra/ - Pulumi, Terraform, Vault]
    A --> C[infrastructure/ - Multi-tenant TypeScript]
    A --> D[services/ - Microservices]
    A --> E[tests/ - Comprehensive Test Suite]
    
    D --> F[Services with package.json]
    D --> G[Agent Blueprints Only]
    
    F --> H[audit, model-router, simulator]
    F --> I[smm-architect, toolhub]
    
    G --> J[agent folders - blueprint.json only]
    
    style C fill:#ffcccc
    style G fill:#ffcccc
    style J fill:#ffcccc
```

### Target State Architecture

```mermaid
graph TD
    A[Root Project] --> B[infra/ - Canonical Infrastructure]
    A --> C[services/ - Standardized Services]
    A --> D[Development Environment]
    
    B --> E[pulumi/ - IaC Templates]
    B --> F[provisioning/ - Multi-tenant Logic]
    B --> G[terraform/ - Legacy IaC]
    B --> H[vault/ - Secrets Management]
    
    C --> I[Each Service Container]
    I --> J[package.json + Dockerfile + README]
    I --> K[Health Endpoints]
    I --> L[Metrics Endpoints]
    
    D --> M[docker-compose.dev.yml]
    D --> N[pnpm-workspace.yaml]
    D --> O[Local Emulators]
    
    style B fill:#ccffcc
    style I fill:#ccffcc
    style D fill:#ccffcc
```

## Infrastructure Folder Consolidation

### Current Folder Structure Issues

| Folder | Contents | Issues |
|--------|----------|---------|
| `infra/` | Pulumi, Terraform, Vault, Test configs | Core infrastructure tooling |
| `infrastructure/` | Multi-tenant provisioning TypeScript | Overlaps with Pulumi functionality |

### Proposed Reorganization

```
infra/
├── README.md                    # Infrastructure overview and responsibilities
├── pulumi/                      # Infrastructure as Code templates
│   ├── templates/              # Workspace deployment templates
│   ├── examples/               # Example configurations
│   └── modules/                # Reusable Pulumi components
├── provisioning/               # Moved from infrastructure/
│   └── multi-tenant/          # Multi-tenant provisioning logic
│       ├── tenant-manager.ts
│       ├── tenant-provisioning.ts
│       └── types.ts
├── terraform/                  # Legacy Terraform modules
│   └── workspace-module/
├── vault/                      # Secrets management configuration
│   ├── policies/              # Vault policies
│   ├── scripts/               # Setup and configuration scripts
│   └── dev/                   # Development Vault configuration
└── test/                      # Infrastructure testing
    └── Pulumi.yaml
```

### Infrastructure Responsibilities Matrix

| Component | Purpose | Technology | Responsibility Boundary |
|-----------|---------|------------|------------------------|
| Pulumi Templates | Workspace IaC deployment | TypeScript/Pulumi | New workspace provisioning |
| Provisioning Logic | Multi-tenant orchestration | TypeScript | Tenant lifecycle management |
| Terraform Modules | Legacy infrastructure | HCL | Existing infrastructure migration |
| Vault Configuration | Secrets management | Vault policies | Security and secret lifecycle |

## Service Standardization Framework

### Service Packaging Requirements

Each service must implement the following standardized structure:

```
services/{service-name}/
├── package.json           # Build, start, test scripts
├── Dockerfile            # Standardized containerization
├── README.md             # Service documentation
├── src/
│   ├── server.ts        # Main application entry point
│   ├── health.ts        # Health check endpoints
│   └── metrics.ts       # Prometheus metrics
├── test/                # Service-specific tests
└── .env.example         # Environment variable template
```

### Standardized package.json Scripts

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "dev": "ts-node src/server.ts",
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/ --ext .ts",
    "lint:fix": "eslint src/ --ext .ts --fix",
    "health": "curl http://localhost:${PORT:-3000}/health"
  }
}
```

### Dockerfile Template

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Security: non-root user
USER node

EXPOSE ${PORT:-3000}
CMD ["npm", "start"]
```

### Health and Metrics Endpoints

#### Health Endpoint Standard

```typescript
// src/health.ts
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  dependencies: {
    [key: string]: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
      error?: string;
    };
  };
}

export const healthEndpoint = {
  path: '/health',
  method: 'GET',
  response: HealthStatus
};
```

#### Metrics Endpoint Standard

```typescript
// src/metrics.ts
export const metricsEndpoint = {
  path: '/metrics',
  method: 'GET',
  contentType: 'text/plain; version=0.0.4; charset=utf-8',
  response: 'Prometheus metrics format'
};
```

## Monorepo Configuration

### pnpm Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'services/*'
  - 'infra/**'
  - 'monitoring/**'
  - 'examples/**'
  - 'schemas/**'
```

### Root Package.json Enhancement

```json
{
  "scripts": {
    "bootstrap": "pnpm install",
    "dev": "pnpm -r --parallel run dev",
    "build": "pnpm -r run build",
    "build:all": "pnpm -r run build",
    "test": "pnpm -r run test",
    "test:all": "pnpm -r run test",
    "test:unit": "pnpm -r run test --testPathPattern=unit",
    "test:integration": "pnpm -r run test --testPathPattern=integration",
    "test:e2e": "pnpm -r run test --testPathPattern=e2e",
    "lint": "pnpm -r run lint",
    "lint:fix": "pnpm -r run lint:fix",
    "clean": "pnpm -r run clean",
    "docker:build": "docker-compose build",
    "docker:dev": "docker-compose -f docker-compose.dev.yml up",
    "docker:test": "docker-compose -f docker-compose.test.yml up --abort-on-container-exit"
  }
}
```

## Local Development Environment

### Docker Compose Development Stack

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  # Core Database
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: smm_architect_dev
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev_user -d smm_architect_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Secrets Management
  vault:
    image: vault:1.15
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: dev-root-token
      VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200
    ports:
      - "8200:8200"
    volumes:
      - ./infra/vault/dev:/vault/config
    cap_add:
      - IPC_LOCK
    command: vault server -dev -dev-listen-address="0.0.0.0:8200"
    healthcheck:
      test: ["CMD", "vault", "status"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Vector Database (Local)
  milvus:
    image: milvusdb/milvus:latest
    environment:
      ETCD_ENDPOINTS: etcd:2379
      MINIO_ADDRESS: minio:9000
    ports:
      - "19530:19530"
    depends_on:
      - etcd
      - minio
    volumes:
      - milvus_data:/var/lib/milvus

  # Supporting Services for Milvus
  etcd:
    image: quay.io/coreos/etcd:v3.5.0
    environment:
      ETCD_AUTO_COMPACTION_MODE: revision
      ETCD_AUTO_COMPACTION_RETENTION: 1000
      ETCD_QUOTA_BACKEND_BYTES: 4294967296
    volumes:
      - etcd_data:/etcd
    command: etcd -advertise-client-urls=http://127.0.0.1:2379 -listen-client-urls http://0.0.0.0:2379

  minio:
    image: minio/minio:latest
    environment:
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    command: minio server /data --console-address ":9001"

  # SMM Architect Services
  smm-architect:
    build:
      context: ./services/smm-architect
      dockerfile: Dockerfile
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://dev_user:dev_pass@postgres:5432/smm_architect_dev
      VAULT_ADDR: http://vault:8200
      VAULT_TOKEN: dev-root-token
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      vault:
        condition: service_healthy
    volumes:
      - ./services/smm-architect/src:/app/src

  toolhub:
    build:
      context: ./services/toolhub
      dockerfile: Dockerfile
    environment:
      NODE_ENV: development
      VECTOR_DB_URL: http://milvus:19530
      VAULT_ADDR: http://vault:8200
    ports:
      - "3001:3001"
    depends_on:
      - milvus
      - vault
    volumes:
      - ./services/toolhub/src:/app/src

  simulator:
    build:
      context: ./services/simulator
      dockerfile: Dockerfile
    environment:
      NODE_ENV: development
    ports:
      - "3002:3002"
    volumes:
      - ./services/simulator/src:/app/src

  # Reverse Proxy
  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./infra/nginx/dev.conf:/etc/nginx/nginx.conf
    depends_on:
      - smm-architect
      - toolhub
      - simulator

volumes:
  postgres_data:
  etcd_data:
  minio_data:
  milvus_data:
```

## Security and Secrets Management

### Git Secrets Configuration

```bash
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
  
  - repo: https://github.com/gitguardian/ggshield
    rev: v1.18.0
    hooks:
      - id: ggshield
        language: python
        stages: [commit]
```

### Environment Configuration

```bash
# .env.example (root)
# Core Application
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/smm_architect

# Secrets Management
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=your-vault-token

# Vector Database
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=your-pinecone-env

# External APIs
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Monitoring
PROMETHEUS_ENDPOINT=http://localhost:9090
GRAFANA_ENDPOINT=http://localhost:3000
```

## Testing Strategy Enhancement

### Test Classification Framework

```mermaid
graph TD
    A[Test Suite] --> B[Unit Tests]
    A --> C[Integration Tests]
    A --> D[End-to-End Tests]
    
    B --> E[Service Logic]
    B --> F[Utility Functions]
    B --> G[Policy Rules]
    
    C --> H[Database Integration]
    C --> I[External API Integration]
    C --> J[Service-to-Service Communication]
    
    D --> K[Full Workflow Tests]
    D --> L[User Journey Tests]
    D --> M[Production Simulation]
    
    style B fill:#e1f5fe
    style C fill:#fff3e0
    style D fill:#f3e5f5
```

### Local Mode Adapters

```typescript
// services/audit/src/kms/adapter.local.ts
export class LocalKMSAdapter implements KMSAdapter {
  async encrypt(data: string, keyId: string): Promise<EncryptedData> {
    // Local encryption using Node.js crypto
    // For development and CI testing
  }
  
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    // Local decryption
  }
}

// services/toolhub/src/adapters/vector/localAdapter.ts
export class LocalVectorAdapter implements VectorAdapter {
  async search(query: number[], topK: number): Promise<SearchResult[]> {
    // SQLite-based vector search for local development
  }
}
```

### Test Environment Configuration

```typescript
// tests/config/test-environment.ts
export const getTestConfig = () => {
  const env = process.env.TEST_ENV || 'local';
  
  return {
    local: {
      kms: new LocalKMSAdapter(),
      vector: new LocalVectorAdapter(),
      vault: new DevVaultAdapter()
    },
    ci: {
      kms: new MockKMSAdapter(),
      vector: new MockVectorAdapter(),
      vault: new MockVaultAdapter()
    },
    integration: {
      kms: new LocalKMSAdapter(),
      vector: new LocalVectorAdapter(),
      vault: new DevVaultAdapter()
    }
  }[env];
};
```

## CI/CD Pipeline Enhancement

### Required Validation Jobs

```yaml
# .github/workflows/ci.yml (enhanced)
name: Continuous Integration

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  # Schema validation
  schema-validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate JSON Schemas
        run: |
          npm install -g ajv-cli
          ajv validate -s schemas/workspace-contract.json -d examples/*.json

  # Unit testing
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:unit

  # Simulation regression testing
  simulate-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:simulation

  # Audit integration testing
  audit-integration:
    runs-on: ubuntu-latest
    services:
      vault:
        image: vault:1.15
        env:
          VAULT_DEV_ROOT_TOKEN_ID: test-token
        options: --cap-add=IPC_LOCK
    steps:
      - uses: actions/checkout@v4
      - name: Setup test environment
        run: |
          docker-compose -f docker-compose.test.yml up -d postgres vault
      - run: pnpm test:audit-integration

  # Agent integration testing
  agent-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test agent blueprints
        run: pnpm test:agents

  # Database migration testing
  db-migrate-check:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - name: Run migrations
        run: |
          cd services/smm-architect
          npm run migrate:test

  # Contract testing
  contract-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test:contract

  # Security scanning
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run security scan
        uses: securecodewarrior/github-action-add-sarif@v1
        with:
          sarif-file: security-scan-results.sarif

  # Build verification
  build-services:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [smm-architect, toolhub, simulator, audit, model-router]
    steps:
      - uses: actions/checkout@v4
      - name: Build service
        run: |
          cd services/${{ matrix.service }}
          docker build -t ${{ matrix.service }}:test .

  # Integration gate
  integration-gate:
    runs-on: ubuntu-latest
    needs: [
      schema-validate,
      unit-tests,
      simulate-regression,
      audit-integration,
      agent-integration,
      db-migrate-check,
      contract-test,
      security-scan,
      build-services
    ]
    steps:
      - run: echo "All checks passed"
```

### Branch Protection Rules

```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "schema-validate",
      "unit-tests",
      "simulate-regression",
      "audit-integration",
      "agent-integration",
      "db-migrate-check",
      "contract-test",
      "security-scan",
      "build-services"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 2,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null
}
```

## Project Governance

### CODEOWNERS Configuration

```
# CODEOWNERS
# Global owners
* @smm-architect/core-team

# Infrastructure
/infra/ @smm-architect/devops-team @smm-architect/security-team
/infrastructure/ @smm-architect/devops-team

# Security and policies
/security/ @smm-architect/security-team
/services/policy/ @smm-architect/security-team

# Core services
/services/smm-architect/ @smm-architect/backend-team
/services/toolhub/ @smm-architect/backend-team
/services/simulator/ @smm-architect/ml-team

# Schemas and contracts
/schemas/ @smm-architect/architecture-team
/examples/ @smm-architect/architecture-team

# CI/CD and monitoring
/.github/ @smm-architect/devops-team
/monitoring/ @smm-architect/devops-team

# Documentation
/docs/ @smm-architect/tech-writing-team
README.md @smm-architect/tech-writing-team
```

### Contributing Guidelines

```markdown
# CONTRIBUTING.md

## Development Workflow

1. **Setup Development Environment**
   ```bash
   git clone https://github.com/org/smm-architect.git
   cd smm-architect
   pnpm install
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Development Standards**
   - All services must include health endpoints
   - New services must follow the standardized structure
   - Tests are required for all new functionality
   - Policy changes require security team review

4. **Testing Requirements**
   ```bash
   pnpm test:unit          # Unit tests must pass
   pnpm test:integration   # Integration tests must pass
   pnpm lint              # Code style must be consistent
   ```

5. **Pull Request Process**
   - Fill out the PR template completely
   - Ensure all CI checks pass
   - Request review from appropriate code owners
   - Address all feedback before merging

## Code Standards

- **TypeScript**: Strict mode enabled
- **Testing**: 80%+ coverage required
- **Documentation**: All public APIs must be documented
- **Security**: No secrets in code, use Vault for all sensitive data
```

## Implementation Roadmap

### Phase 1: Infrastructure Consolidation (Week 1)

1. **Folder Reorganization**
   - Move `infrastructure/multi-tenant/*` to `infra/provisioning/multi-tenant/`
   - Create `infra/README.md` with clear responsibilities
   - Remove duplicate `infrastructure/` folder
   - Update all import paths and references

2. **Monorepo Configuration**
   - Create `pnpm-workspace.yaml`
   - Update root `package.json` with workspace scripts
   - Test workspace functionality with `pnpm -w install`

### Phase 2: Service Standardization (Week 2)

1. **Service Package Configuration**
   - Add missing `package.json` files to all services
   - Standardize scripts across all services
   - Create `.env.example` files for each service

2. **Containerization**
   - Create standardized `Dockerfile` for each service
   - Implement health endpoints in all services
   - Add Prometheus metrics endpoints

### Phase 3: Development Environment (Week 3)

1. **Docker Compose Setup**
   - Create `docker-compose.dev.yml`
   - Configure local development stack
   - Test full stack integration

2. **Local Emulators**
   - Implement local KMS adapter
   - Create local vector database adapter
   - Configure development Vault instance

### Phase 4: CI/CD Enhancement (Week 4)

1. **Pipeline Jobs**
   - Add all required validation jobs
   - Configure branch protection rules
   - Test CI pipeline thoroughly

2. **Security Configuration**
   - Setup git-secrets and pre-commit hooks
   - Add security scanning to CI
   - Configure secret detection

### Phase 5: Documentation and Governance (Week 5)

1. **Project Governance**
   - Create `CODEOWNERS` file
   - Write comprehensive `CONTRIBUTING.md`
   - Add issue and PR templates

2. **Final Validation**
   - Test complete development workflow
   - Validate all automation works
   - Update project documentation

## Testing

### Unit Testing Framework

Each standardized service includes comprehensive unit tests:

```typescript
// services/{service}/src/__tests__/health.test.ts
describe('Health Endpoint', () => {
  it('should return healthy status when all dependencies are available', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });

  it('should return degraded status when some dependencies are unavailable', async () => {
    // Mock dependency failure
    jest.spyOn(dbService, 'ping').mockRejectedValue(new Error('Connection failed'));
    
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('degraded');
  });
});
```

### Integration Testing

```typescript
// tests/integration/development-environment.test.ts
describe('Development Environment', () => {
  beforeAll(async () => {
    // Start docker-compose.dev.yml
    await execAsync('docker-compose -f docker-compose.dev.yml up -d');
    await waitForServices(['postgres', 'vault', 'milvus']);
  });

  it('should allow full workflow execution', async () => {
    // Test complete workflow from contract to execution
    const workspaceContract = await loadExampleContract();
    const response = await smmArchitectClient.createWorkspace(workspaceContract);
    expect(response.status).toBe('success');
  });

  afterAll(async () => {
    await execAsync('docker-compose -f docker-compose.dev.yml down');
  });
});
```

### Performance Testing

```typescript
// tests/performance/development-stack.test.ts
describe('Development Stack Performance', () => {
  it('should handle concurrent service startup', async () => {
    const startTime = Date.now();
    await Promise.all([
      waitForServiceHealth('smm-architect'),
      waitForServiceHealth('toolhub'),
      waitForServiceHealth('simulator')
    ]);
    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(30000); // 30 seconds max
  });
});
```