# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build scripts)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Initialize and seed database during build
# This creates the database file with schema and demo data
RUN mkdir -p /app/data && \
    node src/db/init.js && \
    node src/db/seed.js

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy pre-initialized database from builder
COPY --from=builder --chown=nodejs:nodejs /app/data ./data

# Create uploads directory
RUN mkdir -p /app/data/uploads && chown -R nodejs:nodejs /app/data

USER nodejs

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "src/index.js"]