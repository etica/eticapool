# EticaPool

Mining pool for [Etica Protocol](https://www.eticaprotocol.org) (ETI) — RandomX Proof of Work.

Original pool developed by InfernalToast with help from the 0xBitcoin Community ([tokenpool](https://github.com/0xbitcoin/tokenpool)) (GNU Public License).

See it running at [eticapool.com](http://eticapool.com)

---

## Quick Start (Docker)

The fastest way to get a pool running. Docker handles Redis, the frontend build, and all processes automatically.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- [MongoDB](https://www.mongodb.com/docs/manual/installation/) running on the host machine (port 27017), listening on `0.0.0.0` (see [MongoDB note](#mongodb-connection) below)
- Two Etica wallet addresses with private keys (one for minting, one for payments)
- A small amount of EGAZ in both addresses for gas fees

### 1. Clone and prepare wallets

```bash
git clone https://github.com/etica/eticapool.git
cd eticapool
```

You need **two separate wallets** funded with EGAZ:

| Wallet | Purpose |
|--------|---------|
| **Minting address** | Submits mining solutions to the blockchain |
| **Payments address** | Owner of the BatchedPayments contract — sends payouts to miners |

### 2. Deploy the BatchedPayments contract

The pool pays miners through a BatchedPayments smart contract that sends ETI to multiple miners in a single transaction. You need to deploy your own instance.

1. Open `deploythis/BatchedPayments.sol`
2. In the `Ownable` constructor, replace the hardcoded owner address with **your payments address**:
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

### 3. Configure

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
      "publicAddress": "0xYOUR_MINTING_ADDRESS",    // Minting wallet
      "privateKey": "YOUR_MINTING_PRIVATE_KEY",     // !! Keep secret !!
      "poolTokenFee": 5,                            // Pool fee %
      "web3Provider": "https://eticamainnet.eticascan.org"
    },

    "paymentsConfig": {
      "publicAddress": "0xCONTRACT_OWNER_ADDRESS",  // Must match the BatchedPayments contract owner
      "privateKey": "CONTRACT_OWNER_PRIVATE_KEY",   // !! Keep secret !!
      "minBalanceForTransfer": 1500000000000000000, // Min payout (1.5 ETI in wei)
      "web3Provider": "https://eticamainnet.eticascan.org"
    }
  }
}
```

> **SECURITY**: Never share your `pool.config.json` — it contains private keys. It is listed in `.gitignore` and `.dockerignore`.

### 4. Start the pool

```bash
docker compose up --build -d
```

This starts 4 containers:

| Container | Role |
|-----------|------|
| `redis` | In-memory cache + share queue |
| `pool-app` | Main pool process (stratum, web, shares, tokens) |
| `pools-network` | Discovers and syncs with other Etica pools |
| `cleaner` | Periodically cleans old pending shares |

### 5. Verify

```bash
# Check all containers are running
docker compose ps

# Watch logs
docker compose logs -f pool-app

# Test the API
curl http://localhost/api/v1/overview
```

Open `http://localhost` in your browser to see the pool frontend.

### 6. Connect a miner

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

### 7. Stop

```bash
docker compose down
```

### MongoDB connection

MongoDB runs on the host machine (not inside Docker). Docker containers connect to it via `host.docker.internal`. On **macOS** and **Windows** this works out of the box. On **Linux**, MongoDB must be configured to accept connections from Docker containers:

```bash
# Check current MongoDB bind address
grep bindIp /etc/mongod.conf

# If it shows 127.0.0.1, update it to accept all connections
sudo sed -i 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/' /etc/mongod.conf

# Restart MongoDB to apply
sudo systemctl restart mongod

# Verify MongoDB is listening on all interfaces
sudo ss -tlnp | grep 27017
```

The `ss` output should show `0.0.0.0:27017` (not `127.0.0.1:27017`).

> **Note**: If your server is exposed to the internet, make sure MongoDB is protected by a firewall. Only ports listed in the [Firewall](#6-firewall) section need to be open — port 27017 should **not** be exposed publicly.

**Alternative**: If you can't change MongoDB's bind address, create a `.env` file in the eticapool directory:

```bash
echo "MONGODB_URI=mongodb://YOUR_SERVER_IP:27017" > .env
```

Docker Compose will automatically pick it up. This also works for remote MongoDB instances or custom ports.

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

Runs 7 containers:

| Container | Role | Ports |
|-----------|------|-------|
| `redis` | Cache + share queue | internal |
| `token-collector` | Watches blockchain for mining parameters | — |
| `share-processor` | Consumes and validates shares from Redis | — |
| `stratum` | Accepts miner connections | 3333, 5555, 7777, 9999, 8081 |
| `web` | Frontend + REST API + Socket.IO | 80, 2053 |
| `pools-network` | Network pool discovery | — |
| `cleaner` | Old shares cleanup | — |

### Privacy (docker-compose.privacy.yml)

Same as standard but without network pool discovery — your pool won't announce itself to other pools or fetch their data.

```bash
docker compose -f docker-compose.privacy.yml up --build -d
```

---

## Manual Setup (without Docker)

### Prerequisites

- **Node.js 18** (with npm)
- **MongoDB** (4.4+) running as a service
- **build-essential**, **cmake**, **python3**, **git** (for native module compilation)

### 1. Install dependencies

```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt-get install -y build-essential cmake python3 git

# Install Node 18 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 18

# Clone and install
git clone https://github.com/etica/eticapool.git
cd eticapool
npm install

# Build the frontend
cd frontend-new
npm install
npm run build
cd ..
```

### 2. Configure

```bash
cp pool.config.template.json pool.config.json
# Edit pool.config.json with your wallet addresses and private keys
```

### 3. Install and start MongoDB

```bash
# Ubuntu/Debian — see https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 4. (Optional) Install Redis

Redis is optional — the pool falls back to MongoDB queues without it.

```bash
sudo apt-get install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

If Redis is running, set the environment variable:

```bash
export REDIS_URL=redis://localhost:6379
```

### 5. Run with pm2

```bash
npm i -g pm2

# Start all 3 processes
pm2 start index.js
pm2 start indexpoolsnetwork.js
pm2 start indexcleanercoordinator.js

# Save and enable startup
pm2 save
pm2 startup
```

### 6. Firewall

```bash
sudo ufw allow 22      # SSH
sudo ufw allow 80      # Web UI
sudo ufw allow 2053    # Socket.IO
sudo ufw allow 3333    # Stratum
sudo ufw allow 5555    # Stratum
sudo ufw allow 7777    # Stratum
sudo ufw allow 9999    # Stratum
sudo ufw allow 8081    # JSONRPC
sudo ufw enable
```

---

## Configuration Reference

### pool.config.json

The config file has two top-level keys: `staging` and `production`. The pool reads the section matching the `POOL_ENV` environment variable (defaults to `production`).

| Field | Description |
|-------|-------------|
| `poolName` | Display name shown in the frontend header and network pools list |
| `poolUrl` | Public URL of your pool (e.g. `http://mypool.com`) |
| `MainPeerPoolUrl` | URL of the main Etica pool to sync network data from |
| `poolEnv` | `staging` or `production` |

#### mintingConfig

| Field | Description |
|-------|-------------|
| `publicAddress` | Etica address used for submitting mining solutions |
| `privateKey` | Private key for the minting address |
| `poolTokenFee` | Pool fee percentage (e.g. `5` = 5%) |
| `maxGasPriceGwei` | Maximum gas price for minting transactions |
| `gasPriceBoost` | Gas price boost in gwei |
| `overrideSuspension` | `true` to keep minting even during low-profit periods |
| `web3Provider` | Etica RPC endpoint |

#### paymentsConfig

| Field | Description |
|-------|-------------|
| `publicAddress` | Etica address used for sending miner payouts |
| `privateKey` | Private key for the payments address |
| `minBalanceForTransfer` | Minimum payout threshold in wei (1 ETI = 1000000000000000000) |
| `minPaymentsInBatch` | Minimum payments per batch transaction |
| `PoolSecurityBalance` | Minimum EGAZ to keep in payments address |
| `poolRewardsBonus` | Bonus reward percentage for miners (optional) |
| `maxGasPriceGwei` | Maximum gas price for payment transactions |
| `web3Provider` | Etica RPC endpoint |

#### miningConfig

| Field | Description |
|-------|-------------|
| `minimumShareDifficulty` | Minimum share difficulty accepted |
| `minimumShareDifficultyHard` | Hard minimum (rejects below this) |
| `allowCustomVardiff` | Allow miners to set custom difficulty |
| `newShareExpectedTime` | Expected seconds between shares (for vardiff) |

---

## Processes

| Script | Purpose | Required |
|--------|---------|----------|
| `index.js` | Main pool — stratum server, web server, share processing, token collection, transaction coordination | Yes |
| `indexpoolsnetwork.js` | Discovers other Etica pools, syncs network stats, manages pool list | Recommended |
| `indexcleanercoordinator.js` | Cleans old pending shares from MongoDB (runs hourly, keeps last 1000 epochs) | Recommended |

---

## Architecture

```
Miners (RandomX)
    |
    |  Stratum TCP (ports 3333/5555/7777/9999)
    v
+-----------+       +-------+       +---------+
|  Stratum  | ----> | Redis | ----> |  Share  |
|  Server   |       | Queue |       |Processor|
+-----------+       +-------+       +---------+
                                        |
                                        v
+-----------+       +---------+     +---------+
|   Web     | <---- | MongoDB | <-- |  Token  |
|  Server   |       |         |     |Interface|
+-----------+       +---------+     +---------+
    |                                   |
    |  HTTP :80 + Socket.IO :2053       |  Blockchain RPC
    v                                   v
 Browser                          Etica Network
```

- **Redis** (optional): High-performance share queue between stratum and processor. Falls back to MongoDB if unavailable.
- **MongoDB**: Persistent storage for miners, shares, rewards, payments, pool stats.
- **Socket.IO**: Real-time updates pushed to the frontend (new shares, pool stats, blocks).

---

## How Mining Rewards Work

1. **Share submission**: Miner submits RandomX proof via stratum
2. **Share validation**: Pool verifies the hash meets difficulty target
3. **Block found**: When a share solves the on-chain challenge, pool submits the minting transaction
4. **PPLNS rewards**: `rewardCrawl()` distributes block rewards proportionally based on last N shares (Pay Per Last N Shares)
5. **Payment creation**: `buildBalancePayments()` creates payment records when miner balance exceeds the minimum payout threshold
6. **Batched payment**: `buildBatchedPaymentTransactions()` groups pending payments and broadcasts on-chain
7. **Confirmation**: Pool monitors the transaction until it is mined and confirmed

---

## Links

- [Etica Protocol](https://www.eticaprotocol.org)
- [How to Mine Etica](https://www.eticaprotocol.org/eticadocs/mining.html)
- [Block Explorer (EticaScan)](https://www.eticascan.org)
- [Etica Web App](https://www.etica.io)
- [Reddit](https://reddit.com/r/etica)
- [GitHub](https://github.com/etica)
