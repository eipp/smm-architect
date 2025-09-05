# SMM Architect Deployment Guide

This guide covers deployment options for SMM Architect from local development to production environments.

## Overview

SMM Architect supports multiple deployment patterns:

- **Local Development**: Docker Compose for quick setup
- **Kubernetes**: Production-ready container orchestration
- **Cloud Platforms**: AWS, GCP, Azure with Infrastructure as Code
- **Edge Deployment**: CDN and edge computing integration

## Prerequisites

### Required Tools
- Docker 20.0+
- Kubernetes 1.24+
- Helm 3.8+
- kubectl configured for your cluster
- HashiCorp Vault (for secrets management)
- PostgreSQL 14+ (or managed database service)

### Infrastructure Requirements

#### Minimum System Requirements
- **Development**: 4 CPU cores, 8GB RAM, 50GB storage
- **Production**: 16 CPU cores, 32GB RAM, 500GB storage
- **Database**: Separate PostgreSQL instance with 100GB+ storage

#### Network Requirements
- HTTPS/TLS termination
- Load balancer with health checks
- Internal service mesh (optional but recommended)

## Local Development Deployment

### Docker Compose Setup

1. **Clone and Configure**
   ```bash
   git clone https://github.com/yourorg/smm-architect.git
   cd smm-architect
   
   # Copy environment template
   cp .env.example .env
   
   # Update configuration
   nano .env
   ```

2. **Start Services**
   ```bash
   # Start all services
   docker-compose up -d
   
   # Check service health
   docker-compose ps
   
   # View logs
   docker-compose logs -f smm-architect
   ```

3. **Initialize Database**
   ```bash
   # Run migrations
   docker-compose exec smm-architect npm run db:migrate
   
   # Seed initial data
   docker-compose exec smm-architect npm run db:seed
   ```

4. **Access Services**
   - SMM Architect API: `http://localhost:4000`
   - ToolHub Service: `http://localhost:3001`
   - Monitoring Dashboard: `http://localhost:3000`
   - Vault UI: `http://localhost:8200`

### Environment Configuration

Create `.env` file with required variables:

```bash
# Core Configuration
NODE_ENV=development
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/smm_architect
REDIS_URL=redis://localhost:6379

# Vault
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=dev-token

# API Keys
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
PINECONE_API_KEY=your-pinecone-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
PROMETHEUS_URL=http://localhost:9090

# n8n Configuration
N8N_HOST=localhost
N8N_PORT=5678
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin
```

### Secret Provisioning (Production)

For production deployments with `docker-compose.prod.yml`, store sensitive values as Docker secrets instead of environment variables:

```bash
# Create secret files from provided examples
cp secrets/database_url.txt.example secrets/database_url.txt
cp secrets/redis_url.txt.example secrets/redis_url.txt
cp secrets/vault_url.txt.example secrets/vault_url.txt
cp secrets/vault_token.txt.example secrets/vault_token.txt
cp secrets/openai_api_key.txt.example secrets/openai_api_key.txt
cp secrets/sentry_dsn.txt.example secrets/sentry_dsn.txt
cp secrets/grafana_password.txt.example secrets/grafana_password.txt
cp secrets/grafana_secret_key.txt.example secrets/grafana_secret_key.txt

# Edit each *.txt file and insert the real secret value
```

These files are mounted into `/run/secrets` at runtime and referenced via `*_FILE` environment variables in `docker-compose.prod.yml`.

## Kubernetes Deployment

### Prerequisites Setup

1. **Create Namespace**
   ```bash
   kubectl create namespace smm-architect
   kubectl config set-context --current --namespace=smm-architect
   ```

2. **Install Dependencies**
   ```bash
   # Add Helm repositories
   helm repo add bitnami https://charts.bitnami.com/bitnami
   helm repo add hashicorp https://helm.releases.hashicorp.com
   helm repo update
   
   # Install PostgreSQL
   helm install postgresql bitnami/postgresql \
     --set auth.postgresPassword=secretpassword \
     --set auth.database=smm_architect
   
   # Install Redis
   helm install redis bitnami/redis \
     --set auth.password=secretpassword
   
   # Install Vault
   helm install vault hashicorp/vault \
     --set server.dev.enabled=true
   ```

