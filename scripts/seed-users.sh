#!/usr/bin/env bash
# Creates local dev users via the Supabase Auth Admin API.
# Run once after `supabase db reset`.
#
# Usage: ./scripts/seed-users.sh
#
# Passwords: Password123!
#   athlete1@example.com (role: athlete)
#   athlete2@example.com (role: athlete)
#   admin@example.com    (role: admin)
#
# NOTE: Uses `docker exec` to reach the GoTrue container directly because
# the Kong gateway (/auth/v1/admin/*) returns 502 in Supabase CLI >= 2.x.
# See: https://github.com/supabase/cli/issues/
#
# Git worktrees: each checkout has its own folder name (e.g. …/training-records-bjj).
# Supabase Docker names match that folder, so in the BJJ worktree this script uses
# supabase_auth_training-records-bjj — not supabase_auth_training-records.
#
# Run this from the worktree you started Supabase in:
#   cd /path/to/training-records-bjj && ./scripts/seed-users.sh
#
# Container names follow: supabase_auth_<folder_name>. Override with:
#   SUPABASE_AUTH_CONTAINER=supabase_auth_training-records-bjj

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_NAME="$(basename "$REPO_ROOT")"
AUTH_CONTAINER="${SUPABASE_AUTH_CONTAINER:-supabase_auth_${PROJECT_NAME}}"

SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

UUID_REGEX='^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

if ! docker inspect "$AUTH_CONTAINER" &>/dev/null; then
  echo "Cannot find auth container: $AUTH_CONTAINER" >&2
  echo "Repo: $REPO_ROOT — expected Docker project '${PROJECT_NAME}' (basename of this path)." >&2
  echo "Start Supabase from this worktree: supabase start" >&2
  echo "If your auth container has another name:" >&2
  echo "  SUPABASE_AUTH_CONTAINER=\$(docker ps --filter name=supabase_auth --format '{{.Names}}' | head -1) $0" >&2
  exit 1
fi

echo "Using worktree: $REPO_ROOT"
echo "Auth container: $AUTH_CONTAINER"

create_user() {
  local email="$1"
  local password="$2"
  local id
  id=$(docker exec "$AUTH_CONTAINER" wget -qO- \
    --post-data="{\"email\":\"$email\",\"password\":\"$password\",\"email_confirm\":true}" \
    --header='Content-Type: application/json' \
    --header="Authorization: Bearer $SERVICE_KEY" \
    "http://localhost:9999/admin/users" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id') or '')")
  if [[ ! $id =~ $UUID_REGEX ]]; then
    echo "Failed to create $email — GoTrue did not return a user id (got: '${id:-<empty>}'). Response may be an error object." >&2
    exit 1
  fi
  echo "$email → $id"
  echo "$id"
}

echo "Creating seed users..."

ATHLETE1_ID=$(create_user "athlete1@example.com" "Password123!" | tail -1)
ATHLETE2_ID=$(create_user "athlete2@example.com" "Password123!" | tail -1)
ADMIN_ID=$(create_user "admin@example.com" "Password123!" | tail -1)

echo ""
echo "Setting admin role..."
if [[ ! $ADMIN_ID =~ $UUID_REGEX ]]; then
  echo "Invalid admin user id; cannot set role (ADMIN_ID='${ADMIN_ID:-}')." >&2
  exit 1
fi
supabase db query "UPDATE public.profiles SET role = 'admin' WHERE id = '$ADMIN_ID';"

echo ""
echo "Done! Users created:"
echo "  athlete1@example.com / Password123!  (athlete)"
echo "  athlete2@example.com / Password123!  (athlete)"
echo "  admin@example.com    / Password123!  (admin)"
