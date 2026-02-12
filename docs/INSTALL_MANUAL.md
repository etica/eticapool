# Manual Installation Guide (without Docker)

Use this guide if you cannot run Docker or need a custom setup. For most users, the [Docker installation](INSTALL_DOCKER.md) is simpler and recommended.

---

## Prerequisites

- **Node.js 18** (with npm)
- **MongoDB** (4.4+) running as a service
- **build-essential**, **cmake**, **python3**, **git** (for native module compilation)
- Two Etica wallet addresses with private keys (one for minting, one for payments)
- A small amount of EGAZ in both addresses for gas fees
- A server with 4GB+ RAM (Ubuntu recommended)

---

## 1. Install system dependencies

```bash
# Ubuntu/Debian
sudo apt-get install -y build-essential cmake python3 git

# Install Node 18 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 18
```

## 2. Clone and install

```bash
git clone https://github.com/etica/eticapool.git
cd eticapool
npm install

# Build the frontend
cd frontend-new
npm install
npm run build
cd ..
```

## 3. Deploy the BatchedPayments contract

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

## 4. Configure

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

> **SECURITY**: Never share your `pool.config.json` — it contains private keys. It is listed in `.gitignore`.

See the [Configuration Reference](../README.md#configuration-reference) for all available options.

## 5. Install and start MongoDB

```bash
# Ubuntu/Debian — see https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/
sudo systemctl start mongod
sudo systemctl enable mongod
```

> **Security**: MongoDB defaults to `bindIp: 127.0.0.1` (localhost only), which is safe. **Never** change this to `0.0.0.0` without firewall rules — automated bots scan for exposed MongoDB instances and will delete your data within hours. Set the environment variable: `export MONGODB_URI=mongodb://localhost:27017`

## 6. (Optional) Install Redis

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

## 7. Run with pm2

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

## 8. Firewall (MANDATORY)

```bash
# Allow pool services
sudo ufw allow 22      # SSH
sudo ufw allow 80      # Web UI
sudo ufw allow 2053    # Socket.IO
sudo ufw allow 3333    # Stratum
sudo ufw allow 5555    # Stratum
sudo ufw allow 7777    # Stratum
sudo ufw allow 9999    # Stratum
# BLOCK internal services from external access
# Port 8081 (JSONRPC) must NEVER be exposed — internal use only
sudo ufw deny in to any port 27017 comment 'Block external MongoDB'
sudo ufw deny in to any port 6379  comment 'Block external Redis'

sudo ufw --force enable
```

> **CRITICAL**: Port 27017 (MongoDB) and 6379 (Redis) must NEVER be exposed to the internet. Automated bots scan for these ports and will delete your data within hours.

## 9. HTTPS with Let's Encrypt (Recommended)

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