3. **Create Secrets**
   ```bash
   # Database secrets
   kubectl create secret generic db-credentials \
     --from-literal=username=postgres \
     --from-literal=password=secretpassword \
     --from-literal=database=smm_architect
   
   # API keys
   kubectl create secret generic api-keys \
     --from-literal=openai-key=your-openai-key \
     --from-literal=anthropic-key=your-anthropic-key \
     --from-literal=pinecone-key=your-pinecone-key
   
   # TLS certificates
   kubectl create secret tls smm-architect-tls \
     --cert=path/to/tls.crt \
     --key=path/to/tls.key
   ```

### Deploy SMM Architect

1. **Apply Kubernetes Manifests**
   ```bash
   # Deploy ConfigMaps
   kubectl apply -f infrastructure/kubernetes/configmaps/
   
   # Deploy Services
   kubectl apply -f infrastructure/kubernetes/services/
   
   # Deploy Deployments
   kubectl apply -f infrastructure/kubernetes/deployments/
   
   # Deploy Ingress
   kubectl apply -f infrastructure/kubernetes/ingress/
   ```

2. **Verify Deployment**
   ```bash
   # Check pod status
   kubectl get pods -l app=smm-architect
   
   # Check service endpoints
   kubectl get svc
   
   # Check ingress
   kubectl get ingress
   
   # View logs
   kubectl logs -f deployment/smm-architect-service
   ```

3. **Initialize Application**
   ```bash
   # Run database migrations
   kubectl exec -it deployment/smm-architect-service -- npm run db:migrate
   
   # Create initial admin user
   kubectl exec -it deployment/smm-architect-service -- npm run create-admin
   ```

### Helm Chart Deployment (Recommended)

1. **Install SMM Architect Helm Chart**
   ```bash
   # Add SMM Architect Helm repo
   helm repo add smm-architect https://charts.smmarchitect.com
   helm repo update
   
   # Install with custom values
   helm install smm-architect smm-architect/smm-architect \
     -f values.production.yaml \
     --namespace smm-architect
   ```

2. **Custom Values Configuration**
   
   Create `values.production.yaml`:
   ```yaml
   # Global configuration
   global:
     imageRegistry: your-registry.com
     imagePullSecrets: ["regcred"]
   
   # SMM Architect Service
   smmArchitect:
     image:
       repository: smm-architect/smm-architect-service
       tag: "1.0.0"
     
     replicas: 3
     
     resources:
       requests:
         cpu: 500m
         memory: 1Gi
       limits:
         cpu: 2
         memory: 4Gi
   
     service:
       type: ClusterIP
       port: 4000
   
     ingress:
       enabled: true
       annotations:
         kubernetes.io/ingress.class: nginx
         cert-manager.io/cluster-issuer: letsencrypt-prod
       hosts:
         - host: api.smmarchitect.com
           paths: ["/"]
       tls:
         - secretName: smm-architect-tls
           hosts: ["api.smmarchitect.com"]
   
   # ToolHub Service
   toolhub:
     image:
       repository: smm-architect/toolhub-service
       tag: "1.0.0"
     replicas: 2
   
   # Database Configuration
   postgresql:
     enabled: true
     auth:
       existingSecret: db-credentials
     primary:
       persistence:
         size: 100Gi
   
   # Redis Configuration
   redis:
     enabled: true
     auth:
       existingSecret: redis-credentials
   
   # Monitoring
   monitoring:
     prometheus:
       enabled: true
     grafana:
       enabled: true
     alertmanager:
       enabled: true
   ```

## Cloud Platform Deployment

### AWS Deployment with Pulumi

1. **Setup Pulumi**
   ```bash
   # Install Pulumi
   curl -fsSL https://get.pulumi.com | sh
   
   # Configure AWS credentials
   aws configure
   
   # Create new Pulumi project
   cd infrastructure/pulumi
   pulumi stack init production
   ```

2. **Configure Stack**
   ```bash
   # Set configuration
   pulumi config set aws:region us-east-1
   pulumi config set smm-architect:domain smmarchitect.com
   pulumi config set --secret database:password supersecretpassword
   pulumi config set --secret api:openaiKey your-openai-key
   ```

3. **Deploy Infrastructure**
   ```bash
   # Deploy all resources
   pulumi up
   
   # Get deployment outputs
   pulumi stack output apiEndpoint
   pulumi stack output databaseEndpoint
   ```

### Azure Deployment

