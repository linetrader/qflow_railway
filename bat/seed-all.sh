#!/usr/bin/env bash
set -euo pipefail

# Seed all data in the correct order.
# Usage:
#   bash scripts/seed-all.sh
#   chmod +x scripts/seed-all.sh && ./scripts/seed-all.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

# Pretty logger
log() { printf "\n\e[1m▶ %s\e[0m\n" "$*"; }

trap 'echo "\n❌ Error on line $LINENO"; exit 1' ERR

# Optional: ensure Prisma Client is up to date
log "prisma generate"
npx prisma generate

# 1) Countries
log "seed.country"
time npx tsx prisma/seed.country.ts

# 2) Referral (plans/levels/edges/templates etc.)
log "seed.referral"
time npx tsx prisma/seed.referral.ts

# 3) Packages
log "seed.packages"
time npx tsx prisma/seed.packages.ts

# 4) Token master data
log "seed.token"
time npx tsx prisma/seed.token.ts

# 5) Initial CoinPrice rows
log "seed.coinprice"
time npx tsx prisma/seed.coinprice.ts

# 6) Create admin user
log "seed.create.admin"
time npx tsx prisma/seed.create.admin.ts

# 7) Create Mining Plan
log "seed.mining"
time npx tsx prisma/seed.mining.ts

# 8) Create Level Policy
log "seed.level.policy"
time npx tsx prisma/seed.level.policy.ts

# 9) Create Level Worker Config
log "seed.level.worker"
time npx tsx prisma/seed.level.worker.ts

# 10) Create Mining Schedule
log "seed.miningSchedule"
time npx tsx prisma/seed.miningSchedule.ts

# 11) Create Chain Config
log "seed.chain.config"
time npx tsx prisma/seed.chain.config.ts

printf "\n✅ All seeds completed successfully.\n"
