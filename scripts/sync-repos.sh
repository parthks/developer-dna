#!/usr/bin/env bash
# Clone (or update) every non-fork repo owned by GITHUB_USERNAME into REPOS_DIR.
# The analysis pipeline reads working trees + git history from these clones.
set -uo pipefail

GITHUB_USERNAME="${GITHUB_USERNAME:-parthks}"
REPOS_DIR="${REPOS_DIR:-/root/github-repos}"
JOBS="${JOBS:-6}"

mkdir -p "$REPOS_DIR"

echo "[sync-repos] user=$GITHUB_USERNAME dir=$REPOS_DIR jobs=$JOBS"

repo_list="$(mktemp)"
trap 'rm -f "$repo_list"' EXIT

if ! gh api "/user/repos?per_page=100&affiliation=owner&sort=created&direction=asc" --paginate \
     --jq '.[] | select(.fork==false) | .name' > "$repo_list"; then
  echo "[sync-repos] ERROR: failed to list repos (is gh authenticated?)" >&2
  exit 1
fi

total=$(wc -l < "$repo_list")
echo "[sync-repos] $total non-fork repos to sync"

sync_one() {
  name="$1"
  dir="$REPOS_DIR/$name"
  if [ -d "$dir/.git" ]; then
    git -C "$dir" fetch --quiet --prune origin 2>/dev/null || { echo "  fetch-fail  $name"; return; }
    head_ref="$(git -C "$dir" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null)"
    if [ -z "$head_ref" ]; then
      git -C "$dir" remote set-head origin --auto >/dev/null 2>&1
      head_ref="$(git -C "$dir" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null)"
    fi
    if [ -n "$head_ref" ]; then
      git -C "$dir" reset --quiet --hard "$head_ref" 2>/dev/null && echo "  updated     $name" || echo "  reset-fail  $name"
    else
      echo "  no-head     $name"   # empty repo
    fi
  else
    if git clone --quiet "git@github.com:$GITHUB_USERNAME/$name.git" "$dir" 2>/dev/null; then
      echo "  cloned      $name"
    else
      echo "  clone-fail  $name"
    fi
  fi
}
export -f sync_one
export REPOS_DIR GITHUB_USERNAME

xargs -a "$repo_list" -P "$JOBS" -I{} bash -c 'sync_one "$@"' _ {}

echo "[sync-repos] done — $(find "$REPOS_DIR" -maxdepth 1 -mindepth 1 -type d | wc -l) local clones, $(du -sh "$REPOS_DIR" 2>/dev/null | cut -f1) on disk"
