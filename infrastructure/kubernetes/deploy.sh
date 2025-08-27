#!/bin/bash

set -euo pipefail

# SMM Architect Kubernetes Deployment Script
# This script deploys all SMM Architect services to Kubernetes with proper ordering

NAMESPACE=${1:-smm-architect}
ENVIRONMENT=${2:-production}

echo "🚀 Starting SMM Architect deployment to namespace: $NAMESPACE"
echo "📦 Environment: $ENVIRONMENT"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    exit 1
fi

# Check if we can connect to the cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster"
    exit 1
fi

# Create namespace if it doesn't exist
echo "📦 Creating namespace: $NAMESPACE"
kubectl apply -f 00-namespace.yaml

# Wait for namespace to be ready
kubectl wait --for=condition=Ready namespace/$NAMESPACE --timeout=60s

# Apply RBAC first
echo "🔐 Applying RBAC configurations..."
kubectl apply -f 03-rbac.yaml

# Apply ConfigMaps and Secrets
echo "⚙️ Applying configuration..."
kubectl apply -f 01-configmap.yaml
kubectl apply -f 02-secrets.yaml

# Apply storage configurations
echo "💾 Applying storage configurations..."
kubectl apply -f 40-storage.yaml

# Wait for StatefulSets to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
kubectl rollout status statefulset/smm-postgres -n $NAMESPACE --timeout=300s

echo "⏳ Waiting for Redis to be ready..."
kubectl rollout status statefulset/smm-redis -n $NAMESPACE --timeout=300s

# Apply application deployments
echo "🚀 Deploying application services..."
kubectl apply -f 10-smm-architect-service.yaml
kubectl apply -f 11-toolhub-service.yaml
kubectl apply -f 12-frontend-service.yaml
kubectl apply -f 13-model-router-service.yaml
kubectl apply -f 14-publisher-service.yaml
kubectl apply -f 15-agents-service.yaml

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl rollout status deployment/smm-architect-service -n $NAMESPACE --timeout=300s
kubectl rollout status deployment/smm-toolhub-service -n $NAMESPACE --timeout=300s
kubectl rollout status deployment/smm-model-router-service -n $NAMESPACE --timeout=300s
kubectl rollout status deployment/smm-publisher-service -n $NAMESPACE --timeout=300s
kubectl rollout status deployment/smm-agents-service -n $NAMESPACE --timeout=300s

# Apply Istio configurations (if Istio is installed)
if kubectl get crd gateways.networking.istio.io &> /dev/null; then
    echo "🌐 Applying Istio service mesh configurations..."
    kubectl apply -f 20-istio-gateway.yaml
    kubectl apply -f 21-istio-destination-rules.yaml
    kubectl apply -f 22-istio-security.yaml
else
    echo "⚠️ Istio not detected, skipping service mesh configuration"
fi

# Apply network policies
echo "🔒 Applying network policies..."
kubectl apply -f 23-network-policies.yaml

# Apply monitoring configurations (if Prometheus operator is installed)
if kubectl get crd servicemonitors.monitoring.coreos.com &> /dev/null; then
    echo "📊 Applying monitoring configurations..."
    kubectl apply -f 30-monitoring.yaml
else
    echo "⚠️ Prometheus operator not detected, skipping monitoring configuration"
fi

# Verify deployment
echo "🔍 Verifying deployment..."
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE

# Check if all pods are running
echo "⏳ Waiting for all pods to be ready..."
kubectl wait --for=condition=Ready pods --all -n $NAMESPACE --timeout=600s

echo "✅ SMM Architect deployment completed successfully!"
echo "🌐 Application should be available at:"
echo "   - API: https://api.smm-architect.com"
echo "   - ToolHub: https://toolhub.smm-architect.com"
echo "   - Frontend: https://app.smm-architect.com"

# Display useful commands
echo ""
echo "📋 Useful commands:"
echo "   View pods: kubectl get pods -n $NAMESPACE"
echo "   View logs: kubectl logs -f deployment/smm-architect-service -n $NAMESPACE"
echo "   Port forward API: kubectl port-forward service/smm-architect-service 4000:4000 -n $NAMESPACE"
echo "   Delete deployment: kubectl delete namespace $NAMESPACE"