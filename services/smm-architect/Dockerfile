# SMM Architect Core Service Dockerfile
FROM node:18-alpine AS builder

# Install dependencies for building
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy workspace configuration
COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy shared packages
COPY packages/shared ./packages/shared
COPY packages/build-config ./packages/build-config

# Copy service package file
COPY services/smm-architect/package.json ./services/smm-architect/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy service source code
COPY services/smm-architect/src ./services/smm-architect/src
COPY services/smm-architect/tsconfig.json ./services/smm-architect/

# Build the service
WORKDIR /app/services/smm-architect
RUN pnpm build

# Production stage
FROM node:18-alpine AS production

# Security setup
RUN addgroup -g 1001 -S nodejs && \
    adduser -S smmuser -u 1001

# Install runtime dependencies
RUN apk add --no-cache dumb-init curl

WORKDIR /app

# Copy package files for production dependencies
COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/smm-architect/package.json ./services/smm-architect/
COPY packages/shared/package.json ./packages/shared/

# Install pnpm and production dependencies
RUN npm install -g pnpm@8.15.0 && \
    pnpm install --prod --no-frozen-lockfile && \
    npm cache clean --force

# Copy built application
COPY --from=builder /app/services/smm-architect/dist ./dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy database migrations
COPY services/smm-architect/migrations ./migrations

# Health check script
COPY <<EOF ./healthcheck.js
const http = require('http');
const options = {
  hostname: 'localhost',
  port: process.env.PORT || 4000,
  path: '/health',
  timeout: 2000,
};
const req = http.request(options, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});
req.on('error', () => process.exit(1));
req.end();
EOF

# Set permissions
RUN chown -R smmuser:nodejs /app
USER smmuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node healthcheck.js

# Expose port
EXPOSE 4000

# Environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Start the service
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]