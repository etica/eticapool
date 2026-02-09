#!/bin/bash
# ============================================================
# MongoDB Security Setup for Eticapool Docker Deployment
# ============================================================
# This script configures MongoDB to accept connections from
# Docker containers while blocking all external access.
#
# WHAT IT DOES:
# 1. Updates MongoDB bindIp to 0.0.0.0 (required for Docker)
# 2. Adds firewall rules to BLOCK port 27017 from the internet
# 3. Only allows localhost and Docker network (172.17.0.0/16)
#
# IMPORTANT: MongoDB MUST be protected by firewall when bound
# to 0.0.0.0. Without firewall rules, anyone on the internet
# can connect and delete your data.
# ============================================================

set -e

echo "============================================"
echo " Eticapool MongoDB Security Setup"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "ERROR: Please run as root (sudo ./setup-mongodb-docker.sh)"
  exit 1
fi

# ---- Step 1: Firewall rules FIRST (before changing bindIp) ----
echo "[1/3] Setting up firewall rules..."

if command -v ufw &> /dev/null; then
  # Ensure UFW is enabled
  ufw --force enable

  # IMPORTANT: UFW processes rules top-to-bottom, first match wins.
  # ALLOW rules MUST come before DENY, otherwise DENY catches everything.

  # Allow Docker networks FIRST (docker-compose creates 172.17.x, 172.18.x, etc)
  ufw allow from 172.16.0.0/12 to any port 27017 comment 'Allow all Docker networks to MongoDB'

  # Allow localhost
  ufw allow from 127.0.0.1 to any port 27017 comment 'Allow localhost to MongoDB'

  # DENY everything else LAST
  ufw deny in to any port 27017 comment 'Block external MongoDB'

  echo "  UFW rules added. Verifying..."
  ufw status | grep 27017
else
  echo "  UFW not found, using iptables directly..."

  # Flush existing MongoDB rules to avoid duplicates
  iptables -D INPUT -p tcp --dport 27017 -j DROP 2>/dev/null || true

  # Allow Docker networks (172.16.0.0/12 covers all Docker bridge networks)
  iptables -A INPUT -p tcp --dport 27017 -s 172.16.0.0/12 -j ACCEPT
  iptables -A INPUT -p tcp --dport 27017 -s 127.0.0.1 -j ACCEPT
  iptables -A INPUT -p tcp --dport 27017 -j DROP

  echo "  iptables rules added."

  # Try to persist rules
  if command -v iptables-save &> /dev/null; then
    iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
    echo "  Rules persisted."
  else
    echo "  WARNING: Install iptables-persistent to persist rules across reboots:"
    echo "    apt-get install -y iptables-persistent"
  fi
fi

echo ""

# ---- Step 2: Update MongoDB bindIp ----
echo "[2/3] Configuring MongoDB bindIp..."

MONGOD_CONF="/etc/mongod.conf"

if [ ! -f "$MONGOD_CONF" ]; then
  echo "  WARNING: $MONGOD_CONF not found. Checking /etc/mongodb.conf..."
  MONGOD_CONF="/etc/mongodb.conf"
fi

if [ ! -f "$MONGOD_CONF" ]; then
  echo "  ERROR: MongoDB config file not found. Please update bindIp manually."
  exit 1
fi

CURRENT_BIND=$(grep -E "bindIp|bind_ip" "$MONGOD_CONF" | head -1)
echo "  Current: $CURRENT_BIND"

if echo "$CURRENT_BIND" | grep -q "0.0.0.0"; then
  echo "  Already set to 0.0.0.0 — no change needed."
else
  # Backup config first
  cp "$MONGOD_CONF" "${MONGOD_CONF}.backup.$(date +%Y%m%d%H%M%S)"
  echo "  Backup saved."

  sed -i 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/' "$MONGOD_CONF"
  sed -i 's/bind_ip = 127.0.0.1/bind_ip = 0.0.0.0/' "$MONGOD_CONF"
  echo "  Updated to 0.0.0.0"
fi

echo ""

# ---- Step 3: Restart MongoDB ----
echo "[3/3] Restarting MongoDB..."

if systemctl is-active mongod &>/dev/null; then
  systemctl restart mongod
  echo "  mongod restarted."
elif systemctl is-active mongodb &>/dev/null; then
  systemctl restart mongodb
  echo "  mongodb restarted."
else
  echo "  WARNING: Could not detect MongoDB service. Please restart manually."
fi

echo ""

# ---- Verify ----
echo "============================================"
echo " Verification"
echo "============================================"

echo ""
echo "MongoDB listening on:"
ss -tlnp | grep 27017 || echo "  WARNING: MongoDB not detected on port 27017"

echo ""
echo "Firewall status for port 27017:"
if command -v ufw &> /dev/null; then
  ufw status | grep 27017
else
  iptables -L INPUT -n | grep 27017 || echo "  Check iptables manually"
fi

echo ""
echo "============================================"
echo " DONE — MongoDB is secured"
echo "============================================"
echo ""
echo "MongoDB accepts connections from:"
echo "  - localhost (127.0.0.1)"
echo "  - Docker containers (172.16.0.0/12)"
echo "  - BLOCKED from the internet"
echo ""
echo "You can now safely run:"
echo "  docker compose up --build -d"
echo ""
