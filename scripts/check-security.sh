#!/bin/bash
# Quick security check — run before starting the pool
# Usage: bash scripts/check-security.sh

ERRORS=0

echo "Eticapool Security Check"
echo "========================"
echo ""

# Check if MongoDB is listening on 0.0.0.0
MONGO_BIND=$(ss -tlnp 2>/dev/null | grep 27017 | head -1)

if echo "$MONGO_BIND" | grep -q "0.0.0.0:27017"; then
  # MongoDB is on 0.0.0.0 — check firewall
  echo "[!] MongoDB is bound to 0.0.0.0 — checking firewall..."

  PROTECTED=false

  if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status 2>/dev/null)
    if echo "$UFW_STATUS" | grep -q "Status: active"; then
      if echo "$UFW_STATUS" | grep -q "27017.*DENY"; then
        PROTECTED=true
        echo "[OK] UFW is active and blocking port 27017 from the internet"
      fi
    fi
  fi

  if ! $PROTECTED; then
    # Check iptables
    if iptables -L INPUT -n 2>/dev/null | grep -q "27017.*DROP\|27017.*REJECT"; then
      PROTECTED=true
      echo "[OK] iptables is blocking port 27017 from the internet"
    fi
  fi

  if ! $PROTECTED; then
    echo ""
    echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    echo "!! CRITICAL: MongoDB is EXPOSED to the internet  !!"
    echo "!! Your data WILL be deleted by automated bots   !!"
    echo "!! Run: sudo bash scripts/setup-mongodb-docker.sh !!"
    echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    echo ""
    ERRORS=$((ERRORS + 1))
  fi
elif echo "$MONGO_BIND" | grep -q "127.0.0.1:27017"; then
  echo "[OK] MongoDB is bound to 127.0.0.1 (localhost only)"
else
  echo "[--] Could not detect MongoDB binding (is it running?)"
fi

# Check Redis
REDIS_BIND=$(ss -tlnp 2>/dev/null | grep 6379 | head -1)

if echo "$REDIS_BIND" | grep -q "0.0.0.0:6379"; then
  echo "[!] Redis is bound to 0.0.0.0 — checking firewall..."

  if command -v ufw &> /dev/null; then
    if ufw status 2>/dev/null | grep -q "6379.*DENY"; then
      echo "[OK] UFW is blocking port 6379"
    else
      echo "[WARN] Redis may be exposed. Add: sudo ufw deny in to any port 6379"
      ERRORS=$((ERRORS + 1))
    fi
  fi
elif echo "$REDIS_BIND" | grep -q "127.0.0.1:6379"; then
  echo "[OK] Redis is bound to 127.0.0.1 (localhost only)"
fi

# Check pool.config.json permissions
if [ -f "pool.config.json" ]; then
  PERMS=$(stat -c %a pool.config.json 2>/dev/null)
  if [ "$PERMS" = "600" ] || [ "$PERMS" = "400" ]; then
    echo "[OK] pool.config.json permissions: $PERMS"
  else
    echo "[WARN] pool.config.json permissions are $PERMS — recommend 600: chmod 600 pool.config.json"
  fi
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "All checks passed."
else
  echo "$ERRORS CRITICAL issue(s) found. Fix them before starting the pool."
  exit 1
fi
