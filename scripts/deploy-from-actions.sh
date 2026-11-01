#!/usr/bin/env bash
set -euo pipefail

required=(DEPLOY_HOST DEPLOY_USER DEPLOY_SSH_KEY DEPLOY_KNOWN_HOSTS)
missing=()
for name in "${required[@]}"; do [[ -n "${!name:-}" ]] || missing+=("$name"); done
report_config() {
  printf 'configured=%s\n' "$1"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then printf 'configured=%s\n' "$1" >> "$GITHUB_OUTPUT"; fi
}
if ((${#missing[@]} == ${#required[@]})); then
  report_config false
  printf 'Automatic deployment awaits first-time SSH configuration.\n'
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then printf '### Server deployment waiting for configuration\n\nSet DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY and DEPLOY_KNOWN_HOSTS in repository Secrets. No server was updated.\n' >> "$GITHUB_STEP_SUMMARY"; fi
  [[ "${1:-}" == --check-config ]] && exit 0
  exit 2
fi
if ((${#missing[@]})); then printf 'Missing deployment Secrets: %s\n' "${missing[*]}" >&2; exit 2; fi

DEPLOY_SSH_PORT=${DEPLOY_SSH_PORT:-22}
DEPLOY_PATH=${DEPLOY_PATH:-/opt/dota2-2d}
DEPLOY_PUBLIC_URL=${DEPLOY_PUBLIC_URL:-https://dota2.prismabyss.com}
[[ "$DEPLOY_HOST" =~ ^[A-Za-z0-9][A-Za-z0-9.:-]*$ ]] || { echo 'Invalid DEPLOY_HOST' >&2; exit 2; }
[[ "$DEPLOY_USER" =~ ^[a-z_][a-z0-9_-]*$ ]] || { echo 'Invalid DEPLOY_USER' >&2; exit 2; }
[[ "$DEPLOY_SSH_PORT" =~ ^[0-9]{1,5}$ ]] && ((10#$DEPLOY_SSH_PORT >= 1 && 10#$DEPLOY_SSH_PORT <= 65535)) || { echo 'Invalid DEPLOY_SSH_PORT' >&2; exit 2; }
[[ "$DEPLOY_PATH" == /* && "$DEPLOY_PATH" != / && "$DEPLOY_PATH" != *$'\n'* && "$DEPLOY_PATH" != *$'\r'* ]] || { echo 'Invalid DEPLOY_PATH' >&2; exit 2; }
[[ "$DEPLOY_PUBLIC_URL" =~ ^https?://[A-Za-z0-9.:-]+/?$ ]] || { echo 'Invalid DEPLOY_PUBLIC_URL' >&2; exit 2; }
report_config true
[[ "${1:-}" == --check-config ]] && exit 0
[[ "$#" == 0 ]] || { echo 'Unsupported deployment arguments' >&2; exit 2; }
[[ "${GITHUB_SHA:-}" =~ ^[a-f0-9]{40}$ && "${DEPLOY_IMAGE:-}" =~ ^ghcr\.io/hyn-lei/dota2-2d@sha256:[a-f0-9]{64}$ ]] || { echo 'Invalid immutable image or commit SHA' >&2; exit 2; }
registry_pattern='^[A-Za-z0-9_-]+(\[bot\])?$'
[[ "${GITHUB_ACTOR:-}" =~ $registry_pattern && -n "${GITHUB_TOKEN:-}" ]] || { echo 'Registry authentication is required' >&2; exit 2; }

key_dir=$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/dota2-ssh.XXXXXXXX")
remote_dir=''
ssh_args=(-i "$key_dir/key" -p "$DEPLOY_SSH_PORT" -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$key_dir/known_hosts" -o IdentitiesOnly=yes -o ConnectTimeout=10 -o ServerAliveInterval=15 -o ServerAliveCountMax=4)
target="$DEPLOY_USER@$DEPLOY_HOST"
cleanup() {
  if [[ "$remote_dir" =~ ^/tmp/dota2-ssh\.[A-Za-z0-9]+$ ]]; then ssh "${ssh_args[@]}" "$target" "rm -f -- '$remote_dir/deploy-on-server.sh'; rmdir -- '$remote_dir'" >/dev/null 2>&1 || true; fi
  rm -f -- "$key_dir/key" "$key_dir/known_hosts"
  rmdir -- "$key_dir" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
printf '%s\n' "$DEPLOY_SSH_KEY" | tr -d '\r' > "$key_dir/key"
printf '%s\n' "$DEPLOY_KNOWN_HOSTS" | tr -d '\r' > "$key_dir/known_hosts"
chmod 600 "$key_dir/key" "$key_dir/known_hosts"
remote_dir=$(ssh "${ssh_args[@]}" "$target" 'umask 077; mktemp -d /tmp/dota2-ssh.XXXXXXXX')
[[ "$remote_dir" =~ ^/tmp/dota2-ssh\.[A-Za-z0-9]+$ ]] || { echo 'Unexpected SSH temporary directory' >&2; exit 1; }
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
ssh "${ssh_args[@]}" "$target" "cat > '$remote_dir/deploy-on-server.sh'" < "$script_dir/deploy-on-server.sh"
# Base64 keeps spaces/quotes in user paths out of the remote shell command.
encoded_path=$(printf '%s' "$DEPLOY_PATH" | base64 | tr -d '\n')
encoded_url=$(printf '%s' "$DEPLOY_PUBLIC_URL" | base64 | tr -d '\n')
printf '%s\n' "$GITHUB_TOKEN" | ssh "${ssh_args[@]}" "$target" "bash '$remote_dir/deploy-on-server.sh' '$DEPLOY_IMAGE' '$GITHUB_SHA' '$encoded_path' '$GITHUB_ACTOR' '$encoded_url' --encoded"
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then printf '### Server updated\n\nCommit: `%s`\n\nImage: `%s`\n' "$GITHUB_SHA" "$DEPLOY_IMAGE" >> "$GITHUB_STEP_SUMMARY"; fi
