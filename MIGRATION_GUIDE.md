# Migration Guide: Bare-Metal Pool to Docker (eticapool v2)

This guide covers migrating a running eticapool instance (Node.js process + external MongoDB on the host) to the new Dockerized architecture with MongoDB, Redis, and the pool application all running inside Docker containers.

**Estimated downtime: 5–15 minutes** (steps 5–8). Miners will reconnect automatically.

---

## Table of Contents

1. [Before You Start — Prerequisites](#1-before-you-start--prerequisites)
2. [Understand What Changes](#2-understand-what-changes)
3. [Prepare the Server](#3-prepare-the-server)
4. [Export Your Existing MongoDB Data](#4-export-your-existing-mongodb-data)
5. [Stop the Old Pool](#5-stop-the-old-pool)
6. [Configure the New Stack](#6-configure-the-new-stack)
7. [Start Docker and Import Data](#7-start-docker-and-import-data)
8. [Verify Everything Works](#8-verify-everything-works)
9. [Post-Migration Cleanup](#9-post-migration-cleanup)
10. [Rollback Plan](#10-rollback-plan)
11. [Choosing a Compose File](#11-choosing-a-compose-file)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Before You Start — Prerequisites

### Required software

```bash
# Check Docker is installed (need 20.10+)
docker --version

# Check Docker Compose (need v2+)
docker compose version

# If not installed:
# https://docs.docker.com/engine/install/ubuntu/
# Docker Compose v2 is included with modern Docker Engine
```

### Required information from your current setup

Gather these before starting:

| Item | Where to find it | Example |
|---|---|---|
| MongoDB host/port | Your current connection string or `mongod` config | `localhost:27017` |
| MongoDB database name | In your entry point code (usually `tokenpool_production`) | `tokenpool_production` |
| MongoDB auth credentials | If your current MongoDB uses authentication | user/password or none |
| pool.config.json | Your current pool config file location | `/root/eticapool/pool.config.json` |
| Private keys | Inside pool.config.json (`mintingConfig.privateKey`, `paymentsConfig.privateKey`) | Keep these safe |
| Current Node.js process | How it's started (pm2, systemd, screen, etc.) | `pm2 list` |
| SSL/TLS certificates | If using nginx + Let's Encrypt | `/etc/letsencrypt/live/yourdomain/` |
| Server RAM | Total available memory | `free -h` |

### Disk space check

```bash
# Check how large your current MongoDB data is
mongo tokenpool_production --eval "db.stats().dataSize / 1024 / 1024"
# → gives size in MB

# You need at least 3x this space free:
#   1x for the mongodump export
#   1x for the new Docker MongoDB volume
#   1x headroom
df -h /
```

---

## 2. Understand What Changes

### Architecture comparison

```
BEFORE (bare-metal):
┌─────────────────────────────────────────┐
│  Server                                 │
│  ├─ mongod (host process, port 27017)   │
│  ├─ node index.js (pool, single proc)   │
│  └─ nginx (TLS termination)             │
└─────────────────────────────────────────┘

AFTER (Docker):
┌─────────────────────────────────────────┐
│  Server                                 │
│  ├─ nginx (host, TLS termination)       │
│  └─ Docker                              │
│     ├─ mongodb container (port 27017*)  │
│     ├─ redis container (port 6379*)     │
│     ├─ pool-app container              │
│     ├─ pools-network container          │
│     ├─ cleaner container                │
│     └─ backup container                 │
│     * internal only, not exposed        │
└─────────────────────────────────────────┘
```

### What stays the same
- Your `pool.config.json` (mounted read-only into the container)
- nginx on the host (TLS termination, reverse proxy)
- External ports: 80/443 (web), 2053 (Socket.IO), 3333/5555/7777/9999 (stratum)
- All your miner data, shares, rewards, payment history (migrated via mongodump/mongorestore)

### What changes
- MongoDB runs inside Docker (isolated, not exposed to host network)
- Redis added (share queue, caching, pub/sub)
- MongoDB now requires authentication (`--auth` flag)
- Automatic daily backups (backup container)
- Pool process managed by Docker (auto-restart, health checks)

---

## 3. Prepare the Server

### 3.1 Clone or pull the latest code

```bash
cd /opt  # or wherever you want the pool to live
git clone https://github.com/YOUR_REPO/eticapool.git eticapool-v2
cd eticapool-v2
git checkout eticapool-v2  # or the branch/tag you pushed
```

Or if updating in-place:
```bash
cd /path/to/eticapool
git fetch origin
git checkout eticapool-v2
```

### 3.2 Create the directory structure

```bash
# Inside your eticapool-v2 directory:
mkdir -p log backups
```

### 3.3 Ensure Docker can access ports

If you have a firewall (ufw, iptables), ensure these ports are open:
- **80** (HTTP / web UI)
- **443** (HTTPS — nginx on host)
- **2053** (Socket.IO)
- **3333, 5555, 7777, 9999** (stratum mining ports)

```bash
# Example with ufw:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 2053/tcp
sudo ufw allow 3333/tcp
sudo ufw allow 5555/tcp
sudo ufw allow 7777/tcp
sudo ufw allow 9999/tcp
```

---

## 4. Export Your Existing MongoDB Data

**Do this while the old pool is still running.** The export is a read-only snapshot.

### 4.1 Find your current database name

Your pool uses `tokenpool_production` (or `tokenpool_staging` if running in staging mode). Verify:

```bash
# If your MongoDB has no auth:
mongo --eval "db.adminCommand('listDatabases')" | grep tokenpool

# If your MongoDB has auth:
mongo -u YOUR_USER -p YOUR_PASS --authenticationDatabase admin --eval "db.adminCommand('listDatabases')" | grep tokenpool
```

### 4.2 Run mongodump

```bash
# Create export directory
mkdir -p /tmp/pool-migration

# WITHOUT authentication (most common for legacy bare-metal setups):
mongodump --db tokenpool_production --out /tmp/pool-migration/dump

# WITH authentication:
mongodump -u YOUR_USER -p YOUR_PASS --authenticationDatabase admin \
  --db tokenpool_production --out /tmp/pool-migration/dump

# If MongoDB is on a non-default port:
mongodump --host localhost --port 27017 --db tokenpool_production \
  --out /tmp/pool-migration/dump
```

### 4.3 Verify the dump

```bash
ls -la /tmp/pool-migration/dump/tokenpool_production/
# You should see .bson and .metadata.json files for each collection:
#   minerData.bson
#   miner_pendingshares.bson
#   miner_shares.bson
#   balance_payments.bson
#   ppnls_rewards.bson
#   allminingContracts.bson
#   poolStatsRecords.bson
#   ... and more

du -sh /tmp/pool-migration/dump/
# Shows total dump size
```

**Keep this dump safe.** It's your safety net if anything goes wrong.

---

## 5. Stop the Old Pool

This is where downtime begins. Miners will disconnect and queue reconnection attempts.

```bash
# If using pm2:
pm2 stop all
pm2 list  # verify all stopped

# If using systemd:
sudo systemctl stop eticapool

# If running in screen/tmux:
# Ctrl+C the node process

# If running bare:
kill $(pgrep -f "node index.js")
```

### 5.1 Stop the old MongoDB (optional but recommended)

Once the Docker MongoDB is running, you don't want two mongod instances competing for RAM.

```bash
# Check if mongod is running as a service
sudo systemctl status mongod

# Stop it (but don't disable yet — keep it available for rollback)
sudo systemctl stop mongod
```

---

## 6. Configure the New Stack

### 6.1 Create your `.env` file

```bash
cd /path/to/eticapool-v2

# Copy the example
cp .env_example .env
```

Edit `.env` with strong passwords:

```bash
# .env — CHANGE THESE TO STRONG RANDOM PASSWORDS
REDIS_PASSWORD=your_strong_redis_password_here
MONGO_ROOT_USER=eticapool
MONGO_ROOT_PASSWORD=your_strong_mongo_password_here
```

Generate strong passwords:
```bash
# Quick way to generate random passwords:
openssl rand -base64 24  # run twice, one for Redis, one for Mongo
```

### 6.2 Copy your pool.config.json

```bash
# Copy from your old installation:
cp /path/to/old/eticapool/pool.config.json /path/to/eticapool-v2/pool.config.json

# Verify it's valid JSON:
python3 -m json.tool pool.config.json > /dev/null && echo "OK" || echo "INVALID JSON"
```

**Important checks in pool.config.json:**
- `mintingConfig.privateKey` is set (minting wallet)
- `paymentsConfig.privateKey` is set (payment wallet)
- `mintingConfig.publicAddress` is set
- `paymentsConfig.publicAddress` is set
- `poolEnv` is `"production"`

### 6.3 Verify the nginx config

Update your nginx config to proxy to the Docker ports. The new stack exposes:
- Port **80** → web UI (HTTP)
- Port **2053** → Socket.IO

```nginx
# /etc/nginx/sites-available/default (or your pool site config)

server {
    listen 443 ssl;
    server_name your-pool-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-pool-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-pool-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    # Web UI
    location / {
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_redirect off;
        proxy_pass http://127.0.0.1:80;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_redirect off;
        proxy_pass http://127.0.0.1:2053;
    }
}

server {
    listen 80;
    server_name your-pool-domain.com;
    return 301 https://$host$request_uri;
}
```

**Key change:** If your old nginx was proxying to `localhost:8080` for the web UI, the new Docker setup maps port **80** on the host to **8080** inside the container. So change `proxy_pass` from `http://127.0.0.1:8080` to `http://127.0.0.1:80`.

```bash
sudo nginx -t          # test config
sudo systemctl reload nginx
```

---

## 7. Start Docker and Import Data

### 7.1 Start ONLY the MongoDB container first

We need MongoDB running to import data before starting the pool app.

```bash
cd /path/to/eticapool-v2

# Start just MongoDB and Redis:
docker compose up -d mongodb redis

# Wait for MongoDB to be healthy (30-60 seconds on first start):
docker compose ps
# Look for "healthy" status on mongodb

# If it shows "starting", wait and check again:
sleep 30 && docker compose ps
```

### 7.2 Import the database dump

```bash
# Copy the dump into the MongoDB container:
docker cp /tmp/pool-migration/dump/tokenpool_production \
  $(docker compose ps -q mongodb):/tmp/tokenpool_production

# Run mongorestore inside the container:
docker compose exec mongodb mongorestore \
  -u "${MONGO_ROOT_USER:-eticapool}" \
  -p "${MONGO_ROOT_PASSWORD:-eticapool_mongo_default_change_me}" \
  --authenticationDatabase admin \
  --db tokenpool_production \
  /tmp/tokenpool_production

# You should see output like:
#   restoring tokenpool_production.minerData
#   restoring tokenpool_production.miner_pendingshares
#   ... (one line per collection)
#   done
```

**Read the passwords from your `.env` file** — replace the defaults above with your actual passwords.

### 7.3 Verify the import

```bash
# Connect to MongoDB and check collection counts:
docker compose exec mongodb mongo \
  -u "${MONGO_ROOT_USER:-eticapool}" \
  -p "${MONGO_ROOT_PASSWORD:-eticapool_mongo_default_change_me}" \
  --authenticationDatabase admin \
  tokenpool_production \
  --eval "
    var colls = db.getCollectionNames();
    print('Collections: ' + colls.length);
    colls.forEach(function(c) {
      print('  ' + c + ': ' + db[c].countDocuments({}) + ' docs');
    });
  "
```

**Compare the document counts** against your old database. They should match exactly.

Key collections to verify:
- `minerData` — miner profiles (should have all your miners)
- `miner_pendingshares` — recent shares
- `balance_payments` — payment history
- `ppnls_rewards` — PPLNS reward records
- `allminingContracts` — challenge/epoch history

### 7.4 Clean up the temp dump inside the container

```bash
docker compose exec mongodb rm -rf /tmp/tokenpool_production
```

### 7.5 Start the full stack

```bash
docker compose up -d

# Watch the logs for startup:
docker compose logs -f pool-app --tail 50
# You should see the ASCII art banner, then:
#   Initialising Mining Pool
#   ... (MongoDB connected, indexes created)
#   Stratum TCP server listening on port 3333
#   ... etc

# Press Ctrl+C to stop following logs
```

---

## 8. Verify Everything Works

Run through this checklist:

### 8.1 Container health

```bash
docker compose ps
# All containers should show "Up" or "healthy"
# Expected services: mongodb, redis, pool-app, pools-network, cleaner, backup
```

### 8.2 Web UI

```bash
# Test the API:
curl -s http://localhost/api/v1/overview | head -c 200
# Should return JSON with pool data

# Test the v2 API:
curl -s http://localhost/api/v2/pool/overview | head -c 200

# Open in browser:
# http://your-pool-domain.com (or https:// if nginx is configured)
```

### 8.3 Stratum ports

```bash
# Test each stratum port responds:
echo '{"id":1,"method":"mining.subscribe","params":[]}' | nc -w 3 localhost 3333
echo '{"id":1,"method":"mining.subscribe","params":[]}' | nc -w 3 localhost 5555
echo '{"id":1,"method":"mining.subscribe","params":[]}' | nc -w 3 localhost 7777
echo '{"id":1,"method":"mining.subscribe","params":[]}' | nc -w 3 localhost 9999
# Each should return a JSON response (not connection refused)
```

### 8.4 Miner data preserved

```bash
# Check a known miner address (replace with a real one):
curl -s http://localhost/api/v2/pool/miner/0xYOUR_MINER_ADDRESS | python3 -m json.tool | head -20
# Should show the miner's data, hashrate, workers, etc.
```

### 8.5 Logs look clean

```bash
# Check for errors across all services:
docker compose logs --tail 20 pool-app
docker compose logs --tail 10 pools-network
docker compose logs --tail 10 cleaner

# Look for: no "ECONNREFUSED", no "Authentication failed", no crash loops
```

### 8.6 Wait for miners to reconnect

Miners with auto-reconnect (most mining software) will reconnect within 30–60 seconds. Check:

```bash
# After a few minutes, check active miners:
curl -s http://localhost/api/v2/pool/miners | python3 -m json.tool | head -5
```

---

## 9. Post-Migration Cleanup

### 9.1 Disable the old host MongoDB (after confirming everything works)

Wait at least 24 hours before doing this, to ensure stability.

```bash
# Prevent old mongod from starting on boot:
sudo systemctl disable mongod

# The data files are still on disk at /var/lib/mongodb/ (or wherever configured)
# Keep them for at least a week as backup, then optionally remove
```

### 9.2 Verify backups are running

The Docker stack includes an automatic backup container that dumps the database every 24 hours.

```bash
# Check backup container is running:
docker compose logs backup --tail 5
# Should show "[backup] Sleeping 24h until next backup" or a recent dump success

# Check backup files:
ls -la backups/
# After 24 hours, you should see: dump-YYYYMMDD-HHMMSS/
```

### 9.3 Remove the migration dump

```bash
rm -rf /tmp/pool-migration
```

### 9.4 Set up log rotation (optional)

The pool writes logs to `./log/`. Docker also keeps container logs. To prevent disk bloat:

```bash
# Docker log limits are already set for MongoDB in the compose file.
# For pool-app logs in ./log/, add a logrotate config:
sudo tee /etc/logrotate.d/eticapool << 'EOF'
/path/to/eticapool-v2/log/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
EOF
```

---

## 10. Rollback Plan

If something goes wrong, you can revert to the old setup in under 5 minutes.

### Quick rollback

```bash
# 1. Stop Docker stack
cd /path/to/eticapool-v2
docker compose down

# 2. Restart old MongoDB
sudo systemctl start mongod

# 3. Restart old pool process
cd /path/to/old/eticapool
pm2 start index.js       # or however you were running it

# 4. Verify old pool is back:
curl http://localhost:8080/api/v1/overview
```

Your old MongoDB data is untouched — we never modified it, only exported a copy.

### After confirming rollback works

Investigate what went wrong by checking Docker logs:
```bash
cd /path/to/eticapool-v2
docker compose logs pool-app --tail 100
docker compose logs mongodb --tail 50
```

---

## 11. Choosing a Compose File

The repository includes three Docker Compose files:

| File | Architecture | Best for |
|---|---|---|
| `docker-compose.yml` | Monolith (`index.js`) | Simple setup, single process, low-traffic pools |
| `docker-compose.scaled.yml` | Split processes | High-traffic pools, horizontal scaling |
| `docker-compose.privacy.yml` | Monolith (privacy variant) | Minimal setup |

### For most pools, use `docker-compose.yml` (the default)

This runs `index.js` as a single process (same as your current bare-metal setup), plus Redis, MongoDB, backup, cleaner, and pools-network as separate containers.

```bash
# This is the default — just use:
docker compose up -d
```

### For high-traffic pools, use `docker-compose.scaled.yml`

This splits the pool into separate processes (stratum, web, share-processor, token-collector) for better performance under heavy miner load.

```bash
docker compose -f docker-compose.scaled.yml up -d
```

**Use the scaled version if you have 50+ active miners** or are experiencing performance issues.

---

## 12. Troubleshooting

### "Authentication failed" on MongoDB

**Cause:** `MONGO_INITDB_*` env vars only work on first initialization of a fresh volume. If the `mongodb-data` volume already exists from a previous attempt, the credentials are baked into the old volume.

**Fix:**
```bash
# Nuclear option — destroy the volume and re-import:
docker compose down
docker volume rm eticapool-v2_mongodb-data  # adjust prefix to match your project dir name
docker compose up -d mongodb redis
sleep 30  # wait for fresh init with new credentials
# Then re-run the mongorestore from step 7.2
```

### Pool can't connect to MongoDB

```bash
# Check MongoDB is healthy:
docker compose ps mongodb
# Should show "healthy"

# Check the MONGODB_URI being used:
docker compose exec pool-app env | grep MONGODB
# Should show: mongodb://eticapool:YOUR_PASSWORD@mongodb:27017

# Test connectivity from pool container to mongo:
docker compose exec pool-app curl -s mongodb:27017
# Should get a response (even if garbled — means TCP connection works)
```

### Pool starts but no miners connect

```bash
# Check stratum ports are actually exposed:
ss -tlnp | grep -E '3333|5555|7777|9999'
# Should show LISTEN on each port

# Check Docker port mapping:
docker compose port pool-app 3333
# Should show: 0.0.0.0:3333

# Check firewall isn't blocking:
sudo ufw status | grep -E '3333|5555|7777|9999'
```

### Web UI loads but shows no data

```bash
# Check if the database was imported correctly:
docker compose exec mongodb mongo \
  -u eticapool -p YOUR_PASSWORD --authenticationDatabase admin \
  tokenpool_production --eval "db.minerData.countDocuments({})"
# Should show a number > 0

# Check pool-app can read from DB:
curl -s http://localhost/api/v2/pool/miners | head -c 100
```

### Container keeps restarting (crash loop)

```bash
# Check the logs:
docker compose logs pool-app --tail 50

# Common causes:
# - Missing pool.config.json (check the volume mount)
# - Invalid JSON in pool.config.json
# - Wrong POOL_ENV (must match the key in pool.config.json: "staging" or "production")
# - MongoDB not ready yet (pool-app has depends_on with health check, but if mongo is slow...)
```

### How to view MongoDB data directly

```bash
# Open a mongo shell inside the container:
docker compose exec mongodb mongo \
  -u eticapool -p YOUR_PASSWORD --authenticationDatabase admin \
  tokenpool_production

# Then run any query:
> db.minerData.find().limit(3).pretty()
> db.miner_pendingshares.countDocuments({})
> db.balance_payments.find().sort({block:-1}).limit(5).pretty()
```

### How to do a manual backup

```bash
# From the host, using the backup container's approach:
docker compose exec mongodb mongodump \
  -u eticapool -p YOUR_PASSWORD --authenticationDatabase admin \
  --db tokenpool_production --out /tmp/manual-backup

# Copy it out:
docker cp $(docker compose ps -q mongodb):/tmp/manual-backup ./backups/manual-backup-$(date +%Y%m%d)
```

### Memory tuning

The compose file is tuned for a 4GB VPS:
- MongoDB: 1GB (with 0.5GB WiredTiger cache)
- Redis: 600MB (512MB maxmemory)
- pool-app: 1GB
- Other services: 256MB each

If you have more RAM, increase `mem_limit` and `--wiredTigerCacheSizeGB` proportionally:

| Server RAM | MongoDB mem_limit | WiredTiger cache | pool-app mem_limit |
|---|---|---|---|
| 4 GB | 1g | 0.5 | 1g |
| 8 GB | 2g | 1.0 | 2g |
| 16 GB | 4g | 2.5 | 3g |

Edit the values directly in `docker-compose.yml`.

---

## Quick Reference — Full Migration Commands

For copy-paste convenience, here's the entire migration as a linear script. **Read each step first** — don't blindly run this.

```bash
# === ON YOUR SERVER ===

# 1. Export current data (while old pool is still running)
mkdir -p /tmp/pool-migration
mongodump --db tokenpool_production --out /tmp/pool-migration/dump

# 2. Get the new code
cd /opt
git clone YOUR_REPO eticapool-v2
cd eticapool-v2
git checkout eticapool-v2

# 3. Configure
cp .env_example .env
nano .env  # SET REAL PASSWORDS

cp /path/to/old/pool.config.json ./pool.config.json
mkdir -p log backups

# 4. Stop old pool   ← DOWNTIME STARTS HERE
pm2 stop all           # or kill your node process
sudo systemctl stop mongod

# 5. Start MongoDB + Redis
docker compose up -d mongodb redis
sleep 30

# 6. Import data
docker cp /tmp/pool-migration/dump/tokenpool_production \
  $(docker compose ps -q mongodb):/tmp/tokenpool_production

# Read your .env passwords for the next command:
source .env
docker compose exec mongodb mongorestore \
  -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db tokenpool_production /tmp/tokenpool_production

docker compose exec mongodb rm -rf /tmp/tokenpool_production

# 7. Start everything
docker compose up -d   # ← DOWNTIME ENDS HERE

# 8. Verify
docker compose ps
curl -s http://localhost/api/v2/pool/overview | head -c 200
docker compose logs pool-app --tail 20

# 9. Update nginx if needed
sudo nginx -t && sudo systemctl reload nginx

# 10. Clean up (after 24h of stable operation)
rm -rf /tmp/pool-migration
sudo systemctl disable mongod
```