1. **Setup Azure CLI**
   ```bash
   # Install Azure CLI
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   
   # Login to Azure
   az login
   
   # Create resource group
   az group create --name smm-architect-rg --location eastus
   ```

2. **Deploy using ARM Templates**
   ```bash
   # Deploy infrastructure
   az deployment group create \
     --resource-group smm-architect-rg \
     --template-file infrastructure/azure/main.json \
     --parameters @infrastructure/azure/parameters.json
   ```

### Google Cloud Platform (GCP)

1. **Setup GCP**
   ```bash
   # Install gcloud CLI
   curl https://sdk.cloud.google.com | bash
   
   # Authenticate
   gcloud auth login
   gcloud config set project your-project-id
   
   # Enable APIs
   gcloud services enable container.googleapis.com
   gcloud services enable sql.googleapis.com
   ```

2. **Deploy to GKE**
   ```bash
   # Create GKE cluster
   gcloud container clusters create smm-architect-cluster \
     --zone us-central1-a \
     --num-nodes 3 \
     --machine-type n1-standard-4
   
   # Get credentials
   gcloud container clusters get-credentials smm-architect-cluster \
     --zone us-central1-a
   
   # Deploy application
   kubectl apply -f infrastructure/kubernetes/
   ```

## Production Configuration

### Security Hardening

1. **Network Security**
   ```yaml
   # Network Policy (Kubernetes)
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: smm-architect-netpol
   spec:
     podSelector:
       matchLabels:
         app: smm-architect
     policyTypes:
     - Ingress
     - Egress
     ingress:
     - from:
       - podSelector:
           matchLabels:
             app: ingress-nginx
     egress:
     - to:
       - podSelector:
           matchLabels:
             app: postgresql
   ```

2. **Pod Security Standards**
   ```yaml
   apiVersion: v1
   kind: Pod
   spec:
     securityContext:
       runAsNonRoot: true
       runAsUser: 1000
       fsGroup: 2000
     containers:
     - name: smm-architect
       securityContext:
         allowPrivilegeEscalation: false
         readOnlyRootFilesystem: true
         capabilities:
           drop:
           - ALL
   ```

3. **Secrets Management**
   ```bash
   # Use Vault for secrets
   vault kv put secret/smm-architect/api openai_key="your-key"
   vault kv put secret/smm-architect/db password="db-password"
   
   # Use Vault Agent for automatic secret injection
   kubectl apply -f infrastructure/vault/vault-agent.yaml
   ```

### Monitoring and Observability

1. **Prometheus Configuration**
   ```yaml
   # prometheus-config.yaml
   global:
     scrape_interval: 15s
   
   scrape_configs:
   - job_name: 'smm-architect'
     static_configs:
     - targets: ['smm-architect-service:4000']
     metrics_path: /metrics
   
   - job_name: 'toolhub'
     static_configs:
     - targets: ['toolhub-service:3001']
   ```

2. **Grafana Dashboards**
   ```bash
   # Import pre-built dashboards
   kubectl apply -f infrastructure/monitoring/grafana-dashboards.yaml
   ```

3. **Alerting Rules**
   ```yaml
   # alerting-rules.yaml
   groups:
   - name: smm-architect
     rules:
     - alert: HighErrorRate
       expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
       for: 2m
       annotations:
         summary: High error rate detected
   
     - alert: DatabaseConnectionsFull
       expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.9
       for: 1m
       annotations:
         summary: Database connections nearly exhausted
   ```

### Backup and Disaster Recovery

1. **Database Backups**
   ```bash
   # Automated PostgreSQL backups
   kubectl create cronjob postgres-backup \
     --image=postgres:14 \
     --schedule="0 2 * * *" \
     -- pg_dump -h postgresql -U postgres smm_architect > /backup/db-$(date +%Y%m%d).sql
   ```

2. **Application Data Backup**
   ```bash
   # Backup Vault data
   vault operator raft snapshot save backup.snap
   
   # Backup application configs
   kubectl get configmap -o yaml > configmaps-backup.yaml
   ```

3. **Disaster Recovery Plan**
   ```bash
   # Restore from backup
   kubectl apply -f disaster-recovery/restore-job.yaml
   
   # Scale services back up
   kubectl scale deployment/smm-architect-service --replicas=3
   ```

### Performance Optimization

