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
# It tracks what is actually deployed in a `.deployed_rev` file (NOT git HEAD),
# so it works correctly even if you `git pull` by hand first.
#
# Usage:
#   ./update.sh              # pull + redeploy latest origin/main
#   ./update.sh my-branch    # pull + redeploy a specific branch
#   ./update.sh --force      # rebuild + recreate even if nothing changed
#   ./update.sh my-branch --force
#
set -e

cd "$(dirname "$0")"

BRANCH="main"
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    *) BRANCH="$arg" ;;
  esac
done

REV_FILE=".deployed_rev"
DEPLOYED_REV="$(cat "$REV_FILE" 2>/dev/null || echo "")"

echo "=== Xplosale quick update (app only) ==="

echo "==> Fetching origin/$BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
NEW_REV="$(git rev-parse HEAD)"

if [ "$FORCE" -ne 1 ] && [ "$DEPLOYED_REV" = "$NEW_REV" ]; then
  echo "==> Already deployed ($NEW_REV) — nothing to do. (use --force to rebuild anyway)"
  exit 0
fi

if [ -n "$DEPLOYED_REV" ]; then
  echo "==> Deploying $DEPLOYED_REV -> $NEW_REV"
else
  echo "==> First tracked deploy -> $NEW_REV"
fi

echo "==> Building app image (uses cache — fast)"
docker compose build app

# Run migrations if the Prisma schema changed since the last deploy
# (or if we have no record of the last deploy, run them to be safe).
SCHEMA_CHANGED=1
if [ -n "$DEPLOYED_REV" ] && git diff --quiet "$DEPLOYED_REV" "$NEW_REV" -- prisma/schema.prisma; then
  SCHEMA_CHANGED=0
fi
if [ "$SCHEMA_CHANGED" -eq 1 ]; then
  echo "==> Schema may have changed — running prisma db push"
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

# Record what we just deployed.
echo "$NEW_REV" > "$REV_FILE"

echo ""
echo "=== Update complete ($NEW_REV) ==="
docker compose ps
