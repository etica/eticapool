# Docker Installation Guide

The fastest way to get a pool running. Docker handles Redis, MongoDB, the frontend build, and all processes automatically.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- Two Etica wallet addresses with private keys (one for minting, one for payments)
- A small amount of EGAZ in both addresses for gas fees
- A server with 4GB+ RAM (Ubuntu recommended)

```bash
# Check if Docker is already installed
docker --version
# → If it prints "Docker version 20.x" or higher: Docker is OK.
# → If it prints "command not found" or a version below 20: install Docker:
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Then log out and log back in so Docker works without sudo.
```

---

## 1. Clone the repository

```bash
git clone https://github.com/etica/eticapool.git
cd eticapool
```

You need **two separate wallets** funded with EGAZ:

| Wallet | Purpose |
|--------|---------|
| **Minting address** (Wallet A) | Submits mining solutions to the blockchain |
| **Payments address** (Wallet B) | Owner of the BatchedPayments contract — sends payouts to miners |

## 2. Deploy the BatchedPayments contract

The pool pays miners through a BatchedPayments smart contract that sends ETI to multiple miners in a single transaction. You need to deploy your own instance.

1. Open `deploythis/BatchedPayments.sol`
2. In the `Ownable` constructor, replace the hardcoded owner address with **your payments address** (Wallet B):
   ```solidity
   constructor() public {
     owner = 0xYOUR_PAYMENTS_PUBLIC_ADDRESS;
   }
   ```
3. Deploy the contract to the Etica network using Remix, Hardhat, or any deployment tool
4. After deployment, update the contract address in `config/DeployedContractInfo.json`:

```json
{
  "networks": {
    "etica": {
      "contracts": {
        "EticaRelease": {"name":"EticaRelease", "blockchain_address":"0x34c61EA91bAcdA647269d4e310A86b875c09946f"},
        "batchedpayments": {"name":"BatchedPayments", "blockchain_address":"0xYOUR_DEPLOYED_CONTRACT_ADDRESS"}
      }
    }
  }
}
```

> **Important**: The `owner` address hardcoded in the contract and the `paymentsConfig.publicAddress` in pool.config.json **must be the same address**. Only the owner can call the contract to send batched payouts to miners.

## 3. Configure

```bash
cp pool.config.template.json pool.config.json
```

Edit `pool.config.json` — fill in the **production** section:

```jsonc
{
  "production": {
    "poolName": "My Etica Pool",                    // Display name
    "poolUrl": "http://your-server-ip-or-domain",   // Public URL
    "MainPeerPoolUrl": "http://eticapool.com",      // Main peer for network sync
    "poolEnv": "production",

    "mintingConfig": {
      "publicAddress": "0xYOUR_MINTING_ADDRESS",    // Wallet A
      "privateKey": "YOUR_MINTING_PRIVATE_KEY",     // !! Keep secret !!
      "poolTokenFee": 5,                            // Pool fee %
      "web3Provider": "https://eticamainnet.eticascan.org"
    },

    "paymentsConfig": {
      "publicAddress": "0xCONTRACT_OWNER_ADDRESS",  // Wallet B (must match contract owner)
      "privateKey": "CONTRACT_OWNER_PRIVATE_KEY",   // !! Keep secret !!
      "minBalanceForTransfer": 1500000000000000000, // Min payout (1.5 ETI in wei)
      "web3Provider": "https://eticamainnet.eticascan.org"
    }
  }
}
```

> **SECURITY**: Never share your `pool.config.json` — it contains private keys. It is listed in `.gitignore` and `.dockerignore`.

## 4. Set passwords

Create a `.env` file in the project root:

```bash
cat > .env << 'EOF'
REDIS_PASSWORD=change_me_to_a_strong_password
MONGO_ROOT_USER=eticapool
MONGO_ROOT_PASSWORD=change_me_to_a_strong_password
EOF
```

> The `.env` file is listed in `.gitignore` — it will not be committed.

## 5. Open firewall ports

```bash
sudo ufw allow 22 80 443 2053 3333 5555 7777 9999
sudo ufw deny 27017
sudo ufw deny 6379
sudo ufw --force enable
```

> **CRITICAL**: Port 27017 (MongoDB) and 6379 (Redis) must NEVER be exposed to the internet.

## 6. Start the pool

```bash
docker compose up --build -d
```

This starts 6 containers:

| Container | Role |
|-----------|------|
| `mongodb` | Database (internal network only, never exposed to internet) |
| `redis` | In-memory cache + share queue |
| `pool-app` | Main pool process (stratum, web, shares, tokens) |
| `pools-network` | Discovers and syncs with other Etica pools |
| `cleaner` | Periodically cleans old pending shares |
| `backup` | Automated daily database backups to `./backups/` |

## 7. Verify

```bash
# Check all containers are running
docker compose ps

# Watch logs
docker compose logs -f pool-app

# Test the API
curl http://localhost/api/v1/overview
```

Open `http://localhost` in your browser to see the pool frontend.

## 8. Connect a miner

Point your RandomX miner at:

```
stratum+tcp://your-server-ip:3333
```

Available ports:

| Port | Difficulty |
|------|-----------|
| 3333 | Low-end CPU |
| 5555 | Mid-range CPU |
| 7777 | High-end CPU |
| 9999 | Very-High-end CPU |

---

## Docker Commands

```bash
# Start the pool (build + detached)
docker compose up --build -d

# Start with live logs
docker compose up --build

# View logs (all containers)
docker compose logs -f

# View logs (pool only)
docker compose logs -f pool-app

# Check container status
docker compose ps

# Restart the pool
docker compose restart

# Stop the pool (preserves data)
docker compose down
```

