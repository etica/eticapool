# Stage 1: Build frontend (Node 16 for vue-cli-service + webpack 4)
FROM node:16-bullseye AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
COPY contracts/ /app/contracts/
COPY config/DeployedContractInfo.json /app/config/DeployedContractInfo.json
RUN npm run build

# Stage 2: Build backend (Node 18 for native modules)
FROM node:18-bullseye AS backend-builder
WORKDIR /app
RUN apt-get update && apt-get install -y build-essential cmake python3 git && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# Stage 3: Production
FROM node:18-bullseye-slim
WORKDIR /app
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN groupadd -r pool && useradd -r -g pool -m pool

COPY package.json package-lock.json ./
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=frontend-builder /app/dist ./dist

# Copy backend source (explicit, no COPY . .)
COPY express.js ./
COPY index*.js ./
COPY lib/ ./lib/
COPY jobs/ ./jobs/
COPY contracts/ ./contracts/
COPY config/ ./config/
COPY networkpools/ ./networkpools/

RUN mkdir -p /app/log && chown -R pool:pool /app/log
USER pool
ENV HTTP_PORT=8080
EXPOSE 8080 2053 3333 5555 7777 9999 8081
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/api/v1/overview || exit 1
CMD ["node", "index.js"]
