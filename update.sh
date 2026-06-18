#!/bin/bash
#
# update.sh — lightweight redeploy for CODE changes only.
#
# Unlike deploy.sh (which does a full `down` + `build --no-cache` of every
# service), this rebuilds ONLY the `app` container — the only one with your code.
#
#   - postgres / redis / adminer / certbot : left running, untouched (your data)
#   - migrate : run ONLY when prisma/schema.prisma changed
#   - nginx  : reloaded (so it re-resolves app's new container IP — avoids 502s)
#
# Usage:
#   ./update.sh            # pull + redeploy latest origin/main
#   ./update.sh my-branch  # pull + redeploy a specific branch
#
set -e

cd "$(dirname "$0")"
BRANCH="${1:-main}"

echo "=== Xplosale quick update (app only) ==="

echo "==> Fetching origin/$BRANCH"
git fetch origin "$BRANCH"

OLD_REV="$(git rev-parse HEAD)"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
NEW_REV="$(git rev-parse HEAD)"

if [ "$OLD_REV" = "$NEW_REV" ]; then
  echo "==> Already up to date ($NEW_REV) — nothing to do."
  exit 0
fi
echo "==> $OLD_REV -> $NEW_REV"

echo "==> Building app image (uses cache — fast)"
docker compose build app

# Run migrations only if the Prisma schema actually changed.
if ! git diff --quiet "$OLD_REV" "$NEW_REV" -- prisma/schema.prisma; then
  echo "==> Prisma schema changed — running prisma db push"
  docker compose build migrate
  docker compose run --rm migrate sh -c "npx prisma db push"
else
  echo "==> No schema changes — skipping migrate"
fi

echo "==> Recreating app container"
docker compose up -d --no-deps --force-recreate app

echo "==> Reloading nginx"
docker compose exec -T nginx nginx -s reload \
  || echo "   (nginx reload failed — check: docker compose logs nginx)"

echo ""
echo "=== Update complete ==="
docker compose ps