> **WARNING**: Never use `docker compose down -v` — the `-v` flag **permanently deletes all pool data** (MongoDB and Redis volumes). Plain `docker compose down` is safe and preserves all data.

---

## HTTPS with Let's Encrypt (Recommended)

HTTPS encrypts all traffic between miners' browsers and your pool. It also enables secure WebSocket (`wss://`) for real-time updates.

### Install nginx and certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Get a certificate

```bash
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts — certbot will verify domain ownership and save the certificate to `/etc/letsencrypt/live/yourdomain.com/`.

### Generate DH parameters

```bash
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
```

This takes about 1 minute.

### Configure nginx

Copy the included nginx template:

```bash
sudo cp config/nginx/default /etc/nginx/sites-available/default
```

Replace the placeholder domain with yours:

```bash
sudo sed -i 's/YOUR_DOMAIN.com/yourdomain.com/g' /etc/nginx/sites-available/default
```

Test and reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Update firewall

```bash
sudo ufw allow 443   # HTTPS
```

### What this does

- `http://yourdomain.com` automatically redirects to `https://yourdomain.com`
- nginx proxies web traffic to the pool on port 8080
- Socket.IO (real-time updates) goes through `wss://yourdomain.com/socket.io/` — no need to expose port 2053
- Stratum ports (3333/5555/7777/9999) are unaffected — miners connect directly via TCP

### Certificate auto-renewal

Certbot installs a systemd timer that renews certificates automatically. Verify it's active:

```bash
sudo systemctl status certbot.timer
```

To test renewal:

```bash
sudo certbot renew --dry-run
```

---

## Docker Deployment Modes

### Standard (docker-compose.yml)

Single-process monolith. Best for small to medium pools.

```bash
docker compose up --build -d
```

### Scaled (docker-compose.scaled.yml)

Separate processes for each role. Better for high-traffic pools with many miners.

```bash
docker compose -f docker-compose.scaled.yml up --build -d
```

Runs 8 containers:

| Container | Role | Ports |
|-----------|------|-------|
| `mongodb` | Database (internal only) | — |
| `redis` | Cache + share queue | internal |
| `token-collector` | Watches blockchain for mining parameters | — |
| `share-processor` | Consumes and validates shares from Redis | — |
| `stratum` | Accepts miner connections | 3333, 5555, 7777, 9999 |
| `web` | Frontend + REST API + Socket.IO | 80, 2053 |
| `pools-network` | Network pool discovery | — |
| `cleaner` | Old shares cleanup | — |

### Privacy (docker-compose.privacy.yml)

Same as standard but without network pool discovery — your pool won't announce itself to other pools or fetch their data.

```bash
docker compose -f docker-compose.privacy.yml up --build -d
```

---

## Upgrading from Bare-Metal (MongoDB on host)

If you previously ran MongoDB on the host machine (e.g., with pm2), migrate your data into the Docker container:

```bash
# 1. Stop the old pool processes
pm2 stop all

# 2. Back up your existing database
mongodump --db tokenpool_production --out /tmp/pool-backup

# 3. Verify the backup was created
ls -la /tmp/pool-backup/tokenpool_production/
# You should see .bson and .metadata.json files for each collection
```

```bash
# 4. Create your .env file (see step 4 above) and start the new Docker stack
docker compose up --build -d

# 5. Wait for all containers to be healthy (~30s)
docker compose ps
```

```bash
# 6. Copy backup into the MongoDB container and restore
docker cp /tmp/pool-backup/tokenpool_production \
  $(docker compose ps -q mongodb):/tmp/tokenpool_production

docker compose exec mongodb mongorestore \
  -u "${MONGO_ROOT_USER:-eticapool}" \
  -p "${MONGO_ROOT_PASSWORD:-eticapool_mongo_default_change_me}" \
  --authenticationDatabase admin \
  --db tokenpool_production \
  /tmp/tokenpool_production

# 7. Verify the restore
docker compose exec mongodb mongo \
  -u "${MONGO_ROOT_USER:-eticapool}" \
  -p "${MONGO_ROOT_PASSWORD:-eticapool_mongo_default_change_me}" \
  --authenticationDatabase admin \
  tokenpool_production \
  --eval "db.getCollectionNames()"
# Should list: minerData, miner_shares, balance_payments, pool_mints, etc.
```

After confirming the restore, disable the host MongoDB service:

```bash
sudo systemctl stop mongod
sudo systemctl disable mongod
```

> **IMPORTANT**: Also set up the firewall (see step 5 above) to block port 27017 from the internet.

For a more detailed migration guide with rollback plan, see [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md).

---

## Restoring from Backup

The `backup` container automatically saves daily backups to the `./backups/` directory on the host. Each backup is a timestamped directory containing a full `mongodump` of the pool database. The two most recent backups are kept; older ones are deleted automatically.

To restore from the most recent backup:

```bash
# 1. Find the latest backup
ls -lt backups/

# 2. Restore into the running MongoDB container
docker compose exec -T mongodb mongorestore \
  -u "${MONGO_ROOT_USER:-eticapool}" \
  -p "${MONGO_ROOT_PASSWORD:-eticapool_mongo_default_change_me}" \
  --authenticationDatabase admin \
  --db tokenpool_production \
  --drop \
  backups/dump-YYYYMMDD-HHMMSS/tokenpool_production

# 3. Verify the restore
docker compose exec mongodb mongo \
  -u "${MONGO_ROOT_USER:-eticapool}" \
  -p "${MONGO_ROOT_PASSWORD:-eticapool_mongo_default_change_me}" \
  --authenticationDatabase admin \
  tokenpool_production \
  --eval "db.getCollectionNames()"
```

> **WARNING**: The `--drop` flag deletes existing collections before restoring. Only use this if you want to fully replace the current database with the backup.
