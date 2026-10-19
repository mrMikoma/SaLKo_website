#!/usr/bin/env bash
# SessionStart: put nextjs/node_modules/.bin on PATH for Claude's Bash commands,
# so `playwright-cli`, `playwright`, `eslint` and `tsc` run the pinned dev
# dependencies, and tell Claude what of the local stack is already running.
set -uo pipefail

app="$CLAUDE_PROJECT_DIR/nextjs"
bin="$app/node_modules/.bin"
if [ -n "${CLAUDE_ENV_FILE:-}" ] && ! grep -qsF "$bin" "$CLAUDE_ENV_FILE"; then
  echo "export PATH=\"\$PATH:$bin\"" >>"$CLAUDE_ENV_FILE"
fi

[ -d "$bin" ] || echo "nextjs/node_modules is missing: run 'cd nextjs && bun install'."

pg=$(docker inspect -f '{{.State.Status}}{{if .State.Health}} ({{.State.Health.Status}}){{end}}' \
  salko-postgres 2>/dev/null) || pg="not running — start with: cd postgres && docker compose up -d"
echo "Local Postgres (salko-postgres): $pg"

# next dev writes its pid and URL here; a server from another checkout does not count
lock="$app/.next/dev/lock"
if [ -f "$lock" ] && kill -0 "$(jq -r .pid "$lock" 2>/dev/null)" 2>/dev/null; then
  echo "Next dev server for this checkout: $(jq -r .appUrl "$lock")"
else
  echo "Next dev server for this checkout: not running — start with: cd nextjs && bun dev"
fi
