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

# Build and start everything
echo "Building and starting services..."
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d

echo ""
echo "=== Deploy complete ==="
echo "App running at: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_IP'):3000"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f app     # view app logs"
echo "  docker compose ps              # check status"
echo "  docker compose down            # stop everything"
