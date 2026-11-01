#!/usr/bin/env bash
# The weekly copy of what lives outside the server: the repository, the
# Terraform state and the Actions variables, and the recovery guide. Run by
# .github/workflows/backup-github.yaml. Why: nextjs/docs/BACKUP_PLAN.md. How to
# switch it on and restore from it: nextjs/docs/BACKUP_GITHUB.md.
#
# Settings, from the environment:
#   REMOTE        where to: an rclone remote ("drive:") or a local directory ending in /
#   RECIPIENTS    the age public keys (age1...), one per line; lines starting with # are comments
#   REPO_URL      the repository to bundle
#   STATE_SOURCE  the Terraform state, as an rclone path (r2:<bucket>/<key>) or a local file
#   VARS_JSON     the Actions variables as a JSON object (toJSON(vars))
#   GUIDE_ROOT    the checkout the recovery guide is read from (default: the current directory)
#
# The dated files are never replaced, and the Drive account can't delete
# anything. The recovery guide in "LUE MINUT" is updated to the current version
# every week.
set -Eeuo pipefail
umask 077

: "${REMOTE:?}" "${RECIPIENTS:?}" "${REPO_URL:?}" "${STATE_SOURCE:?}" "${VARS_JSON:?}"
GUIDE_ROOT=${GUIDE_ROOT:-.}

# The recovery guide: <file in the repository> <its name in LUE MINUT>.
guide=(
  "nextjs/docs/BACKUP_PLAN.md BACKUP_PLAN.md"
  "infra/ansible/roles/backup/README.md BACKUP_SERVER.md"
  "nextjs/docs/BACKUP_GITHUB.md BACKUP_GITHUB.md"
)

log() { printf '%s\n' "$*"; }
fail() { log "ERROR: $*" >&2; exit 1; }
trap 'log "ERROR: failed at line $LINENO" >&2' ERR

rclone_() { rclone --retries 5 --low-level-retries 10 --stats 0 "$@"; }
# As in roles/backup: --ignore-existing, because --immutable doesn't stop copyto
# from replacing a file. Each file's first version is kept forever in Drive.
upload() { # <local file> <remote path>
  rclone_ copyto --ignore-existing --drive-keep-revision-forever --drive-stop-on-upload-limit "$1" "$2"
}
size() { du -h "$1" | cut -f1; }

for tool in age git jq rclone; do
  command -v "$tool" > /dev/null || fail "$tool is not installed"
done
for entry in "${guide[@]}"; do
  read -r src _ <<< "$entry"
  [ -f "$GUIDE_ROOT/$src" ] || fail "$src is missing; if it moved, change the guide list in $0 too"
done

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# The same check as roles/backup, so a private key pasted by mistake stops here.
# The lines are not printed, in case one is.
grep -v -E '^[[:space:]]*(#|$)' <<< "$RECIPIENTS" | tr -d ' \t\r' > "$tmp/recipients.txt" || true
[ -s "$tmp/recipients.txt" ] || fail "RECIPIENTS has no age public key"
if grep -q -v -E '^age1[02-9ac-hj-np-z]{58}$' "$tmp/recipients.txt"; then
  fail "RECIPIENTS has a line that is not an age public key (age1...)"
fi
jq -e 'type == "object"' <<< "$VARS_JSON" > /dev/null 2>&1 || fail "VARS_JSON is not a JSON object"

stamp=$(date -u +%Y%m%dT%H%M%SZ)
year=${stamp:0:4}

# 1. Every branch and tag. A bare clone fetches the branches and the tags on
# them; the second fetch adds the tags on no branch.
bundle="salko-website-$stamp.bundle"
git clone --bare --quiet "$REPO_URL" "$tmp/repo.git"
git -C "$tmp/repo.git" fetch --quiet --tags "$REPO_URL"
git -C "$tmp/repo.git" bundle create --quiet "$tmp/$bundle" --all
git -C "$tmp/repo.git" bundle verify --quiet "$tmp/$bundle" 2> /dev/null ||
  fail "the bundle does not verify"
heads=$(git -C "$tmp/repo.git" bundle list-heads "$tmp/$bundle")
log "bundled $(grep -c ' refs/heads/' <<< "$heads" || true) branches and $(grep -c ' refs/tags/' <<< "$heads" || true) tags ($(size "$tmp/$bundle"))"

# 2. The Terraform state, encrypted: it holds the generated database passwords.
# Only its serial and size are printed.
state="terraform-$stamp.tfstate.age"
rclone_ copyto "$STATE_SOURCE" "$tmp/terraform.tfstate"
jq -e '.version and .serial and .lineage' "$tmp/terraform.tfstate" > /dev/null 2>&1 ||
  fail "$STATE_SOURCE is not a Terraform state file"
log "Terraform state serial $(jq .serial "$tmp/terraform.tfstate"), $(jq '.resources | length' "$tmp/terraform.tfstate") resources"
age -R "$tmp/recipients.txt" -o "$tmp/$state" "$tmp/terraform.tfstate"
rm -f "$tmp/terraform.tfstate"

# 3. The Actions variables. They are not secret, so they stay readable without a key.
vars="actions-variables-$stamp.json"
jq -S . <<< "$VARS_JSON" > "$tmp/$vars"
log "variables: $(jq -r 'keys | join(" ")' "$tmp/$vars")"

upload "$tmp/$bundle" "${REMOTE}github/$year/$bundle"
upload "$tmp/$vars" "${REMOTE}github/$year/$vars"
upload "$tmp/$state" "${REMOTE}terraform/$year/$state"
log "uploaded $bundle, $vars and $state"

# 4. The recovery guide, readable in Drive even when GitHub is gone. Unchanged
# files are skipped; changed ones are updated in place.
for entry in "${guide[@]}"; do
  read -r src name <<< "$entry"
  rclone_ copyto "$GUIDE_ROOT/$src" "${REMOTE}LUE MINUT/$name"
done
log "updated LUE MINUT: ${#guide[@]} files"

log "weekly copy $stamp done"
