#!/usr/bin/env bash
# PostToolUse (Edit|Write): lint the file Claude just changed. ESLint errors are
# fed back to Claude (exit 2); warnings are left out.
set -euo pipefail

file=$(jq -r '.tool_input.file_path // empty')
app="$CLAUDE_PROJECT_DIR/nextjs"

case "$file" in
  "$app"/node_modules/* | "$app"/.next/*) exit 0 ;;
  "$app"/*.ts | "$app"/*.tsx | "$app"/*.js | "$app"/*.jsx | "$app"/*.mjs) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0

cd "$app"
if ! out=$(bunx --no-install eslint --quiet "$file" 2>&1); then
  echo "$out" >&2
  exit 2
fi
