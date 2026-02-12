# EticaPool

Mining pool for [Etica Protocol](https://www.eticaprotocol.org) (ETI) — RandomX Proof of Work.

Original pool developed by InfernalToast with help from the 0xBitcoin Community ([tokenpool](https://github.com/0xbitcoin/tokenpool)) (GNU Public License).

See it running at [eticapool.com](http://eticapool.com)

---

## What You Need Before Starting

1. **2 Etica wallets** (e.g. via MetaMask) — each with a public address and private key, funded with EGAZ for gas fees
   - **Wallet A (Minting)** — the pool uses this to submit mining solutions to the blockchain
   - **Wallet B (Payments)** — the pool uses this to send ETI payouts to miners

2. **A deployed BatchedPayments contract** — this contract allows the pool to pay multiple miners in a single transaction. You deploy it once with Wallet B as the owner. Detailed instructions are in both install guides below.

3. **A server** — Ubuntu recommended, 4GB+ RAM

---

## Installation

### Option A: Docker (Recommended)

**[Full guide: docs/INSTALL_DOCKER.md](docs/INSTALL_DOCKER.md)**

Docker handles Redis, MongoDB, the frontend build, backups, and all processes automatically. One command to start, one command to stop. Best for most users.

### Option B: Manual (without Docker)

**[Full guide: docs/INSTALL_MANUAL.md](docs/INSTALL_MANUAL.md)**

Install Node.js, MongoDB, and pm2 yourself. Use this if Docker is not available on your server or you need a custom setup.

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

## Stratum Ports

| Port | Difficulty |
|------|-----------|
| 3333 | Low-end CPU |
| 5555 | Mid-range CPU |
| 7777 | High-end CPU |
| 9999 | Very-High-end CPU |

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

## Upgrading from Bare-Metal

If you're migrating an existing pool from a bare-metal Node.js setup to Docker, see the [Migration Guide](MIGRATION_GUIDE.md) for step-by-step instructions with a rollback plan.

---

## Links

- [Etica Protocol](https://www.eticaprotocol.org)
- [How to Mine Etica](https://www.eticaprotocol.org/eticadocs/mining.html)
- [Block Explorer (EticaScan)](https://www.eticascan.org)
- [Etica Web App](https://www.etica.io)
- [Reddit](https://reddit.com/r/etica)
- [GitHub](https://github.com/etica)
