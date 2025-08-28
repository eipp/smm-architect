# Multi-stage Dockerfile for Model Router Service
# Security-hardened with distroless base image

# Build stage
FROM node:18-alpine AS builder

# Set build arguments
ARG BUILDPLATFORM
ARG TARGETPLATFORM
ARG BUILDOS
ARG TARGETARCH

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    ca-certificates

WORKDIR /app

# Copy workspace configuration first (better caching)
COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Install pnpm with specific version
RUN npm install -g pnpm@8.15.0

# Copy shared packages
COPY packages/shared ./packages/shared
COPY packages/build-config ./packages/build-config

# Copy service package file
COPY services/model-router/package.json ./services/model-router/
COPY services/shared ./services/shared

# Install dependencies (with frozen lockfile for security)
RUN pnpm install --frozen-lockfile --prefer-offline

# Copy service source code
COPY services/model-router/src ./services/model-router/src
COPY services/model-router/tsconfig.json ./services/model-router/

# Build the service
WORKDIR /app/services/model-router
RUN pnpm build && \
    # Remove source maps and dev files for security
    find dist -name "*.map" -delete && \
    # Verify build output
    ls -la dist/

# Dependency pruning stage
FROM node:18-alpine AS deps

WORKDIR /app

# Install only production dependencies
COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/model-router/package.json ./services/model-router/
COPY services/shared/package.json ./services/shared/

RUN npm install -g pnpm@8.15.0 && \
    # Install only production dependencies
    pnpm install --prod --frozen-lockfile --prefer-offline && \
    # Clean npm cache
    npm cache clean --force && \
    # Remove pnpm cache
    rm -rf ~/.local/share/pnpm

# Final production stage using distroless
FROM gcr.io/distroless/nodejs18-debian11:nonroot AS production

# Add labels for better organization and security scanning
LABEL maintainer="SMM Architect Team" \
      org.opencontainers.image.title="Model Router Service" \
      org.opencontainers.image.description="AI Model Router with circuit breakers and load balancing" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.source="https://github.com/smm-architect/smm-architect" \
      org.opencontainers.image.vendor="SMM Architect" \
      org.opencontainers.image.licenses="MIT" \
      security.scan="enabled" \
      security.distroless="true"

# Set environment variables
ENV NODE_ENV=production \
    NODE_OPTIONS="--enable-source-maps --max-old-space-size=1024" \
    PORT=3003 \
    LOG_LEVEL=info

WORKDIR /app

# Copy production dependencies
COPY --from=deps --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=deps --chown=nonroot:nonroot /app/services/shared ./services/shared

# Copy built application
COPY --from=builder --chown=nonroot:nonroot /app/services/model-router/dist ./dist

# Copy health check script
COPY --chown=nonroot:nonroot services/model-router/healthcheck.js ./healthcheck.js

# Create minimal package.json for runtime
COPY --chown=nonroot:nonroot <<EOF ./package.json
{
  "name": "model-router-service",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js"
}
EOF

# Expose port (documentation only - distroless doesn't have a shell)
EXPOSE 3003

# Health check is handled at Kubernetes level for distroless
# HEALTHCHECK not available in distroless

# User is already 'nonroot' (uid 65532, gid 65532) in distroless image

# Start the service
CMD ["dist/index.js"]