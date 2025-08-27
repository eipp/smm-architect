# ToolHub Service Dockerfile
FROM node:18-alpine AS builder

# Install build dependencies
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
COPY services/toolhub/package.json ./services/toolhub/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy service source
COPY services/toolhub/src ./services/toolhub/src
COPY services/toolhub/tsconfig.json ./services/toolhub/

# Build the service
WORKDIR /app/services/toolhub
RUN pnpm build

# Production stage
FROM node:18-alpine AS production

# Security setup
RUN addgroup -g 1001 -S nodejs && \
    adduser -S smmuser -u 1001

# Install runtime dependencies and tools for web scraping
RUN apk add --no-cache \
    dumb-init \
    curl \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./
COPY services/toolhub/package.json ./services/toolhub/

# Install production dependencies
RUN npm install -g pnpm@8.15.0 && \
    pnpm install --prod --frozen-lockfile --filter=toolhub-service && \
    npm cache clean --force

# Copy built application
COPY --from=builder /app/services/toolhub/dist ./dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Health check script
COPY <<EOF ./healthcheck.js
const http = require('http');
const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3001,
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
EXPOSE 3001

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Start the service
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]