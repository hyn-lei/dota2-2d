#!/usr/bin/env bash
set -euo pipefail
[[ "$#" == 5 || "$#" == 6 && "$6" == --encoded ]] || { echo 'Expected image, commit, directory, registry user and public URL' >&2; exit 2; }
image_ref=$1
commit_sha=$2
deploy_path=$3
registry_user=$4
public_url=$5
if [[ "${6:-}" == --encoded ]]; then deploy_path=$(printf '%s' "$deploy_path" | base64 --decode); public_url=$(printf '%s' "$public_url" | base64 --decode); fi
[[ "$image_ref" =~ ^ghcr\.io/hyn-lei/dota2-2d@sha256:[a-f0-9]{64}$ && "$commit_sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid immutable image or commit' >&2; exit 2; }
[[ "$deploy_path" == /* && "$deploy_path" != / && "$deploy_path" != *$'\n'* && "$deploy_path" != *$'\r'* ]] || { echo 'Invalid deployment directory' >&2; exit 2; }
registry_pattern='^[A-Za-z0-9_-]+(\[bot\])?$'
[[ "$registry_user" =~ $registry_pattern && "$public_url" =~ ^https?://[A-Za-z0-9.:-]+/?$ ]] || { echo 'Invalid registry user or public URL' >&2; exit 2; }
cd -- "$deploy_path"
[[ "$PWD" != / && -f compose.yaml && -f .env && ! -L .env ]] || { echo 'Existing compose.yaml and regular .env are required' >&2; exit 2; }
command -v docker >/dev/null
command -v curl >/dev/null
command -v flock >/dev/null
docker compose version >/dev/null
docker compose config --quiet
exec 9>.deploy.lock
flock -w 300 9

work_dir=$(mktemp -d "${TMPDIR:-/tmp}/dota2-registry.XXXXXXXX")
env_tmp=''
rollback_required=false
previous_image=''
cleanup() {
  local status=$?
  if ((status != 0)) && [[ "$rollback_required" == true ]]; then rollback_required=false; rollback || true; fi
  rm -f -- "$work_dir/config.json" "$work_dir/headers" || true
  [[ -z "$env_tmp" ]] || rm -f -- "$env_tmp" || true
  rmdir -- "$work_dir" 2>/dev/null || true
  return "$status"
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
export DOCKER_CONFIG="$work_dir"
registry_token=''
IFS= read -r registry_token || [[ -n "$registry_token" ]]
[[ -n "$registry_token" ]] || { echo 'Registry token is required on stdin' >&2; exit 2; }
printf '%s' "$registry_token" | docker login ghcr.io --username "$registry_user" --password-stdin
unset registry_token
current_container=$(docker compose ps -q game)
if [[ -n "$current_container" ]]; then previous_image=$(docker inspect --format '{{.Image}}' "$current_container"); fi
[[ -z "$previous_image" || "$previous_image" =~ ^sha256:[a-f0-9]{64}$ ]] || { echo 'Invalid previous image ID' >&2; exit 1; }

persist_image() {
  if [[ -n "$env_tmp" ]]; then rm -f -- "$env_tmp" || return 1; env_tmp=''; fi
  env_tmp=$(mktemp "$PWD/.env.deploy.XXXXXXXX") || return 1
  awk -v image="$1" 'BEGIN { written=0 } /^[[:space:]]*(export[[:space:]]+)?IMAGE[[:space:]]*=/ { if(!written) print "IMAGE=" image; written=1; next } { print } END { if(!written) print "IMAGE=" image }' .env > "$env_tmp" || return 1
  chmod --reference=.env "$env_tmp" || return 1
  mv -f -- "$env_tmp" .env || return 1
  env_tmp=''
}
rollback() {
  if [[ -z "$previous_image" ]]; then echo 'Deployment failed; no previous container image exists for rollback.' >&2; return; fi
  echo 'Deployment failed; restoring previous immutable image.' >&2
  if IMAGE="$previous_image" docker compose up -d --no-deps --pull never --wait --wait-timeout 90 game && persist_image "$previous_image"; then
    echo 'Rollback restored the previous service.' >&2
  else
    echo 'Rollback failed; inspect docker compose logs for game.' >&2
  fi
}

# Pull before touching the running container. Keep its image cached for rollback.
if ! IMAGE="$image_ref" docker compose pull game; then echo 'Image pull failed; existing service was not changed.' >&2; exit 1; fi
rollback_required=true
healthy=false
if IMAGE="$image_ref" docker compose up -d --no-deps --pull never --wait --wait-timeout 90 game; then
  new_container=$(docker compose ps -q game)
  running_ref=$(docker inspect --format '{{.Config.Image}}' "$new_container")
  if [[ "$running_ref" == "$image_ref" ]] && curl --fail --silent --show-error --connect-timeout 10 --max-time 30 --retry 3 --dump-header "$work_dir/headers" "${public_url%/}/healthz" >/dev/null; then
    public_revision=$(tr -d '\r' < "$work_dir/headers" | awk 'tolower($1)=="x-game-revision:" { value=$2 } END { print value }')
    if [[ "$public_revision" == "$commit_sha" ]] && persist_image "$image_ref"; then healthy=true; fi
  fi
fi
if [[ "$healthy" != true ]]; then echo 'New service or public revision check failed.' >&2; exit 1; fi
rollback_required=false
printf 'Deployment succeeded for commit %s\n' "$commit_sha"
