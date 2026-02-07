# Stage 1: Build (includes devDependencies for vue-cli-service)
FROM node:18-bullseye AS builder

WORKDIR /app

# Install build tools for native modules (randomx-etica-nodejs, cryptonight-hashing)
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    python3 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build Vue.js frontend
RUN npm run build

# Stage 2: Production
FROM node:18-bullseye-slim

WORKDIR /app

# Install only runtime native dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r pool && useradd -r -g pool -m pool

# Copy package files
COPY package.json package-lock.json ./

# Copy native modules and production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy only production-needed source files (explicit to avoid fragile COPY . .)
COPY .babelrc ./
COPY express.js ./
COPY index*.js ./
COPY lib/ ./lib/
COPY jobs/ ./jobs/
COPY networkpools/ ./networkpools/
COPY public/ ./public/
COPY src/contracts/ ./src/contracts/
COPY src/config/ ./src/config/

# Create log directory owned by pool user
RUN mkdir -p /app/log && chown -R pool:pool /app/log

# Switch to non-root user
USER pool

# Default HTTP port for non-root user (mapped to 80 in docker-compose)
ENV HTTP_PORT=8080

# Expose ports:
#   8080 - Express HTTP (frontend + API) - mapped to 80 externally
#   2053 - Socket.IO
#   3333 - Stratum (low diff)
#   5555 - Stratum (medium diff)
#   7777 - Stratum (high diff)
#   9999 - Stratum (very high diff)
#   8081 - JSONRPC
EXPOSE 8080 2053 3333 5555 7777 9999 8081

# Healthcheck via API endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/api/v1/overview || exit 1

CMD ["node", "index.js"]
