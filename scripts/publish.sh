#!/usr/bin/env bash
# Publish the game to GitHub Pages with the gh CLI (already logged in): create the repo if missing,
# push main, enable Pages from main /. PRIVATE=1 only pushes to a private repo.
set -euo pipefail
cd "$(dirname "$0")/.."
OWNER=${OWNER:-machinewright}; REPO=${REPO:-squeeze}
[ -z "$(git status --porcelain)" ] || { echo "uncommitted changes; commit first" >&2; exit 1; }
node --test test/ >/dev/null || { echo "tests fail" >&2; exit 1; }
if ! gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  gh repo create "$OWNER/$REPO" --private --description "Squeeze: a puzzle game where you build the best answer and the proof that nobody can do better." \
    --homepage "https://$OWNER.github.io/$REPO/" --disable-wiki
fi
git push "https://github.com/$OWNER/$REPO.git" HEAD:main
if [ "${PRIVATE:-0}" = 1 ]; then echo "pushed (private)"; exit 0; fi
gh api -X PATCH "repos/$OWNER/$REPO" -f visibility=public >/dev/null
gh api -X POST "repos/$OWNER/$REPO/pages" -f 'source[branch]=main' -f 'source[path]=/' >/dev/null 2>&1 \
  || echo "(pages already enabled)"
echo "https://$OWNER.github.io/$REPO/"
