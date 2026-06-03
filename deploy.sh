#!/bin/bash
set -e

echo "=== Xplosale One-Click Deploy ==="

# Install Docker + Docker Compose if not present
if ! command -v docker &>/dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

if ! docker compose version &>/dev/null; then
  echo "Installing Docker Compose plugin..."
  apt-get install -y docker-compose-plugin
fi

# Pull latest code
if [ -d ".git" ]; then
  echo "Pulling latest code..."
  git pull origin main
fi

# Build the app + db services (everything except nginx, which needs a cert first)
echo "Building and starting services..."
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d postgres redis adminer app

# First deploy: no SSL certificate exists yet, so bootstrap Let's Encrypt.
# Subsequent deploys: cert already in the certbot_conf volume, just start nginx.
if docker compose run --rm --entrypoint \
     "test -f /etc/letsencrypt/live/app.xplosole.com/fullchain.pem" certbot; then
  echo "SSL certificate found — starting nginx + certbot..."
  docker compose up -d nginx certbot
else
  echo "No SSL certificate yet — bootstrapping Let's Encrypt..."
  bash init-letsencrypt.sh
  docker compose up -d certbot
fi

echo ""
echo "=== Deploy complete ==="
echo "App running at: https://app.xplosole.com"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f app     # view app logs"
echo "  docker compose logs -f nginx   # view nginx logs"
echo "  docker compose ps              # check status"
echo "  docker compose down            # stop everything"