1. **Horizontal Pod Autoscaling**
   ```yaml
   apiVersion: autoscaling/v2
   kind: HorizontalPodAutoscaler
   metadata:
     name: smm-architect-hpa
   spec:
     scaleTargetRef:
       apiVersion: apps/v1
       kind: Deployment
       name: smm-architect-service
     minReplicas: 2
     maxReplicas: 10
     metrics:
     - type: Resource
       resource:
         name: cpu
         target:
           type: Utilization
           averageUtilization: 70
   ```

2. **Vertical Pod Autoscaling**
   ```yaml
   apiVersion: autoscaling.k8s.io/v1
   kind: VerticalPodAutoscaler
   metadata:
     name: smm-architect-vpa
   spec:
     targetRef:
       apiVersion: apps/v1
       kind: Deployment
       name: smm-architect-service
     updatePolicy:
       updateMode: "Auto"
   ```

3. **Database Optimization**
   ```sql
   -- Index optimization
   CREATE INDEX CONCURRENTLY idx_workspaces_tenant_id ON workspaces(tenant_id);
   CREATE INDEX CONCURRENTLY idx_campaigns_status ON campaigns(status);
   
   -- Connection pooling
   ALTER SYSTEM SET max_connections = 100;
   ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
   ```

## Troubleshooting

### Common Issues

1. **Pod Startup Failures**
   ```bash
   # Check pod events
   kubectl describe pod <pod-name>
   
   # Check logs
   kubectl logs <pod-name> --previous
   
   # Check resource constraints
   kubectl top pod <pod-name>
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connectivity
   kubectl run postgres-test --rm -it --image=postgres:14 -- psql -h postgresql -U postgres
   
   # Check database logs
   kubectl logs -l app=postgresql
   ```

3. **Service Discovery Issues**
   ```bash
   # Check DNS resolution
   kubectl run nslookup --rm -it --image=busybox -- nslookup smm-architect-service
   
   # Check service endpoints
   kubectl get endpoints
   ```

### Performance Debugging

1. **Application Performance**
   ```bash
   # Check application metrics
   curl http://smm-architect-service:4000/metrics
   
   # Profile application
   kubectl port-forward svc/smm-architect-service 4000:4000
   # Open http://localhost:4000/debug/pprof in browser
   ```

2. **Database Performance**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
   
   -- Check blocking queries
   SELECT * FROM pg_stat_activity WHERE wait_event_type IS NOT NULL;
   ```

### Log Analysis

1. **Centralized Logging**
   ```bash
   # Install Fluentd for log aggregation
   kubectl apply -f infrastructure/logging/fluentd.yaml
   
   # Install Elasticsearch and Kibana
   helm install elasticsearch elastic/elasticsearch
   helm install kibana elastic/kibana
   ```

2. **Log Queries**
   ```bash
   # Search application logs
   kubectl logs -l app=smm-architect | grep "ERROR"
   
   # Follow logs in real-time
   kubectl logs -f deployment/smm-architect-service
   ```

## Maintenance

### Regular Tasks

1. **Update Dependencies**
   ```bash
   # Update Helm charts
   helm repo update
   helm upgrade smm-architect smm-architect/smm-architect
   
   # Update container images
   kubectl set image deployment/smm-architect-service smm-architect=smm-architect:v1.1.0
   ```

2. **Database Maintenance**
   ```sql
   -- Vacuum and analyze
   VACUUM ANALYZE;
   
   -- Update statistics
   ANALYZE;
   
   -- Check index usage
   SELECT schemaname, tablename, attname, n_distinct, correlation FROM pg_stats;
   ```

3. **Security Updates**
   ```bash
   # Scan for vulnerabilities
   trivy image smm-architect/smm-architect-service:latest
   
   # Update base images
   docker build --pull -t smm-architect/smm-architect-service:v1.0.1 .
   ```

### Health Checks

Create comprehensive health check endpoints:

```bash
# Application health
curl http://smm-architect-service:4000/health

# Database health
curl http://smm-architect-service:4000/health/database

# External dependencies health
curl http://smm-architect-service:4000/health/dependencies
```

## Support and Resources

- **Deployment Examples**: `/infrastructure/examples/`
- **Monitoring Dashboards**: `/infrastructure/monitoring/`
- **Security Policies**: `/infrastructure/security/`
- **Troubleshooting Guide**: `/docs/troubleshooting.md`
- **Support**: Contact devops@smmarchitect.com