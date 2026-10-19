#!/usr/bin/env bash
# Stop: type-check nextjs/ once per turn, and only when a TypeScript file changed
# since the last check. Errors are fed back to Claude (exit 2) so it fixes them
# before finishing.
set -euo pipefail

input=$(cat)
# Already continuing because of this hook: let Claude stop instead of looping
[ "$(jq -r '.stop_hook_active // false' <<<"$input")" = "true" ] && exit 0

app="$CLAUDE_PROJECT_DIR/nextjs"
cd "$app"
# tsc --incremental rewrites tsconfig.tsbuildinfo on every run
stamp=tsconfig.tsbuildinfo
if [ -f "$stamp" ]; then
  changed=$(find . \( -path ./node_modules -o -path ./.next \) -prune -o \
    \( -name '*.ts' -o -name '*.tsx' \) -newer "$stamp" -print -quit)
  [ -n "$changed" ] || exit 0
fi

# next-env.d.ts is generated (and gitignored); a fresh checkout has none yet
[ -f next-env.d.ts ] || bunx --no-install next typegen >/dev/null 2>&1 || true

if ! out=$(bunx --no-install tsc --noEmit --pretty false 2>&1); then
  echo "TypeScript errors (cd nextjs && bunx tsc --noEmit):" >&2
  echo "$out" | head -40 >&2
  exit 2
fi
