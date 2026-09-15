#!/usr/bin/env bash
# Weekly refresh: sync GitHub clones -> re-run DNA analysis -> build -> deploy to Cloudflare Pages.
# Run by cron. Safe to run by hand: ./scripts/weekly-update.sh
set -uo pipefail

PROJECT_DIR="/root/developer-dna"
export REPOS_DIR="${REPOS_DIR:-/root/github-repos}"
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"
export HOME="${HOME:-/root}"

CF_PAGES_PROJECT="parth-portfolio"
DATA_FILE="src/data/developer-dna.json"
LOG_DIR="$PROJECT_DIR/logs"

cd "$PROJECT_DIR" || { echo "cannot cd to $PROJECT_DIR"; exit 1; }
mkdir -p "$LOG_DIR"

log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }
fail() { log "FAILED: $*"; exit 1; }

log "=== developer-dna weekly update starting ==="

# ── Credentials ──────────────────────────────────────────────────────────────
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a; . "$PROJECT_DIR/.env"; set +a
fi
[ -n "${CLOUDFLARE_API_TOKEN:-}" ] || fail "CLOUDFLARE_API_TOKEN not set (expected in $PROJECT_DIR/.env)"
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID

gh auth status >/dev/null 2>&1 || fail "gh CLI is not authenticated"

# ── 1. Sync every repo ───────────────────────────────────────────────────────
log "Step 1/4: syncing GitHub clones into $REPOS_DIR"
./scripts/sync-repos.sh || fail "repo sync"

# ── 2. Re-run the analysis ───────────────────────────────────────────────────
log "Step 2/4: running DNA analysis"
cp "$DATA_FILE" "$LOG_DIR/developer-dna.prev.json" 2>/dev/null
node scripts/analyze.js || fail "analysis"

# Sanity-check the output before it can reach production.
node -e '
  const d = JSON.parse(require("fs").readFileSync("'"$DATA_FILE"'", "utf8"));
  const repos = d?.metrics?.totalRepos ?? 0;
  const loc   = d?.metrics?.totalLinesOfCode ?? 0;
  if (repos < 10 || loc < 1000 || !Array.isArray(d.allRepos) || d.allRepos.length < 10) {
    console.error(`sanity check failed: repos=${repos} loc=${loc} allRepos=${d.allRepos?.length}`);
    process.exit(1);
  }
  console.log(`  data OK — ${repos} repos, ${loc.toLocaleString()} LOC, ${d.allRepos.length} listed`);
' || {
  log "Output failed sanity check — restoring previous data, not deploying"
  cp "$LOG_DIR/developer-dna.prev.json" "$DATA_FILE" 2>/dev/null
  fail "data sanity check"
}

# ── 3. Build ─────────────────────────────────────────────────────────────────
log "Step 3/4: building site"
npm run build || fail "build"
[ -f dist/index.html ] || fail "build produced no dist/index.html"

# ── 4. Deploy ────────────────────────────────────────────────────────────────
log "Step 4/4: deploying to Cloudflare Pages ($CF_PAGES_PROJECT)"
./node_modules/.bin/wrangler pages deploy dist \
  --project-name "$CF_PAGES_PROJECT" \
  --branch main \
  --commit-dirty=true || fail "deploy"

log "=== developer-dna weekly update complete — https://developer.parthshah.ai ==="
