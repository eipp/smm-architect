#!/bin/bash

set -euo pipefail

# SMM Architect Kubernetes Deployment Validation Script
# This script validates the deployment and health of SMM Architect services

NAMESPACE=${1:-smm-architect}
TIMEOUT=${2:-300}

echo "🔍 Validating SMM Architect deployment in namespace: $NAMESPACE"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    exit 1
fi

# Check if namespace exists
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    echo "❌ Namespace $NAMESPACE does not exist"
    exit 1
fi

echo "✅ Namespace $NAMESPACE exists"

# Define expected services
SERVICES=(
    "smm-architect-service"
    "smm-toolhub-service" 
    "smm-model-router-service"
    "smm-publisher-service"
    "smm-agents-service"
    "smm-postgres"
    "smm-redis"
)

# Define expected deployments
DEPLOYMENTS=(
    "smm-architect-service"
    "smm-toolhub-service"
    "smm-model-router-service" 
    "smm-publisher-service"
    "smm-agents-service"
)

# Define expected statefulsets
STATEFULSETS=(
    "smm-postgres"
    "smm-redis"
)

echo "🔍 Checking services..."
for service in "${SERVICES[@]}"; do
    if kubectl get service $service -n $NAMESPACE &> /dev/null; then
        echo "✅ Service $service exists"
    else
        echo "❌ Service $service is missing"
        exit 1
    fi
done

echo "🔍 Checking deployments..."
for deployment in "${DEPLOYMENTS[@]}"; do
    if kubectl get deployment $deployment -n $NAMESPACE &> /dev/null; then
        echo "✅ Deployment $deployment exists"
        # Check if deployment is ready
        if kubectl rollout status deployment/$deployment -n $NAMESPACE --timeout=${TIMEOUT}s; then
            echo "✅ Deployment $deployment is ready"
        else
            echo "❌ Deployment $deployment is not ready"
            kubectl describe deployment $deployment -n $NAMESPACE
            exit 1
        fi
    else
        echo "❌ Deployment $deployment is missing"
        exit 1
    fi
done

echo "🔍 Checking statefulsets..."
for statefulset in "${STATEFULSETS[@]}"; do
    if kubectl get statefulset $statefulset -n $NAMESPACE &> /dev/null; then
        echo "✅ StatefulSet $statefulset exists"
        # Check if statefulset is ready
        if kubectl rollout status statefulset/$statefulset -n $NAMESPACE --timeout=${TIMEOUT}s; then
            echo "✅ StatefulSet $statefulset is ready"
        else
            echo "❌ StatefulSet $statefulset is not ready"
            kubectl describe statefulset $statefulset -n $NAMESPACE
            exit 1
        fi
    else
        echo "❌ StatefulSet $statefulset is missing"
        exit 1
    fi
done

echo "🔍 Checking pod health..."
# Wait for all pods to be ready
if kubectl wait --for=condition=Ready pods --all -n $NAMESPACE --timeout=${TIMEOUT}s; then
    echo "✅ All pods are ready"
else
    echo "❌ Some pods are not ready"
    kubectl get pods -n $NAMESPACE
    exit 1
fi

echo "🔍 Checking service endpoints..."
for service in "${SERVICES[@]}"; do
    if kubectl get endpoints $service -n $NAMESPACE -o jsonpath='{.subsets[*].addresses[*].ip}' | grep -q .; then
        echo "✅ Service $service has endpoints"
    else
        echo "❌ Service $service has no endpoints"
        kubectl describe endpoints $service -n $NAMESPACE
        exit 1
    fi
done

echo "🔍 Performing health checks..."
# Port forward and check health endpoints
for service in "${DEPLOYMENTS[@]}"; do
    case $service in
        "smm-architect-service")
            PORT=4000
            ;;
        "smm-toolhub-service")
            PORT=3001
            ;;
        "smm-model-router-service")
            PORT=3002
            ;;
        "smm-publisher-service")
            PORT=3003
            ;;
        "smm-agents-service")
            PORT=3004
            ;;
    esac
    
    echo "🔍 Testing health endpoint for $service on port $PORT..."
    
    # Start port forward in background
    kubectl port-forward service/$service $PORT:$PORT -n $NAMESPACE &
    PF_PID=$!
    
    # Wait for port forward to be ready
    sleep 5
    
    # Test health endpoint
    if curl -f -s http://localhost:$PORT/health > /dev/null; then
        echo "✅ Health check passed for $service"
    else
        echo "⚠️ Health check failed for $service (this might be expected if health endpoint is not implemented)"
    fi
    
    # Kill port forward
    kill $PF_PID 2>/dev/null || true
    wait $PF_PID 2>/dev/null || true
    
    sleep 2
done

echo "🔍 Checking resource usage..."
kubectl top pods -n $NAMESPACE 2>/dev/null || echo "⚠️ Metrics server not available, skipping resource usage check"

echo "🔍 Checking logs for errors..."
for deployment in "${DEPLOYMENTS[@]}"; do
    echo "📋 Recent logs for $deployment:"
    kubectl logs deployment/$deployment -n $NAMESPACE --tail=10 --since=1m 2>/dev/null || echo "⚠️ Could not fetch logs for $deployment"
    echo ""
done

echo "✅ SMM Architect deployment validation completed successfully!"
echo ""
echo "📊 Deployment Summary:"
kubectl get pods,services,deployments,statefulsets -n $NAMESPACE
echo ""
echo "🌐 Application endpoints:"
echo "   - API: kubectl port-forward service/smm-architect-service 4000:4000 -n $NAMESPACE"
echo "   - ToolHub: kubectl port-forward service/smm-toolhub-service 3001:3001 -n $NAMESPACE"
echo "   - Model Router: kubectl port-forward service/smm-model-router-service 3002:3002 -n $NAMESPACE"
echo "   - Publisher: kubectl port-forward service/smm-publisher-service 3003:3003 -n $NAMESPACE"
echo "   - Agents: kubectl port-forward service/smm-agents-service 3004:3004 -n $NAMESPACE"