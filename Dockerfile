FROM node:18-bullseye

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

# Install production dependencies
RUN npm ci --production

# Copy source code
COPY . .

# Build Vue.js frontend
RUN npm run build

# Expose ports:
#   80   - Express HTTP (frontend + API)
#   2053 - Socket.IO
#   3333 - Stratum (low diff)
#   5555 - Stratum (medium diff)
#   7777 - Stratum (high diff)
#   9999 - Stratum (very high diff)
#   8081 - JSONRPC
EXPOSE 80 2053 3333 5555 7777 9999 8081

# Healthcheck via API endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:80/api/v1/hashrate || exit 1

CMD ["node", "index.js"]
