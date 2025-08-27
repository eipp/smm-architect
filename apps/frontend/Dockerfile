# Frontend Application Dockerfile (Next.js)
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy workspace configuration
COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy shared packages
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY packages/build-config ./packages/build-config

# Copy frontend package file
COPY apps/frontend/package.json ./apps/frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source
COPY apps/frontend ./apps/frontend

# Build shared packages first
RUN pnpm --filter=@smm-architect/shared build
RUN pnpm --filter=@smm-architect/ui build

# Build frontend application
WORKDIR /app/apps/frontend
RUN pnpm build

# Production stage
FROM node:18-alpine AS production

# Security setup
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Install runtime dependencies
RUN apk add --no-cache dumb-init curl

WORKDIR /app

# Copy package files
COPY --from=builder /app/apps/frontend/package.json ./
COPY --from=builder /app/apps/frontend/next.config.ts ./

# Copy built application
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./.next/static
COPY --from=builder /app/apps/frontend/public ./public

# Health check script
COPY <<EOF ./healthcheck.js
const http = require('http');
const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/health',
  timeout: 2000,
};
const req = http.request(options, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});
req.on('error', () => process.exit(1));
req.end();
EOF

# Set permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node healthcheck.js

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]